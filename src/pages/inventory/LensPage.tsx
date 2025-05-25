import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Eye, ShoppingCart, Search } from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import LensForm, { LensFormData } from '../../components/lens/LensForm';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import SellItemDialog from '../../components/dialogs/SellItemDialog';
import toast from 'react-hot-toast';
import { formatCurrency, LensType } from '../../lib/utils';

const LensPage: React.FC = () => {
  const [lenses, setLenses] = useState<LensFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<LensType | null>(null);
  const [selectedSubType, setSelectedSubType] = useState<'Fuse' | 'Flattop' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLens, setEditingLens] = useState<LensFormData | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lensToDelete, setLensToDelete] = useState<LensFormData | null>(null);
  
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [lensToSell, setLensToSell] = useState<LensFormData | null>(null);
  
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [selectedLens, setSelectedLens] = useState<LensFormData | null>(null);

  const [sphSearch, setSphSearch] = useState('');
  const [cylSearch, setCylSearch] = useState('');
  const [axisSearch, setAxisSearch] = useState('');

  const singleVisionCategories = [
    'bb 1.56', 'bb 1.61', 'bb 1.67',
    'bbpg 1.56', 'bbpg 1.61', 'pg',
    'anti flash', 'anti glare',
    'photo pink', 'photo blue', 'photo purple', 'photo brown',
    'cr', 'mc', 'yangon order', 'error'
  ];

  const fuseCategories = [
    'bbpgfuse', 'bbfuse', 'crfuse', 'mcfuse', 'pgfuse',
    'yangon order', 'error'
  ];

  const flattopCategories = [
    'mcflattop', 'crflattop', 'bbpgflattop', 'bbflattop',
    'yangon order', 'error'
  ];

  const filterLensByMeasurements = (lens: LensFormData) => {
    if (sphSearch && (!lens.sph || !lens.sph.includes(sphSearch))) return false;
    if (cylSearch && (!lens.cyl || !lens.cyl.includes(cylSearch))) return false;
    if (axisSearch && (!lens.axis || !lens.axis.includes(axisSearch))) return false;
    return true;
  };
  
  useEffect(() => {
    fetchLenses();
  }, [selectedType, selectedSubType, selectedCategory]);
  
  const fetchLenses = async () => {
    try {
      setLoading(true);
      
      let lensQuery = query(
        collection(db, 'lenses'),
        orderBy('name')
      );
      
      if (selectedType) {
        lensQuery = query(
          lensQuery,
          where('type', '==', selectedType)
        );
      }

      if (selectedSubType) {
        lensQuery = query(
          lensQuery,
          where('bifocalType', '==', selectedSubType)
        );
      }
      
      if (selectedCategory) {
        lensQuery = query(
          lensQuery,
          where('category', '==', selectedCategory)
        );
      }
      
      const snapshot = await getDocs(lensQuery);
      
      const lensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as LensFormData));
      
      setLenses(lensesData);
    } catch (error) {
      console.error('Error fetching lenses:', error);
      toast.error('Failed to fetch lenses');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddLens = () => {
    setEditingLens(null);
    setIsFormModalOpen(true);
  };
  
  const handleEditLens = (lens: LensFormData) => {
    setEditingLens(lens);
    setIsFormModalOpen(true);
  };
  
  const handleDeleteLens = (lens: LensFormData) => {
    setLensToDelete(lens);
    setDeleteDialogOpen(true);
  };
  
  const handleSellLens = (lens: LensFormData) => {
    setLensToSell(lens);
    setSellDialogOpen(true);
  };
  
  const handleViewDetail = (lens: LensFormData) => {
    setSelectedLens(lens);
    setDetailViewOpen(true);
  };
  
  const handleFormSubmit = async (data: LensFormData) => {
    try {
      setIsSubmitting(true);
      
      if (editingLens?.id) {
        const lensRef = doc(db, 'lenses', editingLens.id);
        await updateDoc(lensRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
        
        setLenses(prevLenses => 
          prevLenses.map(lens => 
            lens.id === editingLens.id ? { ...data, id: lens.id } : lens
          )
        );
        
        toast.success('Lens updated successfully');
      } else {
        const newLens = {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'lenses'), newLens);
        
        setLenses(prevLenses => [...prevLenses, { ...newLens, id: docRef.id }]);
        
        toast.success('Lens added successfully');
      }
      
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error saving lens:', error);
      toast.error('Failed to save lens');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const confirmDelete = async () => {
    if (!lensToDelete?.id) return;
    
    try {
      await deleteDoc(doc(db, 'lenses', lensToDelete.id));
      
      setLenses(prevLenses => 
        prevLenses.filter(lens => lens.id !== lensToDelete.id)
      );
      
      toast.success('Lens deleted successfully');
    } catch (error) {
      console.error('Error deleting lens:', error);
      toast.error('Failed to delete lens');
    }
  };
  
  const confirmSell = async (quantity: number) => {
    if (!lensToSell?.id) return;
    
    try {
      const lensRef = doc(db, 'lenses', lensToSell.id);
      
      const newQty = lensToSell.qty - quantity;
      if (newQty < 0) {
        toast.error('Not enough quantity available');
        return;
      }
      
      await updateDoc(lensRef, {
        qty: newQty,
        updatedAt: serverTimestamp(),
      });
      
      await addDoc(collection(db, 'sales'), {
        itemId: lensToSell.id,
        itemName: lensToSell.name,
        itemType: 'Lens',
        category: lensToSell.category,
        quantity,
        unitPrice: lensToSell.price,
        totalPrice: lensToSell.price * quantity,
        date: serverTimestamp(),
      });
      
      setLenses(prevLenses =>
        prevLenses.map(lens =>
          lens.id === lensToSell.id ? { ...lens, qty: newQty } : lens
        )
      );
      
      toast.success(`Sold ${quantity} ${lensToSell.name}`);
    } catch (error) {
      console.error('Error selling lens:', error);
      toast.error('Failed to process sale');
    }
  };

  const parseNumber = (value: string | undefined): number => {
    if (!value) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };
  
  const lensColumns = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'type', header: 'Type', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'store', header: 'Store', sortable: true },
    {
      key: 'sph',
      header: 'SPH',
      sortable: true,
      sortType: 'number',
      render: (row: LensFormData) => row.sph || '-',
      getValue: (row: LensFormData) => {
        if (!row.sph) return 0;
        return parseFloat(row.sph) || 0;
      }
    },
    {
      key: 'cyl',
      header: 'CYL',
      sortable: true,
      sortType: 'number',
      render: (row: LensFormData) => row.cyl || '-',
      getValue: (row: LensFormData) => {
        if (!row.cyl) return 0;
        return parseFloat(row.cyl) || 0;
      }
    },
    {
      key: 'axis',
      header: 'Axis',
      sortable: true,
      sortType: 'number',
      render: (row: LensFormData) => row.axis || '-',
      getValue: (row: LensFormData) => {
        if (!row.axis) return 0;
        return parseFloat(row.axis) || 0;
      }
    },
    { key: 'qty', header: 'Quantity', sortable: true, sortType: 'number' },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      sortType: 'number',
      render: (row: LensFormData) => formatCurrency(row.price)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: LensFormData) => (
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
            onClick={() => handleEditLens(row)}
            className="p-1"
          >
            <Edit size={16} />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSellLens(row)}
            className="p-1"
            disabled={row.qty <= 0}
          >
            <ShoppingCart size={16} />
            <span className="sr-only">Sell</span>
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeleteLens(row)}
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
      <Header title="Lens Management" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedType === null ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedType(null);
                setSelectedSubType(null);
                setSelectedCategory(null);
              }}
            >
              All Types
            </Button>
            
            <Button 
              variant={selectedType === 'Single Vision' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedType('Single Vision');
                setSelectedSubType(null);
                setSelectedCategory(null);
              }}
            >
              Single Vision
            </Button>
            
            <Button 
              variant={selectedType === 'Bifocal' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedType('Bifocal');
                setSelectedSubType(null);
                setSelectedCategory(null);
              }}
            >
              Bifocal
            </Button>
          </div>

          {selectedType === 'Bifocal' && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedSubType === null ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedSubType(null);
                  setSelectedCategory(null);
                }}
              >
                All Types
              </Button>
              <Button
                variant={selectedSubType === 'Fuse' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedSubType('Fuse');
                  setSelectedCategory(null);
                }}
              >
                Fuse
              </Button>
              <Button
                variant={selectedSubType === 'Flattop' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedSubType('Flattop');
                  setSelectedCategory(null);
                }}
              >
                Flattop
              </Button>
            </div>
          )}

          {selectedType === 'Single Vision' && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All Categories
              </Button>
              {singleVisionCategories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.toUpperCase()}
                </Button>
              ))}
            </div>
          )}

          {selectedSubType === 'Fuse' && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All Categories
              </Button>
              {fuseCategories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.toUpperCase()}
                </Button>
              ))}
            </div>
          )}

          {selectedSubType === 'Flattop' && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All Categories
              </Button>
              {flattopCategories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.toUpperCase()}
                </Button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Input
                label="Search SPH"
                value={sphSearch}
                onChange={(e) => setSphSearch(e.target.value)}
                placeholder="Enter SPH value..."
              />
            </div>
            <div className="relative">
              <Input
                label="Search CYL"
                value={cylSearch}
                onChange={(e) => setCylSearch(e.target.value)}
                placeholder="Enter CYL value..."
              />
            </div>
            <div className="relative">
              <Input
                label="Search AXIS"
                value={axisSearch}
                onChange={(e) => setAxisSearch(e.target.value)}
                placeholder="Enter AXIS value..."
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="success"
              size="sm"
              onClick={handleAddLens}
              className="flex items-center gap-1"
            >
              <PlusCircle size={16} />
              Add Lens
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="mt-6">
            <DataTable 
              data={lenses.filter(filterLensByMeasurements)} 
              columns={lensColumns} 
              filterKey="name"
              itemsPerPage={10}
            />
          </div>
        )}
      </div>
      
      <FormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingLens(null);
        }}
        title={editingLens ? 'Edit Lens' : 'Add Lens'}
      >
        <LensForm
          onSubmit={handleFormSubmit}
          initialData={editingLens || undefined}
          isSubmitting={isSubmitting}
        />
      </FormModal>
      
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        itemName={lensToDelete?.name || ''}
        onDelete={confirmDelete}
      />
      
      <SellItemDialog
        isOpen={sellDialogOpen}
        onClose={() => setSellDialogOpen(false)}
        itemName={lensToSell?.name || ''}
        maxQuantity={lensToSell?.qty || 0}
        onSell={confirmSell}
      />
      
      <FormModal
        isOpen={detailViewOpen}
        onClose={() => setDetailViewOpen(false)}
        title="Lens Details"
      >
        {selectedLens && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Code</p>
                <p className="font-medium">{selectedLens.code}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="font-medium">{selectedLens.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</p>
                <p className="font-medium">{selectedLens.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</p>
                <p className="font-medium">{selectedLens.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Store</p>
                <p className="font-medium">{selectedLens.store}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SPH</p>
                <p className="font-medium">{selectedLens.sph || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">CYL</p>
                <p className="font-medium">{selectedLens.cyl || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Axis</p>
                <p className="font-medium">{selectedLens.axis || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Quantity</p>
                <p className="font-medium">{selectedLens.qty}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Price</p>
                <p className="font-medium">{formatCurrency(selectedLens.price)}</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDetailViewOpen(false);
                  handleEditLens(selectedLens);
                }}
              >
                Edit
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setDetailViewOpen(false);
                  handleSellLens(selectedLens);
                }}
                disabled={selectedLens.qty <= 0}
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

export default LensPage;