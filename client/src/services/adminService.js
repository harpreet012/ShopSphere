import api from './api';

// Dashboard
export const fetchOverview            = ()       => api.get('/admin/overview').then(r => r.data);
export const fetchNotifications       = ()       => api.get('/admin/notifications').then(r => r.data);
export const globalSearch             = (q)      => api.get('/admin/search', { params: { q } }).then(r => r.data);

// Analytics
export const fetchRevenueOverTime         = (range)  => api.get('/admin/analytics/revenue', { params: { range } }).then(r => r.data);
export const fetchSalesByCategory         = ()       => api.get('/admin/analytics/sales-by-category').then(r => r.data);
export const fetchTopProducts             = (limit)  => api.get('/admin/analytics/top-products', { params: { limit } }).then(r => r.data);
export const fetchTopCustomers            = (limit)  => api.get('/admin/analytics/top-customers', { params: { limit } }).then(r => r.data);
export const fetchOrderStatusDistribution = ()       => api.get('/admin/analytics/order-status').then(r => r.data);
export const fetchPaymentDistribution     = ()       => api.get('/admin/analytics/payment-methods').then(r => r.data);

// Inventory
export const fetchInventory          = (params) => api.get('/admin/inventory', { params }).then(r => r.data);
export const fetchLowStock           = ()       => api.get('/admin/inventory/low-stock').then(r => r.data);
export const fetchOutOfStock         = ()       => api.get('/admin/inventory/out-of-stock').then(r => r.data);
export const fetchInventoryValue     = ()       => api.get('/admin/inventory/value').then(r => r.data);
export const adjustStock             = (id, data) => api.post(`/admin/inventory/${id}/adjust`, data).then(r => r.data);
export const fetchInventoryHistory   = (id, params) => api.get(`/admin/inventory/${id}/history`, { params }).then(r => r.data);

// Activity logs
export const fetchActivity           = (params) => api.get('/admin/activity', { params }).then(r => r.data);

// User activity
export const fetchUserActivity       = (id)     => api.get(`/admin/users/${id}/activity`).then(r => r.data);
export const fetchUserOrders         = (id, params) => api.get(`/admin/users/${id}/orders`, { params }).then(r => r.data);

// Users (existing)
export const fetchAllUsers    = (params) => api.get('/users', { params }).then(r => r.data);
export const fetchUserById    = (id)     => api.get(`/users/${id}`).then(r => r.data);
export const updateUserRole   = (id, role) => api.put(`/users/${id}/role`, { role }).then(r => r.data);
export const toggleUserStatus = (id)     => api.put(`/users/${id}/toggle-status`).then(r => r.data);

// CSV exports
export const downloadInventoryCSV  = () => api.get('/admin/export/inventory', { responseType: 'blob' });
export const downloadOrdersCSV     = () => api.get('/admin/export/orders', { responseType: 'blob' });
export const downloadCustomersCSV  = () => api.get('/admin/export/customers', { responseType: 'blob' });
