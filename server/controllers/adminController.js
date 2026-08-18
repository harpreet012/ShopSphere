const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');
const Cart = require('../models/Cart');
const InventoryTransaction = require('../models/InventoryTransaction');
const AdminActivityLog = require('../models/AdminActivityLog');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logAdminActivity, logInventoryTransaction } = require('../utils/auditLogger');

const startOf = (unit) => {
  const now = new Date();
  if (unit === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (unit === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (unit === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(0);
};

const LOW_STOCK_DEFAULT = 10;
const getStockStatus = (stock, threshold = LOW_STOCK_DEFAULT) => {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= threshold) return 'LOW_STOCK';
  return 'IN_STOCK';
};

// Dashboard Overview
const getOverview = asyncHandler(async (req, res) => {
  const todayStart = startOf('today');
  const weekStart  = startOf('week');
  const monthStart = startOf('month');

  const [
    totalCustomers, totalProducts, activeProducts, inactiveProducts,
    totalOrders, todayOrders, pendingOrders, deliveredOrders,
    revenueAgg, todayRev, weekRev, monthRev,
    invAgg, lowStockCount, outOfStockCount,
    recentActivity, recentOrders
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments(),
    Product.countDocuments({ active: true }),
    Product.countDocuments({ active: false }),
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: todayStart } }),
    Order.countDocuments({ orderStatus: 'Pending' }),
    Order.countDocuments({ orderStatus: 'Delivered' }),
    Order.aggregate([{ $match: { orderStatus: { $ne: 'Cancelled' } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Order.aggregate([{ $match: { orderStatus: { $ne: 'Cancelled' }, createdAt: { $gte: todayStart } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Order.aggregate([{ $match: { orderStatus: { $ne: 'Cancelled' }, createdAt: { $gte: weekStart } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Order.aggregate([{ $match: { orderStatus: { $ne: 'Cancelled' }, createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Product.aggregate([{ $match: { active: true } }, { $group: { _id: null, units: { $sum: '$stock' }, value: { $sum: { $multiply: ['$price', '$stock'] } } } }]),
    Product.aggregate([{ $match: { active: true } }, { $match: { $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', LOW_STOCK_DEFAULT] }] }] } } }, { $count: 'n' }]).then(r => r[0]?.n || 0),
    Product.countDocuments({ stock: 0, active: true }),
    AdminActivityLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    Order.find().sort({ createdAt: -1 }).limit(8).populate('user', 'name email').lean()
  ]);

  res.json({
    success: true,
    data: {
      kpis: {
        totalRevenue: revenueAgg[0]?.total || 0,
        todayRevenue: todayRev[0]?.total || 0,
        weekRevenue: weekRev[0]?.total || 0,
        monthRevenue: monthRev[0]?.total || 0,
        totalOrders, todayOrders, pendingOrders, deliveredOrders,
        totalCustomers, totalProducts, activeProducts, inactiveProducts,
        totalInventoryUnits: invAgg[0]?.units || 0,
        inventoryValue: invAgg[0]?.value || 0,
        lowStockCount, outOfStockCount
      },
      recentActivity,
      recentOrders
    }
  });
});

// Revenue over time
const getRevenueOverTime = asyncHandler(async (req, res) => {
  const { range = '30d' } = req.query;
  let sinceDate = new Date();
  if (range === '7d') sinceDate.setDate(sinceDate.getDate() - 7);
  else if (range === 'month') sinceDate = startOf('month');
  else sinceDate.setDate(sinceDate.getDate() - 30);

  const data = await Order.aggregate([
    { $match: { createdAt: { $gte: sinceDate }, orderStatus: { $ne: 'Cancelled' } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  res.json({ success: true, data: { series: data.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })) } });
});

// Sales by category
const getSalesByCategory = asyncHandler(async (req, res) => {
  const data = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'Cancelled' } } },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
    { $unwind: '$prod' },
    { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
    { $unwind: '$cat' },
    { $group: { _id: '$cat.name', totalSales: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }, count: { $sum: '$items.quantity' } } },
    { $sort: { totalSales: -1 } }
  ]);
  res.json({ success: true, data: { categories: data.map((d) => ({ name: d._id, value: d.totalSales, units: d.count })) } });
});

// Top products
const getTopProducts = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  // BUG 6: Use actual order item prices (item.price × item.quantity), not current product price × soldCount
  const topFromOrders = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'Cancelled' } } },
    { $unwind: '$items' },
    { $group: {
        _id: '$items.product',
        unitsSold:   { $sum: '$items.quantity' },
        actualRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
    }},
    { $sort: { unitsSold: -1 } },
    { $limit: Number(limit) },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'prod' } },
    { $unwind: '$prod' },
    { $lookup: { from: 'categories', localField: 'prod.category', foreignField: '_id', as: 'cat' } },
    { $project: {
        name:     '$prod.name',
        image:    { $arrayElemAt: ['$prod.images', 0] },
        stock:    '$prod.stock',
        lowStockThreshold: { $ifNull: ['$prod.lowStockThreshold', LOW_STOCK_DEFAULT] },
        category: { $arrayElemAt: ['$cat.name', 0] },
        unitsSold: 1,
        actualRevenue: 1
    }}
  ]);

  const result = topFromOrders.map(p => ({
    _id: p._id,
    name: p.name,
    image: p.image,
    unitsSold: p.unitsSold,
    revenue: p.actualRevenue,
    stock: p.stock,
    status: getStockStatus(p.stock, p.lowStockThreshold),
    category: p.category
  }));
  res.json({ success: true, data: { products: result } });
});

// Top customers
const getTopCustomers = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const data = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'Cancelled' } } },
    { $group: { _id: '$user', totalSpent: { $sum: '$totalAmount' }, orderCount: { $sum: 1 }, lastOrder: { $max: '$createdAt' }, avgOrder: { $avg: '$totalAmount' } } },
    { $sort: { totalSpent: -1 } }, { $limit: Number(limit) },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    { $project: { name: '$u.name', email: '$u.email', totalSpent: 1, orderCount: 1, lastOrder: 1, avgOrder: 1 } }
  ]);
  res.json({ success: true, data: { customers: data } });
});

