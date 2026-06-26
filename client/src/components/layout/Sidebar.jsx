import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UsersRound, FolderKanban, BarChart3,
  CheckSquare, Flag, MessageSquare, ClipboardCheck, AlertTriangle,
  LogOut, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import { cn } from '../../utils/helpers';

const roleNavItems = {
  coordinator: [
    { label: 'Dashboard', path: '/coordinator/dashboard', icon: LayoutDashboard },
    { label: 'Students', path: '/coordinator/students', icon: Users },
    { label: 'Mentors', path: '/coordinator/mentors', icon: ClipboardCheck },
    { label: 'Teams', path: '/coordinator/teams', icon: UsersRound },
    { label: 'Analytics', path: '/coordinator/analytics', icon: BarChart3 },
  ],
  student: [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'My Team', path: '/student/team', icon: Users },
    { label: 'Projects', path: '/student/projects', icon: FolderKanban },
    { label: 'Tasks', path: '/student/tasks', icon: CheckSquare },
    { label: 'Milestones', path: '/student/milestones', icon: Flag },
    { label: 'Feedback', path: '/student/feedback', icon: MessageSquare },
  ],
  mentor: [
    { label: 'Dashboard', path: '/mentor/dashboard', icon: LayoutDashboard },
    { label: 'Teams', path: '/mentor/teams', icon: UsersRound },
    { label: 'Evaluations', path: '/mentor/evaluations', icon: ClipboardCheck },
    { label: 'Risk Alerts', path: '/mentor/risks', icon: AlertTriangle },
  ],
};

const roleBadgeVariant = {
  coordinator: 'primary',
  student: 'info',
  mentor: 'success',
};

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = roleNavItems[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-surface-border dark:border-dark-border shrink-0',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">CC</span>
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-text-primary dark:text-text-inverted whitespace-nowrap">
            CollabCore
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => onMobileClose?.()}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-primary-light text-primary dark:bg-dark-primaryLight dark:text-dark-primaryAccent border-l-2 border-primary dark:border-dark-primaryAccent rounded-l-none'
                  : 'text-text-secondary dark:text-text-muted hover:bg-surface-input hover:text-text-primary dark:hover:bg-dark-elevated dark:hover:text-text-inverted hover:translate-x-1'
              )
            }
          >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t border-surface-border dark:border-dark-border p-3 shrink-0">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Avatar name={user?.fullName} size="sm" />
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar name={user?.fullName} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary dark:text-text-inverted truncate">
                {user?.fullName || 'User'}
              </p>
              <Badge variant={roleBadgeVariant[user?.role] || 'gray'}>
                {user?.role || 'unknown'}
              </Badge>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Collapse Toggle (desktop) */}
      <div className="hidden lg:flex justify-center py-2 border-t border-surface-border dark:border-dark-border">
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-input dark:hover:text-text-inverted dark:hover:bg-dark-elevated transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30',
          'bg-surface-card border-r border-surface-border',
          'dark:bg-dark-card dark:border-dark-border',
          'transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={onMobileClose} />
          <aside className="fixed inset-y-0 left-0 w-60 z-50 bg-surface-card dark:bg-dark-card border-r border-surface-border dark:border-dark-border shadow-xl">
            <button
              onClick={onMobileClose}
              className="absolute top-4 right-3 p-1 rounded-lg text-text-muted hover:text-text-primary dark:hover:text-text-inverted"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
