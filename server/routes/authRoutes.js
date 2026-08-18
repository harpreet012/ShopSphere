const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { sendOTP, verifyOTP, sendPasswordResetOTP, verifyPasswordResetOTP } = require('../controllers/otpController');
const { protect } = require('../middleware/auth');

// Password auth
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// OTP login
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Forgot password via OTP
router.post('/forgot-password/send-otp', sendPasswordResetOTP);
router.post('/forgot-password/verify', verifyPasswordResetOTP);

module.exports = router;
