const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelMyOrder
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.use(protect);
router.post('/', createOrder);
router.get('/my-orders', getMyOrders);
router.get('/admin/all', adminOnly, getAllOrders);
router.get('/:id', validateObjectId('id'), getOrderById);
router.put('/:id/status', adminOnly, validateObjectId('id'), updateOrderStatus);
router.put('/:id/cancel', validateObjectId('id'), cancelMyOrder);

module.exports = router;
