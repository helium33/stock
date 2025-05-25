import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { collection, getDocs, query, where, addDoc, doc, updateDoc, increment, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Store, ItemType, PaymentType, PaymentMethod} from '../../lib/utils';
import toast from 'react-hot-toast';
import { Search, Plus, Minus, Trash2, RefreshCw } from 'lucide-react';


interface VocFormProps {
  store: Store;
  onSuccess: () => void;
}

const VocForm: React.FC<VocFormProps> = ({ store, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<ItemType>('Lens');
  const [selectedSubType, setSelectedSubType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      vocNumber: '',
      customerName: '',
      customerPhone: '',
      paymentType: 'Full' as PaymentType,
      totalAmount: 0,
      paidAmount: 0,
      balance: 0,
      depositAmount: 0,
      paymentMethod: 'Cash' as PaymentMethod,
      notes: '',
      items: [],
    },
  });

  // Initialize VOC number when form is mounted
  // useEffect(() => {
  //   setValue('vocNumber', generateVocNumber(store as Store));
  // }, [store, setValue]);

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items',
  });

  const paymentType = watch('paymentType');
  const selectedItems = watch('items');
  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  useEffect(() => {
    setValue('totalAmount', totalAmount);
    if (paymentType === 'Full') {
      setValue('paidAmount', totalAmount);
      setValue('balance', 0);
    } else {
      const depositAmount = watch('depositAmount') || 0;
      setValue('balance', totalAmount - depositAmount);
      setValue('paidAmount', depositAmount);
    }
  }, [totalAmount, paymentType, setValue, watch]);

  useEffect(() => {
    fetchItems();
  }, [store, selectedItemType, selectedSubType, selectedCategory]);

  const getCollectionName = () => {
    switch (selectedItemType) {
      case 'Lens': return 'lenses';
      case 'Frame': return 'frames';
      case 'Accessories': return 'accessories';
      case 'Contact Lens': return 'contactLenses';
      default: return 'lenses';
    }
  };

  const fetchItems = async () => {
    try {
      setInventoryLoading(true);
      
      let itemsQuery;
      
      if (selectedItemType === 'Lens') {
        itemsQuery = query(collection(db, 'lenses'));
      } else {
        itemsQuery = query(
          collection(db, getCollectionName()),
          where('store', '==', store)
        );
      }

      if (selectedItemType === 'Lens') {
        if (selectedSubType) {
          itemsQuery = query(itemsQuery, where('type', '==', selectedSubType));
        }
        if (selectedCategory) {
          itemsQuery = query(itemsQuery, where('category', '==', selectedCategory.toLowerCase()));
        }
      } 
      else if (selectedItemType === 'Frame' && selectedCategory) {
        itemsQuery = query(itemsQuery, where('category', '==', selectedCategory));
      }
      else if (selectedItemType === 'Contact Lens' && selectedCategory) {
        itemsQuery = query(itemsQuery, where('category', '==', selectedCategory));
      }

      const snapshot = await getDocs(itemsQuery);
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort items: in-stock items first, then alphabetically by name
      const sortedItems = itemsData.sort((a, b) => {
        // First sort by stock availability (items with qty > 0 come first)
        if ((a.qty > 0) && (b.qty <= 0)) return -1;
        if ((a.qty <= 0) && (b.qty > 0)) return 1;
        
        // Then sort alphabetically by name
        return a.name.localeCompare(b.name);
      });
      
      setItems(sortedItems);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleAddItem = (e: React.MouseEvent, item: any) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Stop event bubbling
    
    if (item.qty <= 0) {
      toast.error('This item is out of stock');
      return;
    }

    const existingItemIndex = selectedItems.findIndex(i => i.id === item.id);
    
    if (existingItemIndex !== -1) {
      if (selectedItems[existingItemIndex].quantity >= item.qty) {
        toast.error('Cannot exceed available quantity');
        return;
      }
      update(existingItemIndex, {
        ...selectedItems[existingItemIndex],
        quantity: selectedItems[existingItemIndex].quantity + 1,
      });
    } else {
      append({
        type: selectedItemType,
        id: item.id,
        name: item.name || '',
        quantity: 1,
        price: item.price || 0,
        category: item.category || '',
        details: {
          sph: item.sph || null,
          cyl: item.cyl || null,
          axis: item.axis || null,
          color: item.color || null,
          power: item.power || null,
        },
      });
    }
  };

  const handleQuantityChange = (index: number, change: number) => {
    const newQuantity = selectedItems[index].quantity + change;
    
    if (newQuantity <= 0) {
      remove(index);
      return;
    }

    const itemInStock = items.find(item => item.id === selectedItems[index].id);
    if (itemInStock && newQuantity > itemInStock.qty) {
      toast.error(`Only ${itemInStock.qty} available in stock`);
      return;
    }

    update(index, {
      ...selectedItems[index],
      quantity: newQuantity
    });
  };

  const validateItems = async (items: any[]) => {
    const invalidItems = [];
    
    for (const item of items) {
      const collectionName = (() => {
        switch (item.type) {
          case 'Lens': return 'lenses';
          case 'Frame': return 'frames';
          case 'Accessories': return 'accessories';
          case 'Contact Lens': return 'contactLenses';
          default: return 'lenses';
        }
      })();
      
      const itemRef = doc(db, collectionName, item.id);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        invalidItems.push(item.name);
      } else {
        const itemData = itemDoc.data();
        if (itemData.qty < item.quantity) {
          invalidItems.push(`${item.name} (insufficient quantity)`);
        }
      }
    }
    
    return invalidItems;
  };

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);

      if (!data.vocNumber.trim()) {
        toast.error('VOC number is required');
        return;
      }
      
      if (data.items.length === 0) {
        toast.error('Please select at least one item');
        return;
      }

      const invalidItems = await validateItems(data.items);
      if (invalidItems.length > 0) {
        toast.error(`Some items are no longer available or have insufficient quantity: ${invalidItems.join(', ')}`);
        return;
      }

      const vocData = {
        vocNumber: data.vocNumber || '',
        customerName: data.customerName || '',
        customerPhone: data.customerPhone || '',
        paymentType: data.paymentType || 'Full',
        totalAmount: data.totalAmount || 0,
        paidAmount: data.paidAmount || 0,
        balance: data.balance || 0,
        depositAmount: data.depositAmount || 0,
        paymentMethod: data.paymentMethod || 'Cash',
        notes: data.notes || '',
        items: data.items.map((item: any) => ({
          type: item.type || '',
          id: item.id || '',
          name: item.name || '',
          quantity: item.quantity || 0,
          price: item.price || 0,
          category: item.category || '',
          details: {
            sph: item.details?.sph || null,
            cyl: item.details?.cyl || null,
            axis: item.details?.axis || null,
            color: item.details?.color || null,
            power: item.details?.power || null,
          },
        })),
        store: store || '',
        staffEmail: user?.email || '',
        createdAt: serverTimestamp(),
      };

      const vocRef = await addDoc(collection(db, 'vouchers'), vocData);

      for (const item of data.items) {
        const collectionName = (() => {
          switch (item.type) {
            case 'Lens': return 'lenses';
            case 'Frame': return 'frames';
            case 'Accessories': return 'accessories';
            case 'Contact Lens': return 'contactLenses';
            default: return 'lenses';
          }
        })();

        const itemRef = doc(db, collectionName, item.id);
        
        try {
          await updateDoc(itemRef, {
            qty: increment(-item.quantity),
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          console.error(`Failed to update quantity for item ${item.name} (${item.id}):`, error);
        }
      }

      toast.success('VOC created successfully');
      
      // Reset form and generate new VOC number
      reset({
        vocNumber: '',
        customerName: '',
        customerPhone: '',
        paymentType: 'Full',
        totalAmount: 0,
        paidAmount: 0,
        balance: 0,
        depositAmount: 0,
        paymentMethod: 'Cash',
        notes: '',
        items: [],
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error creating VOC:', error);
      toast.error('Failed to create VOC. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = () => (
    searchTerm
      ? items.filter(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      : items
  );



  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Input
            label="VOC Number"
            {...register('vocNumber', { required: 'VOC number is required' })}
            error={errors.vocNumber?.message}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="absolute right-2 top-8"
           
            title="Generate new VOC number"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
        <Input
          label="Customer Name"
          {...register('customerName', { required: 'Customer name is required' })}
          error={errors.customerName?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Customer Phone"
          {...register('customerPhone')}
        />
        <Select
          label="Payment Type"
          options={[
            { value: 'Full', label: 'Full Payment' },
            { value: 'Deposit', label: 'Deposit' },
          ]}
          {...register('paymentType')}
        />
      </div>

      {paymentType === 'Deposit' && (
        <Input
          label="Deposit Amount"
          type="number"
          min={0}
          {...register('depositAmount', {
            valueAsNumber: true,
            validate: value => value > 0 || 'Deposit amount must be greater than 0',
          })}
          error={errors.depositAmount?.message}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Total Amount"
          type="number"
          value={totalAmount}
          disabled
        />
        <Input
          label="Paid Amount"
          type="number"
          value={paymentType === 'Full' ? totalAmount : watch('depositAmount') || 0}
          disabled
        />
        <Input
          label="Balance"
          type="number"
          value={paymentType === 'Full' ? 0 : totalAmount - (watch('depositAmount') || 0)}
          disabled
        />
      </div>

      <Select
        label="Payment Method"
        options={[
          { value: 'Cash', label: 'Cash' },
          { value: 'KPay', label: 'KPay' },
          { value: 'Yuan', label: 'Yuan' },
        ]}
        {...register('paymentMethod')}
      />

      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">Items</h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {['Lens', 'Frame', 'Accessories', 'Contact Lens'].map(type => (
            <Button
              key={type}
              type="button"
              variant={selectedItemType === type ? 'primary' : 'outline'}
              onClick={() => {
                setSelectedItemType(type as ItemType);
                setSelectedSubType('');
                setSelectedCategory('');
                setSearchTerm('');
              }}
              className="transition-all duration-200"
            >
              {type}
            </Button>
          ))}
        </div>

        {selectedItemType === 'Lens' && (
          <div className="space-y-4 mb-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={selectedSubType === '' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedSubType('');
                  setSelectedCategory('');
                }}
              >
                All Types
              </Button>
              <Button
                type="button"
                variant={selectedSubType === 'Single Vision' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedSubType('Single Vision');
                  setSelectedCategory('');
                }}
              >
                Single Vision
              </Button>
              <Button
                type="button"
                variant={selectedSubType === 'Bifocal' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedSubType('Bifocal');
                  setSelectedCategory('');
                }}
              >
                Bifocal
              </Button>
            </div>

            {selectedSubType === 'Single Vision' && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={selectedCategory === '' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('')}
                >
                  All
                </Button>
                {['bb 1.56', 'bb 1.61', 'bb 1.67', 'bbpg 1.56', 'bbpg 1.61', 'pg', 
                  'anti flash', 'anti glare', 'photo pink', 'photo blue', 'photo purple',
                  'photo brown', 'cr', 'mc', 'yangon order', 'error'].map(cat => (
                  <Button
                    key={cat}
                    type="button"
                    variant={selectedCategory === cat ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat.toUpperCase()}
                  </Button>
                ))}
              </div>
            )}

            {selectedSubType === 'Bifocal' && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={selectedCategory === '' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('')}
                >
                  All
                </Button>
                {['bbpgfuse', 'bbfuse', 'crfuse', 'mcfuse', 'pgfuse', 
                  'mcflattop', 'crflattop', 'bbpgflattop', 'bbflattop',
                  'yangon order', 'error'].map(cat => (
                  <Button
                    key={cat}
                    type="button"
                    variant={selectedCategory === cat ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat.toUpperCase()}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedItemType === 'Frame' && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              type="button"
              variant={selectedCategory === '' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('')}
            >
              All
            </Button>
            {['Eyeglasses', 'Sunglasses', 'Promotion', 'Ready', 'Ready BB'].map(cat => (
              <Button
                key={cat}
                type="button"
                variant={selectedCategory === cat ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        )}

        {selectedItemType === 'Contact Lens' && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              type="button"
              variant={selectedCategory === '' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('')}
            >
              All
            </Button>
            {['Original', 'Premium'].map(cat => (
              <Button
                key={cat}
                type="button"
                variant={selectedCategory === cat ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        )}

        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            className="pl-10"
            placeholder="Search items by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {inventoryLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredItems().length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems().map(item => (
              <div
                key={item.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors hover:border-blue-500 ${
                  item.qty <= 0 ? 'opacity-60' : ''
                }`}
                onClick={(e) => handleAddItem(e, item)}
              >
                <div className="flex justify-between">
                  <h3 className="font-medium">{item.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    item.qty > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {item.qty} in stock
                  </span>
                </div>
                
                {item.code && (
                  <p className="text-sm text-gray-600">Code: {item.code}</p>
                )}
                
                {selectedItemType === 'Lens' && (
                  <div className="text-sm text-gray-600 mt-1">
                    <p>SPH: {item.sph || '-'} | CYL: {item.cyl || '-'} | AXIS: {item.axis || '-'}</p>
                    {item.category && <p>Material: {item.category}</p>}
                  </div>
                )}
                
                {selectedItemType === 'Frame' && item.color && (
                  <p className="text-sm text-gray-600">Color: {item.color}</p>
                )}
                
                {selectedItemType === 'Contact Lens' && item.power && (
                  <p className="text-sm text-gray-600">Power: {item.power}</p>
                )}
                
                <div className="mt-2 flex justify-between items-center">
                  <span className="font-medium text-blue-600">
                    {new Intl.NumberFormat('my-MM', {
                      style: 'currency',
                      currency: 'MMK',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(item.price)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleAddItem(e, item)}
                    disabled={item.qty <= 0}
                    className="transition-transform hover:scale-105"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No items found. {searchTerm && 'Try a different search term.'}
          </div>
        )}

        {fields.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-2">Selected Items</h4>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium">{field.name}</p>
                      <p className="font-medium">
                        {new Intl.NumberFormat('my-MM', {
                          style: 'currency',
                          currency: 'MMK',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(field.price * field.quantity)}
                      </p>
                    </div>
                    
                    {field.details && (
                      <div className="text-sm text-gray-600 mt-1">
                        {field.type === 'Lens' && (
                          <p>SPH: {field.details.sph || '-'} | CYL: {field.details.cyl || '-'} | AXIS: {field.details.axis || '-'}</p>
                        )}
                        {field.type === 'Frame' && field.details.color && (
                          <p>Color: {field.details.color}</p>
                        )}
                        {field.type === 'Contact Lens' && field.details.power && (
                          <p>Power: {field.details.power}</p>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuantityChange(index, -1)}
                      >
                        <Minus size={16} />
                      </Button>
                      <span className="px-3 py-1 border rounded">{field.quantity}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuantityChange(index, 1)}
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="ml-4"
                    onClick={() => remove(index)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              
              <div className="flex justify-between items-center p-3 border-t mt-4">
                <span className="font-medium">Total:</span>
                <span className="font-bold text-lg">
                  {new Intl.NumberFormat('my-MM', {
                    style: 'currency',
                    currency: 'MMK',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Input
        label="Notes"
        {...register('notes')}
        placeholder="Any special instructions..."
      />

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset({
              vocNumber: generateVocNumber(store as Store),
              customerName: '',
              customerPhone: '',
              paymentType: 'Full',
              totalAmount: 0,
              paidAmount: 0,
              balance: 0,
              depositAmount: 0,
              paymentMethod: 'Cash',
              notes: '',
              items: [],
            });
          }}
        >
          Reset Form
        </Button>
        
        <Button
          type="submit"
      
          className="min-w-[120px]"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Processing...
            </div>
          ) : (
            'Create VOC'
          )}
        </Button>
      </div>
    </form>
  );
};

export default VocForm;