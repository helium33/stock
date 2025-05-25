import React from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Payment, PaymentMethod } from '../../lib/utils';

interface PaymentFormProps {
  onSubmit: (data: Payment) => void;
  initialData?: Payment;
  isSubmitting?: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Payment>({
    defaultValues: initialData || {
      customerId: '',
      customerName: '',
      orderId: '',
      depositAmount: 0,
      usedFromDeposit: 0,
      remainingDeposit: 0,
      totalPaid: 0,
      paymentMethod: 'Cash',
      date: new Date(),
      notes: '',
    },
  });

  const depositAmount = watch('depositAmount');
  const usedFromDeposit = watch('usedFromDeposit');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Customer Name"
          {...register('customerName', { required: 'Customer name is required' })}
          error={errors.customerName?.message}
        />
        <Input
          label="Order ID"
          {...register('orderId', { required: 'Order ID is required' })}
          error={errors.orderId?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Deposit Amount"
          type="number"
          min={0}
          {...register('depositAmount', { 
            required: 'Deposit amount is required',
            valueAsNumber: true,
            min: { value: 0, message: 'Deposit amount must be 0 or greater' }
          })}
          error={errors.depositAmount?.message}
        />
        <Input
          label="Used from Deposit"
          type="number"
          min={0}
          max={depositAmount}
          {...register('usedFromDeposit', { 
            required: 'Used amount is required',
            valueAsNumber: true,
            min: { value: 0, message: 'Used amount must be 0 or greater' },
            max: { value: depositAmount, message: 'Cannot exceed deposit amount' }
          })}
          error={errors.usedFromDeposit?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Remaining Deposit"
          type="number"
          value={depositAmount - usedFromDeposit}
          disabled
        />
        <Input
          label="Total Paid"
          type="number"
          min={0}
          {...register('totalPaid', { 
            required: 'Total paid is required',
            valueAsNumber: true,
            min: { value: 0, message: 'Total paid must be 0 or greater' }
          })}
          error={errors.totalPaid?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Payment Method"
          options={[
            { value: 'Cash', label: 'Cash' },
            { value: 'KPay', label: 'KPay' },
            { value: 'Yuan', label: 'Yuan' },
            { value: 'Bank Transfer', label: 'Bank Transfer' },
          ]}
          {...register('paymentMethod', { required: 'Payment method is required' })}
          error={errors.paymentMethod?.message}
        />
        <Input
          label="Date"
          type="date"
          {...register('date', { required: 'Date is required' })}
          error={errors.date?.message}
        />
      </div>

      <Input
        label="Notes"
        {...register('notes')}
        error={errors.notes?.message}
      />

      <Button 
        type="submit" 
        className="w-full mt-6" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : initialData ? 'Update Payment' : 'Add Payment'}
      </Button>
    </form>
  );
};

export default PaymentForm;