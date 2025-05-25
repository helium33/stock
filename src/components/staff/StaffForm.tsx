import React from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Staff, Store, STORES, UserRole } from '../../lib/utils';

interface StaffFormProps {
  onSubmit: (data: Staff) => void;
  initialData?: Staff;
  isSubmitting?: boolean;
}

const StaffForm: React.FC<StaffFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Staff>({
    defaultValues: initialData || {
      email: '',
      name: '',
      role: 'Staff',
      phone: '',
      store: 'win',
      active: true,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: 'Invalid email address',
            }
          })}
          error={errors.email?.message}
        />
        <Input
          label="Name"
          {...register('name', { required: 'Name is required' })}
          error={errors.name?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Role"
          options={[
            { value: 'Admin', label: 'Admin' },
            { value: 'Staff', label: 'Staff' },
          ]}
          {...register('role', { required: 'Role is required' })}
          error={errors.role?.message}
        />
        <Select
          label="Store"
          options={STORES.map(store => ({
            value: store,
            label: store.toUpperCase(),
          }))}
          {...register('store', { required: 'Store is required' })}
          error={errors.store?.message}
        />
      </div>

      <Input
        label="Phone"
        {...register('phone', { required: 'Phone number is required' })}
        error={errors.phone?.message}
      />

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="active"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          {...register('active')}
        />
        <label htmlFor="active" className="text-sm text-gray-700 dark:text-gray-300">
          Active Account
        </label>
      </div>

      <Button 
        type="submit" 
        className="w-full mt-6" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : initialData ? 'Update Staff' : 'Add Staff'}
      </Button>
    </form>
  );
};

export default StaffForm;