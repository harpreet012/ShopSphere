import { useEffect, useState, useCallback } from 'react';
import {
  fetchAllUsers, updateUserRole, toggleUserStatus,
  fetchUserActivity, fetchUserOrders, downloadCustomersCSV
} from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { formatDate, formatPrice } from '../../utils/format';
import Spinner from '../../components/common/Spinner';
import { EmptyState } from '../../components/common/States';
import { useAuth } from '../../context/AuthContext';
import { Users, X, Download, ShoppingBag } from 'lucide-react';

const STATUS_COLORS = {
  Delivered:        'bg-green-50 text-green-700',
  Cancelled:        'bg-red-50 text-red-700',
  Pending:          'bg-orange-50 text-orange-600',
  Confirmed:        'bg-blue-50 text-blue-700',
  Processing:       'bg-purple-50 text-purple-700',
  Shipped:          'bg-cyan-50 text-cyan-700',
  'Out for Delivery': 'bg-indigo-50 text-indigo-700',
};

// Customer activity drawer
const ActivityDrawer = ({ userId, onClose }) => {
  const [data, setData]       = useState(null);
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchUserActivity(userId), fetchUserOrders(userId, { limit: 10 })])
      .then(([act, ord]) => {
        setData(act.data);
        setOrders(ord.data.orders || []);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-800">Customer Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {loading ? <Spinner full size="md" /> : !data ? (
          <p className="text-sm text-gray-400 text-center py-10">Failed to load.</p>
        ) : (
          <div className="p-5 space-y-5">
            {/* Profile */}
            <div className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base">
                  {data.user.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{data.user.name}</p>
                  <p className="text-sm text-gray-500">{data.user.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${data.user.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {data.user.isActive ? 'Active' : 'Disabled'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {data.user.role}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">Joined {formatDate(data.user.createdAt)}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Total Orders', data.stats.totalOrders],
                ['Total Spent', formatPrice(data.stats.totalSpent)],
                ['Avg Order', formatPrice(data.stats.avgOrderValue)],
                ['Reviews', data.stats.reviewCount],
                ['Wishlist', data.stats.wishlistCount],
                ['Cart Items', data.stats.cartItemCount],
              ].map(([label, val]) => (
                <div key={label} className="card p-3 text-center">
                  <p className="text-base font-bold text-gray-800">{val}</p>
                  <p className="text-[11px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Recent orders */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <ShoppingBag size={14} /> Recent Orders
              </h3>
              {orders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {orders.map(o => (
                    <div key={o._id} className="border border-gray-100 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{o.orderNumber}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[o.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {o.orderStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-gray-500 text-xs">{formatDate(o.createdAt)}</span>
                        <span className="font-medium text-gray-800">{formatPrice(o.totalAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers]         = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true); setError('');
    try {
      const res = await fetchAllUsers({ search: search || undefined, page, limit: 20 });
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(1); }, [load]);

  const handleRoleChange = async (id, role) => {
    setUpdatingId(id); setError('');
    try { await updateUserRole(id, role); load(pagination.page); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setUpdatingId(null); }
  };

  const handleToggleStatus = async (id) => {
    setUpdatingId(id); setError('');
    try { await toggleUserStatus(id); load(pagination.page); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setUpdatingId(null); }
  };

  const handleExport = async () => {
    try {
      const res = await downloadCustomersCSV();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'customers.csv'; a.click();
    } catch { /* ignore */ }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">Manage Users</h1>
        <button onClick={handleExport} className="btn-outline text-xs flex items-center gap-1.5 py-1.5 px-3">
          <Download size={13} /> Export CSV
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or email…" className="input-field max-w-sm mb-4" />

      {error && <div className="bg-red-50 text-danger text-sm px-3 py-2 rounded mb-4">{error}</div>}

      {loading ? <Spinner full size="lg" /> : users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Activity</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="border-t border-gray-100 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <select value={u.role} disabled={updatingId === u._id || u._id === currentUser._id}
                      onChange={e => handleRoleChange(u._id, e.target.value)}
                      className="input-field text-xs py-1.5">
                      <option value="customer">Customer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleStatus(u._id)}
                      disabled={updatingId === u._id || u._id === currentUser._id}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.isActive ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'}`}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedUser(u._id)}
                      className="text-xs text-primary hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button onClick={() => load(pagination.page - 1)} disabled={pagination.page <= 1}
            className="btn-outline text-sm py-1.5 px-3 disabled:opacity-40">Prev</button>
          <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
          <button onClick={() => load(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
            className="btn-outline text-sm py-1.5 px-3 disabled:opacity-40">Next</button>
        </div>
      )}

      {selectedUser && <ActivityDrawer userId={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
};

export default AdminUsers;
