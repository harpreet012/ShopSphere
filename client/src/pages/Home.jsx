import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProducts, fetchCategories } from '../services/productService';
import { getErrorMessage } from '../services/api';
import ProductCard from '../components/products/ProductCard';
import { ProductGridSkeleton } from '../components/common/Skeleton';
import { ErrorState, EmptyState } from '../components/common/States';
import { ChevronRight } from 'lucide-react';

const heroSlides = [
  { title: 'Big Electronics Sale', subtitle: 'Up to 40% off on headphones, TVs & more', color: 'from-blue-600 to-blue-400' },
  { title: 'Fashion Fiesta', subtitle: 'Trendy styles starting at ₹499', color: 'from-orange-500 to-amber-400' },
  { title: 'Home Essentials', subtitle: 'Upgrade your home for less', color: 'from-emerald-600 to-teal-400' }
];

const Section = ({ title, viewAllLink, children }) => (
  <section className="container-app py-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg md:text-xl font-bold text-gray-800">{title}</h2>
      {viewAllLink && (
        <Link to={viewAllLink} className="text-primary text-sm font-medium flex items-center hover:underline">
          View All <ChevronRight size={16} />
        </Link>
      )}
    </div>
    {children}
  </section>
);

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [trending, setTrending] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 4000);
    return () => clearInterval(t);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [featuredRes, newRes, bestRes, trendingRes, catRes] = await Promise.all([
        fetchProducts({ featured: 'true', limit: 8 }),
        fetchProducts({ sort: 'newest', limit: 8 }),
        fetchProducts({ sort: 'popularity', limit: 8 }),
        fetchProducts({ sort: 'rating', limit: 8 }),
        fetchCategories()
      ]);
      setFeatured(featuredRes.data.products);
      setNewArrivals(newRes.data.products);
      setBestSellers(bestRes.data.products);
      setTrending(trendingRes.data.products);
      setCategories(catRes.data.categories.filter((c) => c.isActive));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div>
      {/* Hero */}
      <div className={`bg-gradient-to-r ${heroSlides[slide].color} transition-colors duration-700`}>
        <div className="container-app py-10 md:py-16 text-white">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-2">{heroSlides[slide].title}</h1>
          <p className="text-sm md:text-lg opacity-90 mb-5">{heroSlides[slide].subtitle}</p>
          <Link to="/products" className="inline-block bg-white text-gray-900 font-semibold px-6 py-2.5 rounded-sm hover:bg-gray-100 transition-colors">
            Shop Now
          </Link>
        </div>
      </div>

      {/* Category cards */}
      {categories.length > 0 && (
        <section className="container-app py-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
            {categories.map((cat) => (
              <Link key={cat._id} to={`/products?category=${cat._id}`} className="card p-3 flex flex-col items-center text-center gap-2">
                <img
                  src={cat.image || '/category-placeholder.svg'}
                  alt={cat.name}
                  className="h-14 w-14 object-cover rounded-full"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/category-placeholder.svg';
                  }}
                />
                <span className="text-xs font-medium text-gray-700 line-clamp-1">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="container-app py-6">
          <ProductGridSkeleton count={8} />
        </div>
      ) : (
        <>
          {featured.length > 0 && (
            <Section title="Featured Products" viewAllLink="/products?featured=true">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {featured.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>
            </Section>
          )}

          {/* Promo banner */}
          <div className="container-app py-2">
            <div className="bg-gradient-to-r from-primary to-primary-dark rounded-lg p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl md:text-2xl font-bold mb-1">Free Shipping on Orders Above ₹999</h3>
                <p className="text-sm opacity-90">Shop more, save more — every single day.</p>
              </div>
              <Link to="/products" className="bg-accent hover:bg-accent-dark px-6 py-2.5 rounded-sm font-semibold shrink-0">
                Explore Deals
              </Link>
            </div>
          </div>

          {trending.length > 0 && (
            <Section title="Trending Now" viewAllLink="/products?sort=rating">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {trending.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>
            </Section>
          )}

          {newArrivals.length > 0 && (
            <Section title="New Arrivals" viewAllLink="/products?sort=newest">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {newArrivals.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>
            </Section>
          )}

          {bestSellers.length > 0 && (
            <Section title="Best Sellers" viewAllLink="/products?sort=popularity">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {bestSellers.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>
            </Section>
          )}

          {!featured.length && !trending.length && !newArrivals.length && !bestSellers.length && (
            <EmptyState title="No products yet" message="Run the seed script to populate the store with demo products." />
          )}
        </>
      )}
    </div>
  );
};

export default Home;