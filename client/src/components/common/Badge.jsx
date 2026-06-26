import { cn } from '../../utils/helpers';

const variantStyles = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  primary: 'bg-primary-light text-primary dark:bg-dark-primaryLight dark:text-dark-primaryAccent',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300',
};

export default function Badge({ variant = 'primary', children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
