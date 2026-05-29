/**
 * NotificationBell
 * Floating notification bell (top-right) + dropdown panel.
 * Real-time badge count, group by category, infinite scroll.
 *
 * Panel positioning:
 *   - Desktop: uses position:fixed with viewport collision detection
 *   - Anchored below bell, prefers right-aligned, flips to left if overflowing
 *   - Always stays within the browser viewport
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  MessageSquare,
  Star,
  TrendingUp,
  Shield,
  Award,
  Users,
  Zap,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { useNotifications, relativeTime, NOTIF_META, NOTIF_CATEGORY_ORDER } from '../contexts/NotificationContext';

// ── Category group config ─────────────────────────────────────────────────────
const CATEGORY_GROUPS = {
  Ticket:         { icon: MessageSquare, color: '#38bdf8' },
  'Golden Ticket': { icon: Star,         color: '#fbbf24' },
  Contribution:   { icon: TrendingUp,    color: '#4ade80' },
  Moderation:     { icon: Shield,        color: '#f87171' },
  Account:        { icon: Settings,      color: '#c084fc' },
  Rewards:        { icon: Award,         color: '#fbbf24' },
  Social:         { icon: Users,         color: '#a78bfa' },
  System:         { icon: Zap,           color: '#94a3b8' },
};

const CATEGORY_GROUP_MAP = {};
Object.entries(NOTIF_META).forEach(([type, meta]) => {
  CATEGORY_GROUP_MAP[type] = meta.label;
});

// ── Individual notification item ──────────────────────────────────────────────
function NotificationItem({ notification, onMarkRead, onDelete }) {
  const meta = NOTIF_META[notification.type] || { icon: '🔔', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        group relative flex items-start gap-3 px-4 py-3
        hover:bg-white/5 transition-colors cursor-pointer
        border-b border-white/5 last:border-0
        ${notification.read ? 'opacity-60' : ''}
      `}
      onClick={() => onMarkRead(notification)}
    >
      {/* Unread dot */}
      {!notification.read && (
        <div className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
      )}

      {/* Icon */}
      <div
        className={`
          flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base
          transition-transform group-hover:scale-110
          ${meta.animate ? 'animate-notif-pulse' : ''}
        `}
        style={{ background: meta.bg, color: meta.color }}
      >
        {meta.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold leading-snug ${notification.read ? 'text-slate-400' : 'text-slate-100'}`}>
            {notification.title}
          </p>
          <span className="flex-shrink-0 text-[10px] text-slate-500 mt-0.5">
            {relativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed break-words whitespace-normal">
          {notification.message}
        </p>
      </div>

      {/* Hover actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkRead(notification, true); }}
            className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors"
            title="Mark as read"
          >
            <Check size={12} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notification._id); }}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
        {notification.actionUrl && (
          <span className="text-slate-500">
            <ChevronRight size={12} />
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Bell size={24} className="text-slate-600" />
      </div>
      <p className="text-sm font-semibold text-slate-400">No notifications yet</p>
      <p className="text-xs text-slate-500 mt-1">We'll notify you when something important happens</p>
    </div>
  );
}

// ── Main NotificationBell ─────────────────────────────────────────────────────
export default function NotificationBell() {
  const {
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
  } = useNotifications();

  const panelRef = useRef(null);
  const bellRef = useRef(null);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Panel position: calculated on open to avoid viewport overflow
  const [panelPos, setPanelPos] = useState({ top: 0, left: 'auto', right: 0, width: 400 });
  const PANEL_WIDTH = 400;
  const PANEL_MAX_HEIGHT = 480;
  const VIEWPORT_PAD = 16;

  const calculatePosition = useCallback(() => {
    if (!bellRef.current) return;
    const bell = bellRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Default: open below bell, right-aligned to bell's right edge
    let left = bell.right - PANEL_WIDTH;
    let right = 'auto';

    // If no room on left, flip to open below bell, left-aligned to bell's left edge
    if (left < VIEWPORT_PAD) {
      left = bell.left;
      right = 'auto';
    }

    // Clamp left to viewport
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
    // Clamp right to viewport
    const maxRight = vw - VIEWPORT_PAD - PANEL_WIDTH;
    if (typeof left === 'number' && left > maxRight) {
      left = Math.max(VIEWPORT_PAD, maxRight);
    }

    // Vertical: below bell by default; if not enough room below, open above
    const spaceBelow = vh - bell.bottom;
    let top;
    if (spaceBelow >= PANEL_MAX_HEIGHT + 8) {
      top = bell.bottom + 8;
    } else {
      top = bell.top - PANEL_MAX_HEIGHT - 8;
    }
    // Clamp top
    top = Math.max(VIEWPORT_PAD, Math.min(top, vh - PANEL_MAX_HEIGHT - VIEWPORT_PAD));

    setPanelPos({ left, right, top, width: PANEL_WIDTH });
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isPanelOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        bellRef.current &&
        !bellRef.current.contains(e.target)
      ) {
        setIsPanelOpen(false);
      }
    };
    // Use capture phase so we catch events before they bubble
    document.addEventListener('mousedown', handleClickOutside, { capture: true });
    return () => document.removeEventListener('mousedown', handleClickOutside, { capture: true });
  }, [isPanelOpen, setIsPanelOpen]);

  // Recalculate position when panel opens and on window resize
  useEffect(() => {
    if (isPanelOpen) {
      calculatePosition();
      window.addEventListener('resize', calculatePosition, { passive: true });
      window.addEventListener('scroll', calculatePosition, { passive: true, capture: true });
    }
    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, { passive: true, capture: true });
    };
  }, [isPanelOpen, calculatePosition]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPanelOpen) setIsPanelOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen, setIsPanelOpen]);

  // Infinite scroll sentinel
  useEffect(() => {
    if (!isPanelOpen) return;
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(loadMoreRef.current);

    return () => observerRef.current?.disconnect();
  }, [isPanelOpen, hasMore, isLoading, loadMore]);

  // Group notifications by category
  const grouped = {};
  NOTIF_CATEGORY_ORDER.forEach((cat) => { grouped[cat] = []; });
  notifications.forEach((n) => {
    const cat = CATEGORY_GROUP_MAP[n.type] || 'System';
    if (grouped[cat]) grouped[cat].push(n);
    else grouped['System'].push(n);
  });

  return (
    <div className="relative">
      {/* ── Bell button ────────────────────────────────────────────────────── */}
      <button
        ref={bellRef}
        onClick={() => setIsPanelOpen((v) => !v)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 transition-all group"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell
          size={20}
          className={`
            transition-all
            ${unreadCount > 0 ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'}
            ${isPanelOpen ? 'text-sky-300' : ''}
          `}
        />

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={`
                absolute -top-0.5 -right-0.5
                flex items-center justify-center
                min-w-[18px] h-[18px] px-1
                text-[10px] font-bold text-white rounded-full
                shadow-lg
                ${unreadCount > 9 ? 'bg-orange-500' : 'bg-rose-500'}
              `}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse ring on new notification */}
        {unreadCount > 0 && (
          <span className="absolute inset-0 rounded-xl ring-2 ring-rose-400/40 animate-ping pointer-events-none" />
        )}
      </button>

      {/* ── Dropdown panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="
              fixed z-[100]
              bg-[#0d1117]/95 backdrop-blur-xl
              border border-white/10 rounded-2xl
              shadow-2xl shadow-black/50
            "
            style={{
              top: panelPos.top,
              left: typeof panelPos.left === 'number' ? panelPos.left : 'auto',
              right: panelPos.right === 'auto' ? 'auto' : panelPos.right,
              width: panelPos.width,
              maxHeight: `${PANEL_MAX_HEIGHT}px`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-400 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck size={13} />
                    <span>All read</span>
                  </button>
                )}
                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors text-xs"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: '480px' }}
            >
              {notifications.length === 0 && !isLoading ? (
                <EmptyState />
              ) : (
                <>
                  {/* Flat list — grouped sections */}
                  {notifications.length === 0 ? null : (
                    <div>
                      {notifications.map((n) => (
                        <NotificationItem
                          key={n._id}
                          notification={n}
                          onMarkRead={(notif) => {
                            handleNotificationClick(notif);
                          }}
                          onDelete={deleteNotification}
                        />
                      ))}
                    </div>
                  )}

                  {/* Load more sentinel */}
                  {hasMore && (
                    <div ref={loadMoreRef} className="flex items-center justify-center py-4">
                      {isLoading ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <div className="w-4 h-4 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
                          Loading...
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-white/8 px-4 py-2.5 text-center">
                <button
                  onClick={() => {
                    setIsPanelOpen(false);
                    window.location.href = '/notifications';
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                >
                  View all notifications →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}