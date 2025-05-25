import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import ExpenseForm, { ExpenseFormData } from '../../components/expense/ExpenseForm';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseFormData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseFormData | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseFormData | null>(null);
  
  useEffect(() => {
    fetchExpenses();
  }, []);
  
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      
      const expenseQuery = query(
        collection(db, 'expenses'),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(expenseQuery);
      
      const expensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as ExpenseFormData));
      
      setExpenses(expensesData);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddExpense = () => {
    setEditingExpense(null);
    setIsFormModalOpen(true);
  };
  
  const handleEditExpense = (expense: ExpenseFormData) => {
    setEditingExpense(expense);
    setIsFormModalOpen(true);
  };
  
  const handleDeleteExpense = (expense: ExpenseFormData) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };
  
  const handleFormSubmit = async (data: ExpenseFormData) => {
    try {
      setIsSubmitting(true);
      
      if (editingExpense?.id) {
        const expenseRef = doc(db, 'expenses', editingExpense.id);
        await updateDoc(expenseRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
        
        setExpenses(prevExpenses => 
          prevExpenses.map(expense => 
            expense.id === editingExpense.id ? { ...data, id: expense.id } : expense
          )
        );
        
        toast.success('Expense updated successfully');
      } else {
        const newExpense = {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'expenses'), newExpense);
        
        setExpenses(prevExpenses => [...prevExpenses, { ...newExpense, id: docRef.id }]);
        
        toast.success('Expense added successfully');
      }
      
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const confirmDelete = async () => {
    if (!expenseToDelete?.id) return;
    
    try {
      await deleteDoc(doc(db, 'expenses', expenseToDelete.id));
      
      setExpenses(prevExpenses => 
        prevExpenses.filter(expense => expense.id !== expenseToDelete.id)
      );
      
      toast.success('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };
  
  const expenseColumns = [
    { key: 'date', header: 'Date', render: (row: ExpenseFormData) => format(new Date(row.date), 'PPP') },
    { key: 'description', header: 'Description' },
    { key: 'amount', header: 'Amount', render: (row: ExpenseFormData) => formatCurrency(row.amount) },
    { key: 'paymentMode', header: 'Payment Mode' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: ExpenseFormData) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleEditExpense(row)}
            className="p-1"
          >
            <Edit size={16} />
            <span className="sr-only">Edit</span>
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => handleDeleteExpense(row)}
            className="p-1"
          >
            <Trash2 size={16} />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <Header title="Expenses Management" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Expenses
          </h2>
          
          <Button
            variant="success"
            size="sm"
            onClick={handleAddExpense}
            className="flex items-center gap-1"
          >
            <PlusCircle size={16} />
            Add Expense
          </Button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DataTable 
            data={expenses} 
            columns={expenseColumns} 
            filterKey="description"
            itemsPerPage={10}
          />
        )}
      </div>
      
      <FormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingExpense(null);
        }}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
      >
        <ExpenseForm
          onSubmit={handleFormSubmit}
          initialData={editingExpense || undefined}
          isSubmitting={isSubmitting}
        />
      </FormModal>
      
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        itemName={expenseToDelete?.description || ''}
        onDelete={confirmDelete}
      />
    </div>
  );
};

export default ExpensesPage;