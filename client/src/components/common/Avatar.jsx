import { cn, getInitials, getAvatarColor } from '../../utils/helpers';

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

const statusDotSize = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

const statusColors = {
  online: 'bg-success',
  offline: 'bg-neutral',
  busy: 'bg-danger',
};

export default function Avatar({ name, src, size = 'md', status, className }) {
  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={cn('rounded-full object-cover', sizeMap[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white',
            sizeMap[size]
          )}
          style={{ backgroundColor: bgColor }}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-dark-card',
            statusDotSize[size],
            statusColors[status] || statusColors.offline
          )}
        />
      )}
    </div>
  );
}
