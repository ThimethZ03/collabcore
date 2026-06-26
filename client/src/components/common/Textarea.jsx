import { forwardRef, useState } from 'react';
import { cn } from '../../utils/helpers';

const Textarea = forwardRef(function Textarea(
  { label, error, helperText, maxLength, className, id, onChange, ...props },
  ref
) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const [charCount, setCharCount] = useState(0);

  const handleChange = (e) => {
    setCharCount(e.target.value.length);
    onChange?.(e);
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-text-primary dark:text-text-inverted mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        maxLength={maxLength}
        onChange={handleChange}
        className={cn(
          'w-full rounded-lg border px-3 py-2.5 text-sm transition-colors resize-y min-h-[80px]',
          'bg-surface-input text-text-primary placeholder-text-muted',
          'border-surface-border focus:border-primary focus:ring-2 focus:ring-primary/20',
          'dark:bg-dark-input dark:text-text-inverted dark:placeholder-text-muted',
          'dark:border-dark-border dark:focus:border-dark-primaryAccent dark:focus:ring-dark-primaryAccent/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-danger focus:border-danger focus:ring-danger/20 dark:border-danger',
          className
        )}
        {...props}
      />
      <div className="flex justify-between mt-1">
        <div>
          {error && <p className="text-xs text-danger">{error}</p>}
          {helperText && !error && (
            <p className="text-xs text-text-muted dark:text-text-muted">{helperText}</p>
          )}
        </div>
        {maxLength && (
          <p className="text-xs text-text-muted dark:text-text-muted">
            {charCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
});

export default Textarea;
