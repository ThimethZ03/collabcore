import { cn } from '../../utils/helpers';

export default function Card({ title, action, children, className, padding = true }) {
  return (
    <div
      className={cn(
        'rounded-xl border shadow-sm transition-all duration-300',
        'bg-surface-card border-surface-border',
        'dark:bg-dark-card dark:border-dark-border',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border dark:border-dark-border">
          {title && (
            <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted">
              {title}
            </h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn(padding && 'p-5')}>{children}</div>
    </div>
  );
}
