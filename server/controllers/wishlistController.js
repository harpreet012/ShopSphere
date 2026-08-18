const User = require('../models/User');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist');
  res.json({ success: true, data: { wishlist: user.wishlist } });
});

const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw new ApiError(400, 'productId is required');
  const product = await Product.findById(productId);
  if (!product || !product.active) throw new ApiError(404, 'Product not found');

  const user = await User.findById(req.user._id);
  if (user.wishlist.some((id) => id.toString() === productId)) {
    throw new ApiError(400, 'Product already in wishlist');
  }
  user.wishlist.push(productId);
  await user.save();
  const populated = await User.findById(req.user._id).populate('wishlist');
  res.json({ success: true, message: 'Added to wishlist', data: { wishlist: populated.wishlist } });
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const user = await User.findById(req.user._id);
  user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
  await user.save();
  const populated = await User.findById(req.user._id).populate('wishlist');
  res.json({ success: true, message: 'Removed from wishlist', data: { wishlist: populated.wishlist } });
});

const moveToCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  // 1. Find and validate product first
  const product = await Product.findById(productId);
  if (!product || !product.active) throw new ApiError(404, 'Product not found');
  if (product.stock < 1) throw new ApiError(400, 'Product is out of stock');

  // 2. Validate desired cart quantity before touching wishlist
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, items: [] });

  const existing = cart.items.find((i) => i.product.toString() === productId);
  const currentQty = existing ? existing.quantity : 0;
  const desiredQty = currentQty + 1;

  if (desiredQty > product.stock) {
    throw new ApiError(400, `Cannot add more: only ${product.stock} unit(s) in stock and you already have ${currentQty} in cart`);
  }

  // 3. Update cart
  if (existing) {
    existing.quantity = desiredQty;
  } else {
    cart.items.push({ product: productId, quantity: 1 });
  }
  await cart.save();

  // 4. Only AFTER successful cart save — remove from wishlist
  const user = await User.findById(req.user._id);
  user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
  await user.save();

  res.json({ success: true, message: 'Moved to cart' });
});

module.exports = { getWishlist, addToWishlist, removeFromWishlist, moveToCart };