// Order status distribution
const getOrderStatusDistribution = asyncHandler(async (req, res) => {
  const data = await Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]);
  res.json({ success: true, data: { distribution: data.map((d) => ({ status: d._id, count: d.count })) } });
});

// Payment distribution
const getPaymentDistribution = asyncHandler(async (req, res) => {
  const data = await Order.aggregate([{ $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }]);
  res.json({ success: true, data: { distribution: data.map((d) => ({ method: d._id, count: d.count, revenue: d.revenue })) } });
});

// Inventory list
const getInventory = asyncHandler(async (req, res) => {
  const { status, category, search, sort = 'name', page = 1, limit = 20 } = req.query;
  const query = {};
  if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { brand: { $regex: search, $options: 'i' } }];
  if (category) query.category = category;
  if (status === 'OUT_OF_STOCK') query.stock = 0;
  // LOW_STOCK and IN_STOCK use per-product threshold via $expr; handled below after find
  const useExprFilter = status === 'LOW_STOCK' || status === 'IN_STOCK';

  let sortOpt = { name: 1 };
  if (sort === 'stock_asc') sortOpt = { stock: 1 };
  else if (sort === 'stock_desc') sortOpt = { stock: -1 };
  else if (sort === 'updated') sortOpt = { lastStockUpdate: -1 };

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Number(limit));

  // For LOW_STOCK/IN_STOCK add per-product $expr filter
  if (status === 'LOW_STOCK') {
    query.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', LOW_STOCK_DEFAULT] }] }] };
  } else if (status === 'IN_STOCK') {
    query.$expr = { $gt: ['$stock', { $ifNull: ['$lowStockThreshold', LOW_STOCK_DEFAULT] }] };
  }

  const [products, total] = await Promise.all([
    Product.find(query).populate('category', 'name').sort(sortOpt).skip((pageNum - 1) * limitNum).limit(limitNum),
    Product.countDocuments(query)
  ]);

  const result = products.map((p) => ({
    _id: p._id, name: p.name, brand: p.brand, sku: p._id.toString().slice(-8).toUpperCase(),
    category: p.category?.name, price: p.price, stock: p.stock,
    lowStockThreshold: p.lowStockThreshold || LOW_STOCK_DEFAULT,
    inventoryValue: p.price * p.stock,
    status: getStockStatus(p.stock, p.lowStockThreshold),
    active: p.active, lastStockUpdate: p.lastStockUpdate, lastStockUpdatedBy: p.lastStockUpdatedBy, images: p.images
  }));
  res.json({ success: true, data: { products: result, pagination: { total, page: pageNum, totalPages: Math.ceil(total / limitNum) } } });
});

