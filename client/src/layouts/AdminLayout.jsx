import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications } from '../services/adminService';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tag,
  ArrowLeft, Boxes, Activity, BarChart2, Bell, Menu, X
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin',            label: 'Overview',   icon: LayoutDashboard, end: true },
  { to: '/admin/inventory',  label: 'Inventory',  icon: Boxes },
  { to: '/admin/products',   label: 'Products',   icon: Package },
  { to: '/admin/orders',     label: 'Orders',     icon: ShoppingBag },
  { to: '/admin/users',      label: 'Users',      icon: Users },
  { to: '/admin/categories', label: 'Categories', icon: Tag },
  { to: '/admin/analytics',  label: 'Analytics',  icon: BarChart2 },
  { to: '/admin/activity',   label: 'Activity Log', icon: Activity },
];

const AdminLayout = () => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState({ total: 0, lowStock: 0, outOfStock: 0, pendingOrders: 0 });

  useEffect(() => {
    fetchNotifications()
      .then(r => setNotifications(r.data || {}))
      .catch(() => {});
  }, []);

  const Sidebar = () => (
    <aside className="w-60 bg-[#172337] text-gray-300 flex flex-col h-full">
      <div className="px-5 py-5 border-b border-white/10">
        <Link to="/" className="flex items-baseline gap-1">
          <span className="text-white text-lg font-extrabold">Shop</span>
          <span className="text-accent text-lg font-extrabold">Sphere</span>
        </Link>
        <p className="text-[11px] text-gray-400 mt-0.5">Admin Panel</p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const badge = item.to === '/admin/inventory'
            ? (notifications.lowStock + notifications.outOfStock) || 0
            : item.to === '/admin/orders' ? notifications.pendingOrders || 0 : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary/20 text-white border-r-2 border-primary' : 'hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                  {badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        {notifications.total > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-xs text-orange-300">
            <div className="flex items-center gap-1.5 mb-1"><Bell size={11} /> Alerts</div>
            {notifications.lowStock > 0 && <p>{notifications.lowStock} low stock</p>}
            {notifications.outOfStock > 0 && <p>{notifications.outOfStock} out of stock</p>}
            {notifications.pendingOrders > 0 && <p>{notifications.pendingOrders} pending orders</p>}
          </div>
        )}
        <p className="text-xs text-gray-500 truncate">{user?.name}</p>
        <Link to="/" className="flex items-center gap-2 text-xs text-gray-400 hover:text-white">
          <ArrowLeft size={14} /> Back to Store
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-muted flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-60 shrink-0">
        <div className="fixed top-0 left-0 w-60 h-screen flex flex-col">
          <Sidebar />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="w-60 flex flex-col">
            <Sidebar />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#172337] text-white">
          <button onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <span className="font-bold text-sm">ShopSphere Admin</span>
          {notifications.total > 0 && (
            <span className="bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {notifications.total}
            </span>
          )}
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
