/**
 * NotificationContext
 * Global state for notifications + real-time Socket.IO integration.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}

// ── Relative timestamp helper ─────────────────────────────────────────────────
export function relativeTime(date) {
  if (!date) return '';
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 30) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

// ── Notification type metadata: icon + color ─────────────────────────────────
export const NOTIF_META = {
  TICKET_ANSWERED:         { icon: '💬', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  label: 'Ticket' },
  TICKET_UNDER_REVIEW:     { icon: '👀', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  label: 'Ticket' },
  TICKET_ESCALATED:        { icon: '📈', color: '#f97316', bg: 'rgba(249,115,22,0.1)',  label: 'Ticket' },
  TICKET_RESOLVED:         { icon: '✅', color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  label: 'Ticket' },
  TICKET_REOPENED:         { icon: '🔄', color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  label: 'Ticket' },
  TICKET_MERGED:           { icon: '🔗', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',label: 'Ticket' },
  TICKET_REDIRECTED:       { icon: '↪️', color: '#67e8f9', bg: 'rgba(103,232,249,0.1)', label: 'Ticket' },
  GOLDEN_TICKET_APPROVED:  { icon: '🎉', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', label: 'Golden Ticket', animate: true },
  GOLDEN_TICKET_REJECTED:  { icon: '❌', color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Golden Ticket' },
  GOLDEN_TICKET_REVIEWED:  { icon: '⭐', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  label: 'Golden Ticket' },
  CONTRIBUTION_ACCEPTED:   { icon: '✅', color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  label: 'Contribution' },
  CONTRIBUTION_REJECTED:   { icon: '❌', color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Contribution' },
  CONTRIBUTION_UPVOTED:    { icon: '👍', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  label: 'Contribution' },
  CONTRIBUTION_FEATURED:   { icon: '⭐', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', label: 'Contribution', animate: true },
  WARNING_ISSUED:          { icon: '⚠️', color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  label: 'Moderation' },
  TEMP_BAN:                { icon: '⛔', color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Moderation', animate: true },
  PERM_BAN:                { icon: '⛔', color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   label: 'Moderation', animate: true },
  MUTE_APPLIED:            { icon: '🔇', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'Moderation' },
  SUSPENSION_LIFTED:       { icon: '✅', color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  label: 'Moderation' },
  ROLE_CHANGED:            { icon: '🎉', color: '#c084fc', bg: 'rgba(192,132,252,0.1)', label: 'Account' },
  BADGE_EARNED:            { icon: '🏅', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', label: 'Rewards', animate: true },
  MILESTONE_REACHED:       { icon: '🎯', color: '#34d399', bg: 'rgba(52,211,153,0.1)',  label: 'Rewards' },
  REPUTATION_INCREASED:    { icon: '📈', color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  label: 'Rewards' },
  TOP_CONTRIBUTOR:         { icon: '🏆', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', label: 'Rewards', animate: true },
  QUERY_TRENDING:          { icon: '📊', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  label: 'Social' },
  USER_JOINED_QUERY:       { icon: '👋', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', label: 'Social' },
  QUERY_CLUSTERED:         { icon: '🔗', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', label: 'Social' },
  ANSWER_MARKED_HELPFUL:   { icon: '👍', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  label: 'Social' },
  ADMIN_RESPONDED:         { icon: '💬', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  label: 'Social' },
  MENTION:                 { icon: '@',  color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  label: 'Social' },
  MAINTENANCE_NOTICE:      { icon: '🔧', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'System' },
  FEATURE_RELEASE:         { icon: '✨', color: '#c084fc', bg: 'rgba(192,132,252,0.1)', label: 'System' },
  SECURITY_ALERT:          { icon: '🔐', color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'System', animate: true },
  LOGIN_NEW_DEVICE:        { icon: '🔐', color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  label: 'System' },
  DOWNTIME_NOTICE:         { icon: '⏰', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'System' },
  BROADCAST_ALL:           { icon: '📢', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  label: 'System' },
  BROADCAST_TARGETED:      { icon: '📢', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  label: 'System' },
};

export const NOTIF_CATEGORY_ORDER = ['Ticket', 'Golden Ticket', 'Contribution', 'Moderation', 'Account', 'Rewards', 'Social', 'System'];

export default function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const socketRef = useRef(null);
  const toastTimeouts = useRef({});

  // ── Fetch notifications (initial + paginated) ───────────────────────────────
  const fetchNotifications = useCallback(async (pageNum = 1, reset = false) => {
    setIsLoading(true);
    try {
      const res = await axiosClient.get('/notifications', {
        params: { page: pageNum, limit: 20 },
      });
      const { notifications: newNotifs, total, pages } = res.data;
      setHasMore(pageNum < pages);
      setPage(pageNum);
      setNotifications((prev) =>
        reset ? newNotifs : [...prev, ...newNotifs]
      );
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      // Silently fail — notifications shouldn't break the app
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Socket.IO real-time setup ───────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Tell backend our userId (decoded from token server-side ideally, but
      // we pass it explicitly for simplicity)
      const payload = JSON.parse(atob(token.split('.')[1]));
      socket.emit('user:join', { userId: payload.id });
    });

    // Real-time new notification
    socket.on('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((c) => c + 1);
      showToast(notification);
    });

    // Real-time broadcast
    socket.on('notification:broadcast', (data) => {
      // For broadcast we refresh the whole list
      fetchNotifications(1, true);
    });

    socket.on('disconnect', () => console.log('[Socket.IO] Disconnected'));

    return () => socket.disconnect();
  }, [fetchNotifications]);

  // ── Toast notification popup ────────────────────────────────────────────────
  const showToast = useCallback((notification) => {
    const meta = NOTIF_META[notification.type] || { icon: '🔔', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
    const toastId = `notif-${notification._id}`;

    // Clear any existing toast for the same notification
    if (toastTimeouts.current[toastId]) {
      clearTimeout(toastTimeouts.current[toastId]);
    }

    toast.custom(
      (t) => (
        <div
          onClick={() => {
            handleNotificationClick(notification);
            toast.dismiss(t.id);
          }}
          className={`
            flex items-start gap-3 w-[360px] max-w-[calc(100vw-32px)]
            bg-[#0f1923] border border-white/10
            rounded-2xl px-4 py-3 shadow-2xl cursor-pointer
            transform transition-all duration-300
            ${t.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
          `}
          style={{ borderColor: `${meta.color}30` }}
        >
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: meta.bg, color: meta.color }}
          >
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-100 truncate">{notification.title}</p>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notification.message}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(t.id);
            }}
            className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      ),
      {
        id: toastId,
        duration: 5000,
        position: 'top-right',
      }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Action helpers ──────────────────────────────────────────────────────────
  const handleNotificationClick = useCallback((notification) => {
    if (!notification.read) {
      markRead(notification._id);
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  }, []);

  const markRead = useCallback(async (notificationId) => {
    try {
      await axiosClient.patch(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await axiosClient.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (_) {}
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const n = notifications.find((n) => n._id === notificationId);
      await axiosClient.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      if (n && !n.read) setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  }, [notifications]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) fetchNotifications(page + 1);
  }, [isLoading, hasMore, page, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        hasMore,
        isPanelOpen,
        setIsPanelOpen,
        fetchNotifications,
        markRead,
        markAllRead,
        deleteNotification,
        loadMore,
        handleNotificationClick,
        NOTIF_META,
        NOTIF_CATEGORY_ORDER,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}