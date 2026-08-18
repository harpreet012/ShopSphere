const Product = require('../models/Product');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { logAdminActivity } = require('../utils/auditLogger');

// Whitelisted fields for create/update
const ALLOWED_FIELDS = ['name', 'description', 'category', 'brand', 'price', 'discount', 'stock', 'images', 'specifications', 'featured', 'active', 'lowStockThreshold'];

const pickFields = (body, fields) => {
  const result = {};
  fields.forEach((f) => { if (body[f] !== undefined) result[f] = body[f]; });
  return result;
};

// @desc  Get all active products (customers)
// @route GET /api/products
const getProducts = asyncHandler(async (req, res) => {
  const { search, category, minPrice, maxPrice, minRating, inStock, sort, page = 1, limit = 12, featured } = req.query;
  const query = { active: true };
  if (search) query.$text = { $search: search };
  if (category) query.category = category;
  if (minPrice || maxPrice) { query.price = {}; if (minPrice) query.price.$gte = Number(minPrice); if (maxPrice) query.price.$lte = Number(maxPrice); }
  if (minRating) query.rating = { $gte: Number(minRating) };
  if (inStock === 'true') query.stock = { $gt: 0 };
  if (featured === 'true') query.featured = true;

  let sortOption = { createdAt: -1 };
  if (sort === 'price_asc') sortOption = { price: 1 };
  else if (sort === 'price_desc') sortOption = { price: -1 };
  else if (sort === 'rating') sortOption = { rating: -1 };
  else if (sort === 'popularity') sortOption = { soldCount: -1 };

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));
  const [products, total] = await Promise.all([
    Product.find(query).populate('category', 'name slug').sort(sortOption).skip((pageNum - 1) * limitNum).limit(limitNum),
    Product.countDocuments(query)
  ]);
  res.json({ success: true, data: { products, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } } });
});

// @desc  Get all products for admin (active + inactive)
// @route GET /api/products/admin/all
const getProductsAdmin = asyncHandler(async (req, res) => {
  const { search, category, active, page = 1, limit = 20 } = req.query;
  const query = {};
  if (search) query.$text = { $search: search };
  if (category) query.category = category;
  if (active === 'true') query.active = true;
  else if (active === 'false') query.active = false;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const [products, total] = await Promise.all([
    Product.find(query).populate('category', 'name slug').sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Product.countDocuments(query)
  ]);
  res.json({ success: true, data: { products, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } } });
});

// @desc  Get single product (inactive blocked for customers)
// @route GET /api/products/:id
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) throw new ApiError(404, 'Product not found');

  const isAdmin = req.user?.role === 'admin';
  if (!product.active && !isAdmin) throw new ApiError(404, 'Product not found');

  const related = await Product.find({ category: product.category, _id: { $ne: product._id }, active: true }).limit(4);
  res.json({ success: true, data: { product, related } });
});

// @desc  Create product (admin)
// @route POST /api/products
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, brand, price, stock, discount, images } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) throw new ApiError(400, 'Product name is required');
  if (!description || typeof description !== 'string' || !description.trim()) throw new ApiError(400, 'Product description is required');
  if (!category) throw new ApiError(400, 'Category is required');
  if (!brand || typeof brand !== 'string' || !brand.trim()) throw new ApiError(400, 'Brand is required');
  if (price == null || isNaN(Number(price)) || Number(price) < 0) throw new ApiError(400, 'Valid price is required (>= 0)');
  if (stock == null || isNaN(Number(stock)) || Number(stock) < 0) throw new ApiError(400, 'Valid stock is required (>= 0)');
  if (discount != null && (isNaN(Number(discount)) || Number(discount) < 0 || Number(discount) > 100)) throw new ApiError(400, 'Discount must be between 0 and 100');
  if (!images || !Array.isArray(images) || images.length === 0) throw new ApiError(400, 'At least one product image is required');
  if (images.some((img) => typeof img !== 'string' || !img.trim())) throw new ApiError(400, 'All images must be valid URLs');

  const categoryExists = await Category.findById(category);
  if (!categoryExists) throw new ApiError(400, 'Invalid category');

  const data = pickFields(req.body, ALLOWED_FIELDS);
  const product = await Product.create(data);

  // Audit log after successful creation
  await logAdminActivity({
    adminUser: req.user._id, adminName: req.user.name,
    action: 'PRODUCT_CREATED', entityType: 'Product',
    entityId: product._id, entityName: product.name,
    details: `Created product "${product.name}"`
  });

  res.status(201).json({ success: true, message: 'Product created', data: { product } });
});

// @desc  Update product (admin)
// @route PUT /api/products/:id
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  const updates = pickFields(req.body, ALLOWED_FIELDS);

  if (updates.name !== undefined && (typeof updates.name !== 'string' || !updates.name.trim())) throw new ApiError(400, 'Product name must be a non-empty string');
  if (updates.price !== undefined && (isNaN(Number(updates.price)) || Number(updates.price) < 0)) throw new ApiError(400, 'Price must be a number >= 0');
  if (updates.discount !== undefined && (isNaN(Number(updates.discount)) || Number(updates.discount) < 0 || Number(updates.discount) > 100)) throw new ApiError(400, 'Discount must be between 0 and 100');
  if (updates.stock !== undefined && (isNaN(Number(updates.stock)) || Number(updates.stock) < 0)) throw new ApiError(400, 'Stock must be a number >= 0');
  if (updates.category !== undefined) {
    const categoryExists = await Category.findById(updates.category);
    if (!categoryExists) throw new ApiError(400, 'Invalid category');
  }
  if (updates.images !== undefined) {
    if (!Array.isArray(updates.images) || updates.images.length === 0) throw new ApiError(400, 'At least one image is required');
    if (updates.images.some((img) => typeof img !== 'string' || !img.trim())) throw new ApiError(400, 'All images must be valid strings');
  }
  if (updates.description !== undefined && (typeof updates.description !== 'string' || !updates.description.trim())) throw new ApiError(400, 'Description must be a non-empty string');

  const wasActive = product.active;
  Object.assign(product, updates);
  await product.save();

  // Determine audit action
  let action = 'PRODUCT_UPDATED';
  if (wasActive && product.active === false) action = 'PRODUCT_DEACTIVATED';
  else if (!wasActive && product.active === true) action = 'PRODUCT_REACTIVATED';

  await logAdminActivity({
    adminUser: req.user._id, adminName: req.user.name,
    action, entityType: 'Product',
    entityId: product._id, entityName: product.name,
    details: `${action.replace(/_/g, ' ').toLowerCase()} "${product.name}"`,
    metadata: updates
  });

  res.json({ success: true, message: 'Product updated', data: { product } });
});

// @desc  Soft-delete product (admin) — sets active: false
// @route DELETE /api/products/:id
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  product.active = false;
  await product.save();

  await logAdminActivity({
    adminUser: req.user._id, adminName: req.user.name,
    action: 'PRODUCT_DEACTIVATED', entityType: 'Product',
    entityId: product._id, entityName: product.name,
    details: `Deactivated product "${product.name}" (soft delete)`
  });

  res.json({ success: true, message: 'Product deactivated successfully' });
});

module.exports = { getProducts, getProductsAdmin, getProductById, createProduct, updateProduct, deleteProduct };