// Low stock
const getLowStockProducts = asyncHandler(async (req, res) => {
  // Use per-product threshold via aggregation, then fetch full docs
  const lowIds = await Product.aggregate([
    { $match: { active: true } },
    { $match: { $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', LOW_STOCK_DEFAULT] }] }] } } },
    { $sort: { stock: 1 } }, { $limit: 50 }, { $project: { _id: 1 } }
  ]);
  const products = await Product.find({ _id: { $in: lowIds.map(i => i._id) } }).populate('category', 'name').sort({ stock: 1 });
  res.json({ success: true, data: { products: products.map((p) => ({
    _id: p._id, name: p.name, stock: p.stock,
    lowStockThreshold: p.lowStockThreshold || LOW_STOCK_DEFAULT,
    category: p.category?.name, price: p.price, images: p.images
  })) } });
});

// Out of stock
const getOutOfStockProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ stock: 0, active: true })
    .populate('category', 'name').sort({ lastStockUpdate: -1 }).limit(50);
  res.json({ success: true, data: { products: products.map((p) => ({
    _id: p._id, name: p.name, category: p.category?.name,
    price: p.price, lastStockUpdate: p.lastStockUpdate, lastStockUpdatedBy: p.lastStockUpdatedBy, images: p.images
  })) } });
});

// Adjust stock
const adjustStock = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { adjustmentType, quantity, reason, lowStockThreshold } = req.body;

  if (!['ADD', 'REMOVE'].includes(adjustmentType)) throw new ApiError(400, 'adjustmentType must be ADD or REMOVE');
  if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) throw new ApiError(400, 'quantity must be a positive number');
  if (!reason || !reason.trim()) throw new ApiError(400, 'reason is required');

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');

  const qty = Number(quantity);
  const previousStock = product.stock;
  const quantityChanged = adjustmentType === 'ADD' ? qty : -qty;
  const newStock = previousStock + quantityChanged;

  if (newStock < 0) throw new ApiError(400, `Cannot remove ${qty} units. Only ${previousStock} in stock.`);

  product.stock = newStock;
  product.lastStockUpdate = new Date();
  product.lastStockUpdatedBy = req.user.name;
  if (lowStockThreshold !== undefined && !isNaN(Number(lowStockThreshold))) product.lowStockThreshold = Number(lowStockThreshold);
  await product.save();

  await logInventoryTransaction({
    product: product._id, productName: product.name, previousStock, quantityChanged, newStock,
    type: adjustmentType === 'ADD' ? 'RESTOCK' : 'MANUAL_ADJUSTMENT',
    reason, source: 'ADMIN', performedBy: req.user._id, performedByName: req.user.name
  });
  await logAdminActivity({
    adminUser: req.user._id, adminName: req.user.name,
    action: adjustmentType === 'ADD' ? 'STOCK_INCREASED' : 'STOCK_DECREASED',
    entityType: 'Product', entityId: product._id, entityName: product.name,
    details: `${adjustmentType === 'ADD' ? '+' : '-'}${qty} units (${previousStock} → ${newStock}). Reason: ${reason}`,
    metadata: { previousStock, quantityChanged, newStock, reason }
  });

  res.json({ success: true, message: `Stock ${adjustmentType === 'ADD' ? 'increased' : 'decreased'} successfully`,
    data: { product: { _id: product._id, name: product.name, stock: product.stock } } });
});

// Inventory history
const getInventoryHistory = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Number(limit));
  const [transactions, total] = await Promise.all([
    InventoryTransaction.find({ product: productId }).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    InventoryTransaction.countDocuments({ product: productId })
  ]);
  res.json({ success: true, data: { transactions, pagination: { total, page: pageNum, totalPages: Math.ceil(total / limitNum) } } });
});

// Inventory value
const getInventoryValue = asyncHandler(async (req, res) => {
  const [total, byCategory] = await Promise.all([
    Product.aggregate([{ $group: { _id: null, value: { $sum: { $multiply: ['$price', '$stock'] } }, units: { $sum: '$stock' } } }]),
    Product.aggregate([
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmpty: true } },
      { $group: { _id: { $ifNull: ['$cat.name', 'Uncategorized'] }, value: { $sum: { $multiply: ['$price', '$stock'] } }, units: { $sum: '$stock' } } },
      { $sort: { value: -1 } }
    ])
  ]);
  res.json({ success: true, data: {
    totalValue: total[0]?.value || 0, totalUnits: total[0]?.units || 0,
    byCategory: byCategory.map((d) => ({ category: d._id, value: d.value, units: d.units }))
  } });
});

// Activity logs
const getActivity = asyncHandler(async (req, res) => {
  const { adminId, action, entityType, search, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
  const query = {};
  if (adminId) query.adminUser = adminId;
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;
  if (search) query.$or = [{ entityName: { $regex: search, $options: 'i' } }, { details: { $regex: search, $options: 'i' } }, { adminName: { $regex: search, $options: 'i' } }];
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      // Include the entire selected day through 23:59:59.999
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Number(limit));
  const [logs, total] = await Promise.all([
    AdminActivityLog.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    AdminActivityLog.countDocuments(query)
  ]);
  res.json({ success: true, data: { logs, pagination: { total, page: pageNum, totalPages: Math.ceil(total / limitNum) } } });
});

