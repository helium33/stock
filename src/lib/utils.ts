import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STORES = ['win', 'pwint', 'yangon'] as const;
export type Store = typeof STORES[number];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('my-MM', {
    style: 'currency',
    currency: 'MMK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatYuan(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// export function generateVocNumber(store: Store): string {
//   const date = new Date();
//   const year = date.getFullYear().toString().slice(-2);
//   const month = (date.getMonth() + 1).toString().padStart(2, '0');
//   const day = date.getDate().toString().padStart(2, '0');
//   const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  
//   const storeCode = store.charAt(0).toUpperCase();
//   return `${storeCode}-${year}${month}${day}-${random}`;
// }

export function exportToExcel(data: any[], filename: string): void {
  try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    const colWidths = [
      { wch: 15 }, // VOC Number
      { wch: 20 }, // Customer
      { wch: 40 }, // Lens
      { wch: 40 }, // Frame
      { wch: 30 }, // Accessories
      { wch: 30 }, // Contact Lens
      { wch: 15 }, // Payment Type
      { wch: 15 }, // Payment Method
      { wch: 15 }, // Deposit Amount
      { wch: 15 }, // Total Amount
      { wch: 15 }, // Balance
      { wch: 15 }, // Date
      { wch: 30 }  // Refund
    ];
    
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'VOC Data');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export to Excel. Please try again.');
  }
}

