const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP using bcrypt
 * @param {string} otp - Plain OTP
 * @returns {Promise<string>} Hashed OTP
 */
const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

/**
 * Compare plain OTP with hash
 * @param {string} otp - Plain OTP
 * @param {string} otpHash - Hashed OTP
 * @returns {Promise<boolean>} True if match
 */
const compareOTP = async (otp, otpHash) => {
  return bcrypt.compare(otp, otpHash);
};

/**
 * Calculate OTP expiry time
 * @param {number} minutesFromNow - Minutes from now
 * @returns {Date} Expiry date
 */
const getOTPExpiry = (minutesFromNow = 10) => {
  return new Date(Date.now() + minutesFromNow * 60 * 1000);
};

/**
 * Check if resend is allowed (60-second cooldown)
 * @param {Date} lastResendAt - Last resend timestamp
 * @param {number} cooldownSeconds - Cooldown in seconds (default 60)
 * @returns {object} { allowed: boolean, waitSeconds: number }
 */
const checkResendCooldown = (lastResendAt, cooldownSeconds = 60) => {
  if (!lastResendAt) {
    return { allowed: true, waitSeconds: 0 };
  }

  const now = Date.now();
  const lastResendMs = lastResendAt.getTime();
  const elapsedSeconds = Math.floor((now - lastResendMs) / 1000);
  const waitSeconds = Math.max(0, cooldownSeconds - elapsedSeconds);

  return {
    allowed: waitSeconds === 0,
    waitSeconds
  };
};

module.exports = {
  generateOTP,
  hashOTP,
  compareOTP,
  getOTPExpiry,
  checkResendCooldown
};
