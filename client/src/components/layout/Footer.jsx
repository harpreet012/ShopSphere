import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useState } from 'react';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) setSubscribed(true);
  };

  return (
    <footer className="bg-[#172337] text-gray-300 mt-12">
      <div className="container-app py-10 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">ABOUT</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/" className="hover:text-white">Contact Us</Link></li>
            <li><Link to="/" className="hover:text-white">About ShopSphere</Link></li>
            <li><Link to="/" className="hover:text-white">Careers</Link></li>
            <li><Link to="/" className="hover:text-white">Press</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">HELP</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/orders" className="hover:text-white">Track Order</Link></li>
            <li><Link to="/" className="hover:text-white">Returns</Link></li>
            <li><Link to="/" className="hover:text-white">Shipping</Link></li>
            <li><Link to="/" className="hover:text-white">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">POLICY</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/" className="hover:text-white">Return Policy</Link></li>
            <li><Link to="/" className="hover:text-white">Terms of Use</Link></li>
            <li><Link to="/" className="hover:text-white">Privacy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">SHOP</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/products" className="hover:text-white">All Products</Link></li>
            <li><Link to="/products?sort=newest" className="hover:text-white">New Arrivals</Link></li>
            <li><Link to="/products?featured=true" className="hover:text-white">Featured</Link></li>
          </ul>
        </div>
        <div className="col-span-2 md:col-span-1">
          <h4 className="text-white font-semibold mb-3 text-sm">NEWSLETTER</h4>
          {subscribed ? (
            <p className="text-xs text-success">Thanks for subscribing!</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
              <div className="flex bg-white rounded-sm overflow-hidden">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  className="flex-1 px-3 py-1.5 text-xs text-gray-800 focus:outline-none"
                  aria-label="Newsletter email"
                />
                <button type="submit" className="px-3 bg-primary text-white" aria-label="Subscribe">
                  <Mail size={14} />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} ShopSphere. All rights reserved. Built for educational purposes.
      </div>
    </footer>
  );
};

export default Footer;
