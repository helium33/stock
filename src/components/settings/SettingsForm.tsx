import React from 'react';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { StoreSettings, SystemStatus, PaymentMethod, Currency } from '../../lib/utils';

interface SettingsFormProps {
  onSubmit: (data: StoreSettings) => void;
  initialData?: StoreSettings;
  isSubmitting?: boolean;
}

const SettingsForm: React.FC<SettingsFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StoreSettings>({
    defaultValues: initialData || {
      name: '',
      address: '',
      phone: '',
      email: '',
      systemStatus: 'open',
      defaultPaymentMethods: ['Cash'],
      currency: 'MMK',
    },
  });

  const paymentMethods: PaymentMethod[] = ['Cash', 'KPay', 'Yuan', 'Bank Transfer'];
  const currencies: Currency[] = ['MMK', 'CNY', 'USD'];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Status Control
        </h3>
        
        <div className="space-y-4">
          <Select
            label="System Status"
            options={[
              { value: 'open', label: 'Open (အသုံးပြုနိုင်)' },
              { value: 'closed', label: 'Closed (Maintenance Mode / ခေတ္တပိတ်)' },
            ]}
            {...register('systemStatus', { required: 'System status is required' })}
            error={errors.systemStatus?.message}
          />
          
          <Input
            label="Status Note (Optional)"
            {...register('statusNote')}
            placeholder="Enter a message for staff members..."
          />
        </div>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Payment Settings
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Default Payment Methods
            </label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => (
                <label
                  key={method}
                  className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    value={method}
                    {...register('defaultPaymentMethods')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{method}</span>
                </label>
              ))}
            </div>
          </div>

          <Select
            label="Default Currency"
            options={currencies.map(currency => ({
              value: currency,
              label: currency
            }))}
            {...register('currency', { required: 'Currency is required' })}
            error={errors.currency?.message}
          />
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Store Information
        </h3>
        
        <div className="space-y-4">
          <Input
            label="Store Name"
            {...register('name', { required: 'Store name is required' })}
            error={errors.name?.message}
          />

          <Input
            label="Phone"
            {...register('phone', { required: 'Phone number is required' })}
            error={errors.phone?.message}
          />

          <Input
            label="Address"
            {...register('address', { required: 'Address is required' })}
            error={errors.address?.message}
          />

          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />

          <Input
            label="Logo URL"
            {...register('logo')}
            error={errors.logo?.message}
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  );
};

export default SettingsForm;