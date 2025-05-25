import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, ShoppingCart } from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import AccessoriesForm, { AccessoriesFormData } from '../../components/accessories/AccessoriesForm';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import SellItemDialog from '../../components/dialogs/SellItemDialog';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';

const AccessoriesPage: React.FC = () => {
  const { store } = useParams<{ store: string }>();
  
  const [accessories, setAccessories] = useState<AccessoriesFormData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<AccessoriesFormData | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accessoryToDelete, setAccessoryToDelete] = useState<AccessoriesFormData | null>(null);
  
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [accessoryToSell, setAccessoryToSell] = useState<AccessoriesFormData | null>(null);
  
  useEffect(() => {
    fetchAccessories();
  }, [store]);
  
  const fetchAccessories = async () => {
    if (!store) return;
    
    try {
      setLoading(true);
      
      const accessoryQuery = query(
        collection(db, 'accessories'),
        where('store', '==', store)
      );
      
      const snapshot = await getDocs(accessoryQuery);
      
      const accessoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as AccessoriesFormData));
      
      setAccessories(accessoriesData);
    } catch (error) {
      console.error('Error fetching accessories:', error);
      toast.error('Failed to fetch accessories');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddAccessory = () => {
    setEditingAccessory(null);
    setIsFormModalOpen(true);
  };
  
  const handleEditAccessory = (accessory: AccessoriesFormData) => {
    setEditingAccessory(accessory);
    setIsFormModalOpen(true);
  };
  
  const handleDeleteAccessory = (accessory: AccessoriesFormData) => {
    setAccessoryToDelete(accessory);
    setDeleteDialogOpen(true);
  };
  
  const handleSellAccessory = (accessory: AccessoriesFormData) => {
    setAccessoryToSell(accessory);
    setSellDialogOpen(true);
  };
  
  const handleFormSubmit = async (data: AccessoriesFormData) => {
    if (!store) return;
    
    try {
      setIsSubmitting(true);
      
      if (editingAccessory?.id) {
        const accessoryRef = doc(db, 'accessories', editingAccessory.id);
        await updateDoc(accessoryRef, {
          ...data,
          store,
          updatedAt: serverTimestamp(),
        });
        
        setAccessories(prevAccessories => 
          prevAccessories.map(accessory => 
            accessory.id === editingAccessory.id ? { ...data, id: accessory.id } : accessory
          )
        );
        
        toast.success('Accessory updated successfully');
      } else {
        const newAccessory = {
          ...data,
          store,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'accessories'), newAccessory);
        
        setAccessories(prevAccessories => [...prevAccessories, { ...newAccessory, id: docRef.id }]);
        
        toast.success('Accessory added successfully');
      }
      
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error saving accessory:', error);
      toast.error('Failed to save accessory');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const confirmDelete = async () => {
    if (!accessoryToDelete?.id) return;
    
    try {
      await deleteDoc(doc(db, 'accessories', accessoryToDelete.id));
      
      setAccessories(prevAccessories => 
        prevAccessories.filter(accessory => accessory.id !== accessoryToDelete.id)
      );
      
      toast.success('Accessory deleted successfully');
    } catch (error) {
      console.error('Error deleting accessory:', error);
      toast.error('Failed to delete accessory');
    }
  };
  
  const confirmSell = async (quantity: number) => {
    if (!accessoryToSell?.id || !store) return;
    
    try {
      const accessoryRef = doc(db, 'accessories', accessoryToSell.id);
      
      const newQty = accessoryToSell.qty - quantity;
      if (newQty < 0) {
        toast.error('Not enough quantity available');
        return;
      }
      
      await updateDoc(accessoryRef, {
        qty: newQty,
        updatedAt: serverTimestamp(),
      });
      
      await addDoc(collection(db, 'sales'), {
        itemId: accessoryToSell.id,
        itemName: accessoryToSell.name,
        itemType: 'Accessories',
        store,
        quantity,
        unitPrice: accessoryToSell.price,
        totalPrice: accessoryToSell.price * quantity,
        date: serverTimestamp(),
      });
      
      setAccessories(prevAccessories =>
        prevAccessories.map(accessory =>
          accessory.id === accessoryToSell.id ? { ...accessory, qty: newQty } : accessory
        )
      );
      
      toast.success(`Sold ${quantity} ${accessoryToSell.name}`);
    } catch (error) {
      console.error('Error selling accessory:', error);
      toast.error('Failed to process sale');
    }
  };
  
  const accessoryColumns = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'qty', header: 'Quantity', sortable: true, sortType: 'number' },
    { 
      key: 'price', 
      header: 'Price', 
      sortable: true, 
      sortType: 'number',
      render: (row: AccessoriesFormData) => formatCurrency(row.price)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: AccessoriesFormData) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleEditAccessory(row)}
            className="p-1"
          >
            <Edit size={16} />
            <span className="sr-only">Edit</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSellAccessory(row)}
            className="p-1"
            disabled={row.qty <= 0}
          >
            <ShoppingCart size={16} />
            <span className="sr-only">Sell</span>
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => handleDeleteAccessory(row)}
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
      <Header title={`Accessories Management - ${store?.toUpperCase()}`} />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Accessories
          </h2>
          
          <Button
            variant="success"
            size="sm"
            onClick={handleAddAccessory}
            className="flex items-center gap-1"
          >
            <PlusCircle size={16} />
            Add Accessory
          </Button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DataTable 
            data={accessories} 
            columns={accessoryColumns} 
            filterKey="name"
            itemsPerPage={10}
          />
        )}
      </div>
      
      <FormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingAccessory(null);
        }}
        title={editingAccessory ? 'Edit Accessory' : 'Add Accessory'}
      >
        <AccessoriesForm
          onSubmit={handleFormSubmit}
          initialData={editingAccessory || undefined}
          isSubmitting={isSubmitting}
        />
      </FormModal>
      
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        itemName={accessoryToDelete?.name || ''}
        onDelete={confirmDelete}
      />
      
      <SellItemDialog
        isOpen={sellDialogOpen}
        onClose={() => setSellDialogOpen(false)}
        itemName={accessoryToSell?.name || ''}
        maxQuantity={accessoryToSell?.qty || 0}
        onSell={confirmSell}
      />
    </div>
  );
};

export default AccessoriesPage;