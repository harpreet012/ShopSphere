import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendForgotOTP, verifyForgotOTP } from '../services/authService';
import { getErrorMessage } from '../services/api';
import OTPInput from '../components/auth/OTPInput';
import { Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

const RESEND_COOLDOWN = 60;
const STEPS = { EMAIL: 'email', OTP: 'otp', PASSWORD: 'password', DONE: 'done' };

const ForgotPassword = () => {
  const [step, setStep]           = useState(STEPS.EMAIL);
  const [email, setEmail]         = useState('');
  const [otp, setOtp]             = useState('');
  const [newPassword, setNew]     = useState('');
  const [confirmPwd, setConfirm]  = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [cooldown, setCooldown]   = useState(0);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const cooldownRef               = useRef(null);
  const navigate                  = useNavigate();

  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldown((c) => { if (c <= 1) { clearInterval(cooldownRef.current); return 0; } return c - 1; });
      }, 1000);
    }
    return () => clearInterval(cooldownRef.current);
  }, [cooldown]);

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setError(''); setLoading(true);
    try {
      await sendForgotOTP(email);
      setStep(STEPS.OTP);
      setOtp('');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Enter the complete 6-digit OTP'); return; }
    setError('');
    // Just move to password step; actual verify+reset happens together
    setStep(STEPS.PASSWORD);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPwd) { setError('Passwords do not match'); return; }
    setError(''); setLoading(true);
    try {
      await verifyForgotOTP(email, otp, newPassword);
      setStep(STEPS.DONE);
    } catch (err) {
      setError(getErrorMessage(err));
      // If OTP is wrong/expired, go back to OTP step
      if (err?.response?.status === 400 || err?.response?.status === 429) {
        setStep(STEPS.OTP);
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-app py-10 max-w-md">
      <div className="card p-6 md:p-8">

        {step === STEPS.DONE ? (
          <div className="text-center py-4">
            <CheckCircle size={48} className="text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Password Reset!</h2>
            <p className="text-sm text-gray-500 mb-6">Your password has been updated successfully.</p>
            <Link to="/login" className="btn-primary">Go to Login</Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Forgot Password</h1>
            <p className="text-sm text-gray-500 mb-6">
              {step === STEPS.EMAIL    && 'Enter your email to receive a reset OTP.'}
              {step === STEPS.OTP      && `OTP sent to ${email}. Check your inbox.`}
              {step === STEPS.PASSWORD && 'OTP verified. Set your new password.'}
            </p>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              {['Email', 'OTP', 'Password'].map((label, i) => {
                const stepIndex = { email: 0, otp: 1, password: 2 }[step] || 0;
                const active = i <= stepIndex;
                return (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                      ${active ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {i + 1}
                    </div>
                    <span className={`text-xs ${active ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
                    {i < 2 && <div className={`flex-1 h-px ${i < stepIndex ? 'bg-primary' : 'bg-gray-200'}`} />}
                  </div>
                );
              })}
            </div>

            {error && <div className="bg-red-50 text-danger text-sm px-3 py-2 rounded mb-4">{error}</div>}

            {/* Step 1: Email */}
            {step === STEPS.EMAIL && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="label-text">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-9" placeholder="you@example.com"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === STEPS.OTP && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="label-text text-center block mb-3">Enter 6-digit OTP</label>
                  <OTPInput value={otp} onChange={setOtp} disabled={loading} />
                  <p className="text-xs text-gray-400 text-center mt-2">OTP expires in 10 minutes</p>
                </div>
                <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full">
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <div className="text-center">
                  {cooldown > 0 ? (
                    <span className="text-xs text-gray-400">Resend in {cooldown}s</span>
                  ) : (
                    <button type="button" onClick={() => handleSendOTP()} disabled={loading}
                      className="text-xs text-primary hover:underline">
                      Resend OTP
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Step 3: New password */}
            {step === STEPS.PASSWORD && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="label-text">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPwd ? 'text' : 'password'} required value={newPassword}
                      onChange={(e) => setNew(e.target.value)}
                      className="input-field pl-9 pr-9" placeholder="Min 6 characters"
                    />
                    <button type="button" onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label-text">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password" required value={confirmPwd}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="input-field pl-9" placeholder="Repeat password"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            <p className="text-sm text-gray-600 mt-5 text-center">
              Remember it?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">Back to Login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
