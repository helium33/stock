import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown } from 'lucide-react';
import Button from '../ui/Button';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortType?: 'number' | 'string';
  getValue?: (row: T) => number | string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  itemsPerPage?: number;
  searchable?: boolean;
  filterKey?: keyof T;
  additionalFilters?: {
    key: keyof T;
    value: any;
  }[];
}

function DataTable<T>({
  data,
  columns,
  itemsPerPage = 20,
  searchable = true,
  filterKey,
  additionalFilters,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === column.key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    setSortConfig({ key: column.key, direction });
  };

  const sortedData = React.useMemo(() => {
    let sortableData = [...data];
    
    if (sortConfig) {
      sortableData.sort((a, b) => {
        const column = columns.find(col => col.key === sortConfig.key);
        
        let aValue: any = column?.getValue ? column.getValue(a) : a[sortConfig.key as keyof T];
        let bValue: any = column?.getValue ? column.getValue(b) : b[sortConfig.key as keyof T];
        
        // Handle code sorting specially to maintain natural order (EG1, EG2, ..., EG100)
        if (sortConfig.key === 'code') {
          const aMatch = String(aValue).match(/(\D+)(\d+)/);
          const bMatch = String(bValue).match(/(\D+)(\d+)/);
          
          if (aMatch && bMatch) {
            const [, aPrefix, aNum] = aMatch;
            const [, bPrefix, bNum] = bMatch;
            
            if (aPrefix === bPrefix) {
              return sortConfig.direction === 'asc' 
                ? parseInt(aNum) - parseInt(bNum)
                : parseInt(bNum) - parseInt(aNum);
            }
          }
        }

        // Handle special sorting for SPH, CYL, AXIS
        if (['sph', 'cyl', 'axis'].includes(String(sortConfig.key))) {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        }
        
        if (column?.sortType === 'number') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }
        
        if (sortConfig.direction === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      });
    }
    
    return sortableData;
  }, [data, sortConfig, columns]);

  const filteredData = React.useMemo(() => {
    let filtered = sortedData;

    if (searchable && searchTerm && filterKey) {
      filtered = filtered.filter(item => 
        String(item[filterKey])
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }

    if (additionalFilters) {
      filtered = filtered.filter(item =>
        additionalFilters.every(filter => item[filter.key] === filter.value)
      );
    }

    return filtered;
  }, [sortedData, searchTerm, filterKey, additionalFilters]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="w-full">
      {searchable && (
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={18} className="text-gray-500 dark:text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">No.</th>
              {columns.map((column) => (
                <th 
                  key={column.key.toString()} 
                  scope="col" 
                  className="px-6 py-3"
                  onClick={() => handleSort(column)}
                  style={{ cursor: column.sortable ? 'pointer' : 'default' }}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && (
                      <ArrowUpDown size={14} className={`
                        text-gray-400
                        ${sortConfig?.key === column.key ? 'opacity-100' : 'opacity-50'}
                        ${sortConfig?.key === column.key && sortConfig.direction === 'desc' ? 'transform rotate-180' : ''}
                      `} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => (
                <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4">{startIndex + index + 1}</td>
                  {columns.map((column) => (
                    <td key={column.key.toString()} className="px-6 py-4">
                      {column.render
                        ? column.render(row)
                        : String(row[column.key as keyof T] || '')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-4 text-center">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-700 dark:text-gray-400">
            Showing <span className="font-medium">{Math.min(startIndex + 1, filteredData.length)}</span> to{" "}
            <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredData.length)}</span> of{" "}
            <span className="font-medium">{filteredData.length}</span> results
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <ChevronLeft size={16} />
              <span className="sr-only">Previous</span>
            </Button>
            <Button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <ChevronRight size={16} />
              <span className="sr-only">Next</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;