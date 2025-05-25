import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, Eye, ShoppingCart, Plus, Minus } from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import FrameForm, { FrameFormData } from '../../components/frame/FrameForm';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import SellItemDialog from '../../components/dialogs/SellItemDialog';
import toast from 'react-hot-toast';
import { formatCurrency, FrameCategory, FrameColor } from '../../lib/utils';

const FramePage: React.FC = () => {
  const { store } = useParams<{ store: string }>();
  
  const [frames, setFrames] = useState<FrameFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<FrameCategory | null>(null);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFrame, setEditingFrame] = useState<FrameFormData | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [frameToDelete, setFrameToDelete] = useState<FrameFormData | null>(null);
  
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [frameToSell, setFrameToSell] = useState<FrameFormData | null>(null);
  
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<FrameFormData | null>(null);
  
  useEffect(() => {
    fetchFrames();
  }, [store, selectedCategory]);
  
  const fetchFrames = async () => {
    if (!store) return;
    
    try {
      setLoading(true);
      
      let frameQuery = query(
        collection(db, 'frames'),
        where('store', '==', store)
      );
      
      if (selectedCategory) {
        frameQuery = query(
          frameQuery,
          where('category', '==', selectedCategory)
        );
      }
      
      const snapshot = await getDocs(frameQuery);
      
      const framesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as FrameFormData));
      
      setFrames(framesData);
    } catch (error) {
      console.error('Error fetching frames:', error);
      toast.error('Failed to fetch frames');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddFrame = () => {
    setEditingFrame(null);
    setIsFormModalOpen(true);
  };
  
  const handleEditFrame = (frame: FrameFormData) => {
    setEditingFrame(frame);
    setIsFormModalOpen(true);
  };
  
  const handleDeleteFrame = (frame: FrameFormData) => {
    setFrameToDelete(frame);
    setDeleteDialogOpen(true);
  };
  
  const handleSellFrame = (frame: FrameFormData) => {
    setFrameToSell(frame);
    setSellDialogOpen(true);
  };
  
  const handleViewDetail = (frame: FrameFormData) => {
    setSelectedFrame(frame);
    setDetailViewOpen(true);
  };
  
  const handleFormSubmit = async (data: FrameFormData) => {
    if (!store) return;
    
    try {
      setIsSubmitting(true);
      
      if (editingFrame?.id) {
        const frameRef = doc(db, 'frames', editingFrame.id);
        await updateDoc(frameRef, {
          ...data,
          store,
          updatedAt: serverTimestamp(),
        });
        
        setFrames(prevFrames => 
          prevFrames.map(frame => 
            frame.id === editingFrame.id ? { ...data, id: frame.id } : frame
          )
        );
        
        toast.success('Frame updated successfully');
      } else {
        const newFrame = {
          ...data,
          store,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'frames'), newFrame);
        
        setFrames(prevFrames => [...prevFrames, { ...newFrame, id: docRef.id }]);
        
        toast.success('Frame added successfully');
      }
      
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error saving frame:', error);
      toast.error('Failed to save frame');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const confirmDelete = async () => {
    if (!frameToDelete?.id) return;
    
    try {
      await deleteDoc(doc(db, 'frames', frameToDelete.id));
      
      setFrames(prevFrames => 
        prevFrames.filter(frame => frame.id !== frameToDelete.id)
      );
      
      toast.success('Frame deleted successfully');
    } catch (error) {
      console.error('Error deleting frame:', error);
      toast.error('Failed to delete frame');
    }
  };
  
  const confirmSell = async (quantity: number) => {
    if (!frameToSell?.id || !store) return;
    
    try {
      const frameRef = doc(db, 'frames', frameToSell.id);
      
      const newQty = frameToSell.qty - quantity;
      if (newQty < 0) {
        toast.error('Not enough quantity available');
        return;
      }
      
      await updateDoc(frameRef, {
        qty: newQty,
        updatedAt: serverTimestamp(),
      });
      
      await addDoc(collection(db, 'sales'), {
        itemId: frameToSell.id,
        itemName: frameToSell.name,
        itemType: 'Frame',
        category: frameToSell.category,
        store,
        quantity,
        unitPrice: frameToSell.price,
        totalPrice: frameToSell.price * quantity,
        date: serverTimestamp(),
      });
      
      setFrames(prevFrames =>
        prevFrames.map(frame =>
          frame.id === frameToSell.id ? { ...frame, qty: newQty } : frame
        )
      );
      
      toast.success(`Sold ${quantity} ${frameToSell.name}`);
    } catch (error) {
      console.error('Error selling frame:', error);
      toast.error('Failed to process sale');
    }
  };

  const handleColorQuantityChange = async (color: string, change: number) => {
    if (!selectedFrame?.id) return;

    try {
      const frameRef = doc(db, 'frames', selectedFrame.id);
      const currentColors = selectedFrame.colors || {};
      const currentQty = selectedFrame.qty;
      
      const newColorQty = Math.max(0, (currentColors[color] || 0) + change);
      const newTotalQty = currentQty + change;
      
      if (newTotalQty < 0) {
        toast.error('Cannot reduce quantity below 0');
        return;
      }

      const newColors = {
        ...currentColors,
        [color]: newColorQty
      };

      await updateDoc(frameRef, {
        colors: newColors,
        qty: newTotalQty,
        updatedAt: serverTimestamp(),
      });

      const updatedFrame = {
        ...selectedFrame,
        colors: newColors,
        qty: newTotalQty
      };

      setSelectedFrame(updatedFrame);
      setFrames(prevFrames =>
        prevFrames.map(frame =>
          frame.id === selectedFrame.id ? updatedFrame : frame
        )
      );

      toast.success(`Updated ${color} quantity`);
    } catch (error) {
      console.error('Error updating color quantity:', error);
      toast.error('Failed to update quantity');
    }
  };
  
  const frameColumns = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { 
      key: 'colors', 
      header: 'Colors', 
      render: (row: FrameFormData) => {
        const colorCount = Object.values(row.colors || {}).filter(qty => qty > 0).length;
        return `${colorCount} colors`;
      }
    },
    { key: 'qty', header: 'Quantity', sortable: true },
    { key: 'price', header: 'Price', sortable: true, render: (row: FrameFormData) => formatCurrency(row.price) },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: FrameFormData) => (
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
            onClick={() => handleEditFrame(row)}
            className="p-1"
          >
            <Edit size={16} />
            <span className="sr-only">Edit</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSellFrame(row)}
            className="p-1"
            disabled={row.qty <= 0}
          >
            <ShoppingCart size={16} />
            <span className="sr-only">Sell</span>
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => handleDeleteFrame(row)}
            className="p-1"
          >
            <Trash2 size={16} />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      ),
    },
  ];
  
  const frameCategories: FrameCategory[] = ['Eyeglasses', 'Sunglasses', 'Promotion', 'Ready', 'Ready BB', 'Error'];

  return (
    <div className="space-y-6 p-4">
      <Header title={`Frame Management - ${store?.toUpperCase()}`} />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Frames {selectedCategory ? ` - ${selectedCategory}` : ''}
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
            
            {frameCategories.map(category => (
              <Button 
                key={category}
                variant={selectedCategory === category ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
            
            <Button
              variant="success"
              size="sm"
              onClick={handleAddFrame}
              className="ml-2 flex items-center gap-1"
            >
              <PlusCircle size={16} />
              Add Frame
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DataTable 
            data={frames} 
            columns={frameColumns} 
            filterKey="name"
          />
        )}
      </div>
      
      <FormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingFrame(null);
        }}
        title={editingFrame ? 'Edit Frame' : 'Add Frame'}
      >
        <FrameForm
          onSubmit={handleFormSubmit}
          initialData={editingFrame || undefined}
          isSubmitting={isSubmitting}
        />
      </FormModal>
      
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        itemName={frameToDelete?.name || ''}
        onDelete={confirmDelete}
      />
      
      <SellItemDialog
        isOpen={sellDialogOpen}
        onClose={() => setSellDialogOpen(false)}
        itemName={frameToSell?.name || ''}
        maxQuantity={frameToSell?.qty || 0}
        onSell={confirmSell}
      />
      
      <FormModal
        isOpen={detailViewOpen}
        onClose={() => setDetailViewOpen(false)}
        title="Frame Details"
      >
        {selectedFrame && (
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg">
              <img 
                src={selectedFrame.imageUrl} 
                alt={selectedFrame.name} 
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
                <p className="font-medium">{selectedFrame.code}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="font-medium">{selectedFrame.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</p>
                <p className="font-medium">{selectedFrame.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Quantity</p>
                <p className="font-medium">{selectedFrame.qty}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Price</p>
                <p className="font-medium">{formatCurrency(selectedFrame.price)}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Color Distribution</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(selectedFrame.colors || {}).map(([color, qty]) => (
                  <div key={color} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{color}</p>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleColorQuantityChange(color, -1)}
                        className="p-1"
                      >
                        <Minus size={14} />
                      </Button>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white mx-2">
                        {qty}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleColorQuantityChange(color, 1)}
                        className="p-1"
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDetailViewOpen(false);
                  handleEditFrame(selectedFrame);
                }}
              >
                Edit
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setDetailViewOpen(false);
                  handleSellFrame(selectedFrame);
                }}
                disabled={selectedFrame.qty <= 0}
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

export default FramePage;