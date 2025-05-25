import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import DataTable from '../../components/tables/DataTable';
import Select from '../../components/ui/Select';
import { formatCurrency, ItemType, Store, STORES } from '../../lib/utils';
import { format } from 'date-fns';

interface SaleRecord {
  id: string;
  itemId: string;
  itemName: string;
  itemType: ItemType;
  category?: string;
  store: Store;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date: { toDate: () => Date };
}

const HistoryPage: React.FC = () => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | ''>('');
  const [selectedType, setSelectedType] = useState<ItemType | ''>('');
  
  useEffect(() => {
    fetchSales();
  }, [selectedStore, selectedType]);
  
  const fetchSales = async () => {
    try {
      setLoading(true);
      
      let salesQuery = query(
        collection(db, 'sales'),
        orderBy('date', 'desc')
      );
      
      if (selectedStore) {
        salesQuery = query(salesQuery, where('store', '==', selectedStore));
      }
      
      if (selectedType) {
        salesQuery = query(salesQuery, where('itemType', '==', selectedType));
      }
      
      const snapshot = await getDocs(salesQuery);
      
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as SaleRecord));
      
      setSales(salesData);
    } catch (error) {
      console.error('Error fetching sales history:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const salesColumns = [
    { key: 'date', header: 'Date', render: (row: SaleRecord) => format(row.date.toDate(), 'PPP') },
    { key: 'itemName', header: 'Item' },
    { key: 'itemType', header: 'Type' },
    { key: 'category', header: 'Category' },
    { key: 'store', header: 'Store', render: (row: SaleRecord) => row.store.toUpperCase() },
    { key: 'quantity', header: 'Quantity' },
    { key: 'unitPrice', header: 'Unit Price', render: (row: SaleRecord) => formatCurrency(row.unitPrice) },
    { key: 'totalPrice', header: 'Total Price', render: (row: SaleRecord) => formatCurrency(row.totalPrice) },
  ];
  
  const itemTypes: ItemType[] = ['Lens', 'Frame', 'Accessories', 'Contact Lens'];

  return (
    <div className="space-y-6 p-4">
      <Header title="Sales History" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="w-full md:w-64">
            <Select
              label="Filter by Store"
              options={[
                { value: '', label: 'All Stores' },
                ...STORES.map(store => ({
                  value: store,
                  label: store.toUpperCase(),
                })),
              ]}
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value as Store | '')}
            />
          </div>
          
          <div className="w-full md:w-64">
            <Select
              label="Filter by Type"
              options={[
                { value: '', label: 'All Types' },
                ...itemTypes.map(type => ({
                  value: type,
                  label: type,
                })),
              ]}
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ItemType | '')}
            />
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DataTable 
            data={sales} 
            columns={salesColumns} 
            filterKey="itemName"
            itemsPerPage={10}
          />
        )}
      </div>
    </div>
  );
};

export default HistoryPage;