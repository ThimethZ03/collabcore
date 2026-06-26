import { cn } from '../../utils/helpers';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {Icon && (
        <div className="p-4 rounded-full bg-surface-input dark:bg-dark-elevated mb-4">
          <Icon size={40} className="text-text-muted dark:text-text-muted" />
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-text-primary dark:text-text-inverted mb-1">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-text-secondary dark:text-text-muted max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
