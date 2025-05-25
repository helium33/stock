import React from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { LensType, BifocalType, CancelReason } from '../../lib/utils';

interface LensFormProps {
  onSubmit: (data: LensFormData) => void;
  initialData?: LensFormData;
  isSubmitting?: boolean;
}

export interface LensFormData {
  id?: string;
  code: string;
  name: string;
  type: LensType;
  category: string;
  bifocalType?: BifocalType;
  qty: number;
  price: number;
  sph?: string;
  cyl?: string;
  axis?: string;
  isCancelled?: boolean;
  cancelReason?: CancelReason;
  cancelNote?: string;
}

const LensForm: React.FC<LensFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LensFormData>({
    defaultValues: initialData || {
      code: '',
      name: '',
      type: 'Single Vision',
      category: '',
      qty: 0,
      price: 0,
      isCancelled: false,
    },
  });

  const lensType = watch('type');
  const isCancelled = watch('isCancelled');

  const singleVisionCategories = [
    { value: 'bb 1.56', label: 'BB 1.56' },
    { value: 'bb 1.61', label: 'BB 1.61' },
    { value: 'bb 1.67', label: 'BB 1.67' },
    { value: 'bbpg 1.56', label: 'BBPG 1.56' },
    { value: 'bbpg 1.61', label: 'BBPG 1.61' },
    { value: 'pg', label: 'PG' },
    { value: 'anti flash', label: 'Anti Flash' },
    { value: 'anti glare', label: 'Anti Glare' },
    { value: 'photo pink', label: 'Photo Pink' },
    { value: 'photo blue', label: 'Photo Blue' },
    { value: 'photo purple', label: 'Photo Purple' },
    { value: 'photo brown', label: 'Photo Brown' },
    { value: 'cr', label: 'CR' },
    { value: 'mc', label: 'MC' },
    { value: 'yangon order', label: 'Yangon Order' },
    { value: 'error', label: 'Error' },
  ];

  const bifocalFuseCategories = [
    { value: 'bbpgfuse', label: 'BBPG Fuse' },
    { value: 'bbfuse', label: 'BB Fuse' },
    { value: 'crfuse', label: 'CR Fuse' },
    { value: 'mcfuse', label: 'MC Fuse' },
    { value: 'pgfuse', label: 'PG Fuse' },
    { value: 'yangon order', label: 'Yangon Order' },
    { value: 'error', label: 'Error' },
  ];

  const bifocalFlattopCategories = [
    { value: 'mcflattop', label: 'MC Flattop' },
    { value: 'crflattop', label: 'CR Flattop' },
    { value: 'bbpgflattop', label: 'BBPG Flattop' },
    { value: 'bbflattop', label: 'BB Flattop' },
    { value: 'yangon order', label: 'Yangon Order' },
    { value: 'error', label: 'Error' },
  ];

  const cancelReasons = [
    { value: 'Customer Dissatisfied', label: 'Customer Dissatisfied' },
    { value: 'Error in Order', label: 'Error in Order' },
    { value: 'Out of Stock', label: 'Out of Stock' },
    { value: 'Price Dispute', label: 'Price Dispute' },
    { value: 'Other', label: 'Other' },
  ];

  const bifocalType = watch('bifocalType');

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Type"
          options={[
            { value: 'Single Vision', label: 'Single Vision' },
            { value: 'Bifocal', label: 'Bifocal' },
          ]}
          {...register('type', { required: 'Type is required' })}
          error={errors.type?.message}
        />

        {lensType === 'Bifocal' && (
          <Select
            label="Bifocal Type"
            options={[
              { value: 'Fuse', label: 'Fuse' },
              { value: 'Flattop', label: 'Flattop' },
            ]}
            {...register('bifocalType', { required: 'Bifocal type is required' })}
            error={errors.bifocalType?.message}
          />
        )}

        <Select
          label="Category"
          options={
            lensType === 'Single Vision'
              ? singleVisionCategories
              : bifocalType === 'Fuse'
              ? bifocalFuseCategories
              : bifocalFlattopCategories
          }
          {...register('category', { required: 'Category is required' })}
          error={errors.category?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="SPH"
          type="text"
          {...register('sph')}
        />
        <Input
          label="CYL"
          type="text"
          {...register('cyl')}
        />
        <Input
          label="Axis"
          type="text"
          {...register('axis')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Quantity"
          type="number"
          min={0}
          step={0.5}
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
        {isSubmitting ? 'Saving...' : initialData ? 'Update Lens' : 'Add Lens'}
      </Button>
    </form>
  );
};

export default LensForm;