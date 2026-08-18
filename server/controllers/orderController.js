const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logAdminActivity, logInventoryTransaction } = require('../utils/auditLogger');
const {
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancellationEmail
} = require('../utils/emailService');

const SHIPPING_FEE = 49;
const FREE_SHIPPING_THRESHOLD = 999;

const generateOrderNumber = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SS-${ts}-${rand}`;
};

// Valid status transitions
const STATUS_TRANSITIONS = {
  'Pending':          ['Confirmed', 'Cancelled'],
  'Confirmed':        ['Processing', 'Cancelled'],
  'Processing':       ['Shipped', 'Cancelled'],
  'Shipped':          ['Out for Delivery'],
  'Out for Delivery': ['Delivered'],
  'Delivered':        [],
  'Cancelled':        []
};

const isValidTransition = (from, to) => (STATUS_TRANSITIONS[from] || []).includes(to);

// Create SALE inventory transactions for all items in a successfully placed order
const createSaleTransactions = async (cartItems, order) => {
  for (const item of cartItems) {
    const product = item.product;
    // snapshot stock before deduction to compute previousStock
    const freshProduct = await Product.findById(product._id).select('stock name');
    if (!freshProduct) continue;
    // After deduction newStock = freshProduct.stock (already decremented)
    await logInventoryTransaction({
      product: product._id,
      productName: freshProduct.name,
      previousStock: freshProduct.stock + item.quantity, // before = after + qty
      quantityChanged: -item.quantity,
      newStock: freshProduct.stock,
      type: 'SALE',
      reason: `Order sale — ${order.orderNumber}`,
      source: 'ORDER',
      performedBy: null,
      performedByName: 'System',
      orderId: order._id
    });
  }
};

// Create CANCELLATION inventory transactions for all items in a cancelled order
const createCancellationTransactions = async (orderItems, order) => {
  for (const item of orderItems) {
    const freshProduct = await Product.findById(item.product).select('stock name');
    if (!freshProduct) continue;
    await logInventoryTransaction({
      product: item.product,
      productName: freshProduct.name,
      previousStock: freshProduct.stock - item.quantity, // before restoration
      quantityChanged: item.quantity,
      newStock: freshProduct.stock,
      type: 'CANCELLATION',
      reason: `Order cancellation — ${order.orderNumber}`,
      source: 'ORDER',
      performedBy: null,
      performedByName: 'System',
      orderId: order._id
    });
  }
};

// @desc Create order from current cart (checkout)
const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;
  if (!shippingAddress || !paymentMethod) throw new ApiError(400, 'Shipping address and payment method are required');
  if (!['COD', 'CARD', 'UPI'].includes(paymentMethod)) throw new ApiError(400, 'Invalid payment method');

  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart || cart.items.length === 0) throw new ApiError(400, 'Your cart is empty');

  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.active) throw new ApiError(400, `Product no longer available: ${product?.name || 'unknown'}`);
    if (item.quantity > product.stock) throw new ApiError(400, `Insufficient stock for ${product.name}. Only ${product.stock} left.`);
  }

  let subtotal = 0, discountTotal = 0;
  const orderItems = cart.items.map((item) => {
    const product = item.product;
    const finalPrice = Math.round(product.price - (product.price * product.discount) / 100);
    subtotal += product.price * item.quantity;
    discountTotal += (product.price - finalPrice) * item.quantity;
    return { product: product._id, name: product.name, image: product.images?.[0] || '', price: finalPrice, quantity: item.quantity };
  });

  const afterDiscount = subtotal - discountTotal;
  const shippingFee = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const totalAmount = afterDiscount + shippingFee;
  const paymentStatus = ['CARD', 'UPI'].includes(paymentMethod) ? 'Paid' : 'Pending';

  // Snapshot stock before deduction for inventory logging
  const stocksBefore = {};
  for (const item of cart.items) {
    stocksBefore[item.product._id.toString()] = item.product.stock;
  }

  const runWithTransaction = async () => {
    const session = await mongoose.startSession();
    try {
      let createdOrder;
      await session.withTransaction(async () => {
        for (const item of cart.items) {
          const updated = await Product.findOneAndUpdate(
            { _id: item.product._id, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity, soldCount: item.quantity } },
            { new: true, session }
          );
          if (!updated) throw new ApiError(400, `Insufficient stock for ${item.product.name}`);
        }
        const [order] = await Order.create([{
          orderNumber: generateOrderNumber(), user: req.user._id, items: orderItems, shippingAddress,
          paymentMethod, paymentStatus, orderStatus: 'Confirmed',
          statusHistory: [
            { status: 'Pending',   timestamp: new Date(), actor: req.user.name, actorRole: 'customer' },
            { status: 'Confirmed', timestamp: new Date(), actor: 'System',      actorRole: 'system' }
          ],
          subtotal, discount: discountTotal, shippingFee, totalAmount
        }], { session });
        createdOrder = order;
        cart.items = [];
        await cart.save({ session });
      });
      return createdOrder;
    } finally { session.endSession(); }
  };

  const runWithoutTransaction = async () => {
    for (const item of cart.items) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity, soldCount: item.quantity } },
        { new: true }
      );
      if (!updated) throw new ApiError(400, `Insufficient stock for ${item.product.name}`);
    }
    const createdOrder = await Order.create({
      orderNumber: generateOrderNumber(), user: req.user._id, items: orderItems, shippingAddress,
      paymentMethod, paymentStatus, orderStatus: 'Confirmed',
      statusHistory: [
        { status: 'Pending',   timestamp: new Date(), actor: req.user.name, actorRole: 'customer' },
        { status: 'Confirmed', timestamp: new Date(), actor: 'System',      actorRole: 'system' }
      ],
      subtotal, discount: discountTotal, shippingFee, totalAmount
    });
    cart.items = [];
    await cart.save();
    return createdOrder;
  };

  let order;
  try {
    order = await runWithTransaction();
  } catch (err) {
    const isUnsupported = err?.code === 20 ||
      (/transaction/i.test(err?.message || '') && /replica set/i.test(err?.message || ''));
    if (isUnsupported) { order = await runWithoutTransaction(); }
    else throw err;
  }

  // BUG 1: Create SALE inventory transactions (after order is committed)
  for (const item of cart._doc?.items || []) {
    // cart.items was cleared; use orderItems + stocksBefore
  }
  // Use original cart items (now cleared); reconstruct from orderItems + stocksBefore
  for (const orderItem of order.items) {
    const pid = orderItem.product.toString();
    const before = stocksBefore[pid];
    if (before === undefined) continue;
    const after = before - orderItem.quantity;
    await logInventoryTransaction({
      product: orderItem.product,
      productName: orderItem.name,
      previousStock: before,
      quantityChanged: -orderItem.quantity,
      newStock: after,
      type: 'SALE',
      reason: `Order sale — ${order.orderNumber}`,
      source: 'ORDER',
      performedBy: null,
      performedByName: 'System',
      orderId: order._id
    });
  }

  // Send confirmation email (fire-and-forget is acceptable here — email failure shouldn't fail the order)
  const user = await User.findById(req.user._id);
  sendOrderConfirmationEmail(user.email, order, user.name).catch((e) =>
    console.error('Order confirmation email failed:', e.message)
  );

  res.status(201).json({ success: true, message: 'Order placed successfully', data: { order } });
});

// @desc Get logged-in user's orders
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: { orders } });
});

// @desc Get single order (owner or admin)
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to view this order');
  }
  res.json({ success: true, data: { order } });
});

// @desc Get all orders (admin)
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.orderStatus = status;
  if (search) query.$or = [{ orderNumber: { $regex: search, $options: 'i' } }];

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const [orders, total] = await Promise.all([
    Order.find(query).populate('user', 'name email').sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Order.countDocuments(query)
  ]);
  res.json({ success: true, data: { orders, pagination: { total, page: pageNum, totalPages: Math.ceil(total / limitNum) } } });
});

// @desc Update order status (admin) — enforces valid transitions + BUGs 4 & 5
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, paymentStatus } = req.body;
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw new ApiError(404, 'Order not found');

  const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

  if (orderStatus) {
    if (!validStatuses.includes(orderStatus)) throw new ApiError(400, 'Invalid order status');

    if (orderStatus !== order.orderStatus) {
      if (!isValidTransition(order.orderStatus, orderStatus)) {
        throw new ApiError(
          400,
          `Invalid status transition: "${order.orderStatus}" → "${orderStatus}". ` +
          `Allowed: ${STATUS_TRANSITIONS[order.orderStatus]?.join(', ') || 'none'}`
        );
      }
    }

    const previousStatus = order.orderStatus;

    // Restock on cancellation
    if (orderStatus === 'Cancelled' && previousStatus !== 'Cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, soldCount: -item.quantity } });
      }
      // BUG 1: Create CANCELLATION inventory transactions
      await createCancellationTransactions(order.items, order);
    }

    order.orderStatus = orderStatus;
    // BUG 5: Record actor in status history
    order.statusHistory.push({
      status: orderStatus,
      timestamp: new Date(),
      actor: req.user.name,
      actorRole: 'admin'
    });

    const userEmail = order.user?.email;
    const userName  = order.user?.name || 'Customer';
    if (userEmail) {
      if (orderStatus === 'Shipped')    sendOrderShippedEmail(userEmail, order, userName).catch(e => console.error(e.message));
      if (orderStatus === 'Delivered')  sendOrderDeliveredEmail(userEmail, order, userName).catch(e => console.error(e.message));
      if (orderStatus === 'Cancelled')  sendOrderCancellationEmail(userEmail, order, userName).catch(e => console.error(e.message));
    }
  }

  if (paymentStatus) {
    if (!['Pending', 'Paid', 'Failed', 'Refunded'].includes(paymentStatus)) throw new ApiError(400, 'Invalid payment status');
    order.paymentStatus = paymentStatus;
  }

  await order.save();

  // BUG 4: Direct audit log — no monkey-patching
  if (orderStatus) {
    await logAdminActivity({
      adminUser: req.user._id, adminName: req.user.name,
      action: orderStatus === 'Cancelled' ? 'ORDER_CANCELLED' : 'ORDER_STATUS_UPDATED',
      entityType: 'Order', entityId: order._id, entityName: order.orderNumber,
      details: `Status updated to "${order.orderStatus}"`,
      metadata: { newStatus: order.orderStatus }
    });
  }

  res.json({ success: true, message: 'Order updated', data: { order } });
});

// @desc Cancel own order (customer) — BUGs 1 & 5
const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.user._id.toString() !== req.user._id.toString()) throw new ApiError(403, 'Not authorized');

  if (!isValidTransition(order.orderStatus, 'Cancelled')) {
    throw new ApiError(400, `Cannot cancel an order that is already ${order.orderStatus}`);
  }

  // Restock items
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, soldCount: -item.quantity } });
  }

  // BUG 1: CANCELLATION inventory transactions
  await createCancellationTransactions(order.items, order);

  order.orderStatus = 'Cancelled';
  // BUG 5: Record actor
  order.statusHistory.push({
    status: 'Cancelled',
    timestamp: new Date(),
    actor: req.user.name,
    actorRole: 'customer'
  });
  await order.save();

  const userEmail = order.user?.email;
  const userName  = order.user?.name || 'Customer';
  if (userEmail) sendOrderCancellationEmail(userEmail, order, userName).catch(e => console.error(e.message));

  res.json({ success: true, message: 'Order cancelled', data: { order } });
});

module.exports = { createOrder, getMyOrders, getOrderById, getAllOrders, updateOrderStatus, cancelMyOrder };
