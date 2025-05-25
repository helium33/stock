import React from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormData) => void;
  initialData?: ExpenseFormData;
  isSubmitting?: boolean;
}

export interface ExpenseFormData {
  id?: string;
  description: string;
  amount: number;
  paymentMode: string;
  date: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    defaultValues: initialData || {
      description: '',
      amount: 0,
      paymentMode: 'Cash',
      date: new Date().toISOString().substring(0, 10),
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Description"
        {...register('description', { required: 'Description is required' })}
        error={errors.description?.message}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Amount"
          type="number"
          min={0}
          {...register('amount', { 
            required: 'Amount is required',
            valueAsNumber: true, 
            min: { value: 0, message: 'Amount must be 0 or greater' } 
          })}
          error={errors.amount?.message}
        />
        <Select
          label="Payment Mode"
          options={[
            { value: 'Cash', label: 'Cash' },
            { value: 'Bank Transfer', label: 'Bank Transfer' },
            { value: 'Mobile Payment', label: 'Mobile Payment' },
            { value: 'Other', label: 'Other' },
          ]}
          {...register('paymentMode', { required: 'Payment mode is required' })}
          error={errors.paymentMode?.message}
        />
      </div>

      <Input
        label="Date"
        type="date"
        {...register('date', { required: 'Date is required' })}
        error={errors.date?.message}
      />

      <Button 
        type="submit" 
        className="w-full mt-6" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : initialData ? 'Update Expense' : 'Add Expense'}
      </Button>
    </form>
  );
};

export default ExpenseForm;