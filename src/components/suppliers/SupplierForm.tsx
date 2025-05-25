import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Supplier } from '../../lib/utils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';

interface SupplierFormProps {
  onSubmit: (data: Supplier) => void;
  initialData?: Supplier;
  isSubmitting?: boolean;
}

const SupplierForm: React.FC<SupplierFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(initialData?.imageUrl || '');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Supplier>({
    defaultValues: initialData || {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      paymentTerms: '',
      notes: '',
      imageUrl: '',
    },
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const storageRef = ref(storage, `suppliers/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Supplier Logo/Image
        </label>
        <div className="flex flex-col items-center p-4 border-2 border-dashed rounded-lg">
          {previewUrl && (
            <img 
              src={previewUrl} 
              alt="Supplier preview" 
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
            {...register('imageUrl')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Supplier Name"
          {...register('name', { required: 'Supplier name is required' })}
          error={errors.name?.message}
        />
        <Input
          label="Contact Person"
          {...register('contactPerson', { required: 'Contact person is required' })}
          error={errors.contactPerson?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Phone"
          {...register('phone', { required: 'Phone number is required' })}
          error={errors.phone?.message}
        />
        <Input
          label="Email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
        />
      </div>

      <Input
        label="Address"
        {...register('address', { required: 'Address is required' })}
        error={errors.address?.message}
      />

      <Input
        label="Payment Terms"
        {...register('paymentTerms')}
        error={errors.paymentTerms?.message}
      />

      <Input
        label="Notes"
        {...register('notes')}
        error={errors.notes?.message}
      />

      <Button 
        type="submit" 
        className="w-full mt-6" 
        disabled={isSubmitting || uploading}
      >
        {isSubmitting ? 'Saving...' : initialData ? 'Update Supplier' : 'Add Supplier'}
      </Button>
    </form>
  );
};

export default SupplierForm;