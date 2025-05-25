import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import DataTable from '../../components/tables/DataTable';
import Button from '../../components/ui/Button';
import FormModal from '../../components/modals/FormModal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { formatCurrency } from '../../lib/utils';
import { exportToGoogleSheets } from '../../lib/exportUtils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { FileDown } from 'lucide-react';

const DepositsPage: React.FC = () => {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('pending');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'KPay' | 'Yuan'>('Cash');

  useEffect(() => {
    fetchDeposits();
  }, [filter]);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      
      const depositsQuery = query(
        collection(db, 'vouchers'),
        where('paymentType', '==', 'Deposit'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(depositsQuery);
      
      const depositsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const isPaid = (data.depositAmount || 0) >= data.totalAmount;
        return {
          id: doc.id,
          vocNumber: data.vocNumber,
          customerName: data.customerName,
          depositAmount: data.depositAmount || 0,
          totalAmount: data.totalAmount,
          remainingAmount: data.totalAmount - (data.depositAmount || 0),
          date: data.createdAt.toDate(),
          status: isPaid ? 'paid' : 'pending',
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate?.toDate(),
        };
      });

      // Filter based on status
      const filteredDeposits = filter === 'all' 
        ? depositsData 
        : depositsData.filter(deposit => deposit.status === filter);
      
      setDeposits(filteredDeposits);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast.error('Failed to fetch deposits');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = (deposit: any) => {
    setEditingDeposit(deposit);
    setPaymentAmount(deposit.remainingAmount);
    setPaymentMethod(deposit.paymentMethod);
    setEditModalOpen(true);
  };

  const handleUpdatePayment = async () => {
    if (!editingDeposit) return;

    try {
      const vocRef = doc(db, 'vouchers', editingDeposit.id);
      
      const updateData = {
        depositAmount: editingDeposit.depositAmount + paymentAmount,
        paymentMethod,
        paymentDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(vocRef, updateData);
      await fetchDeposits();

      toast.success('Payment updated successfully');
      setEditModalOpen(false);
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    }
  };

  const handleExportToGoogleSheets = () => {
    const data = deposits.map(deposit => ({
      'VOC Number': deposit.vocNumber,
      'Customer Name': deposit.customerName,
      'Deposit Amount': deposit.depositAmount,
      'Total Amount': deposit.totalAmount,
      'Remaining Amount': deposit.remainingAmount,
      'Status': deposit.status === 'paid' ? 'ပေးချေပြီး' : 'ပေးချေရန်ကျန်',
      'Payment Method': deposit.paymentMethod,
      'Date': format(deposit.date, 'yyyy-MM-dd'),
      'Payment Date': deposit.paymentDate ? format(deposit.paymentDate, 'yyyy-MM-dd') : '-'
    }));

    exportToGoogleSheets(data);
  };

  const columns = [
    { key: 'vocNumber', header: 'VOC Number', sortable: true },
    { key: 'customerName', header: 'Customer Name', sortable: true },
    { 
      key: 'depositAmount', 
      header: 'Deposit Amount',
      render: (row: any) => formatCurrency(row.depositAmount)
    },
    { 
      key: 'totalAmount', 
      header: 'Total Amount',
      render: (row: any) => formatCurrency(row.totalAmount)
    },
    { 
      key: 'remainingAmount', 
      header: 'Remaining',
      render: (row: any) => formatCurrency(row.remainingAmount)
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          row.status === 'paid'
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        }`}>
          {row.status === 'paid' ? 'ပေးချေပြီး' : 'ပေးချေရန်ကျန်'}
        </span>
      )
    },
    { key: 'paymentMethod', header: 'Payment Method' },
    { 
      key: 'date', 
      header: 'Deposit Date',
      render: (row: any) => format(row.date, 'yyyy-MM-dd')
    },
    { 
      key: 'paymentDate', 
      header: 'Payment Date',
      render: (row: any) => row.paymentDate ? format(row.paymentDate, 'yyyy-MM-dd') : '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        row.status === 'pending' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditPayment(row)}
          >
            Update Payment
          </Button>
        )
      )
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <Header title="Deposits Management" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <Button
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
            >
              All
            </Button>
            <Button
              onClick={() => setFilter('pending')}
              variant={filter === 'pending' ? 'primary' : 'outline'}
              size="sm"
            >
              Pending
            </Button>
            <Button
              onClick={() => setFilter('paid')}
              variant={filter === 'paid' ? 'primary' : 'outline'}
              size="sm"
            >
              Paid
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToGoogleSheets}
            className="flex items-center gap-1"
          >
            <FileDown size={16} />
            Export to Google Sheets
          </Button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DataTable 
            data={deposits} 
            columns={columns} 
            filterKey="vocNumber"
            itemsPerPage={20}
          />
        )}
      </div>

      <FormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Update Payment"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Amount</p>
              <p className="text-lg font-semibold">{editingDeposit && formatCurrency(editingDeposit.totalAmount)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Remaining Balance</p>
              <p className="text-lg font-semibold">{editingDeposit && formatCurrency(editingDeposit.remainingAmount)}</p>
            </div>
          </div>

          <Input
            label="Payment Amount"
            type="number"
            min={0}
            max={editingDeposit?.remainingAmount}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(Number(e.target.value))}
          />
          
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'KPay' | 'Yuan')}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'KPay', label: 'KPay' },
              { value: 'Yuan', label: 'Yuan' },
            ]}
          />

          <Button
            onClick={handleUpdatePayment}
            className="w-full"
            disabled={!paymentAmount || paymentAmount > (editingDeposit?.remainingAmount || 0)}
          >
            Update Payment
          </Button>
        </div>
      </FormModal>
    </div>
  );
};

export default DepositsPage;