import api from './api';
export const fetchWishlist = () => api.get('/wishlist').then((r) => r.data);
export const addToWishlist = (productId) => api.post('/wishlist', { productId }).then((r) => r.data);
export const removeFromWishlist = (productId) => api.delete(`/wishlist/${productId}`).then((r) => r.data);
export const moveWishlistToCart = (productId) => api.post(`/wishlist/${productId}/move-to-cart`).then((r) => r.data);
