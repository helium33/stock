import React, { useState } from 'react';
import { FileDown, FileSpreadsheet, X } from 'lucide-react';
import Button from './Button';
import { formatCurrency } from '../../lib/utils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportExcel: () => Promise<void>;
  onExportGoogleSheets: () => Promise<void>;
  totalAmount: number;
  kpayTotal: number;
  yuanTotal: number;
  depositTotal: number;
}

const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose, 
  onExportExcel, 
  onExportGoogleSheets,
  totalAmount,
  kpayTotal,
  yuanTotal,
  depositTotal
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'excel' | 'sheets' | null>(null);

  if (!isOpen) return null;

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      setExportType('excel');
      await onExportExcel();
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleExportGoogleSheets = async () => {
    try {
      setIsExporting(true);
      setExportType('sheets');
      await onExportGoogleSheets();
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Export Data</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Summary</h3>
          <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
              <p className="text-lg font-semibold">{formatCurrency(totalAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cash Sales</p>
              <p className="text-lg font-semibold">{formatCurrency(totalAmount - kpayTotal - yuanTotal)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">KPay Sales</p>
              <p className="text-lg font-semibold">{formatCurrency(kpayTotal)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Yuan Sales</p>
              <p className="text-lg font-semibold">{formatCurrency(yuanTotal)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Deposit Total</p>
              <p className="text-lg font-semibold">{formatCurrency(depositTotal)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-4">
            <h3 className="font-medium mb-2 flex items-center">
              <FileDown size={18} className="mr-2" />
              Excel Export
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Download a complete Excel file with formatted data and summaries.
            </p>
            <Button
              onClick={handleExportExcel}
              className="w-full"
              disabled={isExporting}
              loading={isExporting && exportType === 'excel'}
              leftIcon={<FileDown size={16} />}
            >
              {isExporting && exportType === 'excel' ? 'Exporting...' : 'Export to Excel'}
            </Button>
          </div>

          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
            <h3 className="font-medium mb-2 flex items-center">
              <FileSpreadsheet size={18} className="mr-2" />
              Google Sheets Export
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Export as CSV and upload to Google Sheets. Follow these steps:
            </p>
            <ol className="text-sm text-gray-600 dark:text-gray-300 list-decimal ml-5 mb-3">
              <li>Click the button below to generate and download a CSV file</li>
              <li>A new tab will open to Google Sheets</li>
              <li>In Google Sheets, click File → Import → Upload</li>
              <li>Select the downloaded CSV file</li>
              <li>Select "Replace spreadsheet" and click Import</li>
            </ol>
            <Button
              onClick={handleExportGoogleSheets}
              className="w-full"
              disabled={isExporting}
              loading={isExporting && exportType === 'sheets'}
              variant="success"
              leftIcon={<FileSpreadsheet size={16} />}
            >
              {isExporting && exportType === 'sheets' ? 'Exporting...' : 'Export for Google Sheets'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;