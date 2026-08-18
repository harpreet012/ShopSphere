import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { moveWishlistToCart } from '../services/wishlistService';
import { formatPrice, finalPrice } from '../utils/format';
import { EmptyState } from '../components/common/States';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';

const Wishlist = () => {
  const { wishlist, toggleWishlist, refreshWishlist } = useWishlist();
  const { refreshCart } = useCart();
  const [error, setError] = useState('');
  const [movingId, setMovingId] = useState(null);

  const handleMoveToCart = async (productId) => {
    setError('');
    setMovingId(productId);
    try {
      await moveWishlistToCart(productId);
      await refreshWishlist();
      await refreshCart();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not move item to cart');
    } finally {
      setMovingId(null);
    }
  };

  if (!wishlist.length) {
    return (
      <div className="container-app">
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          message="Save items you love here so you never lose track of them."
          action={
            <Link to="/products" className="btn-primary">
              Browse Products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-app py-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">My Wishlist ({wishlist.length})</h1>
      {error && <div className="bg-red-50 text-danger text-sm px-3 py-2 rounded mb-4">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {wishlist.map((product) => {
          const fp = finalPrice(product.price, product.discount);
          const outOfStock = product.stock <= 0;
          return (
            <div key={product._id} className="card p-3 flex flex-col">
              <Link to={`/products/${product._id}`} className="bg-gray-50 rounded h-36 mb-2 flex items-center justify-center overflow-hidden">
                <img src={product.images?.[0]} alt={product.name} className="object-contain h-full w-full" />
              </Link>
              <Link to={`/products/${product._id}`} className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">
                {product.name}
              </Link>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-bold text-gray-900">{formatPrice(fp)}</span>
                {product.discount > 0 && <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>}
              </div>
              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => handleMoveToCart(product._id)}
                  disabled={outOfStock || movingId === product._id}
                  className="btn-accent flex-1 text-xs py-1.5 flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <ShoppingCart size={13} /> {outOfStock ? 'Out of Stock' : 'Move to Cart'}
                </button>
                <button onClick={() => toggleWishlist(product._id)} className="border border-gray-300 rounded px-2 hover:text-danger" aria-label="Remove from wishlist">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Wishlist;
