import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchProducts, fetchCategories } from '../services/productService';
import { getErrorMessage } from '../services/api';
import ProductCard from '../components/products/ProductCard';
import ProductFilters from '../components/products/ProductFilters';
import { ProductGridSkeleton } from '../components/common/Skeleton';
import { ErrorState, EmptyState } from '../components/common/States';
import useDebounce from '../hooks/useDebounce';
import { SlidersHorizontal, X } from 'lucide-react';

const SORT_OPTIONS = [
  { value: '', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
  { value: 'rating', label: 'Customer Rating' },
  { value: 'popularity', label: 'Popularity' }
];

const ProductListing = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minRating: searchParams.get('minRating') || '',
    inStock: searchParams.get('inStock') || '',
    sort: searchParams.get('sort') || '',
    featured: searchParams.get('featured') || '',
    page: Number(searchParams.get('page')) || 1
  });

  const debouncedSearch = useDebounce(filters.search, 400);

  useEffect(() => {
    fetchCategories()
      .then((res) => setCategories(res.data.categories.filter((c) => c.isActive)))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setFilters((f) => ({
      search: searchParams.get('search') || f.search,
      category: searchParams.get('category') || '',
      minPrice: '',
      maxPrice: '',
      minRating: '',
      inStock: '',
      sort: searchParams.get('sort') || '',
      featured: searchParams.get('featured') || '',
      page: 1
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        search: debouncedSearch || undefined,
        category: filters.category || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        minRating: filters.minRating || undefined,
        inStock: filters.inStock || undefined,
        sort: filters.sort || undefined,
        featured: filters.featured || undefined,
        page: filters.page,
        limit: 12
      };
      const res = await fetchProducts(params);
      setProducts(res.data.products);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    filters.category,
    filters.minPrice,
    filters.maxPrice,
    filters.minRating,
    filters.inStock,
    filters.sort,
    filters.featured,
    filters.page
  ]);

  const goToPage = (p) => {
    if (p < 1 || p > pagination.totalPages) return;
    setFilters((f) => ({ ...f, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container-app py-6">
      <div className="mb-4">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
          placeholder="Search products..."
          className="input-field max-w-md"
          aria-label="Search products"
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{pagination.total} products found</p>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowMobileFilters(true)} className="md:hidden flex items-center gap-1 text-sm border border-gray-300 rounded px-3 py-1.5">
            <SlidersHorizontal size={14} /> Filters
          </button>
          <select
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
            className="input-field text-sm py-1.5 w-auto"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="hidden md:block w-64 shrink-0">
          <ProductFilters categories={categories} filters={filters} setFilters={setFilters} />
        </aside>

        {showMobileFilters && (
          <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setShowMobileFilters(false)}>
            <div className="bg-white w-4/5 h-full p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Filters</h3>
                <button onClick={() => setShowMobileFilters(false)}><X size={20} /></button>
              </div>
              <ProductFilters categories={categories} filters={filters} setFilters={setFilters} mobile />
            </div>
          </div>
        )}

        <div className="flex-1">
          {error ? (
            <ErrorState message={error} onRetry={loadProducts} />
          ) : loading ? (
            <ProductGridSkeleton count={12} />
          ) : products.length === 0 ? (
            <EmptyState title="No products found" message="Try adjusting your filters or search terms." />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1} className="btn-outline text-sm py-1.5 px-3 disabled:opacity-40">
                    Prev
                  </button>
                  <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
                  <button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="btn-outline text-sm py-1.5 px-3 disabled:opacity-40">
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListing;
