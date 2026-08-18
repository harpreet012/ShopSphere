import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { fetchAddresses, addAddress } from '../services/addressService';
import { createOrder } from '../services/orderService';
import { getErrorMessage } from '../services/api';
import { formatPrice, finalPrice } from '../utils/format';
import Spinner from '../components/common/Spinner';
import { CreditCard, Wallet, Truck, Plus } from 'lucide-react';

const STEPS = ['Address', 'Payment', 'Review'];

const Checkout = () => {
  const { cart, emptyCart, refreshCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'India'
  });
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [processing, setProcessing] = useState(false);
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

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const res = await fetchAddresses();
      setAddresses(res.data.addresses);
      const def = res.data.addresses.find((a) => a.isDefault);
      if (def) setSelectedAddressId(def._id);
      else if (res.data.addresses.length) setSelectedAddressId(res.data.addresses[0]._id);
      else setShowAddForm(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (items.length === 0 && !placing) {
      navigate('/cart');
      return;
    }
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await addAddress(newAddress);
      setAddresses(res.data.addresses);
      const created = res.data.addresses[res.data.addresses.length - 1];
      setSelectedAddressId(created._id);
      setShowAddForm(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handlePlaceOrder = async () => {
    setError('');
    const address = addresses.find((a) => a._id === selectedAddressId);
    if (!address) {
      setError('Please select a shipping address');
      return;
    }
    setPlacing(true);

    if (paymentMethod !== 'COD') {
      setProcessing(true);
      await new Promise((resolve) => setTimeout(resolve, 1800));
      setProcessing(false);
    }

    try {
      const res = await createOrder({
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country
        },
        paymentMethod
      });
      await refreshCart();
      navigate(`/order-confirmation/${res.data.order._id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setPlacing(false);
    }
  };

  if (loading) return <Spinner full size="lg" />;

  return (
    <div className="container-app py-6 max-w-5xl">
      <div className="flex items-center justify-center gap-4 mb-8">
        {STEPS.map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${idx <= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
              {idx + 1}
            </div>
            <span className={`text-sm ${idx <= step ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{s}</span>
            {idx < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 text-danger text-sm px-3 py-2 rounded mb-4">{error}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {step === 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Select Shipping Address</h2>
              <div className="space-y-3 mb-4">
                {addresses.map((addr) => (
                  <label key={addr._id} className={`flex gap-3 p-3 border rounded cursor-pointer ${selectedAddressId === addr._id ? 'border-primary bg-primary-light/30' : 'border-gray-200'}`}>
                    <input type="radio" name="address" checked={selectedAddressId === addr._id} onChange={() => setSelectedAddressId(addr._id)} className="mt-1" />
                    <div className="text-sm">
                      <p className="font-medium text-gray-800">{addr.fullName} <span className="text-xs text-gray-500">({addr.label})</span></p>
                      <p className="text-gray-600">{addr.line1}, {addr.line2 ? `${addr.line2}, ` : ''}{addr.city}, {addr.state} - {addr.postalCode}</p>
                      <p className="text-gray-500">Phone: {addr.phone}</p>
                    </div>
                  </label>
                ))}
              </div>

              {showAddForm ? (
                <form onSubmit={handleAddAddress} className="border-t pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input required placeholder="Full Name" value={newAddress.fullName} onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })} className="input-field" />
                    <input required placeholder="Phone" value={newAddress.phone} onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })} className="input-field" />
                  </div>
                  <input required placeholder="Address Line 1" value={newAddress.line1} onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })} className="input-field" />
                  <input placeholder="Address Line 2 (optional)" value={newAddress.line2} onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })} className="input-field" />
                  <div className="grid grid-cols-3 gap-3">
                    <input required placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} className="input-field" />
                    <input required placeholder="State" value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} className="input-field" />
                    <input required placeholder="Postal Code" value={newAddress.postalCode} onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })} className="input-field" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-sm">Save Address</button>
                    {addresses.length > 0 && (
                      <button type="button" onClick={() => setShowAddForm(false)} className="btn-outline text-sm">Cancel</button>
                    )}
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                  <Plus size={15} /> Add New Address
                </button>
              )}

              <button onClick={() => setStep(1)} disabled={!selectedAddressId} className="btn-primary w-full mt-5 disabled:opacity-50">
                Continue to Payment
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Select Payment Method</h2>
              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer ${paymentMethod === 'COD' ? 'border-primary bg-primary-light/30' : 'border-gray-200'}`}>
                  <input type="radio" name="payment" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} />
                  <Truck size={18} className="text-gray-600" />
                  <span className="text-sm font-medium">Cash on Delivery</span>
                </label>
                <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer ${paymentMethod === 'CARD' ? 'border-primary bg-primary-light/30' : 'border-gray-200'}`}>
                  <input type="radio" name="payment" checked={paymentMethod === 'CARD'} onChange={() => setPaymentMethod('CARD')} />
                  <CreditCard size={18} className="text-gray-600" />
                  <span className="text-sm font-medium">Credit / Debit Card (Mock)</span>
                </label>
                <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer ${paymentMethod === 'UPI' ? 'border-primary bg-primary-light/30' : 'border-gray-200'}`}>
                  <input type="radio" name="payment" checked={paymentMethod === 'UPI'} onChange={() => setPaymentMethod('UPI')} />
                  <Wallet size={18} className="text-gray-600" />
                  <span className="text-sm font-medium">UPI (Mock)</span>
                </label>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setStep(0)} className="btn-outline flex-1">Back</button>
                <button onClick={() => setStep(2)} className="btn-primary flex-1">Review Order</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>
              <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.product._id} className="flex gap-3 text-sm">
                    <img src={item.product.images?.[0]} alt={item.product.name} className="h-14 w-14 object-contain bg-gray-50 rounded" />
                    <div className="flex-1">
                      <p className="text-gray-800 line-clamp-1">{item.product.name}</p>
                      <p className="text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-medium text-gray-800">{formatPrice(finalPrice(item.product.price, item.product.discount) * item.quantity)}</span>
                  </div>
                ))}
              </div>
              {processing ? (
                <div className="text-center py-6">
                  <Spinner size="lg" />
                  <p className="text-sm text-gray-600 mt-3">Processing payment...</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="btn-outline flex-1" disabled={placing}>Back</button>
                  <button onClick={handlePlaceOrder} disabled={placing} className="btn-accent flex-1">
                    {placing ? 'Placing Order...' : 'Place Order'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card p-5 h-fit">
          <h3 className="font-semibold text-gray-800 mb-4">Price Details</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span className="text-success">- {formatPrice(discount)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span className={shipping === 0 ? 'text-success' : ''}>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span></div>
            <div className="border-t pt-2 flex justify-between font-bold text-gray-900 text-base"><span>Total</span><span>{formatPrice(total)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
