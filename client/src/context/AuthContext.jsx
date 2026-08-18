import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, getMe, verifyLoginOTP } from '../services/authService';
import { getErrorMessage } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token      = localStorage.getItem('ss_token');
      const cachedUser = localStorage.getItem('ss_user');
      if (token && cachedUser) {
        setUser(JSON.parse(cachedUser));
        try {
          const res = await getMe();
          setUser(res.data.user);
          localStorage.setItem('ss_user', JSON.stringify(res.data.user));
        } catch {
          localStorage.removeItem('ss_token');
          localStorage.removeItem('ss_user');
          setUser(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const _setSession = (u, token) => {
    localStorage.setItem('ss_token', token);
    localStorage.setItem('ss_user', JSON.stringify(u));
    setUser(u);
  };

  const login = useCallback(async (email, password) => {
    try {
      const res = await loginUser({ email, password });
      _setSession(res.data.user, res.data.token);
      return { success: true };
    } catch (err) {
      return { success: false, message: getErrorMessage(err) };
    }
  }, []);

  const loginWithOTP = useCallback(async (email, otp) => {
    try {
      const res = await verifyLoginOTP(email, otp);
      _setSession(res.data.user, res.data.token);
      return { success: true };
    } catch (err) {
      return { success: false, message: getErrorMessage(err) };
    }
  }, []);

  const register = useCallback(async (payload) => {
    try {
      const res = await registerUser(payload);
      _setSession(res.data.user, res.data.token);
      return { success: true };
    } catch (err) {
      return { success: false, message: getErrorMessage(err) };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
    setUser(null);
  }, []);

  const updateLocalUser = useCallback((u) => {
    setUser(u);
    localStorage.setItem('ss_user', JSON.stringify(u));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginWithOTP, register, logout, updateLocalUser, isAdmin: user?.role === 'admin' }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
