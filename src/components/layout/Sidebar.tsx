import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Glasses, 
  Box, 
  Contact, 
  Users, 
  Clock,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Truck,
  UserCog,
  Settings,
  FileText,
  Wallet,
  BarChart3,
  Calendar,
  Receipt
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useStoreStore from '../../stores/useStoreStore';
import { STORES, CustomerCategory } from '../../lib/utils';
import Button from '../ui/Button';
import Input from '../ui/Input';

export const Sidebar: React.FC = () => {
  const { isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentStore, setCurrentStore } = useStoreStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dateFilterType, setDateFilterType] = useState<'daily' | 'monthly'>('daily');

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  const customerCategories: CustomerCategory[] = [
    "Win",
   "Pwint",
   "Yangon",
  
  ];

  const baseNavItems = [
    { 
      name: 'Lens', 
      path: '/lens', 
      icon: <Glasses size={20} />,
      noSubmenu: true
    },
    { 
      name: 'Frame', 
      path: '/frame', 
      icon: <Box size={20} />, 
      hasSubmenu: true, 
      menuKey: 'frame'
    },
    { 
      name: 'Accessories', 
      path: '/accessories', 
      icon: <Box size={20} />, 
      hasSubmenu: true, 
      menuKey: 'accessories'
    },
    { 
      name: 'Contact Lens', 
      path: '/contact-lens', 
      icon: <Contact size={20} />, 
      hasSubmenu: true, 
      menuKey: 'contactLens'
    },
    { 
      name: 'Customer', 
      path: '/customer', 
      icon: <Users size={20} />, 
      hasSubmenu: true, 
      menuKey: 'customer',
      subCategories: [
        { name: 'Original', subItems: customerCategories },
        { name: 'Membership' }
      ]
    },
    { 
      name: 'VOC', 
      path: '/voc', 
      icon: <FileText size={20} />, 
      hasSubmenu: true, 
      menuKey: 'voc' 
    },
    { 
      name: 'Sales Data', 
      path: '/sales', 
      icon: <BarChart3 size={20} />,
      noSubmenu: true
    },
    { 
      name: 'Deposits', 
      path: '/deposits', 
      icon: <Wallet size={20} />,
      noSubmenu: true
    },
   { 
      name: 'Expenses', 
      path: '/expenses', 
      icon: <Receipt size={20} />,
      noSubmenu: true
    },
    { 
      name: 'History', 
      path: '/history', 
      icon: <Clock size={20} /> 
    },
  ];

  const adminOnlyItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Staff', path: '/staff', icon: <UserCog size={20} /> },
    { name: 'Suppliers', path: '/suppliers', icon: <Truck size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
    {name : 'Expenses', path: '/expenses', icon: <Receipt size={20} />},

  ];

  const navItems = isAdmin ? [...adminOnlyItems, ...baseNavItems] : baseNavItems;

  return (
    <>
      <button
        type="button"
        className="fixed top-4 left-4 z-50 md:hidden text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-30 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-40 h-screen transition-transform 
        bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 w-[280px]
      `}>
        <div className="h-full px-3 py-4 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center">
              <Glasses className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 ml-2">
                Optical Store
              </h2>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Select Store</p>
            <div className="flex flex-col gap-2">
              {STORES.map((store) => (
                <Button
                  key={store}
                  variant={currentStore === store ? 'primary' : 'outline'}
                  size="sm"
                  className="capitalize w-full"
                  onClick={() => setCurrentStore(store)}
                >
                  {store}
                </Button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={20} className="text-gray-500" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Date Filter</p>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant={dateFilterType === 'daily' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilterType('daily')}
                >
                  Daily
                </Button>
                <Button
                  variant={dateFilterType === 'monthly' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilterType('monthly')}
                >
                  Monthly
                </Button>
              </div>
              {dateFilterType === 'daily' ? (
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full"
                />
              ) : (
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full"
                />
              )}
            </div>
          </div>

          <ul className="space-y-2 font-medium flex-grow">
            {navItems.map((item) => (
              <li key={item.path}>
                {item.hasSubmenu ? (
                  <div>
                    <button
                      className="flex items-center w-full p-2 text-gray-900 rounded-lg hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 group"
                      onClick={() => toggleMenu(item.menuKey!)}
                    >
                      <span className="flex items-center">
                        {item.icon}
                        <span className="ml-3">{item.name}</span>
                      </span>
                      <span className="ml-auto">
                        {expandedMenus[item.menuKey!] ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </span>
                    </button>
                    
                    {expandedMenus[item.menuKey!] && (
                      <ul className="pl-5 mt-1 space-y-1">
                        {item.subCategories ? (
                          // Render customer categories
                          item.subCategories.map((category) => (
                            <li key={category.name}>
                              <div className="py-2">
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  {category.name}
                                </span>
                                {category.subItems && (
                                  <ul className="pl-4 mt-1 space-y-1">
                                    {category.subItems.map((subItem) => (
                                      <li key={subItem}>
                                        <NavLink
                                          to={`${item.path}/${currentStore}?category=${category.name}&age=${subItem}&date=${dateFilterType === 'daily' ? selectedDate : selectedMonth}`}
                                          className={({ isActive }) => `
                                            flex items-center p-2 text-gray-900 rounded-lg 
                                            hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 group
                                            ${isActive ? 'bg-gray-100 dark:bg-gray-700' : ''}
                                          `}
                                          onClick={closeMobileMenu}
                                        >
                                          <span className="ml-3">{subItem}</span>
                                        </NavLink>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </li>
                          ))
                        ) : (
                          // Render store submenu
                          STORES.map((store) => (
                            <li key={`${item.path}-${store}`}>
                              <NavLink
                                to={`${item.path}/${store}?date=${dateFilterType === 'daily' ? selectedDate : selectedMonth}`}
                                className={({ isActive }) => `
                                  flex items-center p-2 text-gray-900 rounded-lg 
                                  hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 group
                                  ${isActive ? 'bg-gray-100 dark:bg-gray-700' : ''}
                                `}
                                onClick={closeMobileMenu}
                              >
                                <span className="ml-3 capitalize">{store}</span>
                              </NavLink>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                ) : (
                  <NavLink
                    to={`${item.path}${item.path === '/dashboard' ? '' : `?date=${dateFilterType === 'daily' ? selectedDate : selectedMonth}`}`}
                    className={({ isActive }) => `
                      flex items-center p-2 text-gray-900 rounded-lg 
                      hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 group
                      ${isActive ? 'bg-gray-100 dark:bg-gray-700' : ''}
                    `}
                    onClick={closeMobileMenu}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </NavLink>
                )}
              </li>
            ))}
          </ul>

          {isAdmin && (
            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
              <NavLink
                to="/settings"
                className={({ isActive }) => `
                  flex items-center p-2 text-gray-900 rounded-lg 
                  hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700
                  ${isActive ? 'bg-gray-100 dark:bg-gray-700' : ''}
                `}
              >
                <Settings size={20} />
                <span className="ml-3">Settings</span>
              </NavLink>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};