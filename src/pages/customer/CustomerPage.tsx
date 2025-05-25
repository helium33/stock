import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, FileDown } from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import CustomerForm, { CustomerFormData } from '../../components/customer/CustomerForm';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import toast from 'react-hot-toast';
import { CustomerType } from '../../lib/utils';
import * as XLSX from 'xlsx';

const CustomerPage: React.FC = () => {
  const { store } = useParams<{ store: string }>();
  
  const [customers, setCustomers] = useState<CustomerFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<CustomerType | null>(null);
  const [customerStats, setCustomerStats] = useState({
    children: 0,
    male16to35: 0,
    female16to35: 0,
    male36to50: 0,
    female36to50: 0,
    male50plus: 0,
    female50plus: 0,
    total: 0
  });
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerFormData | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerFormData | null>(null);

  const calculateCustomerStats = (customerList: CustomerFormData[]) => {
    const stats = {
      children: 0,
      male16to35: 0,
      female16to35: 0,
      male36to50: 0,
      female36to50: 0,
      male50plus: 0,
      female50plus: 0,
      total: customerList.length
    };

    customerList.forEach(customer => {
      const age = customer.age;
      const gender = customer.gender;

      if (age <= 15) {
        stats.children++;
      } else if (age <= 35) {
        gender === 'Male' ? stats.male16to35++ : stats.female16to35++;
      } else if (age <= 50) {
        gender === 'Male' ? stats.male36to50++ : stats.female36to50++;
      } else {
        gender === 'Male' ? stats.male50plus++ : stats.female50plus++;
      }
    });

    return stats;
  };

  const exportToExcel = () => {
    const data = [
      ['Age Group', 'Male', 'Female', 'Total'],
      ['Children (0-15)', customerStats.children, '-', customerStats.children],
      ['16-35', customerStats.male16to35, customerStats.female16to35, customerStats.male16to35 + customerStats.female16to35],
      ['36-50', customerStats.male36to50, customerStats.female36to50, customerStats.male36to50 + customerStats.female36to50],
      ['50+', customerStats.male50plus, customerStats.female50plus, customerStats.male50plus + customerStats.female50plus],
      ['Total', 
        customerStats.male16to35 + customerStats.male36to50 + customerStats.male50plus,
        customerStats.female16to35 + customerStats.female36to50 + customerStats.female50plus,
        customerStats.total
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Statistics');
    XLSX.writeFile(wb, `customer-statistics-${store}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToGoogleSheets = () => {
    const data = [
      ['Age Group', 'Male', 'Female', 'Total'],
      ['Children (0-15)', customerStats.children, '-', customerStats.children],
      ['16-35', customerStats.male16to35, customerStats.female16to35, customerStats.male16to35 + customerStats.female16to35],
      ['36-50', customerStats.male36to50, customerStats.female36to50, customerStats.male36to50 + customerStats.female36to50],
      ['50+', customerStats.male50plus, customerStats.female50plus, customerStats.male50plus + customerStats.female50plus],
      ['Total', 
        customerStats.male16to35 + customerStats.male36to50 + customerStats.male50plus,
        customerStats.female16to35 + customerStats.female36to50 + customerStats.female50plus,
        customerStats.total
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `customer-statistics-${store}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.open('https://docs.google.com/spreadsheets/create', '_blank');
  };
  
  useEffect(() => {
    fetchCustomers();
  }, [store, selectedType]);

  const fetchCustomers = async () => {
    if (!store) return;
    
    try {
      setLoading(true);
      
      let customerQuery = query(
        collection(db, 'customers'),
        where('store', '==', store)
      );
      
      if (selectedType) {
        customerQuery = query(
          customerQuery,
          where('type', '==', selectedType)
        );
      }
      
      const snapshot = await getDocs(customerQuery);
      
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as CustomerFormData));
      
      setCustomers(customersData);
      setCustomerStats(calculateCustomerStats(customersData));
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setIsFormModalOpen(true);
  };
  
  const handleEditCustomer = (customer: CustomerFormData) => {
    setEditingCustomer(customer);
    setIsFormModalOpen(true);
  };
  
  const handleDeleteCustomer = (customer: CustomerFormData) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };
  
  const handleFormSubmit = async (data: CustomerFormData) => {
    try {
      setIsSubmitting(true);
      
      const customerData = {
        ...data,
        store,
        updatedAt: serverTimestamp(),
      };
      
      if (editingCustomer?.id) {
        const customerRef = doc(db, 'customers', editingCustomer.id);
        await updateDoc(customerRef, customerData);
        
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => 
            customer.id === editingCustomer.id ? { ...customerData, id: customer.id } : customer
          )
        );
        
        toast.success('Customer updated successfully');
      } else {
        const newCustomer = {
          ...customerData,
          createdAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'customers'), newCustomer);
        
        setCustomers(prevCustomers => [...prevCustomers, { ...newCustomer, id: docRef.id }]);
        
        toast.success('Customer added successfully');
      }
      
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const confirmDelete = async () => {
    if (!customerToDelete?.id) return;
    
    try {
      await deleteDoc(doc(db, 'customers', customerToDelete.id));
      
      setCustomers(prevCustomers => 
        prevCustomers.filter(customer => customer.id !== customerToDelete.id)
      );
      
      toast.success('Customer deleted successfully');
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };
  
  const customerColumns = [
    { key: 'number', header: 'Number' },
    { key: 'name', header: 'Name' },
    { key: 'type', header: 'Type' },
    { key: 'gender', header: 'Gender' },
    { key: 'age', header: 'Age' },
    { key: 'phone', header: 'Phone' },
    { key: 'address', header: 'Address' },
    { key: 'wechatName', header: 'WeChat Name' },
    { key: 'store', header: 'Store' },
    { key: 'date', header: 'Date' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: CustomerFormData) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleEditCustomer(row)}
            className="p-1"
          >
            <Edit size={16} />
            <span className="sr-only">Edit</span>
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => handleDeleteCustomer(row)}
            className="p-1"
          >
            <Trash2 size={16} />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <Header title={`Customer Management - ${store?.toUpperCase()}`} />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-100 dark:bg-blue-900/20 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">Children (0-15)</h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-300">{customerStats.children}</p>
          </div>
          
          <div className="bg-green-100 dark:bg-green-900/20 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-green-800 dark:text-green-200">Age 16-35</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-green-700 dark:text-green-300">Male</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-300">{customerStats.male16to35}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-700 dark:text-green-300">Female</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-300">{customerStats.female16to35}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-100 dark:bg-yellow-900/20 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-yellow-800 dark:text-yellow-200">Age 36-50</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-yellow-700 dark:text-yellow-300">Male</span>
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">{customerStats.male36to50}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-yellow-700 dark:text-yellow-300">Female</span>
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">{customerStats.female36to50}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-100 dark:bg-purple-900/20 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-purple-800 dark:text-purple-200">Age 50+</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-purple-700 dark:text-purple-300">Male</span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-300">{customerStats.male50plus}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-700 dark:text-purple-300">Female</span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-300">{customerStats.female50plus}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Customers {selectedType ? ` - ${selectedType}` : ''}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total: {customerStats.total} customers
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedType === null ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(null)}
            >
              All Types
            </Button>
            
            <Button 
              variant={selectedType === 'Original' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('Original')}
            >
              Original
            </Button>
            
            <Button 
              variant={selectedType === 'Membership' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('Membership')}
            >
              Membership
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="flex items-center gap-1"
            >
              <FileDown size={16} />
              Export Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportToGoogleSheets}
              className="flex items-center gap-1"
            >
              <FileDown size={16} />
              Export Google Sheets
            </Button>
            
            <Button
              variant="success"
              size="sm"
              onClick={handleAddCustomer}
              className="ml-2 flex items-center gap-1"
            >
              <PlusCircle size={16} />
              Add Customer
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DataTable 
            data={customers} 
            columns={customerColumns} 
            filterKey="name"
            itemsPerPage={10}
          />
        )}
      </div>
      
      <FormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
      >
        <CustomerForm
          onSubmit={handleFormSubmit}
          initialData={editingCustomer || undefined}
          isSubmitting={isSubmitting}
        />
      </FormModal>
      
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        itemName={customerToDelete?.name || ''}
        onDelete={confirmDelete}
      />
    </div>
  );
};

export default CustomerPage;