import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const NotAuthorized: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <div className="flex justify-center mb-4">
          <ShieldAlert size={64} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Access Denied
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You don't have permission to access this page. Please contact an administrator if you believe this is an error.
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            to="/lens"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Go to Lens Page
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotAuthorized;