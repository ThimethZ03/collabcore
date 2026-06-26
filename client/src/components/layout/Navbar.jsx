import { useState, useRef, useEffect } from 'react';
import { Bell, Menu, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import ThemeToggle from '../common/ThemeToggle';
import Avatar from '../common/Avatar';
import NotificationsPanel from '../common/NotificationsPanel';
import { cn } from '../../utils/helpers';

export default function Navbar({ title, onMenuClick }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-4 lg:px-6 border-b border-surface-border dark:border-dark-border bg-surface-card/80 dark:bg-dark-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-input dark:text-text-muted dark:hover:text-text-inverted dark:hover:bg-dark-elevated transition-colors"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-semibold text-text-primary dark:text-text-inverted">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Notification Bell */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-border/30 dark:text-text-muted dark:hover:text-text-inverted dark:hover:bg-dark-elevated transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-[16px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-danger rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Avatar Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-border/30 dark:hover:bg-dark-elevated transition-colors"
            >
              <Avatar name={user?.fullName} size="sm" />
              <ChevronDown
                size={14}
                className={cn(
                  'text-text-muted transition-transform hidden sm:block',
                  showDropdown && 'rotate-180'
                )}
              />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border shadow-lg bg-surface-card border-surface-border dark:bg-dark-card dark:border-dark-border py-1 z-50">
                <div className="px-4 py-2 border-b border-surface-border dark:border-dark-border">
                  <p className="text-sm font-medium text-text-primary dark:text-text-inverted truncate">
                    {user?.fullName}
                  </p>
                  <p className="text-xs text-text-muted truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/settings');
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-text-secondary dark:text-text-muted hover:bg-surface-input dark:hover:bg-dark-elevated transition-colors"
                >
                  <Settings size={16} /> Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
}
