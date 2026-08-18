import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

const NotFound = () => (
  <div className="container-app py-24 flex flex-col items-center text-center">
    <SearchX size={72} className="text-gray-300 mb-4" strokeWidth={1.5} />
    <h1 className="text-3xl font-bold text-gray-800 mb-2">404 - Page Not Found</h1>
    <p className="text-gray-500 mb-6 max-w-md">The page you're looking for doesn't exist or may have been moved.</p>
    <Link to="/" className="btn-primary">Back to Home</Link>
  </div>
);

export default NotFound;
