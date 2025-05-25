import * as React from 'react';
import { cn } from '../../lib/utils';

export const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, ...props }, ref) => (
  <button
    ref={ref}
    value={value}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-gray-950 data-[state=active]:shadow-sm dark:ring-offset-gray-950 dark:focus-visible:ring-gray-800 dark:data-[state=active]:bg-gray-950 dark:data-[state=active]:text-gray-50",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    role="tabpanel"
    data-value={value}
    className={cn(
      "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:ring-offset-gray-950 dark:focus-visible:ring-gray-800",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export const Root = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string;
    onValueChange?: (value: string) => void;
  }
>(({ value, onValueChange, children, ...props }, ref) => {
  const [activeTab, setActiveTab] = React.useState(value);

  React.useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value);
    }
  }, [value]);

  const handleTabChange = (newValue: string) => {
    setActiveTab(newValue);
    onValueChange?.(newValue);
  };

  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      if (child.type === TabsTrigger) {
        return React.cloneElement(child, {
          onClick: () => handleTabChange(child.props.value),
          'data-state': child.props.value === activeTab ? 'active' : undefined
        });
      }
      if (child.type === TabsContent) {
        return child.props.value === activeTab ? child : null;
      }
    }
    return child;
  });

  return (
    <div ref={ref} {...props}>
      {childrenWithProps}
    </div>
  );
});
Root.displayName = "TabsRoot";

export { Root as Tabs };