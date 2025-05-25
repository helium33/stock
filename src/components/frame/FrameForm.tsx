import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { FrameCategory, FrameColor, CancelReason } from '../../lib/utils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';

interface FrameFormProps {
  onSubmit: (data: FrameFormData) => void;
  initialData?: FrameFormData;
  isSubmitting?: boolean;
}

export interface FrameFormData {
  id?: string;
  code: string;
  name: string;
  category: FrameCategory;
  qty: number;
  price: number;
  imageUrl: string;
  colors: { [key in FrameColor]?: number };
  isCancelled?: boolean;
  cancelReason?: CancelReason;
  cancelNote?: string;
}

const FrameForm: React.FC<FrameFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const frameColors: FrameColor[] = [
    'Black', 'Gold', 'Silver', 'Brown', 'Blue', 
    'Red', 'Pink', 'Purple', 'Green', 'Other'
  ];

  const defaultColors = Object.fromEntries(frameColors.map(color => [color, 0])) as { [key in FrameColor]: number };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FrameFormData>({
    defaultValues: initialData || {
      code: '',
      name: '',
      category: 'Eyeglasses',
      qty: 0,
      price: 0,
      imageUrl: '',
      colors: defaultColors,
      isCancelled: false,
    },
  });

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(initialData?.imageUrl || '');

  const watchQty = watch('qty');
  const watchColors = watch('colors') || defaultColors;
  const isCancelled = watch('isCancelled');

  const handleColorChange = (color: FrameColor, value: number) => {
    const newColors = { ...defaultColors, ...watchColors, [color]: value };
    const totalColors = Object.values(newColors).reduce((sum, val) => sum + (val || 0), 0);
    
    if (totalColors <= watchQty) {
      setValue('colors', newColors);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploading(true);

      // Create a reference to the storage location
      const storageRef = ref(storage, `frames/${Date.now()}-${file.name}`);

      // Upload the file
      await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadUrl = await getDownloadURL(storageRef);

      // Update form
      setValue('imageUrl', downloadUrl);
      setPreviewUrl(downloadUrl);

      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const cancelReasons = [
    { value: 'Customer Dissatisfied', label: 'Customer Dissatisfied' },
    { value: 'Error in Order', label: 'Error in Order' },
    { value: 'Out of Stock', label: 'Out of Stock' },
    { value: 'Price Dispute', label: 'Price Dispute' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Code"
          {...register('code', { required: 'Code is required' })}
          error={errors.code?.message}
        />
        <Input
          label="Name"
          {...register('name', { required: 'Name is required' })}
          error={errors.name?.message}
        />
      </div>

      <Select
        label="Category"
        options={[
          { value: 'Eyeglasses', label: 'Eyeglasses' },
          { value: 'Sunglasses', label: 'Sunglasses' },
          { value: 'Promotion', label: 'Promotion' },
          { value: 'Ready', label: 'Ready' },
          { value: 'Ready BB', label: 'Ready BB' },
          { value: 'Error', label: 'Error' },
        ]}
        {...register('category', { required: 'Category is required' })}
        error={errors.category?.message}
      />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Frame Image
        </label>
        <div className="flex flex-col items-center p-4 border-2 border-dashed rounded-lg">
          {previewUrl && (
            <img 
              src={previewUrl} 
              alt="Frame preview" 
              className="w-40 h-40 object-cover mb-4 rounded-lg"
            />
          )}
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload Image'}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </label>
          <input
            type="hidden"
            {...register('imageUrl', { required: 'Image is required' })}
          />
          {errors.imageUrl && (
            <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Total Quantity"
          type="number"
          min={0}
          {...register('qty', { 
            required: 'Quantity is required',
            valueAsNumber: true, 
            min: { value: 0, message: 'Quantity must be 0 or greater' } 
          })}
          error={errors.qty?.message}
        />
        <Input
          label="Price"
          type="number"
          min={0}
          {...register('price', { 
            required: 'Price is required',
            valueAsNumber: true, 
            min: { value: 0, message: 'Price must be 0 or greater' } 
          })}
          error={errors.price?.message}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Color Distribution (Total: {Object.values(watchColors).reduce((sum, val) => sum + (val || 0), 0)})
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {frameColors.map((color) => (
            <div key={color} className="space-y-1">
              <label className="block text-sm text-gray-600 dark:text-gray-400">
                {color}
              </label>
              <input
                type="number"
                min={0}
                max={watchQty}
                value={watchColors[color] || 0}
                onChange={(e) => handleColorChange(color, parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border rounded"
              />
            </div>
          ))}
        </div>
        {Object.values(watchColors).reduce((sum, val) => sum + (val || 0), 0) > watchQty && (
          <p className="text-sm text-red-600">Total color quantity cannot exceed total quantity</p>
        )}
      </div>

      <div className="space-y-4 border-t pt-4 mt-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isCancelled"
            {...register('isCancelled')}
            className="rounded border-gray-300"
          />
          <label htmlFor="isCancelled" className="text-sm font-medium">
            Order Cancelled
          </label>
        </div>

        {isCancelled && (
          <>
            <Select
              label="Cancellation Reason"
              options={cancelReasons}
              {...register('cancelReason', { 
                required: isCancelled ? 'Cancellation reason is required' : false 
              })}
              error={errors.cancelReason?.message}
            />
            
            <Input
              label="Cancellation Note"
              {...register('cancelNote', {
                required: isCancelled ? 'Cancellation note is required' : false
              })}
              error={errors.cancelNote?.message}
            />
          </>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full mt-6" 
        disabled={isSubmitting || uploading}
      >
        {isSubmitting ? 'Saving...' : initialData ? 'Update Frame' : 'Add Frame'}
      </Button>
    </form>
  );
};

export default FrameForm;