import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Glasses } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Glasses size={64} className="text-blue-600 dark:text-blue-400 mb-4" />
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">404</h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">Page Not Found</p>
      <p className="text-gray-600 dark:text-gray-400 max-w-md text-center mb-8">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link to="/">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
};

export default NotFound;