// User activity
const getUserActivity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');

  const [orders, reviewCount, cart] = await Promise.all([
    Order.find({ user: id }).sort({ createdAt: -1 }).limit(10).lean(),
    Review.countDocuments({ user: id }),
    Cart.findOne({ user: id })
  ]);
  const stats = await Order.aggregate([
    { $match: { user: user._id, orderStatus: { $ne: 'Cancelled' } } },
    { $group: { _id: null, totalSpent: { $sum: '$totalAmount' }, count: { $sum: 1 }, avg: { $avg: '$totalAmount' } } }
  ]);
  res.json({ success: true, data: {
    user: user.toSafeObject(),
    stats: { totalOrders: stats[0]?.count || 0, totalSpent: stats[0]?.totalSpent || 0, avgOrderValue: stats[0]?.avg || 0,
      reviewCount, cartItemCount: cart?.items?.length || 0, wishlistCount: user.wishlist?.length || 0 },
    recentOrders: orders
  } });
});

const getUserOrders = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Number(limit));
  const [orders, total] = await Promise.all([
    Order.find({ user: id }).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Order.countDocuments({ user: id })
  ]);
  res.json({ success: true, data: { orders, pagination: { total, page: pageNum, totalPages: Math.ceil(total / limitNum) } } });
});

// Global search
const globalSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) throw new ApiError(400, 'Search query must be at least 2 characters');
  const regex = { $regex: q, $options: 'i' };
  const [products, users, orders] = await Promise.all([
    Product.find({ $or: [{ name: regex }, { brand: regex }] }).select('name price images active').limit(5),
    User.find({ $or: [{ name: regex }, { email: regex }] }).select('name email role isActive').limit(5),
    Order.find({ orderNumber: regex }).populate('user', 'name email').select('orderNumber totalAmount orderStatus createdAt').limit(5)
  ]);
  res.json({ success: true, data: { products, users, orders } });
});

// Notifications
const getNotifications = asyncHandler(async (req, res) => {
  const [lowStock, outOfStock, pendingOrders, newOrdersToday] = await Promise.all([
    Product.aggregate([{ $match: { active: true } }, { $match: { $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', LOW_STOCK_DEFAULT] }] }] } } }, { $count: 'n' }]).then(r => r[0]?.n || 0),
    Product.countDocuments({ stock: 0, active: true }),
    Order.countDocuments({ orderStatus: 'Pending' }),
    Order.countDocuments({ createdAt: { $gte: startOf('today') } })
  ]);
  res.json({ success: true, data: { total: lowStock + outOfStock + pendingOrders, lowStock, outOfStock, pendingOrders, newOrdersToday } });
});

// CSV exports
const exportInventoryCSV = asyncHandler(async (req, res) => {
  const products = await Product.find().populate('category', 'name').lean();
  const rows = [['Name', 'Brand', 'Category', 'Price', 'Stock', 'Inventory Value', 'Status', 'Active']];
  products.forEach((p) => {
    const status = getStockStatus(p.stock, p.lowStockThreshold || LOW_STOCK_DEFAULT);
    rows.push([p.name, p.brand, p.category?.name || '', p.price, p.stock, p.price * p.stock, status, p.active]);
  });
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"');
  res.send(csv);
});

const exportOrdersCSV = asyncHandler(async (req, res) => {
  const orders = await Order.find().populate('user', 'name email').lean();
  const rows = [['Order Number', 'Customer', 'Email', 'Total', 'Status', 'Payment', 'Date']];
  orders.forEach((o) => rows.push([o.orderNumber, o.user?.name || '', o.user?.email || '', o.totalAmount, o.orderStatus, o.paymentStatus, new Date(o.createdAt).toISOString()]));
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
  res.send(csv);
});

const exportCustomersCSV = asyncHandler(async (req, res) => {
  const users = await User.find({ role: 'customer' }).lean();
  const rows = [['Name', 'Email', 'Status', 'Joined']];
  users.forEach((u) => rows.push([u.name, u.email, u.isActive ? 'Active' : 'Disabled', new Date(u.createdAt).toISOString()]));
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
  res.send(csv);
});

module.exports = {
  getOverview, getRevenueOverTime, getSalesByCategory, getTopProducts, getTopCustomers,
  getOrderStatusDistribution, getPaymentDistribution,
  getInventory, getLowStockProducts, getOutOfStockProducts, adjustStock, getInventoryHistory, getInventoryValue,
  getActivity, getUserActivity, getUserOrders,
  globalSearch, getNotifications,
  exportInventoryCSV, exportOrdersCSV, exportCustomersCSV
};
