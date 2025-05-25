import * as XLSX from 'xlsx';
import { format } from 'date-fns';
// import { toast } from 'react-toastify';

export const exportToExcel = (data: any[], filename: string) => {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Style configuration
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const styleOptions = {
    alignment: { vertical: 'center', horizontal: 'center' },
    font: { bold: true },
    fill: { fgColor: { rgb: '4F46E5' }, patternType: 'solid' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  // Apply styles to header row
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellRef]) continue;
    
    ws[cellRef].s = styleOptions;
  }

  // Auto-size columns
  const colWidths = data.reduce((widths, row) => {
    Object.keys(row).forEach((key, i) => {
      const value = String(row[key]);
      widths[i] = Math.max(widths[i] || 0, value.length);
    });
    return widths;
  }, {});

  ws['!cols'] = Object.values(colWidths).map(width => ({ width }));

  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

export const exportToGoogleSheets = async (data: any[]) => {
  if (!data || data.length === 0) {
    toast.error('No data to export.');
    return;
  }
  // Convert data to CSV format
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const cell = row[header]?.toString() || '';
        return cell.includes(',') ? `"${cell}"` : cell;
      }).join(',')
    )
  ].join('\n');
  
  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Show instructions for Google Sheets
  toast.success(
    'CSV file downloaded. To open in Google Sheets:\n' +
    '1. Go to sheets.google.com\n' +
    '2. Create new spreadsheet\n' +
    '3. File > Import > Upload\n' +
    '4. Select the downloaded CSV file'
  );
};