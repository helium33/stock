import React from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { CustomerType, CustomerGender, STORES, Store } from '../../lib/utils';

interface CustomerFormProps {
  onSubmit: (data: CustomerFormData) => void;
  initialData?: CustomerFormData;
  isSubmitting?: boolean;
}

export interface CustomerFormData {
  id?: string;
  number: string;
  name: string;
  type: CustomerType;
  gender: CustomerGender;
  age: number;
  phone: string;
  address?: string;
  wechatName?: string;
  store: Store;
  date: string;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    defaultValues: initialData || {
      number: '',
      name: '',
      type: 'Original',
      gender: 'Male',
      age: 0,
      phone: '',
      address: '',
      wechatName: '',
      store: 'win',
      date: new Date().toISOString().split('T')[0],
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Customer Number"
          {...register('number', { required: 'Customer number is required' })}
          error={errors.number?.message}
        />
        <Input
          label="Name"
          {...register('name', { required: 'Name is required' })}
          error={errors.name?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Type"
          options={[
            { value: 'Original', label: 'Original' },
            { value: 'Membership', label: 'Membership' },
          ]}
          {...register('type', { required: 'Type is required' })}
          error={errors.type?.message}
        />
        
        <Select
          label="Gender"
          options={[
            { value: 'Male', label: 'Male' },
            { value: 'Female', label: 'Female' },
          ]}
          {...register('gender', { required: 'Gender is required' })}
          error={errors.gender?.message}
        />

        <Input
          label="Age"
          type="number"
          min={0}
          {...register('age', { 
            required: 'Age is required',
            valueAsNumber: true,
            min: { value: 0, message: 'Age must be 0 or greater' }
          })}
          error={errors.age?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Phone"
          {...register('phone', { required: 'Phone number is required' })}
          error={errors.phone?.message}
        />
        <Input
          label="Address"
          {...register('address')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="WeChat Name"
          {...register('wechatName')}
        />
        <Select
          label="Store"
          options={STORES.map(store => ({
            value: store,
            label: store.charAt(0).toUpperCase() + store.slice(1)
          }))}
          {...register('store', { required: 'Store is required' })}
          error={errors.store?.message}
        />
        <Input
          label="Date"
          type="date"
          {...register('date', { required: 'Date is required' })}
          error={errors.date?.message}
        />
      </div>

      <Button 
        type="submit" 
        className="w-full mt-6" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : initialData ? 'Update Customer' : 'Add Customer'}
      </Button>
    </form>
  );
};

export default CustomerForm;