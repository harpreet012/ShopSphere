import api from './api';
export const createOrder = (data) => api.post('/orders', data).then((r) => r.data);
export const fetchMyOrders = () => api.get('/orders/my-orders').then((r) => r.data);
export const fetchOrderById = (id) => api.get(`/orders/${id}`).then((r) => r.data);
export const cancelMyOrder = (id) => api.put(`/orders/${id}/cancel`).then((r) => r.data);
export const fetchAllOrders = (params) => api.get('/orders/admin/all', { params }).then((r) => r.data);
export const updateOrderStatus = (id, data) => api.put(`/orders/${id}/status`, data).then((r) => r.data);
