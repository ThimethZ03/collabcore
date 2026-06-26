import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/helpers';

const colorMap = {
  primary: {
    icon: 'bg-primary-light text-primary dark:bg-dark-primaryLight dark:text-dark-primaryAccent',
  },
  success: {
    icon: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  warning: {
    icon: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  danger: {
    icon: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
  info: {
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
};

export default function StatCard({ label, value, icon: Icon, trend, color = 'primary', className }) {
  const colorStyle = colorMap[color] || colorMap.primary;
  const trendPositive = trend > 0;

  return (
    <div
      className={cn(
        'rounded-xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1',
        'bg-surface-card border-surface-border',
        'dark:bg-dark-card dark:border-dark-border',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-secondary dark:text-text-muted truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-text-inverted">
            {value}
          </p>
          {trend !== undefined && trend !== null && (
            <div className="flex items-center gap-1 mt-2">
              {trendPositive ? (
                <TrendingUp size={14} className="text-success" />
              ) : (
                <TrendingDown size={14} className="text-danger" />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  trendPositive ? 'text-success' : 'text-danger'
                )}
              >
                {trendPositive ? '+' : ''}
                {trend}%
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-lg', colorStyle.icon)}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}
