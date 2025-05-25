import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface SellItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  maxQuantity: number;
  onSell: (quantity: number) => void;
}

const SellItemDialog: React.FC<SellItemDialogProps> = ({
  isOpen,
  onClose,
  itemName,
  maxQuantity,
  onSell,
}) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      quantity: 1,
    },
  });

  const onSubmit = (data: { quantity: number }) => {
    onSell(data.quantity);
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sell {itemName}
        </h3>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={`Quantity (max: ${maxQuantity})`}
            type="number"
            min={1}
            max={maxQuantity}
            {...register('quantity', {
              required: 'Quantity is required',
              valueAsNumber: true,
              min: { value: 1, message: 'Quantity must be at least 1' },
              max: { value: maxQuantity, message: `Quantity cannot exceed ${maxQuantity}` },
            })}
            error={errors.quantity?.message}
          />
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Sell
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SellItemDialog;