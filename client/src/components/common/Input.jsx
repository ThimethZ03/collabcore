import { forwardRef } from 'react';
import { cn } from '../../utils/helpers';

const Input = forwardRef(function Input(
  { label, icon: Icon, error, helperText, className, id, ...props },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-primary dark:text-text-inverted mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon size={18} className="text-text-muted dark:text-text-muted" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border px-3 py-2.5 text-sm transition-colors',
            'bg-surface-input text-text-primary placeholder-text-muted',
            'border-surface-border focus:border-primary focus:ring-2 focus:ring-primary/20',
            'dark:bg-dark-input dark:text-text-inverted dark:placeholder-text-muted',
            'dark:border-dark-border dark:focus:border-dark-primaryAccent dark:focus:ring-dark-primaryAccent/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            Icon && 'pl-10',
            error && 'border-danger focus:border-danger focus:ring-danger/20 dark:border-danger',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-xs text-text-muted dark:text-text-muted">{helperText}</p>
      )}
    </div>
  );
});

export default Input;
