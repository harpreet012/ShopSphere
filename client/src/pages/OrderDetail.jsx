import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchOrderById, cancelMyOrder } from '../services/orderService';
import { getErrorMessage } from '../services/api';
import { formatPrice, formatDateTime } from '../utils/format';
import Spinner from '../components/common/Spinner';
import { ErrorState } from '../components/common/States';
import OrderTracker from '../components/checkout/OrderTracker';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchOrderById(id);
      setOrder(res.data.order);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCancel = async () => {
    setCancelError('');
    setCancelling(true);
    try {
      await cancelMyOrder(id);
      await load();
    } catch (err) {
      setCancelError(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <Spinner full size="lg" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!order) return null;

  const canCancel = !['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'].includes(order.orderStatus);

  return (
    <div className="container-app py-6 max-w-4xl">
      <Link to="/orders" className="text-sm text-primary hover:underline mb-4 inline-block">← Back to My Orders</Link>

      <div className="card p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">{order.orderNumber}</h1>
          <p className="text-xs text-gray-500">Placed on {formatDateTime(order.createdAt)}</p>
        </div>
        {canCancel && (
          <div className="text-right">
            <button onClick={handleCancel} disabled={cancelling} className="btn-outline text-danger border-danger text-sm">
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
            {cancelError && <p className="text-xs text-danger mt-1">{cancelError}</p>}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Order Status</h3>
            <OrderTracker order={order} />
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Items</h3>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex gap-3 text-sm">
                  <img src={item.image} alt={item.name} className="h-14 w-14 object-contain bg-gray-50 rounded" />
                  <div className="flex-1">
                    <p className="text-gray-800">{item.name}</p>
                    <p className="text-gray-500">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                  </div>
                  <span className="font-medium text-gray-800">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Shipping Address</h3>
            <div className="text-sm text-gray-600 space-y-0.5">
              <p className="font-medium text-gray-800">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}</p>
              <p>{order.shippingAddress.country}</p>
              <p className="pt-1">Phone: {order.shippingAddress.phone}</p>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Payment</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Method: <span className="font-medium text-gray-800">{order.paymentMethod}</span></p>
              <p>Status: <span className="font-medium text-gray-800">{order.paymentStatus}</span></p>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Price Details</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span className="text-success">- {formatPrice(order.discount)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{order.shippingFee === 0 ? 'FREE' : formatPrice(order.shippingFee)}</span></div>
              <div className="border-t pt-2 flex justify-between font-bold text-gray-900"><span>Total</span><span>{formatPrice(order.totalAmount)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
