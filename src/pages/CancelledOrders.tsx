import React, { useState, useEffect } from 'react';
import { FileDown } from 'lucide-react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';
import DataTable from '../components/tables/DataTable';
import { Order, exportToExcel, exportToPDF } from '../lib/utils';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const CancelledOrders: React.FC = () => {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');

  useEffect(() => {
    fetchCancelledOrders();
  }, [dateFilter, staffFilter]);

  const fetchCancelledOrders = async () => {
    try {
      setLoading(true);
      
      let ordersQuery = query(
        collection(db, 'orders'),
        where('isCancelled', '==', true),
        orderBy('cancelledAt', 'desc')
      );

      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        filterDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        ordersQuery = query(
          ordersQuery,
          where('cancelledAt', '>=', filterDate),
          where('cancelledAt', '<', nextDay)
        );
      }

      if (staffFilter) {
        ordersQuery = query(
          ordersQuery,
          where('cancelledBy', '==', staffFilter)
        );
      }

      const snapshot = await getDocs(ordersQuery);
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));

      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching cancelled orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const data = orders.map(order => ({
      'Invoice No': order.id,
      'Customer': order.customerName,
      'Cancel Reason': order.cancelReason,
      'Date': format(order.cancelledAt!, 'PPP'),
      'Staff': order.cancelledBy,
      'Total Amount': order.totalAmount,
      'Store': order.store.toUpperCase(),
    }));

    exportToExcel(data, 'cancelled-orders');
  };

  const handleExportPDF = () => {
    const data = orders.map(order => ({
      'Invoice No': order.id,
      'Customer': order.customerName,
      'Cancel Reason': order.cancelReason,
      'Date': format(order.cancelledAt!, 'PPP'),
      'Staff': order.cancelledBy,
      'Total Amount': order.totalAmount,
      'Store': order.store.toUpperCase(),
    }));

    const columns = [
      'Invoice No',
      'Customer',
      'Cancel Reason',
      'Date',
      'Staff',
      'Total Amount',
      'Store',
    ];

    exportToPDF(data, columns, 'cancelled-orders');
  };

  const columns = [
    { key: 'id', header: 'Invoice No', sortable: true },
    { key: 'customerName', header: 'Customer', sortable: true },
    { key: 'cancelReason', header: 'Cancel Reason' },
    { 
      key: 'cancelledAt', 
      header: 'Date',
      sortable: true,
      render: (row: Order) => format(row.cancelledAt!, 'PPP')
    },
    { key: 'cancelledBy', header: 'Staff', sortable: true },
    { key: 'store', header: 'Store', render: (row: Order) => row.store.toUpperCase() },
  ];

  if (!isAdmin) {
    return (
      <div className="p-4">
        <Header title="Cancelled Orders" />
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-200">
            Only administrators can access cancelled orders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <Header title="Cancelled Orders" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex flex-wrap gap-4">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              placeholder="Filter by staff email"
              className="px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="flex items-center gap-1"
            >
              <FileDown size={16} />
              Export Excel
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="flex items-center gap-1"
            >
              <FileDown size={16} />
              Export PDF
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DataTable 
            data={orders} 
            columns={columns} 
            filterKey="customerName"
            itemsPerPage={10}
          />
        )}
      </div>
    </div>
  );
};

export default CancelledOrders;