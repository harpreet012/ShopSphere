import api from './api';
export const fetchCart = () => api.get('/cart').then((r) => r.data);
export const addToCart = (productId, quantity = 1) => api.post('/cart', { productId, quantity }).then((r) => r.data);
export const updateCartItem = (productId, quantity) => api.put(`/cart/${productId}`, { quantity }).then((r) => r.data);
export const removeCartItem = (productId) => api.delete(`/cart/${productId}`).then((r) => r.data);
export const clearCart = () => api.delete('/cart').then((r) => r.data);
