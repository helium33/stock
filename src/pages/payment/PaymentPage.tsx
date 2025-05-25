import React, { useState, useEffect } from 'react';
import { PlusCircle, FileDown, Edit, Trash2 } from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import DataTable from '../../components/tables/DataTable';
import FormModal from '../../components/modals/FormModal';
import PaymentForm from '../../components/payment/PaymentForm';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import toast from 'react-hot-toast';
import { Payment, formatCurrency, exportToExcel } from '../../lib/utils';
import { format } from 'date-fns';

const PaymentPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      const paymentsQuery = query(
        collection(db, 'payments'),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(paymentsQuery);
      
      const paymentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      } as Payment));
      
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = () => {
    setEditingPayment(null);
    setIsFormModalOpen(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setIsFormModalOpen(true);
  };

  const handleDeletePayment = (payment: Payment) => {
    setPaymentToDelete(payment);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: Payment) => {
    try {
      setIsSubmitting(true);
      
      if (editingPayment?.id) {
        const paymentRef = doc(db, 'payments', editingPayment.id);
        await updateDoc(paymentRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
        
        setPayments(prevPayments => 
          prevPayments.map(payment => 
            payment.id === editingPayment.id ? { ...data, id: payment.id } : payment
          )
        );
        
        toast.success('Payment updated successfully');
      } else {
        const newPayment = {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'payments'), newPayment);
        
        setPayments(prevPayments => [...prevPayments, { ...newPayment, id: docRef.id }]);
        
        toast.success('Payment added successfully');
      }
      
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Failed to save payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!paymentToDelete?.id) return;
    
    try {
      await deleteDoc(doc(db, 'payments', paymentToDelete.id));
      
      setPayments(prevPayments => 
        prevPayments.filter(payment => payment.id !== paymentToDelete.id)
      );
      
      toast.success('Payment deleted successfully');
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
    }
  };

  const handleExportExcel = () => {
    const data = payments.map(payment => ({
      'Customer Name': payment.customerName,
      'Order ID': payment.orderId,
      'Deposit Amount': payment.depositAmount,
      'Used from Deposit': payment.usedFromDeposit,
      'Remaining Deposit': payment.remainingDeposit,
      'Total Paid': payment.totalPaid,
      'Payment Method': payment.paymentMethod,
      'Date': format(payment.date, 'PPP'),
      'Notes': payment.notes || '',
    }));

    exportToExcel(data, 'payments');
    toast.success('Exported to Excel successfully');
  };

  const handleExportPDF = () => {
    const data = payments.map(payment => ({
      'Customer Name': payment.customerName,
      'Order ID': payment.orderId,
      'Deposit Amount': formatCurrency(payment.depositAmount),
      'Used from Deposit': formatCurrency(payment.usedFromDeposit),
      'Remaining Deposit': formatCurrency(payment.remainingDeposit),
      'Total Paid': formatCurrency(payment.totalPaid),
      'Payment Method': payment.paymentMethod,
      'Date': format(payment.date, 'PPP'),
    }));

    const columns = [
      'Customer Name',
      'Order ID',
      'Deposit Amount',
      'Used from Deposit',
      'Remaining Deposit',
      'Total Paid',
      'Payment Method',
      'Date',
    ];

    exportToPDF(data, columns, 'payments');
    toast.success('Exported to PDF successfully');
  };

  const paymentColumns = [
    { key: 'customerName', header: 'Customer Name', sortable: true },
    { key: 'orderId', header: 'Order ID' },
    { 
      key: 'depositAmount', 
      header: 'Deposit Amount',
      render: (row: Payment) => formatCurrency(row.depositAmount)
    },
    { 
      key: 'usedFromDeposit', 
      header: 'Used from Deposit',
      render: (row: Payment) => formatCurrency(row.usedFromDeposit)
    },
    { 
      key: 'remainingDeposit', 
      header: 'Remaining Deposit',
      render: (row: Payment) => formatCurrency(row.remainingDeposit)
    },
    { 
      key: 'totalPaid', 
      header: 'Total Paid',
      render: (row: Payment) => formatCurrency(row.totalPaid)
    },
    { key: 'paymentMethod', header: 'Payment Method' },
    { 
      key: 'date', 
      header: 'Date',
      render: (row: Payment) => format(row.date, 'PPP')
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Payment) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleEditPayment(row)}
            className="p-1"
          >
            <Edit size={16} />
            <span className="sr-only">Edit</span>
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => handleDeletePayment(row)}
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
      <Header title="Payment Tracking" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Payments
          </h2>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="flex items-center gap-1"
            >
              <FileDown size={16} />
              Export Excel
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="flex items-center gap-1"
            >
              <FileDown size={16} />
              Export PDF
            </Button>
            
            <Button
              variant="success"
              size="sm"
              onClick={handleAddPayment}
              className="flex items-center gap-1"
            >
              <PlusCircle size={16} />
              Add Payment
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DataTable 
            data={payments} 
            columns={paymentColumns} 
            filterKey="customerName"
            itemsPerPage={10}
          />
        )}
      </div>
      
      <FormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingPayment(null);
        }}
        title={editingPayment ? 'Edit Payment' : 'Add Payment'}
      >
        <PaymentForm
          onSubmit={handleFormSubmit}
          initialData={editingPayment || undefined}
          isSubmitting={isSubmitting}
        />
      </FormModal>
      
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        itemName={`payment for ${paymentToDelete?.customerName || ''}`}
        onDelete={confirmDelete}
      />
    </div>
  );
};

export default PaymentPage;