import { useState, useEffect } from 'react';
import {
  Bell, CheckCheck, AlertTriangle, CheckSquare,
  MessageSquare, Info, Users, Check, X, Loader2,
} from 'lucide-react';
import Drawer from './Drawer';
import Spinner from './Spinner';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { formatDate, cn } from '../../utils/helpers';
import * as teamsApi from '../../api/teams';

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'alert', label: 'Alerts' },
  { key: 'task', label: 'Tasks' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'team_invite', label: 'Invites' },
];

const typeIcons = {
  alert: AlertTriangle,
  task: CheckSquare,
  feedback: MessageSquare,
  system: Info,
  evaluation: CheckSquare,
  team_invite: Users,
};

const typeColors = {
  alert: 'text-warning',
  task: 'text-primary dark:text-dark-primaryAccent',
  feedback: 'text-success',
  system: 'text-info',
  evaluation: 'text-primary dark:text-dark-primaryAccent',
  team_invite: 'text-violet-500 dark:text-violet-400',
};

const statusBadge = {
  accepted: { label: 'Accepted', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  declined: { label: 'Declined', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
  proposal_submitted: { label: 'Submitted', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

/** Inline Accept / Decline for team_invite notifications */
function InviteActions({ notif, onRespond }) {
  const [responding, setResponding] = useState(null); // 'accept' | 'decline'
  const meta = notif.meta || {};
  const inviteStatus = meta.status || 'pending';

  // Already responded or non-actionable
  if (inviteStatus !== 'pending') {
    const badge = statusBadge[inviteStatus];
    return badge ? (
      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', badge.cls)}>
        {badge.label}
      </span>
    ) : null;
  }

  const handle = async (action) => {
    setResponding(action);
    try {
      await onRespond(notif._id, meta.inviteId, action);
    } finally {
      setResponding(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <button
        onClick={(e) => { e.stopPropagation(); handle('accept'); }}
        disabled={!!responding}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-green-500 hover:bg-green-600 text-white disabled:opacity-60 transition-colors"
      >
        {responding === 'accept' ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
        Accept
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); handle('decline'); }}
        disabled={!!responding}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-60 transition-colors"
      >
        {responding === 'decline' ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
        Decline
      </button>
    </div>
  );
}

export default function NotificationsPanel({ isOpen, onClose }) {
  const { notifications, loading, fetchNotifications, markAllRead, markRead, updateNotification } = useNotifications();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  const filtered =
    activeTab === 'all'
      ? notifications
      : notifications.filter((n) => n.type === activeTab);

  const IconComp = ({ type }) => {
    const Ic = typeIcons[type] || Info;
    return <Ic size={18} className={typeColors[type] || 'text-text-muted'} />;
  };

  const handleInviteRespond = async (notifId, inviteId, action) => {
    if (!inviteId) return;
    // Optimistic UI update
    updateNotification(notifId, {
      read: true,
      meta: { ...(notifications.find((n) => n._id === notifId)?.meta || {}), status: action === 'accept' ? 'accepted' : 'declined' },
    });
    try {
      await teamsApi.respondToInvite(inviteId, action);
      // Refresh unread count
      fetchNotifications();
    } catch (err) {
      // Revert on failure
      updateNotification(notifId, { read: false, meta: { ...(notifications.find((n) => n._id === notifId)?.meta || {}), status: 'pending' } });
      console.error('Failed to respond to invite:', err);
    }
  };

  const inviteCount = notifications.filter((n) => n.type === 'team_invite' && n.meta?.status === 'pending' && !n.read).length;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Notifications" width="md">
      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-surface-input dark:bg-dark-elevated rounded-lg p-1 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors relative',
                activeTab === tab.key
                  ? 'bg-surface-card dark:bg-dark-card text-text-primary dark:text-text-inverted shadow-sm'
                  : 'text-text-secondary dark:text-text-muted hover:text-text-primary dark:hover:text-text-inverted'
              )}
            >
              {tab.label}
              {tab.key === 'team_invite' && inviteCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-violet-500 text-white text-[8px] flex items-center justify-center font-bold">
                  {inviteCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={markAllRead}
          className="flex items-center gap-1.5 text-xs text-primary dark:text-dark-primaryAccent hover:underline shrink-0"
        >
          <CheckCheck size={14} />
          Mark all read
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bell size={40} className="text-text-muted/50 mb-3" />
          <p className="text-sm text-text-muted">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => (
            <div
              key={notif._id}
              onClick={() => !notif.read && notif.type !== 'team_invite' && markRead(notif._id)}
              className={cn(
                'flex gap-3 p-3 rounded-lg transition-colors',
                notif.type !== 'team_invite' && 'cursor-pointer',
                notif.read
                  ? 'bg-transparent hover:bg-surface-input dark:hover:bg-dark-elevated/30'
                  : 'bg-primary-light/50 dark:bg-dark-primaryLight/20 hover:bg-primary-light dark:hover:bg-dark-primaryLight/30',
                notif.type === 'team_invite' && !notif.read && 'bg-violet-50/60 dark:bg-violet-900/10 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-violet-200/60 dark:border-violet-800/30'
              )}
            >
              {/* Icon */}
              <div className="mt-0.5 shrink-0">
                <IconComp type={notif.type} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm',
                  notif.read
                    ? 'text-text-secondary dark:text-text-muted'
                    : 'text-text-primary dark:text-text-inverted font-medium'
                )}>
                  {notif.title}
                </p>
                {(notif.body || notif.message) && (
                  <p className="text-xs text-text-secondary dark:text-text-muted mt-0.5 whitespace-pre-wrap leading-relaxed">
                    {notif.body || notif.message}
                  </p>
                )}
                <p className="text-[10px] text-text-muted dark:text-text-muted mt-1">
                  {formatDate(notif.createdAt, 'relative')}
                </p>

                {/* Accept / Decline for pending team invites (only shown to students) */}
                {notif.type === 'team_invite' && notif.meta?.inviteId && user?.role === 'student' && (
                  <InviteActions notif={notif} onRespond={handleInviteRespond} />
                )}
              </div>

              {/* Unread dot */}
              {!notif.read && (
                <div className="shrink-0 mt-2">
                  <div className={cn(
                    'h-2 w-2 rounded-full',
                    notif.type === 'team_invite' ? 'bg-violet-500' : 'bg-primary dark:bg-dark-primaryAccent'
                  )} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
