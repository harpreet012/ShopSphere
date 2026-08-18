import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, Menu, X, LogOut, Package, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const Navbar = () => {
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/products?search=${encodeURIComponent(query)}`);
    setMobileOpen(false);
  };

  return (
    <header className="bg-primary sticky top-0 z-40 shadow-md">
      <div className="container-app py-2.5 flex items-center gap-4">
        <Link to="/" className="flex items-baseline gap-1 shrink-0">
          <span className="text-white text-2xl font-extrabold tracking-tight">Shop</span>
          <span className="text-accent text-2xl font-extrabold tracking-tight">Sphere</span>
        </Link>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl">
          <div className="flex w-full bg-white rounded-sm overflow-hidden">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products, brands and more"
              className="flex-1 px-4 py-2 text-sm text-gray-800 focus:outline-none"
              aria-label="Search products"
            />
            <button type="submit" className="px-4 text-primary bg-white hover:bg-gray-50" aria-label="Search">
              <Search size={18} />
            </button>
          </div>
        </form>

        <div className="hidden md:flex items-center gap-6 ml-auto">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-1.5 text-white font-medium text-sm hover:text-white/90"
              >
                <User size={18} /> {user.name.split(' ')[0]}
              </button>
              {profileOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white rounded shadow-lg py-1 text-sm text-gray-700"
                  onMouseLeave={() => setProfileOpen(false)}
                >
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-2 px-4 py-2 hover:bg-muted" onClick={() => setProfileOpen(false)}>
                      <LayoutDashboard size={15} /> Admin Dashboard
                    </Link>
                  )}
                  <Link to="/profile" className="flex items-center gap-2 px-4 py-2 hover:bg-muted" onClick={() => setProfileOpen(false)}>
                    <User size={15} /> My Profile
                  </Link>
                  <Link to="/orders" className="flex items-center gap-2 px-4 py-2 hover:bg-muted" onClick={() => setProfileOpen(false)}>
                    <Package size={15} /> My Orders
                  </Link>
                  <Link to="/wishlist" className="flex items-center gap-2 px-4 py-2 hover:bg-muted" onClick={() => setProfileOpen(false)}>
                    <Heart size={15} /> Wishlist
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setProfileOpen(false);
                      navigate('/');
                    }}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-muted w-full text-left text-danger"
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="bg-white text-primary font-medium text-sm px-6 py-1.5 rounded-sm hover:bg-gray-50">
              Login
            </Link>
          )}

          <Link to="/wishlist" className="text-white flex items-center gap-1.5 text-sm font-medium">
            <Heart size={20} /> Wishlist
          </Link>

          <Link to="/cart" className="relative text-white flex items-center gap-1.5 text-sm font-medium">
            <ShoppingCart size={20} />
            Cart
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-accent text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>

        <button className="md:hidden ml-auto text-white" onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-primary-dark px-4 pb-3 pt-1 space-y-3">
          <form onSubmit={handleSearch} className="flex bg-white rounded-sm overflow-hidden">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              className="flex-1 px-3 py-2 text-sm focus:outline-none"
            />
            <button type="submit" className="px-3 text-primary">
              <Search size={18} />
            </button>
          </form>
          <div className="flex flex-col gap-1 text-white text-sm font-medium">
            <Link to="/cart" onClick={() => setMobileOpen(false)} className="py-2 border-b border-white/10 flex items-center gap-2">
              <ShoppingCart size={16} /> Cart ({itemCount})
            </Link>
            <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="py-2 border-b border-white/10 flex items-center gap-2">
              <Heart size={16} /> Wishlist
            </Link>
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)} className="py-2 border-b border-white/10 flex items-center gap-2">
                    <LayoutDashboard size={16} /> Admin Dashboard
                  </Link>
                )}
                <Link to="/profile" onClick={() => setMobileOpen(false)} className="py-2 border-b border-white/10 flex items-center gap-2">
                  <User size={16} /> My Profile
                </Link>
                <Link to="/orders" onClick={() => setMobileOpen(false)} className="py-2 border-b border-white/10 flex items-center gap-2">
                  <Package size={16} /> My Orders
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                    navigate('/');
                  }}
                  className="py-2 flex items-center gap-2 text-left"
                >
                  <LogOut size={16} /> Logout
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="py-2 flex items-center gap-2">
                <User size={16} /> Login / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
