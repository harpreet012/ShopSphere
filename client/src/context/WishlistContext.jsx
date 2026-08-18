import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as wishlistService from '../services/wishlistService';
import { getErrorMessage } from '../services/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState([]);

  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setWishlist([]);
      return;
    }
    try {
      const res = await wishlistService.fetchWishlist();
      setWishlist(res.data.wishlist);
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const isInWishlist = (productId) => wishlist.some((p) => p._id === productId);

  const toggleWishlist = async (productId) => {
    try {
      if (isInWishlist(productId)) {
        const res = await wishlistService.removeFromWishlist(productId);
        setWishlist(res.data.wishlist);
      } else {
        const res = await wishlistService.addToWishlist(productId);
        setWishlist(res.data.wishlist);
      }
      return { success: true };
    } catch (err) {
      return { success: false, message: getErrorMessage(err) };
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, isInWishlist, toggleWishlist, refreshWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
