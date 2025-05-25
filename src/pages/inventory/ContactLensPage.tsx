import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, Eye, ShoppingCart } from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import ContactLensForm, { ContactLensFormData } from '../../components/contactLens/ContactLensForm';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import SellItemDialog from '../../components/dialogs/SellItemDialog';
import toast from 'react-hot-toast';
import { formatCurrency, ContactLensCategory } from '../../lib/utils';

const ContactLensPage: React.FC = () => {
  const { store } = useParams<{ store: string }>();
  
  const [contactLenses, setContactLenses] = useState<ContactLensFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ContactLensCategory | null>(null);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingContactLens, setEditingContactLens] = useState<ContactLensFormData | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactLensToDelete, setContactLensToDelete] = useState<ContactLensFormData | null>(null);
  
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [contactLensToSell, setContactLensToSell] = useState<ContactLensFormData | null>(null);
  
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [selectedContactLens, setSelectedContactLens] = useState<ContactLensFormData | null>(null);
  
  useEffect(() => {
    fetchContactLenses();
  }, [store, selectedCategory]);
  
  const fetchContactLenses = async () => {
    if (!store) return;
    
    try {
      setLoading(true);
      
      let contactLensQuery = query(
        collection(db, 'contactLenses'),
        where('store', '==', store)
      );
      
      if (selectedCategory) {
        contactLensQuery = query(
          contactLensQuery,
          where('category', '==', selectedCategory)
        );
      }
      
      const snapshot = await getDocs(contactLensQuery);
      
      const contactLensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as ContactLensFormData));
      
      setContactLenses(contactLensesData);
    } catch (error) {
      console.error('Error fetching contact lenses:', error);
      toast.error('Failed to fetch contact lenses');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddContactLens = () => {
    setEditingContactLens(null);
    setIsFormModalOpen(true);
  };
  
  const handleEditContactLens = (contactLens: ContactLensFormData) => {
    setEditingContactLens(contactLens);
    setIsFormModalOpen(true);
  };
  
  const handleDeleteContactLens = (contactLens: ContactLensFormData) => {
    setContactLensToDelete(contactLens);
    setDeleteDialogOpen(true);
  };
  
  const handleSellContactLens = (contactLens: ContactLensFormData) => {
    setContactLensToSell(contactLens);
    setSellDialogOpen(true);
  };
  
  const handleViewDetail = (contactLens: ContactLensFormData) => {
    setSelectedContactLens(contactLens);
    setDetailViewOpen(true);
  };
  
  const handleFormSubmit = async (data: ContactLensFormData) => {
    if (!store) return;
    
    try {
      setIsSubmitting(true);
      
      if (editingContactLens?.id) {
        const contactLensRef = doc(db, 'contactLenses', editingContactLens.id);
        await updateDoc(contactLensRef, {
          ...data,
          store,
          updatedAt: serverTimestamp(),
        });
        
        setContactLenses(prevContactLenses => 
          prevContactLenses.map(contactLens => 
            contactLens.id === editingContactLens.id ? { ...data, id: contactLens.id } : contactLens
          )
        );
        
        toast.success('Contact lens updated successfully');
      } else {
        const newContactLens = {
          ...data,
          store,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'contactLenses'), newContactLens);
        
        setContactLenses(prevContactLenses => [...prevContactLenses, { ...newContactLens, id: docRef.id }]);
        
        toast.success('Contact lens added successfully');
      }
      
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error saving contact lens:', error);
      toast.error('Failed to save contact lens');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const confirmDelete = async () => {
    if (!contactLensToDelete?.id) return;
    
    try {
      await deleteDoc(doc(db, 'contactLenses', contactLensToDelete.id));
      
      setContactLenses(prevContactLenses => 
        prevContactLenses.filter(contactLens => contactLens.id !== contactLensToDelete.id)
      );
      
      toast.success('Contact lens deleted successfully');
    } catch (error) {
      console.error('Error deleting contact lens:', error);
      toast.error('Failed to delete contact lens');
    }
  };
  
  const confirmSell = async (quantity: number) => {
    if (!contactLensToSell?.id || !store) return;
    
    try {
      const contactLensRef = doc(db, 'contactLenses', contactLensToSell.id);
      
      const newQty = contactLensToSell.qty - quantity;
      if (newQty < 0) {
        toast.error('Not enough quantity available');
        return;
      }
      
      await updateDoc(contactLensRef, {
        qty: newQty,
        updatedAt: serverTimestamp(),
      });
      
      await addDoc(collection(db, 'sales'), {
        itemId: contactLensToSell.id,
        itemName: contactLensToSell.name,
        itemType: 'Contact Lens',
        category: contactLensToSell.category,
        store,
        quantity,
        unitPrice: contactLensToSell.price,
        totalPrice: contactLensToSell.price * quantity,
        date: serverTimestamp(),
      });
      
      setContactLenses(prevContactLenses =>
        prevContactLenses.map(contactLens =>
          contactLens.id === contactLensToSell.id ? { ...contactLens, qty: newQty } : contactLens
        )
      );
      
      toast.success(`Sold ${quantity} ${contactLensToSell.name}`);
    } catch (error) {
      console.error('Error selling contact lens:', error);
      toast.error('Failed to process sale');
    }
  };
  
  const contactLensColumns = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { 
      key: 'power', 
      header: 'Power', 
      sortable: true,
      sortType: 'number',
      render: (row: ContactLensFormData) => row.power || '-',
      getValue: (row: ContactLensFormData) => {
        if (!row.power) return 0;
        return parseFloat(row.power) || 0;
      }
    },
    { key: 'qty', header: 'Quantity', sortable: true, sortType: 'number' },
    { 
      key: 'price', 
      header: 'Price', 
      sortable: true, 
      sortType: 'number',
      render: (row: ContactLensFormData) => formatCurrency(row.price)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: ContactLensFormData) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleViewDetail(row)}
            className="p-1"
          >
            <Eye size={16} />
            <span className="sr-only">View</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleEditContactLens(row)}
            className="p-1"
          >
            <Edit size={16} />
            <span className="sr-only">Edit</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSellContactLens(row)}
            className="p-1"
            disabled={row.qty <= 0}
          >
            <ShoppingCart size={16} />
            <span className="sr-only">Sell</span>
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => handleDeleteContactLens(row)}
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
      <Header title={`Contact Lens Management - ${store?.toUpperCase()}`} />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Contact Lenses {selectedCategory ? ` - ${selectedCategory}` : ''}
            </h2>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedCategory === null ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </Button>
            
            <Button 
              variant={selectedCategory === 'Original' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('Original')}
            >
              Original
            </Button>
            
            <Button 
              variant={selectedCategory === 'Premium' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('Premium')}
            >
              Premium
            </Button>
            
            <Button
              variant="success"
              size="sm"
              onClick={handleAddContactLens}
              className="ml-2 flex items-center gap-1"
            >
              <PlusCircle size={16} />
              Add Contact Lens
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DataTable 
            data={contactLenses} 
            columns={contactLensColumns} 
            filterKey="name"
            itemsPerPage={10}
          />
        )}
      </div>
      
      <FormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingContactLens(null);
        }}
        title={editingContactLens ? 'Edit Contact Lens' : 'Add Contact Lens'}
      >
        <ContactLensForm
          onSubmit={handleFormSubmit}
          initialData={editingContactLens || undefined}
          isSubmitting={isSubmitting}
        />
      </FormModal>
      
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        itemName={contactLensToDelete?.name || ''}
        onDelete={confirmDelete}
      />
      
      <SellItemDialog
        isOpen={sellDialogOpen}
        onClose={() => setSellDialogOpen(false)}
        itemName={contactLensToSell?.name || ''}
        maxQuantity={contactLensToSell?.qty || 0}
        onSell={confirmSell}
      />
      
      <FormModal
        isOpen={detailViewOpen}
        onClose={() => setDetailViewOpen(false)}
        title="Contact Lens Details"
      >
        {selectedContactLens && (
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg">
              <img 
                src={selectedContactLens.imageUrl} 
                alt={selectedContactLens.name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/400?text=No+Image';
                }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Code</p>
                <p className="font-medium">{selectedContactLens.code}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="font-medium">{selectedContactLens.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</p>
                <p className="font-medium">{selectedContactLens.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Power</p>
                <p className="font-medium">{selectedContactLens.power || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Quantity</p>
                <p className="font-medium">{selectedContactLens.qty}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Price</p>
                <p className="font-medium">{formatCurrency(selectedContactLens.price)}</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDetailViewOpen(false);
                  handleEditContactLens(selectedContactLens);
                }}
              >
                Edit
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setDetailViewOpen(false);
                  handleSellContactLens(selectedContactLens);
                }}
                disabled={selectedContactLens.qty <= 0}
              >
                Sell
              </Button>
            </div>
          </div>
        )}
      </FormModal>
    </div>
  );
};

export default ContactLensPage;