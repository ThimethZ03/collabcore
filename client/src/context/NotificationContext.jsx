import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as notificationsApi from '../api/notifications';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await notificationsApi.getUnreadCount();
      setUnreadCount(data.count ?? data.data?.count ?? 0);
    } catch {
      /* silently fail */
    }
  }, []);

  const fetchNotifications = useCallback(async (params) => {
    setLoading(true);
    try {
      const { data } = await notificationsApi.getNotifications(params);
      const items = data.data?.notifications || data.notifications || data.data || [];
      setNotifications(Array.isArray(items) ? items : []);
      return items;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      /* silently fail */
    }
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      /* silently fail */
    }
  }, []);

  // Optimistic update for a single notification (used by invite accept/decline)
  const updateNotification = useCallback((id, patch) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, ...patch } : n))
    );
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      intervalRef.current = setInterval(fetchUnreadCount, 30000);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, fetchNotifications, markAllRead, markRead, updateNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
