const express = require('express');
const router = express.Router();
const { getProducts, getProductsAdmin, getProductById, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const reviewRouter = require('./reviewRoutes');

router.use('/:productId/reviews', reviewRouter);

// Public - active products only
router.get('/', getProducts);

// Admin - all products including inactive (must be before /:id)
router.get('/admin/all', protect, adminOnly, getProductsAdmin);

// Public single product (active only for customers)
router.get('/:id', validateObjectId('id'), getProductById);

// Admin CRUD
router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, validateObjectId('id'), updateProduct);
router.delete('/:id', protect, adminOnly, validateObjectId('id'), deleteProduct);

module.exports = router;
