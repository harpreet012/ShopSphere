import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchOrderById } from '../services/orderService';
import { getErrorMessage } from '../services/api';
import { formatPrice, formatDateTime } from '../utils/format';
import Spinner from '../components/common/Spinner';
import { ErrorState } from '../components/common/States';
import { CheckCircle2 } from 'lucide-react';

const OrderConfirmation = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) return <Spinner full size="lg" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!order) return null;

  return (
    <div className="container-app py-10 max-w-2xl">
      <div className="card p-6 md:p-8 text-center mb-6">
        <CheckCircle2 size={64} className="text-success mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Order Placed Successfully!</h1>
        <p className="text-gray-500 text-sm mb-4">Thank you for shopping with ShopSphere.</p>
        <div className="bg-muted rounded p-4 inline-block text-left">
          <p className="text-sm text-gray-600">Order Number: <span className="font-semibold text-gray-800">{order.orderNumber}</span></p>
          <p className="text-sm text-gray-600">Placed on: <span className="font-medium text-gray-800">{formatDateTime(order.createdAt)}</span></p>
          <p className="text-sm text-gray-600">Payment Method: <span className="font-medium text-gray-800">{order.paymentMethod}</span></p>
          <p className="text-sm text-gray-600">Payment Status: <span className="font-medium text-gray-800">{order.paymentStatus}</span></p>
          <p className="text-sm text-gray-600">Total: <span className="font-bold text-gray-900">{formatPrice(order.totalAmount)}</span></p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link to={`/orders/${order._id}`} className="btn-primary flex-1 text-center">Track Order</Link>
        <Link to="/products" className="btn-outline flex-1 text-center">Continue Shopping</Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;
