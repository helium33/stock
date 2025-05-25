import React from 'react';
import Button from '../ui/Button';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  onDelete: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  itemName,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Confirm Delete
        </h3>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Are you sure you want to delete <span className="font-medium">{itemName}</span>? This action cannot be undone.
        </p>
        
        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="danger"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;