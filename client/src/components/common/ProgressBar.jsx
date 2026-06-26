import { cn } from '../../utils/helpers';

export default function ProgressBar({ value = 0, color, label, showValue = false, className }) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const defaultColor =
    clampedValue >= 80
      ? 'bg-success'
      : clampedValue >= 50
        ? 'bg-primary dark:bg-dark-primaryAccent'
        : clampedValue >= 25
          ? 'bg-warning'
          : 'bg-danger';

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs font-medium text-text-secondary dark:text-text-muted">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-xs font-semibold text-text-primary dark:text-text-inverted">
              {clampedValue}%
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-surface-border/50 dark:bg-dark-border rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', color || defaultColor)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
