import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/helpers';

const widthMap = {
  sm: 'max-w-xs w-80',
  md: 'max-w-md w-[480px]',
  lg: 'max-w-xl w-[640px]',
};

export default function Drawer({ isOpen, onClose, title, children, width = 'md', className }) {
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />
      <div
        className={cn(
          'ml-auto relative h-full flex flex-col shadow-2xl',
          'bg-surface-card border-l border-surface-border',
          'dark:bg-dark-card dark:border-dark-border',
          'transform transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          widthMap[width],
          className
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border dark:border-dark-border shrink-0">
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
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
