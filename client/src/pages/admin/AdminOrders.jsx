import { useEffect, useState } from 'react';
import { fetchAllOrders, updateOrderStatus } from '../../services/orderService';
import { getErrorMessage } from '../../services/api';
import { formatPrice, formatDate } from '../../utils/format';
import Spinner from '../../components/common/Spinner';
import { ErrorState, EmptyState } from '../../components/common/States';
import { ShoppingBag } from 'lucide-react';

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const load = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAllOrders({ search: search || undefined, status: statusFilter || undefined, page, limit: 20 });
      setOrders(res.data.orders);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const handleStatusChange = async (orderId, field, value) => {
    setUpdatingId(orderId);
    setError('');
    try {
      const payload = field === 'orderStatus' ? { orderStatus: value } : { paymentStatus: value };
      await updateOrderStatus(orderId, payload);
      load(pagination.page);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-5">Manage Orders</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order number..." className="input-field max-w-xs" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field max-w-xs">
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 text-danger text-sm px-3 py-2 rounded mb-4">{error}</div>}

      {loading ? (
        <Spinner full size="lg" />
      ) : orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders found" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Order Status</th>
                <th className="text-left px-4 py-3">Payment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-800">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{o.user?.name}<br /><span className="text-xs text-gray-400">{o.user?.email}</span></td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{formatPrice(o.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={o.orderStatus}
                      disabled={updatingId === o._id}
                      onChange={(e) => handleStatusChange(o._id, 'orderStatus', e.target.value)}
                      className="input-field text-xs py-1.5"
                    >
                      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={o.paymentStatus}
                      disabled={updatingId === o._id}
                      onChange={(e) => handleStatusChange(o._id, 'paymentStatus', e.target.value)}
                      className="input-field text-xs py-1.5"
                    >
                      {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button onClick={() => load(pagination.page - 1)} disabled={pagination.page <= 1} className="btn-outline text-sm py-1.5 px-3 disabled:opacity-40">Prev</button>
          <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
          <button onClick={() => load(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="btn-outline text-sm py-1.5 px-3 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
