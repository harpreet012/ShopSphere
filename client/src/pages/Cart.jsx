import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { formatPrice, finalPrice } from '../utils/format';
import { EmptyState } from '../components/common/States';
import Spinner from '../components/common/Spinner';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

const Cart = () => {
  const { cart, loading, updateItem, removeItem, emptyCart } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const items = cart.items || [];

  const subtotal = items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0);
  const discount = items.reduce((sum, i) => {
    const fp = finalPrice(i.product?.price || 0, i.product?.discount || 0);
    return sum + ((i.product?.price || 0) - fp) * i.quantity;
  }, 0);
  const afterDiscount = subtotal - discount;
  const shipping = afterDiscount >= 999 || afterDiscount === 0 ? 0 : 49;
  const total = afterDiscount + shipping;

  const handleQuantityChange = async (productId, newQty, stock) => {
    setError('');
    if (newQty < 1) return;
    if (newQty > stock) {
      setError(`Only ${stock} unit(s) available in stock`);
      return;
    }
    const res = await updateItem(productId, newQty);
    if (!res.success) setError(res.message);
  };

  if (loading) return <Spinner full size="lg" />;

  if (items.length === 0) {
    return (
      <div className="container-app">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          message="Looks like you haven't added anything to your cart yet."
          action={
            <Link to="/products" className="btn-primary">
              Start Shopping
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-app py-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Shopping Cart ({items.length} items)</h1>

      {error && <div className="bg-red-50 text-danger text-sm px-3 py-2 rounded mb-4">{error}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const product = item.product;
            if (!product) return null;
            const fp = finalPrice(product.price, product.discount);
            return (
              <div key={product._id} className="card p-4 flex gap-4">
                <Link to={`/products/${product._id}`} className="h-20 w-20 shrink-0 bg-gray-50 rounded overflow-hidden flex items-center justify-center">
                  <img src={product.images?.[0]} alt={product.name} className="object-contain h-full w-full" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${product._id}`} className="text-sm font-medium text-gray-800 hover:text-primary line-clamp-2">
                    {product.name}
                  </Link>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-bold text-gray-900">{formatPrice(fp)}</span>
                    {product.discount > 0 && <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-gray-300 rounded">
                      <button onClick={() => handleQuantityChange(product._id, item.quantity - 1, product.stock)} className="p-1.5 hover:bg-muted" aria-label="Decrease quantity">
                        <Minus size={12} />
                      </button>
                      <span className="px-3 text-sm">{item.quantity}</span>
                      <button onClick={() => handleQuantityChange(product._id, item.quantity + 1, product.stock)} className="p-1.5 hover:bg-muted" aria-label="Increase quantity">
                        <Plus size={12} />
                      </button>
                    </div>
                    <button onClick={() => removeItem(product._id)} className="text-gray-400 hover:text-danger flex items-center gap-1 text-xs" aria-label="Remove item">
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={emptyCart} className="text-sm text-danger hover:underline">
            Clear Cart
          </button>
        </div>

        <div className="card p-5 h-fit">
          <h3 className="font-semibold text-gray-800 mb-4">Price Details</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Price ({items.length} items)</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span className="text-success">- {formatPrice(discount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className={shipping === 0 ? 'text-success' : ''}>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-gray-900 text-base">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          <button onClick={() => navigate('/checkout')} className="btn-primary w-full mt-5">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
