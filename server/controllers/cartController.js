const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

const populateCart = (cart) => cart.populate('items.product', 'name price discount images stock active');

// @desc Get current user's cart
const getCart = asyncHandler(async (req, res) => {
  let cart = await getOrCreateCart(req.user._id);
  cart = await populateCart(cart);
  res.json({ success: true, data: { cart } });
});

// @desc Add item to cart
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) throw new ApiError(400, 'productId is required');
  if (quantity < 1) throw new ApiError(400, 'Quantity must be at least 1');

  const product = await Product.findById(productId);
  if (!product || !product.active) throw new ApiError(404, 'Product not found');
  if (product.stock < 1) throw new ApiError(400, 'Product is out of stock');

  const cart = await getOrCreateCart(req.user._id);
  const existingItem = cart.items.find((i) => i.product.toString() === productId);

  const desiredQty = existingItem ? existingItem.quantity + Number(quantity) : Number(quantity);
  if (desiredQty > product.stock) {
    throw new ApiError(400, `Only ${product.stock} unit(s) available in stock`);
  }

  if (existingItem) {
    existingItem.quantity = desiredQty;
  } else {
    cart.items.push({ product: productId, quantity: desiredQty });
  }
  await cart.save();
  const populated = await populateCart(cart);
  res.json({ success: true, message: 'Item added to cart', data: { cart: populated } });
});

// @desc Update item quantity
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  if (quantity == null || quantity < 1) throw new ApiError(400, 'Quantity must be at least 1');

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');
  if (quantity > product.stock) throw new ApiError(400, `Only ${product.stock} unit(s) available in stock`);

  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) throw new ApiError(404, 'Item not in cart');
  item.quantity = quantity;
  await cart.save();
  const populated = await populateCart(cart);
  res.json({ success: true, message: 'Cart updated', data: { cart: populated } });
});

// @desc Remove item from cart
const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const cart = await getOrCreateCart(req.user._id);
  cart.items = cart.items.filter((i) => i.product.toString() !== productId);
  await cart.save();
  const populated = await populateCart(cart);
  res.json({ success: true, message: 'Item removed', data: { cart: populated } });
});

// @desc Clear cart
const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();
  res.json({ success: true, message: 'Cart cleared', data: { cart } });
});

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
