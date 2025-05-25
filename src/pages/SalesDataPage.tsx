import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Header from '../components/layout/Header';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import Input from '../components/ui/Input';
import DataTable from '../components/tables/DataTable';
import Button from '../components/ui/Button';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { exportToExcel, exportToGoogleSheets } from '../lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const SalesDataPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState({
    lens: {} as Record<string, number>,
    frame: {} as Record<string, { [color: string]: number }>,
    accessories: {} as Record<string, number>,
    contactLens: {} as Record<string, number>
  });
  const [searchDate, setSearchDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [salesList, setSalesList] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    fetchSalesData();
  }, [searchDate]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      
      const startDate = new Date(searchDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(searchDate);
      endDate.setHours(23, 59, 59, 999);

      const vocQuery = query(
        collection(db, 'vouchers'),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(vocQuery);
      
      const salesTracker = {
        lens: {} as Record<string, number>,
        frame: {} as Record<string, { [color: string]: number }>,
        accessories: {} as Record<string, number>,
        contactLens: {} as Record<string, number>
      };

      const salesDetails: any[] = [];
      let revenue = 0;

      snapshot.docs.forEach(doc => {
        const voc = doc.data();
        voc.items.forEach((item: any) => {
          const itemTotal = item.price * item.quantity;
          revenue += itemTotal;

          const saleDetail = {
            vocNumber: voc.vocNumber,
            date: voc.createdAt.toDate(),
            itemName: item.name,
            type: item.type,
            category: item.category,
            quantity: item.quantity,
            price: item.price,
            total: itemTotal,
            details: item.details || {}
          };
          salesDetails.push(saleDetail);

          if (item.type === 'Lens') {
            salesTracker.lens[item.category] = (salesTracker.lens[item.category] || 0) + item.quantity;
          } else if (item.type === 'Frame') {
            if (!salesTracker.frame[item.category]) {
              salesTracker.frame[item.category] = {};
            }
            const color = item.details?.color || 'Unknown';
            salesTracker.frame[item.category][color] = (salesTracker.frame[item.category][color] || 0) + item.quantity;
          } else if (item.type === 'Accessories') {
            salesTracker.accessories[item.name] = (salesTracker.accessories[item.name] || 0) + item.quantity;
          } else if (item.type === 'Contact Lens') {
            salesTracker.contactLens[item.category] = (salesTracker.contactLens[item.category] || 0) + item.quantity;
          }
        });
      });

      setSalesData(salesTracker);
      setSalesList(salesDetails);
      setTotalRevenue(revenue);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = () => {
    const data = salesList.map(sale => ({
      'Date': format(sale.date, 'yyyy-MM-dd'),
      'VOC Number': sale.vocNumber,
      'Item Name': sale.itemName,
      'Type': sale.type,
      'Category': sale.category,
      'Details': sale.type === 'Frame' ? `Color: ${sale.details.color || 'N/A'}` :
                sale.type === 'Lens' ? `SPH: ${sale.details.sph || 'N/A'}, CYL: ${sale.details.cyl || 'N/A'}, AXIS: ${sale.details.axis || 'N/A'}` :
                sale.type === 'Contact Lens' ? `Power: ${sale.details.power || 'N/A'}` : '',
      'Quantity': sale.quantity,
      'Price': formatCurrency(sale.price),
      'Total': formatCurrency(sale.total)
    }));

    exportToExcel(data, `sales-data-${searchDate}`);
  };

  const handleExportToGoogleSheets = () => {
    const data = salesList.map(sale => ({
      'Date': format(sale.date, 'yyyy-MM-dd'),
      'VOC Number': sale.vocNumber,
      'Item Name': sale.itemName,
      'Type': sale.type,
      'Category': sale.category,
      'Details': sale.type === 'Frame' ? `Color: ${sale.details.color || 'N/A'}` :
                sale.type === 'Lens' ? `SPH: ${sale.details.sph || 'N/A'}, CYL: ${sale.details.cyl || 'N/A'}, AXIS: ${sale.details.axis || 'N/A'}` :
                sale.type === 'Contact Lens' ? `Power: ${sale.details.power || 'N/A'}` : '',
      'Quantity': sale.quantity,
      'Price': sale.price,
      'Total': sale.total
    }));

    exportToGoogleSheets(data, `sales-data-${searchDate}`);
  };

  const prepareChartData = () => {
    const lensData = Object.entries(salesData.lens).map(([category, quantity]) => ({
      name: category,
      value: quantity
    }));

    const frameData = Object.entries(salesData.frame).flatMap(([category, colors]) =>
      Object.entries(colors).map(([color, quantity]) => ({
        name: `${category} - ${color}`,
        value: quantity
      }))
    );

    const contactLensData = Object.entries(salesData.contactLens).map(([category, quantity]) => ({
      name: category,
      value: quantity
    }));

    const accessoriesData = Object.entries(salesData.accessories).map(([name, quantity]) => ({
      name,
      value: quantity
    }));

    return {
      lensData,
      frameData,
      contactLensData,
      accessoriesData
    };
  };

  const columns = [
    { 
      key: 'date', 
      header: 'Date',
      render: (row: any) => format(row.date, 'PPp')
    },
    { key: 'vocNumber', header: 'VOC Number' },
    { key: 'itemName', header: 'Item Name' },
    { key: 'type', header: 'Type' },
    { key: 'category', header: 'Category' },
    { 
      key: 'details', 
      header: 'Details',
      render: (row: any) => {
        if (row.type === 'Frame' && row.details.color) {
          return `Color: ${row.details.color}`;
        }
        if (row.type === 'Lens') {
          return `SPH: ${row.details.sph || '-'}, CYL: ${row.details.cyl || '-'}, AXIS: ${row.details.axis || '-'}`;
        }
        if (row.type === 'Contact Lens' && row.details.power) {
          return `Power: ${row.details.power}`;
        }
        return '-';
      }
    },
    { key: 'quantity', header: 'Quantity' },
    { 
      key: 'price', 
      header: 'Price',
      render: (row: any) => formatCurrency(row.price)
    },
    { 
      key: 'total', 
      header: 'Total',
      render: (row: any) => formatCurrency(row.total)
    },
  ];

  const { lensData, frameData, contactLensData, accessoriesData } = prepareChartData();

  return (
    <div className="space-y-6 p-4">
      <Header title="Sales Data" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-40"
            />
            <div className="text-lg font-semibold">
              Total Revenue: {formatCurrency(totalRevenue)}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToExcel}
              className="flex items-center gap-1"
            >
              <FileDown size={16} />
              Export to Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToGoogleSheets}
              className="flex items-center gap-1"
            >
              <FileSpreadsheet size={16} />
              Export to Google Sheets
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Lens Sales Distribution</h3>
            <PieChart width={400} height={300}>
              <Pie
                data={lensData}
                cx={200}
                cy={150}
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {lensData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>

          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Frame Sales by Category</h3>
            <BarChart width={400} height={300} data={frameData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="Quantity" />
            </BarChart>
          </div>

          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Contact Lens Sales</h3>
            <PieChart width={400} height={300}>
              <Pie
                data={contactLensData}
                cx={200}
                cy={150}
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#82ca9d"
                dataKey="value"
              >
                {contactLensData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>

          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Accessories Sales</h3>
            <BarChart width={400} height={300} data={accessoriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#82ca9d" name="Quantity" />
            </BarChart>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <DataTable 
            data={salesList} 
            columns={columns} 
            filterKey="itemName"
            itemsPerPage={20}
          />
        )}
      </div>
    </div>
  );
};

export default SalesDataPage;