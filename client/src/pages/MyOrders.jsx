import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyOrders } from '../services/orderService';
import { getErrorMessage } from '../services/api';
import { formatPrice, formatDate } from '../utils/format';
import Spinner from '../components/common/Spinner';
import { ErrorState, EmptyState } from '../components/common/States';
import { Package } from 'lucide-react';

const statusColor = (status) => {
  if (status === 'Delivered') return 'text-success';
  if (status === 'Cancelled') return 'text-danger';
  return 'text-primary';
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchMyOrders();
      setOrders(res.data.orders);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Spinner full size="lg" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  if (orders.length === 0) {
    return (
      <div className="container-app">
        <EmptyState
          icon={Package}
          title="No orders yet"
          message="Once you place an order, it will show up here."
          action={<Link to="/products" className="btn-primary">Start Shopping</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container-app py-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">My Orders</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <Link key={order._id} to={`/orders/${order._id}`} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">{order.orderNumber}</p>
              <p className="text-xs text-gray-500">Placed on {formatDate(order.createdAt)} • {order.items.length} item(s)</p>
            </div>
            <div className="flex items-center gap-6">
              <span className={`text-sm font-medium ${statusColor(order.orderStatus)}`}>{order.orderStatus}</span>
              <span className="font-bold text-gray-900">{formatPrice(order.totalAmount)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MyOrders;
