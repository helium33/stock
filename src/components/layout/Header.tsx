import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import useStoreStore from '../../stores/useStoreStore';
import NotificationBell from '../notifications/NotificationBell';

const Header: React.FC<{ title: string }> = ({ title }) => {
  const { user, logout } = useAuth();
  const { currentStore } = useStoreStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 px-4 py-2.5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white md:text-2xl">
            {title}
            {currentStore && (
              <span className="ml-2 text-base font-medium text-blue-600 dark:text-blue-400 capitalize">
                ({currentStore})
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          {user && (
            <>
              <span className="hidden md:block text-sm font-medium text-gray-900 dark:text-white">
                {user.email}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;