export function exportToGoogleSheets(vocs: any[], filename: string): void {
  try {
    // Calculate totals for summary rows
    const totalAmount = vocs.reduce((sum, voc) => sum + (voc.totalAmount || 0), 0);
    const kpayTotal = vocs.reduce((sum, voc) => 
      voc.paymentMethod === 'KPay' ? sum + (voc.totalAmount || 0) : sum, 0);
    const yuanTotal = vocs.reduce((sum, voc) => 
      voc.paymentMethod === 'Yuan' ? sum + (voc.totalAmount || 0) : sum, 0);
    const depositTotal = vocs.reduce((sum, voc) => 
      voc.paymentType === 'Deposit' ? sum + (voc.depositAmount || 0) : sum, 0);

    // Format data for export with strict type separation
    const formattedData = vocs.map(voc => {
      // Strictly group items by type to ensure no mixing between categories
      const lensItems = voc.items.filter((item: VocItem) => item.type === 'Lens');
      const frameItems = voc.items.filter((item: VocItem) => item.type === 'Frame');
      const accessoryItems = voc.items.filter((item: VocItem) => item.type === 'Accessories');
      const contactLensItems = voc.items.filter((item: VocItem) => item.type === 'Contact Lens');
      
      // Format each type separately with its own specific details format
      const formatLensItems = () => {
        if (!lensItems || lensItems.length === 0) return '';
        return lensItems.map((item: VocItem) => {
          const details = item.details 
            ? ` (${item.details.sph || ''}, ${item.details.cyl || ' /'}, ${item.details.axis || '-'})`
            : '';
          return `${item.name} x${item.quantity}${details}`;
        }).join('\n'); // Use newlines for better readability in sheets
      };
      
      const formatFrameItems = () => {
        if (!frameItems || frameItems.length === 0) return '';
        return frameItems.map((item: VocItem) => {
          const colorDetail = item.details?.color ? ` (${item.details.color})` : '';
          return `${item.name} x${item.quantity}${colorDetail}`;
        }).join('\n');
      };
      
      const formatAccessoryItems = () => {
        if (!accessoryItems || accessoryItems.length === 0) return '';
        return accessoryItems.map((item: VocItem) => {
          return `${item.name} x${item.quantity}`;
        }).join('\n');
      };
      
      const formatContactLensItems = () => {
        if (!contactLensItems || contactLensItems.length === 0) return '';
        return contactLensItems.map((item: VocItem) => {
          const powerDetail = item.details?.power ? ` (${item.details.power})` : '';
          return `${item.name} x${item.quantity}${powerDetail}`;
        }).join('\n');
      };

      return {
        'VOC Number': voc.vocNumber || '',
        'Customer': voc.customerName || '',
        'Lens': formatLensItems(),
        'Frame': formatFrameItems(),
        'Accessories': formatAccessoryItems(),
        'Contact Lens': formatContactLensItems(),
        'Payment Type': voc.paymentType || '',
        'Payment Method': voc.paymentMethod || '',
        'Deposit Amount': voc.depositAmount || 0,
        'Total Amount': voc.totalAmount || 0,
        'Balance': voc.balance || 0,
        'Date': voc.createdAt ? format(voc.createdAt, 'yyyy-MM-dd') : '',
        'Refund': voc.refund ? `${voc.refund.amount} - ${voc.refund.reason}` : ''
      };
    });

    // Add summary rows
    const summaryRows = [
      {
        'VOC Number': 'SUMMARY',
        'Customer': '',
        'Lens': '',
        'Frame': '',
        'Accessories': '',
        'Contact Lens': '',
        'Payment Type': '',
        'Payment Method': 'Cash Total',
        'Deposit Amount': 0,
        'Total Amount': totalAmount - kpayTotal - yuanTotal,
        'Balance': 0,
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
        'Deposit Amount': 0,
        'Total Amount': kpayTotal,
        'Balance': 0,
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
        'Deposit Amount': 0,
        'Total Amount': yuanTotal,
        'Balance': 0,
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
        'Deposit Amount': depositTotal,
        'Total Amount': 0,
        'Balance': 0,
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
        'Deposit Amount': 0,
        'Total Amount': totalAmount,
        'Balance': 0,
        'Date': '',
        'Refund': ''
      }
    ];

    // Combine data and summary rows
    const allData = [...formattedData, ...summaryRows];

    // Use XLSX to properly handle the CSV conversion with correct escaping
    const worksheet = XLSX.utils.json_to_sheet(allData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    
    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Open Google Sheets in a new tab
    window.open('https://docs.google.com/spreadsheets/create', '_blank');
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    throw new Error('Failed to export to Google Sheets. Please try again.');
  }
}

// Types
export type LensType = 'Single Vision' | 'Bifocal';
export type BifocalType = 'Fuse' | 'Flattop';
export type FrameCategory = 'Eyeglasses' | 'Sunglasses' | 'Promotion' | 'Ready' | 'Ready BB' | 'Error';
export type FrameColor = 'Black' | 'Gold' | 'Silver' | 'Brown' | 'Blue' | 'Red' | 'Pink' | 'Purple' | 'Green' | 'Other';
export type ContactLensCategory = 'Original' | 'Premium';
export type CustomerType = 'Original' | 'Membership';
export type CustomerCategory = 'Win' | 'Pwint' | 'Yangon' | 'Children' | 'Male 16-35' | 'Female 16-35' | 'Male 36-50' | 'Female 36-50' | 'Male 50+' | 'Female 50+';
export type CustomerGender = 'Male' | 'Female';
export type PaymentMethod = 'Cash' | 'KPay' | 'Yuan' | 'Bank Transfer';
export type PaymentType = 'Full' | 'Deposit';
export type CancelReason = 'Customer Dissatisfied' | 'Error in Order' | 'Out of Stock' | 'Price Dispute' | 'Other';
export type ItemType = 'Lens' | 'Frame' | 'Accessories' | 'Contact Lens';
export type SystemStatus = 'open' | 'closed';
export type Currency = 'MMK' | 'CNY' | 'USD';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type Language = 'en' | 'my';
export type NotificationPriority = 'info' | 'warning' | 'error';
export type Theme = 'light' | 'dark';

export interface VocItem {
  id: string;
  type: ItemType;
  name: string;
  quantity: number;
  price: number;
  category?: string;
  details?: {
    sph?: string;
    cyl?: string;
    axis?: string;
    color?: string;
    power?: string;
  };
}

export interface Voc {
  id?: string;
  vocNumber: string;
  customerName: string;
  customerPhone?: string;
  paymentType: PaymentType;
  depositAmount: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  paymentMethod: PaymentMethod;
  items: VocItem[];
  store: Store;
  staffEmail: string;
  createdAt: Date;
  notes?: string;
  refund?: {
    amount: number;
    reason: string;
    date: Date;
  };
}