import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            {label}
          </label>
        )}
        <select
          className={cn(
            "bg-gray-50 border text-gray-900 text-sm rounded-lg block w-full p-2.5",
            "focus:ring-blue-500 focus:border-blue-500",
            "dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white",
            "dark:focus:ring-blue-500 dark:focus:border-blue-500",
            error ? "border-red-500" : "border-gray-300",
            className
          )}
          ref={ref}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;