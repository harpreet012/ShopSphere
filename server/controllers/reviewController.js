const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const recalculateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const rating = stats.length ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const numReviews = stats.length ? stats[0].count : 0;
  await Product.findByIdAndUpdate(productId, { rating, numReviews });
};

const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId }).sort({ createdAt: -1 });
  const distribution = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length
  }));
  res.json({ success: true, data: { reviews, distribution } });
});

const createReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const { productId } = req.params;
  if (!rating || !comment) throw new ApiError(400, 'Rating and comment are required');

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');

  // Verify purchase: user must have a delivered order containing this product
  const purchasedOrder = await Order.findOne({
    user: req.user._id,
    orderStatus: 'Delivered',
    'items.product': product._id
  });
  if (!purchasedOrder) {
    throw new ApiError(403, 'You can only review products you have purchased and received.');
  }

  const existing = await Review.findOne({ product: productId, user: req.user._id });
  if (existing) throw new ApiError(400, 'You have already reviewed this product. Edit your existing review instead.');

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    userName: req.user.name,
    rating,
    comment
  });
  await recalculateProductRating(product._id);
  res.status(201).json({ success: true, message: 'Review submitted', data: { review } });
});

const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  if (review.user.toString() !== req.user._id.toString()) throw new ApiError(403, 'Not authorized');

  const { rating, comment } = req.body;
  if (rating) review.rating = rating;
  if (comment) review.comment = comment;
  await review.save();
  await recalculateProductRating(review.product);
  res.json({ success: true, message: 'Review updated', data: { review } });
});

const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }
  const productId = review.product;
  await review.deleteOne();
  await recalculateProductRating(productId);
  res.json({ success: true, message: 'Review deleted' });
});

module.exports = { getProductReviews, createReview, updateReview, deleteReview };
