import { cn } from '../../utils/helpers';

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export default function Spinner({ size = 'md', className }) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary/30 border-t-primary dark:border-dark-primaryAccent/30 dark:border-t-dark-primaryAccent',
        sizeMap[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
