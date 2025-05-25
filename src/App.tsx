import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import Dashboard from './pages/Dashboard';
import LensPage from './pages/inventory/LensPage';
import FramePage from './pages/inventory/FramePage';
import AccessoriesPage from './pages/inventory/AccessoriesPage';
import ContactLensPage from './pages/inventory/ContactLensPage';
import CustomerPage from './pages/customer/CustomerPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import StaffPage from './pages/staff/StaffPage';
import HistoryPage from './pages/history/HistoryPage';
import SettingsPage from './pages/settings/SettingsPage';
import PaymentPage from './pages/payment/PaymentPage';
import DepositsPage from './pages/deposits/DepositsPage';
import VocPage from './pages/voc/VocPage';
import SalesDataPage from './pages/SalesDataPage';
import NotFound from './pages/NotFound';
import NotAuthorized from './pages/NotAuthorize';

function App() {
  React.useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/not-authorized" element={<NotAuthorized /> } />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/lens" replace />} />
              
              {/* Admin Only Routes */}
              <Route path="dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
              <Route path="expenses" element={<AdminRoute><ExpensesPage /></AdminRoute>} />
              <Route path="suppliers" element={<AdminRoute><SuppliersPage /></AdminRoute>} />
              <Route path="staff" element={<AdminRoute><StaffPage /></AdminRoute>} />
              <Route path="settings/*" element={<AdminRoute><SettingsPage /></AdminRoute>} />
              
              {/* Staff Accessible Routes */}
              <Route path="lens" element={<LensPage />} />
              <Route path="frame/:store" element={<FramePage />} />
              <Route path="accessories/:store" element={<AccessoriesPage />} />
              <Route path="contact-lens/:store" element={<ContactLensPage />} />
              <Route path="voc/:store" element={<VocPage />} />
              <Route path="sales" element={<SalesDataPage />} />
              <Route path="history" element={<HistoryPage />} />
              
              {/* Other routes that need access control decision */}
              <Route path="customer/:store" element={<CustomerPage />} />
              <Route path="payment/:store" element={<PaymentPage />} />
              <Route path="deposits" element={<DepositsPage />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;