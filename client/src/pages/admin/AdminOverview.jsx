import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchOverview, fetchRevenueOverTime, fetchSalesByCategory,
  fetchTopProducts, fetchOrderStatusDistribution, downloadOrdersCSV
} from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { formatPrice } from '../../utils/format';
import Spinner from '../../components/common/Spinner';
import { ErrorState } from '../../components/common/States';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
  IndianRupee, ShoppingBag, Users, Package, AlertTriangle, Clock,
  TrendingUp, CheckCircle, XCircle, Activity, Download, ArrowRight
} from 'lucide-react';

const COLORS = ['#2874F0','#FF9F00','#388e3c','#ff6161','#8b5cf6','#06b6d4','#f59e0b','#ec4899'];

const KPICard = ({ icon: Icon, label, value, sub, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600', orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600', red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600', cyan: 'bg-cyan-50 text-cyan-600'
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
};

const AdminOverview = () => {
  const [data, setData]         = useState(null);
  const [revenue, setRevenue]   = useState([]);
  const [catSales, setCatSales] = useState([]);
  const [topProds, setTopProds] = useState([]);
  const [statusDist, setStatusDist] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [range, setRange]       = useState('30d');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [ov, rev, cat, top, status] = await Promise.all([
        fetchOverview(), fetchRevenueOverTime(range), fetchSalesByCategory(),
        fetchTopProducts(8), fetchOrderStatusDistribution()
      ]);
      setData(ov.data);
      setRevenue(rev.data.series || []);
      setCatSales(cat.data.categories || []);
      setTopProds(top.data.products || []);
      setStatusDist(status.data.distribution || []);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    try {
      const res = await downloadOrdersCSV();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'orders.csv'; a.click();
    } catch { /* ignore */ }
  };

  if (loading) return <Spinner full size="lg" />;
  if (error)   return <ErrorState message={error} onRetry={load} />;
  const k = data?.kpis || {};

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">ShopSphere operations overview</p>
        </div>
        <button onClick={handleExport} className="btn-outline text-xs flex items-center gap-1.5 py-1.5 px-3">
          <Download size={13} /> Export Orders
        </button>
      </div>

      {/* Revenue KPIs */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Revenue</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard icon={IndianRupee} label="Total Revenue"      value={formatPrice(k.totalRevenue)} color="blue" />
          <KPICard icon={TrendingUp}  label="Today"              value={formatPrice(k.todayRevenue)} color="green" />
          <KPICard icon={TrendingUp}  label="This Week"          value={formatPrice(k.weekRevenue)} color="purple" />
          <KPICard icon={TrendingUp}  label="This Month"         value={formatPrice(k.monthRevenue)} color="orange" />
        </div>
      </div>

      {/* Orders KPIs */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Orders</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard icon={ShoppingBag}  label="Total Orders"   value={k.totalOrders}    color="blue" />
          <KPICard icon={Clock}        label="Today's Orders" value={k.todayOrders}    color="cyan" />
          <KPICard icon={AlertTriangle} label="Pending"       value={k.pendingOrders}  color="orange" />
          <KPICard icon={CheckCircle}  label="Delivered"      value={k.deliveredOrders} color="green" />
        </div>
      </div>

      {/* Inventory & Users KPIs */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Inventory & Users</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <KPICard icon={Users}        label="Customers"        value={k.totalCustomers}      color="blue" />
          <KPICard icon={Package}      label="Total Products"   value={k.totalProducts}       color="purple" />
          <KPICard icon={CheckCircle}  label="Active"           value={k.activeProducts}      color="green" />
          <KPICard icon={XCircle}      label="Inactive"         value={k.inactiveProducts}    color="red" />
          <KPICard icon={Package}      label="Total Units"      value={k.totalInventoryUnits?.toLocaleString()} color="cyan" />
          <KPICard icon={AlertTriangle} label="Low Stock"       value={k.lowStockCount}       color="orange" />
          <KPICard icon={XCircle}      label="Out of Stock"     value={k.outOfStockCount}     color="red" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 text-sm">Revenue Over Time</h3>
            <div className="flex gap-1">
              {['7d','30d','month'].map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className={`text-xs px-2 py-0.5 rounded ${range === r ? 'bg-primary text-white' : 'bg-muted text-gray-500'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          {revenue.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No data yet.</p>
            : <ResponsiveContainer width="100%" height={220}>
                <LineChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => formatPrice(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="#2874F0" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
          }
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Orders Over Time</h3>
          {revenue.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No data yet.</p>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#FF9F00" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Sales by Category</h3>
          {catSales.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No sales yet.</p>
            : <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={catSales} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name }) => name}>
                    {catSales.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => formatPrice(v)} />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Order Status Distribution</h3>
          {statusDist.length === 0
            ? <p className="text-sm text-gray-400 py-10 text-center">No orders yet.</p>
            : <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusDist} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75} label={({ status }) => status}>
                    {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Top Products & Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 text-sm">Top Products</h3>
            <Link to="/admin/inventory" className="text-xs text-primary flex items-center gap-1 hover:underline">
              View Inventory <ArrowRight size={12} />
            </Link>
          </div>
          {topProds.length === 0
            ? <p className="text-sm text-gray-400 py-6 text-center">No sales yet.</p>
            : <div className="space-y-2.5">
                {topProds.slice(0, 6).map((p, i) => (
                  <div key={p._id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">{i+1}</span>
                    <img src={p.image} alt={p.name} className="h-8 w-8 object-contain bg-gray-50 rounded flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 line-clamp-1">{p.name}</p>
                      <p className="text-[11px] text-gray-500">{p.unitsSold} sold · {formatPrice(p.revenue)}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      p.status === 'OUT_OF_STOCK' ? 'bg-red-50 text-red-600' :
                      p.status === 'LOW_STOCK'    ? 'bg-orange-50 text-orange-600' :
                      'bg-green-50 text-green-600'}`}>
                      {p.stock}
                    </span>
                  </div>
                ))}
              </div>
          }
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 text-sm">Recent Activity</h3>
            <Link to="/admin/activity" className="text-xs text-primary flex items-center gap-1 hover:underline">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          {(data?.recentActivity || []).length === 0
            ? <p className="text-sm text-gray-400 py-6 text-center">No activity yet.</p>
            : <div className="space-y-2.5">
                {(data.recentActivity || []).slice(0, 6).map((log) => (
                  <div key={log._id} className="flex items-start gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity size={10} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-800 line-clamp-1">
                        <span className="font-medium">{log.adminName}</span> · {log.action.replace(/_/g,' ')}
                      </p>
                      <p className="text-[11px] text-gray-400">{log.entityName} · {new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 text-sm">Recent Orders</h3>
          <Link to="/admin/orders" className="text-xs text-primary flex items-center gap-1 hover:underline">
            View All <ArrowRight size={12} />
          </Link>
        </div>
        {(data?.recentOrders || []).length === 0
          ? <p className="text-sm text-gray-400 py-4 text-center">No orders yet.</p>
          : <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted text-gray-500 uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Order</th>
                    <th className="text-left px-3 py-2">Customer</th>
                    <th className="text-left px-3 py-2">Total</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.recentOrders || []).map(o => (
                    <tr key={o._id} className="border-t border-gray-100 hover:bg-muted/50">
                      <td className="px-3 py-2 font-medium text-primary">{o.orderNumber}</td>
                      <td className="px-3 py-2 text-gray-700">{o.user?.name || 'Guest'}</td>
                      <td className="px-3 py-2">{formatPrice(o.totalAmount)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          o.orderStatus === 'Delivered' ? 'bg-green-50 text-green-700' :
                          o.orderStatus === 'Cancelled' ? 'bg-red-50 text-red-700' :
                          'bg-orange-50 text-orange-700'}`}>{o.orderStatus}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </div>
  );
};

export default AdminOverview;
