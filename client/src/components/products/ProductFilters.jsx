const RATINGS = [4, 3, 2, 1];

const ProductFilters = ({ categories, filters, setFilters, mobile = false }) => {
  const update = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  return (
    <div className={mobile ? '' : 'card p-4 sticky top-32'}>
      <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">Filters</h3>

      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Category</h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="radio" name="category" checked={!filters.category} onChange={() => update('category', '')} />
            All Categories
          </label>
          {categories.map((cat) => (
            <label key={cat._id} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="radio" name="category" checked={filters.category === cat._id} onChange={() => update('category', cat._id)} />
              {cat.name}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Price Range</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => update('minPrice', e.target.value)}
            className="input-field text-xs py-1.5"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => update('maxPrice', e.target.value)}
            className="input-field text-xs py-1.5"
          />
        </div>
      </div>

      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Minimum Rating</h4>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="radio" name="rating" checked={!filters.minRating} onChange={() => update('minRating', '')} />
            Any Rating
          </label>
          {RATINGS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="radio" name="rating" checked={filters.minRating === String(r)} onChange={() => update('minRating', String(r))} />
              {r}★ & above
            </label>
          ))}
        </div>
      </div>

      <div className="mb-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={filters.inStock === 'true'} onChange={(e) => update('inStock', e.target.checked ? 'true' : '')} />
          In Stock Only
        </label>
      </div>

      <button
        onClick={() => setFilters({ search: filters.search, category: '', minPrice: '', maxPrice: '', minRating: '', inStock: '', sort: '', page: 1 })}
        className="text-xs text-primary font-medium mt-2 hover:underline"
      >
        Clear all filters
      </button>
    </div>
  );
};

export default ProductFilters;
