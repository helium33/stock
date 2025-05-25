import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import VocForm from '../../components/voc/VocForm';
import DataTable from '../../components/tables/DataTable';
import Button from '../../components/ui/Button';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import FormModal from '../../components/modals/FormModal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { FileDown, Trash2, Edit, RefreshCw, FileSpreadsheet, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  formatCurrency, 
  exportToExcel, 
  exportToGoogleSheets,
  PaymentMethod, 
  VocItem, 
  ItemType,
  formatYuan,
} from '../../lib/utils';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import toast from 'react-hot-toast';
import ExportModal from '../../components/ui/ExportModal';
import DataDisplay from '../../components/tables/DataDisplay';

interface RefundData {
  amount: number;
  reason: string;
  date: Date;
}

const VocPage: React.FC = () => {
  const { store } = useParams<{ store: string }>();
  const [vocs, setVocs] = useState<any[]>([]);
  const [paidVocs, setPaidVocs] = useState<any[]>([]);
  const [depositVocs, setDepositVocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vocToDelete, setVocToDelete] = useState<any>(null);
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [editingVoc, setEditingVoc] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [totalAmount, setTotalAmount] = useState(0);
  const [kpayTotal, setKpayTotal] = useState(0);
  const [yuanTotal, setYuanTotal] = useState(0);
  const [depositTotal, setDepositTotal] = useState(0);
  const [isFullPayment, setIsFullPayment] = useState(false);
  const [searchDate, setSearchDate] = useState('');
  const [searchMonth, setSearchMonth] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchType, setSearchType] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'deposit'>('all');
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');
  const [selectedVoc, setSelectedVoc] = useState<any>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [showSalesSummary, setShowSalesSummary] = useState(true);

  const [salesByCategory, setSalesByCategory] = useState({
    lens: {} as Record<string, number>,
    frame: {} as Record<string, { [color: string]: number }>,
    accessories: 0,
    contactLens: {} as Record<string, number>
  });

  useEffect(() => {
    if (store) {
      fetchVocs();
    }
  }, [store, searchDate, searchMonth, searchYear, searchType]);

  const fetchVocs = async () => {
    try {
      setLoading(true);
      let vocQuery = query(
        collection(db, 'vouchers'),
        where('store', '==', store),
        orderBy('createdAt', 'desc')
      );

      if (searchType === 'daily' && searchDate) {
        const startDate = new Date(searchDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(searchDate);
        endDate.setHours(23, 59, 59, 999);
        
        vocQuery = query(
          collection(db, 'vouchers'),
          where('store', '==', store),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate),
          orderBy('createdAt', 'desc')
        );
      } else if (searchType === 'monthly' && searchMonth) {
        const [year, month] = searchMonth.split('-');
        const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
        const endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
        
        vocQuery = query(
          collection(db, 'vouchers'),
          where('store', '==', store),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate),
          orderBy('createdAt', 'desc')
        );
      } else if (searchType === 'yearly' && searchYear) {
        const startDate = startOfYear(new Date(parseInt(searchYear), 0));
        const endDate = endOfYear(new Date(parseInt(searchYear), 0));
        
        vocQuery = query(
          collection(db, 'vouchers'),
          where('store', '==', store),
          where('createdAt', '>=', startDate),
          where('createdAt', '<=', endDate),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(vocQuery);
      const vocData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }));

      const paid = vocData.filter(voc => 
        voc.paymentType === 'Full' || 
        (voc.depositAmount && voc.depositAmount >= voc.totalAmount)
      );
      
      const deposits = vocData.filter(voc => 
        voc.paymentType === 'Deposit' && 
        (!voc.depositAmount || voc.depositAmount < voc.totalAmount)
      );

      setPaidVocs(paid);
      setDepositVocs(deposits);
      setVocs(vocData);

      let total = 0;
      let kpay = 0;
      let yuan = 0;
      let deposit = 0;
      const salesTracker = {
        lens: {} as Record<string, number>,
        frame: {} as Record<string, { [color: string]: number }>,
        accessories: 0,
        contactLens: {} as Record<string, number>
      };

      vocData.forEach(voc => {
        total += voc.totalAmount || 0;
        
        if (voc.paymentMethod === 'KPay') {
          kpay += voc.totalAmount || 0;
        } else if (voc.paymentMethod === 'Yuan') {
          yuan += voc.totalAmount || 0;
        }
        
        if (voc.paymentType === 'Deposit') {
          deposit += voc.depositAmount || 0;
        }

        // Categorize items by their type
        voc.items.forEach((item: any) => {
          if (item.type === 'Lens') {
            salesTracker.lens[item.category] = (salesTracker.lens[item.category] || 0) + item.quantity;
          } else if (item.type === 'Frame') {
            if (!salesTracker.frame[item.category]) {
              salesTracker.frame[item.category] = {};
            }
            const color = item.details?.color || 'Unknown';
            salesTracker.frame[item.category][color] = (salesTracker.frame[item.category][color] || 0) + item.quantity;
          } else if (item.type === 'Accessories') {
            salesTracker.accessories += item.quantity;
          } else if (item.type === 'Contact Lens') {
            salesTracker.contactLens[item.category] = (salesTracker.contactLens[item.category] || 0) + item.quantity;
          }
        });
      });

      setTotalAmount(total);
      setKpayTotal(kpay);
      setYuanTotal(yuan);
      setDepositTotal(deposit);
      setSalesByCategory(salesTracker);
    } catch (error) {
      console.error('Error fetching VOCs:', error);
      toast.error('Failed to fetch VOCs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVoc = (voc: any) => {
    setVocToDelete(voc);
    setDeleteDialogOpen(true);
  };

  const handleEditPayment = (voc: any) => {
    setEditingVoc(voc);
    setDepositAmount(voc.depositAmount || 0);
    setPaymentMethod(voc.paymentMethod);
    setIsFullPayment(voc.paymentType === 'Full');
    setEditPaymentOpen(true);
  };

  const handleProcessRefund = (voc: any) => {
    setSelectedVoc(voc);
    setRefundAmount(0);
    setRefundReason('');
    setRefundModalOpen(true);
  };

  const handleUpdatePayment = async () => {
    if (!editingVoc) return;

    try {
      const vocRef = doc(db, 'vouchers', editingVoc.id);
      const updateData = {
        depositAmount: isFullPayment ? editingVoc.totalAmount : depositAmount,
        paymentMethod,
        paymentType: isFullPayment ? 'Full' : 'Deposit',
        paidAmount: isFullPayment ? editingVoc.totalAmount : depositAmount,
        balance: isFullPayment ? 0 : editingVoc.totalAmount - depositAmount,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(vocRef, updateData);
      await fetchVocs();

      toast.success('Payment updated successfully');
      setEditPaymentOpen(false);
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    }
  };

  const handleRefund = async () => {
    if (!selectedVoc) return;

    try {
      const vocRef = doc(db, 'vouchers', selectedVoc.id);
      
      const refundData: RefundData = {
        amount: refundAmount,
        reason: refundReason,
        date: new Date()
      };

      await updateDoc(vocRef, {
        refund: refundData,
        updatedAt: serverTimestamp(),
      });

      toast.success('Refund processed successfully');
      setRefundModalOpen(false);
      setRefundAmount(0);
      setRefundReason('');
      fetchVocs();
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Failed to process refund');
    }
  };

  const confirmDelete = async () => {
    if (!vocToDelete?.id) return;

    try {
      await deleteDoc(doc(db, 'vouchers', vocToDelete.id));
      await fetchVocs();
      toast.success('VOC deleted successfully');
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting VOC:', error);
      toast.error('Failed to delete VOC');
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      
      const data = vocs.map(voc => {
        const itemsByType = voc.items.reduce((acc: any, item: VocItem) => {
          if (!acc[item.type]) {
            acc[item.type] = [];
          }
          acc[item.type].push(item);
          return acc;
        }, {});
        
        const formattedItems: Record<string, string> = {};
        
        if (itemsByType['Lens']) {
          formattedItems['Lens'] = itemsByType['Lens'].map((item: VocItem) => {
            return `${item.name} (${item.quantity}x) ${
              item.details ? `- SPH: ${item.details.sph || '-'}, CYL: ${item.details.cyl || '-'}, AXIS: ${item.details.axis || '-'}` : ''
            }`;
          }).join('\n');
        }
        
        if (itemsByType['Frame']) {
          formattedItems['Frame'] = itemsByType['Frame'].map((item: VocItem) => {
            return `${item.name} (${item.quantity}x)${
              item.details?.color ? ` - Color: ${item.details.color}` : ''
            }`;
          }).join('\n');
        }
        
        if (itemsByType['Accessories']) {
          formattedItems['Accessories'] = itemsByType['Accessories'].map((item: VocItem) => {
            return `${item.name} (${item.quantity}x)`;
          }).join('\n');
        }
        
        if (itemsByType['Contact Lens']) {
          formattedItems['Contact Lens'] = itemsByType['Contact Lens'].map((item: VocItem) => {
            return `${item.name} (${item.quantity}x)${
              item.details?.power ? ` - Power: ${item.details.power}` : ''
            }`;
          }).join('\n');
        }
        
        return {
          'VOC Number': voc.vocNumber,
          'Customer': voc.customerName,
          'Lens': formattedItems['Lens'] || '-',
          'Frame': formattedItems['Frame'] || '-',
          'Accessories': formattedItems['Accessories'] || '-', 
          'Contact Lens': formattedItems['Contact Lens'] || '-',
          'Payment Type': voc.paymentType,
          'Payment Method': voc.paymentMethod,
          'Deposit Amount': voc.depositAmount ? formatCurrency(voc.depositAmount) : '-',
          'Total Amount': formatCurrency(voc.totalAmount),
          'Balance': formatCurrency(voc.balance || 0),
          'Date': format(voc.createdAt, 'yyyy-MM-dd'),
          'Refund': voc.refund ? `${formatCurrency(voc.refund.amount)} - ${voc.refund.reason}` : '-'
        };
      });

      data.push(
        {
          'VOC Number': 'SUMMARY',
          'Customer': '',
          'Lens': '',
          'Frame': '',
          'Accessories': '',
          'Contact Lens': '',
          'Payment Type': '',
          'Payment Method': 'Cash Total',
          'Deposit Amount': '',
          'Total Amount': formatCurrency(totalAmount - kpayTotal - yuanTotal),
          'Balance': '',
          'Date': '',
          'Refund': ''
        },
        {
          'VOC Number': '',
          'Customer': '',
          'Lens': '',
          'Frame': '',
          'Accessories': '',
          'Contact Lens': '',
          'Payment Type': '',
          'Payment Method': 'KPay Total',
          'Deposit Amount': '',
          'Total Amount': formatCurrency(kpayTotal),
          'Balance': '',
          'Date': '',
          'Refund': ''
        },
        {
          'VOC Number': '',
          'Customer': '',
          'Lens': '',
          'Frame': '',
          'Accessories': '',
          'Contact Lens': '',
          'Payment Type': '',
          'Payment Method': 'Yuan Total',
          'Deposit Amount': '',
          'Total Amount': formatCurrency(yuanTotal),
          'Balance': '',
          'Date': '',
          'Refund': ''
        },
        {
          'VOC Number': '',
          'Customer': '',
          'Lens': '',
          'Frame': '',
          'Accessories': '',
          'Contact Lens': '',
          'Payment Type': '',
          'Payment Method': 'Deposit Total',
          'Deposit Amount': formatCurrency(depositTotal),
          'Total Amount': '',
          'Balance': '',
          'Date': '',
          'Refund': ''
        },
        {
          'VOC Number': 'GRAND TOTAL',
          'Customer': '',
          'Lens': '',
          'Frame': '',
          'Accessories': '',
          'Contact Lens': '',
          'Payment Type': '',
          'Payment Method': '',
          'Deposit Amount': '',
          'Total Amount': formatCurrency(totalAmount),
          'Balance': '',
          'Date': '',
          'Refund': ''
        }
      );

      await exportToExcel(data, `voc-list-${store}-${format(new Date(), 'yyyy-MM-dd')}`);
      toast.success('Excel exported successfully');
      setExportModalOpen(false);
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportGoogleSheets = async () => {
    try {
      setExportLoading(true);
      const filename = `voc-list-${store}-${format(new Date(), 'yyyy-MM-dd')}`;
      exportToGoogleSheets(vocs, filename);
      toast.success('Data exported to CSV. Please import into Google Sheets', {
        duration: 5000,
      });
      setExportModalOpen(false);
    } catch (error) {
      console.error('Google Sheets export error:', error);
      toast.error('Failed to export to Google Sheets. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const columns = [
    { key: 'vocNumber', header: 'VOC #', sortable: true },
    { key: 'customerName', header: 'Customer', sortable: true },
    {
      key: 'lens',
      header: 'Lens',
      render: (row: any) => <DataDisplay items={row.items} type="Lens" />
    },
    {
      key: 'frame',
      header: 'Frame',
      render: (row: any) => <DataDisplay items={row.items} type="Frame" />
    },
    {
      key: 'accessories',
      header: 'Accessories',
      render: (row: any) => <DataDisplay items={row.items} type="Accessories" />
    },
    {
      key: 'contactLens',
      header: 'Contact Lens',
      render: (row: any) => <DataDisplay items={row.items} type="Contact Lens" />
    },
    { 
      key: 'paymentType', 
      header: 'Status',
      render: (row: any) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          row.paymentType === 'Full' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
        }`}>
          {row.paymentType === 'Full' ? 'Paid' : 'Deposit'}
        </span>
      )
    },
    { 
      key: 'totalAmount', 
      header: 'Total',
      sortable: true,
      render: (row: any) => formatCurrency(row.totalAmount)
    },
    { 
      key: 'createdAt', 
      header: 'Date',
      sortable: true,
      render: (row: any) => format(row.createdAt, 'MM/dd/yy')
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex space-x-1">
          <Button 
            variant="outline" 
            size="xs"
            onClick={() => handleEditPayment(row)}
            className="p-1"
            title="Edit Payment"
          >
            <Edit size={14} />
          </Button>
          <Button 
            variant="outline" 
            size="xs"
            onClick={() => handleProcessRefund(row)}
            className="p-1"
            title="Process Refund"
          >
            <Circle size={14} className="text-blue-500" />
          </Button>
          <Button 
            variant="danger" 
            size="xs"
            onClick={() => handleDeleteVoc(row)}
            className="p-1"
            title="Delete VOC"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  const SalesSummary = () => (
    <div className="mb-4">
      <div 
        className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg cursor-pointer mb-2"
        onClick={() => setShowSalesSummary(!showSalesSummary)}
      >
        <h3 className="text-lg font-medium">Sales Summary</h3>
        {showSalesSummary ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
      
      {showSalesSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm hover:shadow transition-shadow">
            <h3 className="text-base font-medium mb-2 border-b pb-1">Lens Sales</h3>
            <div className="space-y-1 text-sm">
              {Object.entries(salesByCategory.lens).map(([category, quantity]) => (
                <div key={category} className="flex justify-between">
                  <span>{category}:</span>
                  <span className="font-medium">{quantity} units</span>
                </div>
              ))}
              {Object.keys(salesByCategory.lens).length === 0 && (
                <div className="text-gray-500">No lens sales</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm hover:shadow transition-shadow">
            <h3 className="text-base font-medium mb-2 border-b pb-1">Frame Sales</h3>
            <div className="space-y-1 text-sm">
              {Object.entries(salesByCategory.frame).map(([category, colors]) => (
                <div key={category} className="mb-1">
                  <div className="font-medium">{category}</div>
                  {Object.entries(colors).map(([color, quantity]) => (
                    <div key={color} className="flex justify-between pl-3 text-xs text-gray-600 dark:text-gray-300">
                      <span>{color}:</span>
                      <span>{quantity} units</span>
                    </div>
                  ))}
                </div>
              ))}
              {Object.keys(salesByCategory.frame).length === 0 && (
                <div className="text-gray-500">No frame sales</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm hover:shadow transition-shadow">
            <h3 className="text-base font-medium mb-2 border-b pb-1">Contact Lens Sales</h3>
            <div className="space-y-1 text-sm">
              {Object.entries(salesByCategory.contactLens).map(([category, quantity]) => (
                <div key={category} className="flex justify-between">
                  <span>{category}:</span>
                  <span className="font-medium">{quantity} units</span>
                </div>
              ))}
              {Object.keys(salesByCategory.contactLens).length === 0 && (
                <div className="text-gray-500">No contact lens sales</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm hover:shadow transition-shadow">
            <h3 className="text-base font-medium mb-2 border-b pb-1">Accessories Sales</h3>
            <div className="flex justify-between text-sm">
              <span>Total Units:</span>
              <span className="font-medium">{salesByCategory.accessories}</span>
            </div>
            {salesByCategory.accessories === 0 && (
              <div className="text-gray-500 mt-1 text-sm">No accessories sales</div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!store) {
    return <div>Store parameter is required</div>;
  }

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto">
      <Header title={`VOC Management - ${store?.toUpperCase()}`} />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-3 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-100 mb-1">Total Sales</h3>
            <p className="text-xl font-bold text-blue-900 dark:text-white">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-3 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-100 mb-1">KPay</h3>
            <p className="text-xl font-bold text-green-900 dark:text-white">{formatCurrency(kpayTotal)}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 p-3 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-100 mb-1">Yuan</h3>
            <p className="text-xl font-bold text-yellow-900 dark:text-white">{formatYuan(yuanTotal)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 p-3 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-purple-800 dark:text-purple-100 mb-1">Deposits</h3>
            <p className="text-xl font-bold text-purple-900 dark:text-white">{formatCurrency(depositTotal)}</p>
          </div>
        </div>

        <SalesSummary />

        {/* Filters and Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Filter by</label>
            <div className="flex flex-wrap gap-2">
              <Select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as 'daily' | 'monthly' | 'yearly')}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' }
                ]}
                className="w-28"
              />
              
              {searchType === 'daily' && (
                <Input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-40"
                />
              )}
              
              {searchType === 'monthly' && (
                <Input
                  type="month"
                  value={searchMonth}
                  onChange={(e) => setSearchMonth(e.target.value)}
                  className="w-40"
                />
              )}
              
              {searchType === 'yearly' && (
                <Input
                  type="number"
                  value={searchYear}
                  onChange={(e) => setSearchYear(e.target.value)}
                  placeholder="Year"
                  min="2000"
                  max="2100"
                  className="w-28"
                />
              )}
              
              <Button 
                onClick={() => {
                  setSearchDate('');
                  setSearchMonth('');
                  setSearchYear('');
                  fetchVocs();
                }} 
                variant="outline"
                size="sm"
                className="h-9"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportModalOpen(true)}
              className="h-9"
            >
              <FileSpreadsheet size={16} className="mr-1" />
              Export
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowForm(!showForm)}
              className="h-9"
            >
              {showForm ? 'View VOCs' : 'Create VOC'}
            </Button>
          </div>
        </div>

        {/* View Selection Tabs */}
        <div className="flex border-b mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'all' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            All VOCs ({vocs.length})
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'paid' 
                ? 'border-b-2 border-green-500 text-green-600 dark:text-green-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Paid ({paidVocs.length})
          </button>
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'deposit' 
                ? 'border-b-2 border-yellow-500 text-yellow-600 dark:text-yellow-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Deposits ({depositVocs.length})
          </button>
        </div>
        
        {/* Main Content Area */}
        {showForm ? (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <VocForm store={store} onSuccess={() => {
              setShowForm(false);
              fetchVocs();
            }} />
          </div>
        ) : (
          loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <DataTable 
              data={activeTab === 'all' ? vocs : activeTab === 'paid' ? paidVocs : depositVocs}
              columns={columns} 
              filterKey="vocNumber"
              itemsPerPage={10}
            />
          )
        )}
      </div>

      {/* Modals */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        itemName={`VOC ${vocToDelete?.vocNumber}`}
        onDelete={confirmDelete}
      />

      <FormModal
        isOpen={editPaymentOpen}
        onClose={() => setEditPaymentOpen(false)}
        title="Edit Payment"
      >
        <div className="space-y-4">
          <div className="flex items-center mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <input
              type="checkbox"
              id="fullPayment"
              checked={isFullPayment}
              onChange={(e) => setIsFullPayment(e.target.checked)}
              className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="fullPayment" className="font-medium">
              Mark as fully paid
            </label>
          </div>

          {!isFullPayment && (
            <Input
              label="Deposit Amount"
              type="number"
              min={0}
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
            />
          )}
          
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'KPay', label: 'KPay' },
              { value: 'Yuan', label: 'Yuan' },
              { value: 'Bank Transfer', label: 'Bank Transfer' },
            ]}
          />

          <Button
            onClick={handleUpdatePayment}
            className="w-full"
          >
            Update Payment
          </Button>
        </div>
      </FormModal>

      <FormModal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title="Process Refund"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Original Amount</p>
              <p className="text-base font-semibold">
                {selectedVoc && formatCurrency(selectedVoc.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Previous Refunds</p>
              <p className="text-base font-semibold text-red-600 dark:text-red-400">
                {selectedVoc?.refund ? formatCurrency(selectedVoc.refund.amount) : '-'}
              </p>
            </div>
          </div>

          <Input
            label="Refund Amount"
            type="number"
            min={0}
            max={selectedVoc?.totalAmount}
            value={refundAmount}
            onChange={(e) => setRefundAmount(Number(e.target.value))}
          />

          <Input
            label="Refund Reason"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />

          <Button
            onClick={handleRefund}
            className="w-full"
            disabled={!refundAmount || !refundReason}
          >
            Process Refund
          </Button>
        </div>
      </FormModal>

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExportExcel={handleExportExcel}
        onExportGoogleSheets={handleExportGoogleSheets}
        totalAmount={totalAmount}
        kpayTotal={kpayTotal}
        yuanTotal={yuanTotal}
        depositTotal={depositTotal}
      />
    </div>
  );
};

export default VocPage;