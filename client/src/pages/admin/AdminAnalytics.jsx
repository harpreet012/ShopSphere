import { useEffect, useState, useCallback } from 'react';
import {
  fetchRevenueOverTime, fetchSalesByCategory, fetchTopProducts,
  fetchTopCustomers, fetchOrderStatusDistribution, fetchPaymentDistribution
} from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { formatPrice } from '../../utils/format';
import Spinner from '../../components/common/Spinner';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#2874F0','#FF9F00','#388e3c','#ff6161','#8b5cf6','#06b6d4','#f59e0b','#ec4899'];

const AdminAnalytics = () => {
  const [revenue, setRevenue]         = useState([]);
  const [catSales, setCatSales]       = useState([]);
  const [topProds, setTopProds]       = useState([]);
  const [topCusts, setTopCusts]       = useState([]);
  const [statusDist, setStatusDist]   = useState([]);
  const [payDist, setPayDist]         = useState([]);
  const [range, setRange]             = useState('30d');
  const [loading, setLoading]         = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rev, cat, top, cust, status, pay] = await Promise.all([
        fetchRevenueOverTime(range), fetchSalesByCategory(),
        fetchTopProducts(10), fetchTopCustomers(10),
        fetchOrderStatusDistribution(), fetchPaymentDistribution()
      ]);
      setRevenue(rev.data.series || []);
      setCatSales(cat.data.categories || []);
      setTopProds(top.data.products || []);
      setTopCusts(cust.data.customers || []);
      setStatusDist(status.data.distribution || []);
      setPayDist(pay.data.distribution || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner full size="lg" />;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Sales Analytics</h1>
          <p className="text-xs text-gray-500 mt-0.5">Revenue, orders, and customer insights</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[['7d','7 days'],['30d','30 days'],['month','This month']].map(([v,l]) => (
            <button key={v} onClick={() => setRange(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${range === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Revenue</h3>
          {revenue.length === 0 ? <p className="text-sm text-gray-400 py-10 text-center">No data.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => formatPrice(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#2874F0" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Orders</h3>
          {revenue.length === 0 ? <p className="text-sm text-gray-400 py-10 text-center">No data.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="orders" fill="#FF9F00" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Sales by Category</h3>
          {catSales.length === 0 ? <p className="text-sm text-gray-400 py-10 text-center">No data.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={catSales} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {catSales.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatPrice(v)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Order Status</h3>
          {statusDist.length === 0 ? <p className="text-sm text-gray-400 py-10 text-center">No data.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDist} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80}>
                  {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Products Table */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Top 10 Selling Products</h3>
        {topProds.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No sales data.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Product</th>
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-left px-3 py-2">Units Sold</th>
                  <th className="text-left px-3 py-2">Revenue</th>
                  <th className="text-left px-3 py-2">Stock</th>
                </tr>
              </thead>
              <tbody>
                {topProds.map((p, i) => (
                  <tr key={p._id} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-400">{i+1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img src={p.image} alt={p.name} className="h-7 w-7 object-contain bg-gray-50 rounded" />
                        <span className="text-gray-800 line-clamp-1 max-w-[200px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{p.category}</td>
                    <td className="px-3 py-2 font-medium">{p.unitsSold}</td>
                    <td className="px-3 py-2">{formatPrice(p.revenue)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${p.status === 'OUT_OF_STOCK' ? 'bg-red-50 text-red-600' : p.status === 'LOW_STOCK' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                        {p.stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Customers Table */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Top Customers</h3>
        {topCusts.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No customers yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Customer</th>
                  <th className="text-left px-3 py-2">Orders</th>
                  <th className="text-left px-3 py-2">Total Spent</th>
                  <th className="text-left px-3 py-2">Avg Order</th>
                  <th className="text-left px-3 py-2">Last Order</th>
                </tr>
              </thead>
              <tbody>
                {topCusts.map((c, i) => (
                  <tr key={c._id} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-400">{i+1}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="px-3 py-2">{c.orderCount}</td>
                    <td className="px-3 py-2 font-medium">{formatPrice(c.totalSpent)}</td>
                    <td className="px-3 py-2">{formatPrice(c.avgOrder)}</td>
                    <td className="px-3 py-2 text-gray-400">{new Date(c.lastOrder).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
