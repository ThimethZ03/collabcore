import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/helpers';

export default function ThemeToggle({ className }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative p-2 rounded-lg transition-colors',
        'text-text-secondary hover:text-text-primary hover:bg-surface-border/30',
        'dark:text-text-muted dark:hover:text-text-inverted dark:hover:bg-dark-elevated',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
