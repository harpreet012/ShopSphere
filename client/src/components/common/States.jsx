import { PackageSearch, AlertTriangle, ShieldAlert } from 'lucide-react';

export const EmptyState = ({ icon: Icon = PackageSearch, title, message, action }) => (
  <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
    <Icon className="text-gray-300 mb-4" size={64} strokeWidth={1.5} />
    <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
    {message && <p className="text-gray-500 text-sm max-w-md mb-4">{message}</p>}
    {action}
  </div>
);

export const ErrorState = ({ message = 'Something went wrong.', onRetry }) => (
  <div className="w-full py-16 flex flex-col items-center justify-center text-center px-4">
    <AlertTriangle className="text-danger mb-4" size={56} strokeWidth={1.5} />
    <h3 className="text-lg font-semibold text-gray-700 mb-1">Oops, that didn't work</h3>
    <p className="text-gray-500 text-sm max-w-md mb-4">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="btn-primary">
        Try Again
      </button>
    )}
  </div>
);

export const UnauthorizedState = ({ message = "You don't have permission to view this page." }) => (
  <div className="w-full py-24 flex flex-col items-center justify-center text-center px-4">
    <ShieldAlert className="text-gray-300 mb-4" size={64} strokeWidth={1.5} />
    <h3 className="text-lg font-semibold text-gray-700 mb-1">Access Denied</h3>
    <p className="text-gray-500 text-sm max-w-md">{message}</p>
  </div>
);
