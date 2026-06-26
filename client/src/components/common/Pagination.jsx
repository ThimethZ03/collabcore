import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function Pagination({ page, pages, total, onPageChange, className }) {
  if (pages <= 1) return null;

  const getPageNumbers = () => {
    const nums = [];
    const maxVisible = 5;

    if (pages <= maxVisible) {
      for (let i = 1; i <= pages; i++) nums.push(i);
    } else {
      nums.push(1);
      if (page > 3) nums.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(pages - 1, page + 1);
      for (let i = start; i <= end; i++) nums.push(i);
      if (page < pages - 2) nums.push('...');
      nums.push(pages);
    }

    return nums;
  };

  const btnBase = cn(
    'inline-flex items-center justify-center h-9 min-w-[36px] px-2 text-sm rounded-lg transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-dark-primaryAccent/30'
  );

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {total !== undefined && (
        <p className="text-sm text-text-secondary dark:text-text-muted">
          {total} total result{total !== 1 ? 's' : ''}
        </p>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={cn(
            btnBase,
            'text-text-secondary dark:text-text-muted',
            'hover:bg-surface-border/30 dark:hover:bg-dark-elevated',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <ChevronLeft size={16} />
        </button>
        {getPageNumbers().map((num, idx) =>
          num === '...' ? (
            <span key={`dots-${idx}`} className="px-1 text-text-muted">
              …
            </span>
          ) : (
            <button
              key={num}
              onClick={() => onPageChange(num)}
              className={cn(
                btnBase,
                num === page
                  ? 'bg-primary text-white dark:bg-dark-primaryAccent dark:text-dark-bg font-medium'
                  : 'text-text-secondary dark:text-text-muted hover:bg-surface-border/30 dark:hover:bg-dark-elevated'
              )}
            >
              {num}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className={cn(
            btnBase,
            'text-text-secondary dark:text-text-muted',
            'hover:bg-surface-border/30 dark:hover:bg-dark-elevated',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
