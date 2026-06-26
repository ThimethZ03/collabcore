import { forwardRef } from 'react';
import { cn } from '../../utils/helpers';

const Select = forwardRef(function Select(
  { label, options = [], error, helperText, placeholder, className, id, ...props },
  ref
) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-text-primary dark:text-text-inverted mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'w-full rounded-lg border px-3 py-2.5 text-sm transition-colors appearance-none',
          'bg-surface-input text-text-primary',
          'border-surface-border focus:border-primary focus:ring-2 focus:ring-primary/20',
          'dark:bg-dark-input dark:text-text-inverted',
          'dark:border-dark-border dark:focus:border-dark-primaryAccent dark:focus:ring-dark-primaryAccent/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-danger focus:border-danger focus:ring-danger/20 dark:border-danger',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => {
          const value = typeof opt === 'object' ? opt.value : opt;
          const label = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={value} value={value}>
              {label}
            </option>
          );
        })}
      </select>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-xs text-text-muted dark:text-text-muted">{helperText}</p>
      )}
    </div>
  );
});

export default Select;
