import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from 'react-hot-toast';

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 md:ml-[280px] h-full overflow-auto">
        <Toaster position="top-right" />
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;