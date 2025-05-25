import React from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { ContactLensCategory, CancelReason } from '../../lib/utils';

interface ContactLensFormProps {
  onSubmit: (data: ContactLensFormData) => void;
  initialData?: ContactLensFormData;
  isSubmitting?: boolean;
}

export interface ContactLensFormData {
  id?: string;
  code: string;
  name: string;
  category: ContactLensCategory;
  qty: number;
  price: number;
  imageUrl: string;
  power?: string;
  isCancelled?: boolean;
  cancelReason?: CancelReason;
  cancelNote?: string;
}

const ContactLensForm: React.FC<ContactLensFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ContactLensFormData>({
    defaultValues: initialData || {
      code: '',
      name: '',
      category: 'Original',
      qty: 0,
      price: 0,
      imageUrl: '',
      isCancelled: false,
    },
  });

  const isCancelled = watch('isCancelled');

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
          { value: 'Original', label: 'Original' },
          { value: 'Premium', label: 'Premium' },
        ]}
        {...register('category', { required: 'Category is required' })}
        error={errors.category?.message}
      />

      <Input
        label="Image URL"
        {...register('imageUrl', { required: 'Image URL is required' })}
        error={errors.imageUrl?.message}
      />

      <Input
        label="Power"
        type="text"
        {...register('power')}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Quantity"
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
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : initialData ? 'Update Contact Lens' : 'Add Contact Lens'}
      </Button>
    </form>
  );
};

export default ContactLensForm;