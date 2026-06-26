import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', className }) {
  const handleEsc = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />
      <div
        className={cn(
          'relative w-full rounded-xl shadow-2xl',
          'bg-surface-card border border-surface-border',
          'dark:bg-dark-card dark:border-dark-border',
          'animate-in fade-in zoom-in-95',
          sizeClasses[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border dark:border-dark-border">
            <h2 className="text-lg font-semibold text-text-primary dark:text-text-inverted">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-border/30 dark:hover:text-text-inverted dark:hover:bg-dark-elevated transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-surface-border dark:border-dark-border flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
