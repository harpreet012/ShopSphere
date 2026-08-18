import { Link } from 'react-router-dom';

const CategoryNav = ({ categories = [] }) => {
  if (!categories.length) return null;
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-[52px] md:top-[56px] z-30 shadow-sm overflow-x-auto">
      <div className="container-app flex items-center gap-6 py-2.5 min-w-max md:min-w-0">
        {categories.map((cat) => (
          <Link
            key={cat._id}
            to={`/products?category=${cat._id}`}
            className="text-sm font-medium text-gray-700 hover:text-primary whitespace-nowrap transition-colors"
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default CategoryNav;
