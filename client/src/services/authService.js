import api from './api';

// Password auth
export const registerUser = (data) => api.post('/auth/register', data).then((r) => r.data);
export const loginUser   = (data) => api.post('/auth/login', data).then((r) => r.data);
export const getMe       = ()     => api.get('/auth/me').then((r) => r.data);

// Profile
export const updateProfile  = (data) => api.put('/users/profile', data).then((r) => r.data);
export const changePassword = (data) => api.put('/users/change-password', data).then((r) => r.data);

// OTP login
export const sendLoginOTP   = (email) => api.post('/auth/send-otp', { email }).then((r) => r.data);
export const verifyLoginOTP = (email, otp) => api.post('/auth/verify-otp', { email, otp }).then((r) => r.data);

// Forgot password
export const sendForgotOTP   = (email) => api.post('/auth/forgot-password/send-otp', { email }).then((r) => r.data);
export const verifyForgotOTP = (email, otp, newPassword) =>
  api.post('/auth/forgot-password/verify', { email, otp, newPassword }).then((r) => r.data);
