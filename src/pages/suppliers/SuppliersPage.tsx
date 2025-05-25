import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, FileText } from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import SupplierForm from '../../components/suppliers/SupplierForm';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import toast from 'react-hot-toast';
import { Supplier } from '../../lib/utils';

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  
  useEffect(() => {
    fetchSuppliers();
  }, []);
  
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      
      const suppliersQuery = query(
        collection(db, 'suppliers'),
        orderBy('name')
      );
      
      const snapshot = await getDocs(suppliersQuery);
      
      const suppliersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Supplier));
      
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setIsFormModalOpen(true);
  };
  
  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsFormModalOpen(true);
  };
  
  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteDialogOpen(true);
  };
  
  const handleFormSubmit = async (data: Supplier) => {
    try {
      setIsSubmitting(true);
      
      if (editingSupplier?.id) {
        const supplierRef = doc(db, 'suppliers', editingSupplier.id);
        await updateDoc(supplierRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
        
        setSuppliers(prevSuppliers => 
          prevSuppliers.map(supplier => 
            supplier.id === editingSupplier.id ? { ...data, id: supplier.id } : supplier
          )
        );
        
        toast.success('Supplier updated successfully');
      } else {
        const newSupplier = {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'suppliers'), newSupplier);
        
        setSuppliers(prevSuppliers => [...prevSuppliers, { ...newSupplier, id: docRef.id }]);
        
        toast.success('Supplier added successfully');
      }
      
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const confirmDelete = async () => {
    if (!supplierToDelete?.id) return;
    
    try {
      await deleteDoc(doc(db, 'suppliers', supplierToDelete.id));
      
      setSuppliers(prevSuppliers => 
        prevSuppliers.filter(supplier => supplier.id !== supplierToDelete.id)
      );
      
      toast.success('Supplier deleted successfully');
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };
  
  const supplierColumns = [
    { key: 'name', header: 'Supplier Name', sortable: true },
    { key: 'contactPerson', header: 'Contact Person', sortable: true },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
    { key: 'address', header: 'Address' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Supplier) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleEditSupplier(row)}
            className="p-1"
          >
            <Edit size={16} />
            <span className="sr-only">Edit</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {/* TODO: Implement view orders */}}
            className="p-1"
          >
            <FileText size={16} />
            <span className="sr-only">View Orders</span>
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => handleDeleteSupplier(row)}
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
      <Header title="Suppliers Management" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Suppliers
          </h2>
          
          <Button
            variant="success"
            size="sm"
            onClick={handleAddSupplier}
            className="flex items-center gap-1"
          >
            <PlusCircle size={16} />
            Add Supplier
          </Button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DataTable 
            data={suppliers} 
            columns={supplierColumns} 
            filterKey="name"
            itemsPerPage={10}
          />
        )}
      </div>
      
      <FormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingSupplier(null);
        }}
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
      >
        <SupplierForm
          onSubmit={handleFormSubmit}
          initialData={editingSupplier || undefined}
          isSubmitting={isSubmitting}
        />
      </FormModal>
      
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        itemName={supplierToDelete?.name || ''}
        onDelete={confirmDelete}
      />
    </div>
  );
};

export default SuppliersPage;