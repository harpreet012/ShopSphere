const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    email:        { type: String, required: true, lowercase: true, trim: true },
    otpHash:      { type: String, required: true },
    expiresAt:    { type: Date, required: true },          // TTL index defined once below via schema.index
    attempts:     { type: Number, default: 0, max: 5 },
    maxAttempts:  { type: Number, default: 5 },
    lastResendAt: { type: Date, default: null },
    type:         { type: String, enum: ['login', 'password_reset'], default: 'login' },
    verified:     { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Single TTL index — MongoDB auto-deletes documents when expiresAt is reached
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);
