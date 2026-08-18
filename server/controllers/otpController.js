const User = require('../models/User');
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { generateOTP, hashOTP, compareOTP, getOTPExpiry, checkResendCooldown } = require('../utils/otpGenerator');
const { sendOTPEmail } = require('../utils/emailService');

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5');
const OTP_RESEND_COOLDOWN = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60');

/**
 * @desc Send OTP to email for login
 * @route POST /api/auth/send-otp
 */
const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(404, 'No account found with this email');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'This account has been disabled. Contact support.');
  }

  // Check existing OTP and resend cooldown
  let otpRecord = await OTP.findOne({ email: email.toLowerCase(), type: 'login', verified: false });

  if (otpRecord) {
    const cooldown = checkResendCooldown(otpRecord.lastResendAt, OTP_RESEND_COOLDOWN);
    if (!cooldown.allowed) {
      throw new ApiError(429, `Please wait ${cooldown.waitSeconds} seconds before requesting a new OTP`);
    }
  }

  // Generate and hash OTP
  const plainOTP = generateOTP();
  const otpHash = await hashOTP(plainOTP);
  const expiresAt = getOTPExpiry(OTP_EXPIRY_MINUTES);

  // Create or update OTP record
  otpRecord = await OTP.findOneAndUpdate(
    { email: email.toLowerCase(), type: 'login' },
    {
      otpHash,
      expiresAt,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      lastResendAt: new Date(),
      verified: false
    },
    { upsert: true, new: true }
  );

  // BUG 11: Await email — if delivery fails, revert the OTP record and return an error
  try {
    await sendOTPEmail(email, plainOTP, 'login');
  } catch (emailErr) {
    // Roll back the OTP record so the user can try again cleanly
    await OTP.deleteOne({ _id: otpRecord._id }).catch(() => {});
    console.error('OTP email delivery failed:', emailErr.message);
    throw new ApiError(503, 'Failed to send OTP email. Please try again shortly.');
  }

  res.json({
    success: true,
    message: `OTP sent to ${email}`,
    data: { email, expiresIn: OTP_EXPIRY_MINUTES * 60 }
  });
});

/**
 * @desc Verify OTP and login
 * @route POST /api/auth/verify-otp
 */
const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required');
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new ApiError(400, 'OTP must be a 6-digit number');
  }

  // Find OTP record
  const otpRecord = await OTP.findOne({ email: email.toLowerCase(), type: 'login', verified: false });

  if (!otpRecord) {
    throw new ApiError(400, 'No OTP found. Please request a new one.');
  }

  // Check if expired
  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  // Check attempts
  if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new ApiError(429, 'Maximum OTP verification attempts exceeded. Please request a new OTP.');
  }

  // Compare OTP
  const isMatch = await compareOTP(otp, otpRecord.otpHash);
  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();

    const remaining = OTP_MAX_ATTEMPTS - otpRecord.attempts;
    throw new ApiError(
      400,
      remaining > 0
        ? `Invalid OTP. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
        : 'Maximum attempts exceeded. Please request a new OTP.'
    );
  }

  // OTP is valid - delete record and login user
  await OTP.deleteOne({ _id: otpRecord._id });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User account is not available');
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Login successful',
    data: { user: user.toSafeObject(), token }
  });
});

/**
 * @desc Send OTP for password reset
 * @route POST /api/auth/forgot-password/send-otp
 */
const sendPasswordResetOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(404, 'No account found with this email');
  }

  // Check existing OTP and resend cooldown
  let otpRecord = await OTP.findOne({ email: email.toLowerCase(), type: 'password_reset', verified: false });

  if (otpRecord) {
    const cooldown = checkResendCooldown(otpRecord.lastResendAt, OTP_RESEND_COOLDOWN);
    if (!cooldown.allowed) {
      throw new ApiError(429, `Please wait ${cooldown.waitSeconds} seconds before requesting a new OTP`);
    }
  }

  // Generate and hash OTP
  const plainOTP = generateOTP();
  const otpHash = await hashOTP(plainOTP);
  const expiresAt = getOTPExpiry(OTP_EXPIRY_MINUTES);

  // Create or update OTP record
  otpRecord = await OTP.findOneAndUpdate(
    { email: email.toLowerCase(), type: 'password_reset' },
    {
      otpHash,
      expiresAt,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      lastResendAt: new Date(),
      verified: false
    },
    { upsert: true, new: true }
  );

  // BUG 11: Await email — return error if delivery fails
  try {
    await sendOTPEmail(email, plainOTP, 'password_reset');
  } catch (emailErr) {
    await OTP.deleteOne({ _id: otpRecord._id }).catch(() => {});
    console.error('Password reset OTP email delivery failed:', emailErr.message);
    throw new ApiError(503, 'Failed to send OTP email. Please try again shortly.');
  }

  res.json({
    success: true,
    message: `Password reset OTP sent to ${email}`,
    data: { email, expiresIn: OTP_EXPIRY_MINUTES * 60 }
  });
});

/**
 * @desc Verify OTP and set new password
 * @route POST /api/auth/forgot-password/verify
 */
const verifyPasswordResetOTP = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    throw new ApiError(400, 'Email, OTP, and new password are required');
  }

  if (!/^\d{6}$/.test(otp)) {
    throw new ApiError(400, 'OTP must be a 6-digit number');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long');
  }

  // Find OTP record
  const otpRecord = await OTP.findOne({ email: email.toLowerCase(), type: 'password_reset', verified: false });

  if (!otpRecord) {
    throw new ApiError(400, 'No password reset OTP found. Please request a new one.');
  }

  // Check if expired
  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  // Check attempts
  if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new ApiError(429, 'Maximum OTP verification attempts exceeded. Please request a new OTP.');
  }

  // Compare OTP
  const isMatch = await compareOTP(otp, otpRecord.otpHash);
  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();

    const remaining = OTP_MAX_ATTEMPTS - otpRecord.attempts;
    throw new ApiError(
      400,
      remaining > 0
        ? `Invalid OTP. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
        : 'Maximum attempts exceeded. Please request a new OTP.'
    );
  }

  // OTP is valid - update password and delete OTP record
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.password = newPassword;
  await user.save();

  // Delete OTP record
  await OTP.deleteOne({ _id: otpRecord._id });

  res.json({
    success: true,
    message: 'Password reset successful. You can now login with your new password.',
    data: { email }
  });
});

module.exports = {
  sendOTP,
  verifyOTP,
  sendPasswordResetOTP,
  verifyPasswordResetOTP
};
