import React from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface AccessoriesFormProps {
  onSubmit: (data: AccessoriesFormData) => void;
  initialData?: AccessoriesFormData;
  isSubmitting?: boolean;
}

export interface AccessoriesFormData {
  id?: string;
  code: string;
  name: string;
  qty: number;
  price: number;
  imageUrl: string;
}

const AccessoriesForm: React.FC<AccessoriesFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccessoriesFormData>({
    defaultValues: initialData || {
      code: '',
      name: '',
      qty: 0,
      price: 0,
      imageUrl: '',
    },
  });

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

      <Input
        label="Image URL"
        {...register('imageUrl', { required: 'Image URL is required' })}
        error={errors.imageUrl?.message}
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

      <Button 
        type="submit" 
        className="w-full mt-6" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : initialData ? 'Update Accessory' : 'Add Accessory'}
      </Button>
    </form>
  );
};

export default AccessoriesForm;