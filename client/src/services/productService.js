import api from './api';
export const fetchProducts = (params) => api.get('/products', { params }).then((r) => r.data);
export const fetchProductById = (id) => api.get(`/products/${id}`).then((r) => r.data);
export const createProduct = (data) => api.post('/products', data).then((r) => r.data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data).then((r) => r.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`).then((r) => r.data);
export const fetchCategories = () => api.get('/categories').then((r) => r.data);
export const createCategory = (data) => api.post('/categories', data).then((r) => r.data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data).then((r) => r.data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`).then((r) => r.data);
export const fetchProductReviews = (productId) => api.get(`/products/${productId}/reviews`).then((r) => r.data);
export const submitReview = (productId, data) => api.post(`/products/${productId}/reviews`, data).then((r) => r.data);
export const updateReview = (productId, reviewId, data) => api.put(`/products/${productId}/reviews/${reviewId}`, data).then((r) => r.data);
export const deleteReview = (productId, reviewId) => api.delete(`/products/${productId}/reviews/${reviewId}`).then((r) => r.data);

// Admin endpoint: returns active + inactive products
export const fetchAdminProducts = (params) => api.get('/products/admin/all', { params }).then((r) => r.data);
