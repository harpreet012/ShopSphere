import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as cartService from '../services/cartService';
import { getErrorMessage } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart({ items: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await cartService.fetchCart();
      setCart(res.data.cart);
    } catch {
      // silent - cart will simply appear empty
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = async (productId, quantity = 1) => {
    try {
      const res = await cartService.addToCart(productId, quantity);
      setCart(res.data.cart);
      return { success: true };
    } catch (err) {
      return { success: false, message: getErrorMessage(err) };
    }
  };

  const updateItem = async (productId, quantity) => {
    try {
      const res = await cartService.updateCartItem(productId, quantity);
      setCart(res.data.cart);
      return { success: true };
    } catch (err) {
      return { success: false, message: getErrorMessage(err) };
    }
  };

  const removeItem = async (productId) => {
    try {
      const res = await cartService.removeCartItem(productId);
      setCart(res.data.cart);
      return { success: true };
    } catch (err) {
      return { success: false, message: getErrorMessage(err) };
    }
  };

  const emptyCart = async () => {
    try {
      const res = await cartService.clearCart();
      setCart(res.data.cart);
    } catch {
      // ignore
    }
  };

  const itemCount = (cart.items || []).reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, loading, itemCount, addItem, updateItem, removeItem, emptyCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
