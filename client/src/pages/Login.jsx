import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendLoginOTP } from '../services/authService';
import { getErrorMessage } from '../services/api';
import OTPInput from '../components/auth/OTPInput';
import { Mail, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';

const RESEND_COOLDOWN = 60;

const Login = () => {
  const [mode, setMode]               = useState('password'); // 'password' | 'otp'
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp]                 = useState('');
  const [otpSent, setOtpSent]         = useState(false);
  const [cooldown, setCooldown]       = useState(0);
  const [error, setError]             = useState('');
  const [info, setInfo]               = useState('');
  const [loading, setLoading]         = useState(false);
  const cooldownRef                   = useRef(null);

  const { login, loginWithOTP }       = useAuth();
  const navigate                      = useNavigate();
  const location                      = useLocation();

  const redirectTo = location.state?.from?.pathname || '/';

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) { clearInterval(cooldownRef.current); return 0; }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(cooldownRef.current);
  }, [cooldown]);

  // --- Password login ---
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.success) navigate(redirectTo);
    else setError(res.message);
  };

  // --- OTP: send ---
  const handleSendOTP = async () => {
    if (!email) { setError('Enter your email first'); return; }
    setError(''); setInfo(''); setLoading(true);
    try {
      await sendLoginOTP(email);
      setOtpSent(true);
      setOtp('');
      setCooldown(RESEND_COOLDOWN);
      setInfo('OTP sent! Check your inbox.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // --- OTP: verify ---
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Enter the complete 6-digit OTP'); return; }
    setError(''); setLoading(true);
    const res = await loginWithOTP(email, otp);
    setLoading(false);
    if (res.success) navigate(redirectTo);
    else setError(res.message);
  };

  const fillDemo = (role) => {
    setError(''); setInfo(''); setOtpSent(false); setOtp('');
    if (role === 'admin') { setEmail('admin@shopsphere.com'); setPassword('Admin@123'); }
    else                  { setEmail('user@shopsphere.com');  setPassword('User@123'); }
    setMode('password');
  };

  const switchMode = (m) => {
    setMode(m); setError(''); setInfo('');
    setOtpSent(false); setOtp(''); setPassword('');
  };

  return (
    <div className="container-app py-10 max-w-md">
      <div className="card p-6 md:p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-5">Login to your ShopSphere account</p>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => switchMode('password')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors
              ${mode === 'password' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Lock size={14} /> Password
          </button>
          <button
            onClick={() => switchMode('otp')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors
              ${mode === 'otp' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <KeyRound size={14} /> OTP Login
          </button>
        </div>

        {error && <div className="bg-red-50 text-danger text-sm px-3 py-2 rounded mb-4">{error}</div>}
        {info  && <div className="bg-green-50 text-success text-sm px-3 py-2 rounded mb-4">{info}</div>}

        {/* Email field (shared) */}
        <div className="mb-4">
          <label className="label-text">Email address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-9"
              placeholder="you@example.com"
              disabled={mode === 'otp' && otpSent}
            />
          </div>
        </div>

        {/* ── Password mode ── */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label-text">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-9 pr-9"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {/* ── OTP mode ── */}
        {mode === 'otp' && (
          <div className="space-y-4">
            {!otpSent ? (
              <button onClick={handleSendOTP} disabled={loading || !email} className="btn-primary w-full">
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            ) : (
              <form onSubmit={handleOTPSubmit} className="space-y-4">
                <div>
                  <label className="label-text text-center block mb-3">Enter 6-digit OTP</label>
                  <OTPInput value={otp} onChange={setOtp} disabled={loading} />
                  <p className="text-xs text-gray-400 text-center mt-2">OTP expires in 10 minutes</p>
                </div>
                <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full">
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>
                <div className="text-center">
                  {cooldown > 0 ? (
                    <span className="text-xs text-gray-400">Resend OTP in {cooldown}s</span>
                  ) : (
                    <button type="button" onClick={handleSendOTP} disabled={loading}
                      className="text-xs text-primary hover:underline">
                      Resend OTP
                    </button>
                  )}
                  <span className="mx-2 text-gray-300">|</span>
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setInfo(''); }}
                    className="text-xs text-gray-500 hover:underline">
                    Change email
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Demo fill buttons */}
        <div className="mt-5 flex gap-2 text-xs">
          <button onClick={() => fillDemo('customer')} className="flex-1 border border-gray-300 rounded py-1.5 hover:bg-muted">
            Demo Customer
          </button>
          <button onClick={() => fillDemo('admin')} className="flex-1 border border-gray-300 rounded py-1.5 hover:bg-muted">
            Demo Admin
          </button>
        </div>

        <p className="text-sm text-gray-600 mt-5 text-center">
          New to ShopSphere?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
