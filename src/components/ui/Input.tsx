import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            {label}
          </label>
        )}
        <input
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
        />
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;