const express = require('express');
const router = express.Router();
const {
  getOverview, getRevenueOverTime, getSalesByCategory, getTopProducts, getTopCustomers,
  getOrderStatusDistribution, getPaymentDistribution,
  getInventory, getLowStockProducts, getOutOfStockProducts, adjustStock, getInventoryHistory, getInventoryValue,
  getActivity, getUserActivity, getUserOrders,
  globalSearch, getNotifications,
  exportInventoryCSV, exportOrdersCSV, exportCustomersCSV
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.use(protect, adminOnly);

// Dashboard
router.get('/overview', getOverview);
router.get('/notifications', getNotifications);
router.get('/search', globalSearch);

// Analytics
router.get('/analytics/revenue', getRevenueOverTime);
router.get('/analytics/sales-by-category', getSalesByCategory);
router.get('/analytics/top-products', getTopProducts);
router.get('/analytics/top-customers', getTopCustomers);
router.get('/analytics/order-status', getOrderStatusDistribution);
router.get('/analytics/payment-methods', getPaymentDistribution);

// Inventory
router.get('/inventory', getInventory);
router.get('/inventory/low-stock', getLowStockProducts);
router.get('/inventory/out-of-stock', getOutOfStockProducts);
router.get('/inventory/value', getInventoryValue);
router.post('/inventory/:productId/adjust', validateObjectId('productId'), adjustStock);
router.get('/inventory/:productId/history', validateObjectId('productId'), getInventoryHistory);

// Activity logs
router.get('/activity', getActivity);

// User activity
router.get('/users/:id/activity', validateObjectId('id'), getUserActivity);
router.get('/users/:id/orders', validateObjectId('id'), getUserOrders);

// CSV exports
router.get('/export/inventory', exportInventoryCSV);
router.get('/export/orders', exportOrdersCSV);
router.get('/export/customers', exportCustomersCSV);

module.exports = router;
