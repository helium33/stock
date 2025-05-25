import React, { useState } from 'react';
import { VocItem, ItemType } from '../../lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface DataDisplayProps {
  items: VocItem[];
  type: ItemType;
}

const DataDisplay: React.FC<DataDisplayProps> = ({ items, type }) => {
  const [expanded, setExpanded] = useState(false);
  const filteredItems = items.filter(item => item.type === type);
  
  if (filteredItems.length === 0) {
    return <div className="text-gray-500 text-sm">-</div>;
  }

  const totalItems = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const getTypeColor = (itemType: ItemType): string => {
    switch (itemType) {
      case 'Lens':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'Frame':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'Accessories':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-900/20';
      case 'Contact Lens':
        return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-800';
    }
  };

  // For collapsed view, just show a summary
  if (!expanded && filteredItems.length > 0) {
    return (
      <div 
        className="flex items-center gap-1 cursor-pointer text-sm group"
        onClick={() => setExpanded(true)}
      >
        <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
        <span className="font-medium">{totalItems} items</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div 
        className="flex items-center gap-1 cursor-pointer text-sm group mb-1"
        onClick={() => setExpanded(false)}
      >
        <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
        <span className="font-medium">{totalItems} items</span>
      </div>
      
      {filteredItems.map((item, index) => (
        <div 
          key={index} 
          className={`text-xs border-l-2 pl-2 py-1 rounded-r-sm ${getTypeColor(type)}`}
        >
          <div className="font-medium truncate max-w-[150px]" title={`${item.name} (x${item.quantity})`}>
            {item.name} <span className="text-gray-500">x{item.quantity}</span>
          </div>
          
          {type === 'Lens' && item.details && (
            <div className="text-gray-600 dark:text-gray-300 text-xs flex flex-wrap gap-1 mt-1">
              {item.details.sph && (
                <span className="inline-block px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-[10px]">
                  SPH: {item.details.sph}
                </span>
              )}
              {item.details.cyl && (
                <span className="inline-block px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-[10px]">
                  CYL: {item.details.cyl}
                </span>
              )}
              {item.details.axis && (
                <span className="inline-block px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-[10px]">
                  AXIS: {item.details.axis}
                </span>
              )}
            </div>
          )}
          
          {type === 'Frame' && item.details?.color && (
            <div className="text-gray-600 dark:text-gray-300 text-xs mt-1">
              <span className="inline-block px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-[10px]">
                {item.details.color}
              </span>
            </div>
          )}
          
          {type === 'Contact Lens' && item.details?.power && (
            <div className="text-gray-600 dark:text-gray-300 text-xs mt-1">
              <span className="inline-block px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-[10px]">
                Power: {item.details.power}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DataDisplay;