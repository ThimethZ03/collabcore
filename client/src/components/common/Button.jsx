import { forwardRef } from 'react';
import Spinner from './Spinner';
import { cn } from '../../utils/helpers';

const variants = {
  primary:
    'bg-primary text-white hover:bg-primary-hover dark:bg-dark-primaryAccent dark:hover:bg-blue-400 dark:text-dark-bg',
  secondary:
    'bg-primary-light text-primary border border-primary/20 hover:bg-primary/10 dark:bg-dark-primaryLight dark:text-dark-primaryAccent dark:border-dark-primaryAccent/20 dark:hover:bg-dark-primaryAccent/10',
  ghost:
    'text-text-secondary hover:bg-surface-border/30 hover:text-text-primary dark:text-text-muted dark:hover:bg-dark-elevated dark:hover:text-text-inverted',
  destructive:
    'bg-danger text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500',
  icon:
    'p-2 text-text-secondary hover:bg-surface-border/30 hover:text-text-primary dark:text-text-muted dark:hover:bg-dark-elevated dark:hover:text-text-inverted',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled = false, children, className, ...props },
  ref
) {
  const isIconVariant = variant === 'icon';

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-dark-primaryAccent/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        !isIconVariant && sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
});

export default Button;
