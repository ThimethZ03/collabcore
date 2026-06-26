import { cn } from '../../utils/helpers';

export default function SkeletonCard({ lines = 3, className }) {
  return (
    <div
      className={cn(
        'rounded-xl border p-5 shadow-sm animate-pulse',
        'bg-surface-card border-surface-border',
        'dark:bg-dark-card dark:border-dark-border',
        className
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-surface-border dark:bg-dark-elevated" />
        <div className="flex-1">
          <div className="h-4 w-2/3 bg-surface-border dark:bg-dark-elevated rounded mb-2" />
          <div className="h-3 w-1/3 bg-surface-border dark:bg-dark-elevated rounded" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-surface-border dark:bg-dark-elevated rounded mb-2 last:mb-0"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}
