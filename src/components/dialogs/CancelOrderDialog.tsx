import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Input from '../ui/Input';
import { CancelReason } from '../../lib/utils';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface CancelOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  onConfirm: (reason: CancelReason, note: string) => void;
}

const CancelOrderDialog: React.FC<CancelOrderDialogProps> = ({
  isOpen,
  onClose,
  orderNumber,
  onConfirm,
}) => {
  const [reason, setReason] = useState<CancelReason>('Customer Dissatisfied');
  const [note, setNote] = useState('');
  const { isAdmin, user } = useAuth();

  if (!isOpen || !isAdmin) return null;

  const cancelReasons: { value: CancelReason; label: string }[] = [
    { value: 'Customer Dissatisfied', label: 'Customer Dissatisfied' },
    { value: 'Error in Order', label: 'Error in Order' },
    { value: 'Out of Stock', label: 'Out of Stock' },
    { value: 'Price Dispute', label: 'Price Dispute' },
    { value: 'Other', label: 'Other' },
  ];

  const handleConfirm = async () => {
    try {
      // Create notification for all users
      await addDoc(collection(db, 'notifications'), {
        type: 'System',
        title: 'Order Cancelled',
        message: `Order #${orderNumber} was cancelled by ${user?.email}. Reason: ${reason}`,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      // Log the cancellation
      await addDoc(collection(db, 'activityLogs'), {
        action: 'Order Cancelled',
        details: `Order #${orderNumber} - ${reason}`,
        note,
        staffId: user?.uid,
        staffEmail: user?.email,
        timestamp: serverTimestamp(),
      });

      onConfirm(reason, note);
      toast.success('Order cancelled successfully');
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Cancel Order #{orderNumber}
        </h3>
        
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to cancel this order? This action cannot be undone.
          </p>
          
          <Select
            label="Cancellation Reason"
            options={cancelReasons}
            value={reason}
            onChange={(e) => setReason(e.target.value as CancelReason)}
          />
          
          <Input
            label="Additional Notes"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter any additional details about the cancellation..."
          />
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              type="button" 
              variant="outline"
              onClick={onClose}
            >
              No, Keep Order
            </Button>
            <Button 
              type="button" 
              variant="danger"
              onClick={handleConfirm}
            >
              Yes, Cancel Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelOrderDialog;