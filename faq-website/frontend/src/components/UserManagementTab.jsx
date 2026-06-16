import React, { useState, useEffect, useCallback, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import { Search, RefreshCw, ChevronLeft, ChevronRight, X, User as UserIcon, Clock, AlertCircle, Shield, ShieldCheck, ShieldAlert, ShieldX, Plus, Minus, Ban, UserX } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_LABELS = { all: 'All Status', active: 'Active', suspended: 'Suspended', banned: 'Banned' };
const ROLE_LABELS   = { all: 'All Roles', user: 'User', mentor: 'Mentor / SME', admin: 'Admin' };
const SORT_OPTIONS  = [
  { label: 'Newest Joined',   value: 'createdAt_desc'  },
  { label: 'Oldest Joined',   value: 'createdAt_asc'   },
  { label: 'Name A→Z',        value: 'fullName_asc'    },
  { label: 'Name Z→A',        value: 'fullName_desc'   },
  { label: 'Most SP',         value: 'spurtiPoints_desc' },
  { label: 'Least SP',        value: 'spurtiPoints_asc'  },
  { label: 'Most Pizza',      value: 'pizzaSlices_desc'  },
  { label: 'Least Pizza',     value: 'pizzaSlices_asc'   },
];

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ isSuspended, isBanned }) {
  if (isBanned)    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">Banned</span>;
  if (isSuspended) return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">Suspended</span>;
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Active</span>;
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
function Drawer({ isOpen, onClose, user, onUserUpdate }) {
  const drawerRef = useRef(null);

  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'user',
        institution: user.institution || ''
      });
    }
  }, [user]);

  const hasChanges = user && (
    formData.fullName !== (user.fullName || '') ||
    formData.username !== (user.username || '') ||
    formData.email !== (user.email || '') ||
    formData.role !== (user.role || 'user') ||
    formData.institution !== (user.institution || '')
  );

  // Close on ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Close on click outside
  const handleBackdrop = (e) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target)) onClose();
  };

  // Lock body scroll while drawer open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Hide Bee when drawer is open
      document.documentElement.style.setProperty('--bee-visibility', 'none');
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.setProperty('--bee-visibility', 'block');
    }
    return () => { 
      document.body.style.overflow = ''; 
      document.documentElement.style.setProperty('--bee-visibility', 'block');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await axiosClient.put(`/user-management/users/${user._id}`, formData);
      toast.success('User updated successfully');
      onUserUpdate(res.data.user);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const isDemoUser = import.meta.env.MODE === 'development' && (user?.email?.endsWith('@infracon.com') || user?.email?.endsWith('@test.com'));

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={handleBackdrop}
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />

      <div
        ref={drawerRef}
        className="relative w-full sm:w-[500px] md:w-[600px] lg:w-[650px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl overflow-hidden transition-transform"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Edit User Profile</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-24">
          
          {/* Section 1: User Header */}
          <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {user?.fullName
                    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                    : <UserIcon size={32} className="text-indigo-400" />}
                </span>
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{user?.fullName || '—'}</h3>
                  <StatusBadge isSuspended={user?.isSuspended} isBanned={user?.isBanned} />
                  {isDemoUser && <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 uppercase tracking-wide">Demo Data</span>}
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">@{user?.username || '—'}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5"><Clock size={14} /> Joined {formatDate(user?.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Account Information */}
          <div className="p-6">
            <SectionHeading>Account Information</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email || ''} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                <input 
                  type="text" 
                  value={formData.username || ''} 
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                <input 
                  type="text" 
                  value={formData.fullName || ''} 
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                <select 
                  value={formData.role || 'user'} 
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                >
                  <option value="user">User</option>
                  <option value="mentor">Mentor / SME</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Institution / Organization</label>
                <input 
                  type="text" 
                  value={formData.institution || ''} 
                  onChange={e => setFormData({...formData, institution: e.target.value})}
                  className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Statistics */}
          <div className="px-6 pb-6">
            <SectionHeading>Statistics</SectionHeading>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <StatCard label="Spurti Points" value={user?.spurtiPoints ?? 0} accent="indigo" />
              <StatCard label="Pizza Slices" value={user?.pizzaSlices ?? 0} accent="amber" />
              <StatCard label="Contributions" value={user?.contributionsCount ?? 0} accent="emerald" />
              <StatCard label="Answers" value={user?.answersCount ?? 0} accent="blue" />
            </div>
          </div>

          <div className="px-6 pb-6 space-y-8">
            <StatusSection user={user} onUpdate={onUserUpdate} />
            <RewardsSection user={user} onUpdate={onUserUpdate} />
            <ActivitySection userId={user?._id} onRefresh={onUserUpdate} />
            <ModerationSection userId={user?._id} onRefresh={onUserUpdate} />
          </div>
        </div>

        {/* Section 6: Save Actions Sticky Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex items-center justify-end gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_20px_rgba(0,0,0,0.2)]">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveProfile}
            disabled={!hasChanges || saving}
            className="px-5 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
      {children}
    </h3>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm text-slate-900 dark:text-slate-100 font-medium">{value}</span>
    </div>
  );
}

function StatCard({ label, value, accent = 'indigo' }) {
  const styles = {
    indigo:  'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300',
    amber:   'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    blue:    'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-300',
  }[accent] || 'bg-slate-50 border-slate-100 text-slate-700';

  return (
    <div className={`${styles} rounded-xl border p-4 flex flex-col justify-center shadow-sm`}>
      <span className="text-2xl font-bold mb-1 leading-none">{Number(value).toLocaleString()}</span>
      <span className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
}
// ─── Relative time ────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs  = Math.floor(diff / 1000);
  const mins  = Math.floor(secs  / 60);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 30) return new Date(dateStr).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  if (days  >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  if (mins  >= 1) return `${mins}m ago`;
  return 'just now';
}

// ─── Activity section ─────────────────────────────────────────────────────────
const ACTION_COLOURS = {
  question_asked:        'text-blue-400',
  contribution_submitted:'text-indigo-400',
  faq_approved:          'text-emerald-400',
  answer_posted:         'text-cyan-400',
  attachment_uploaded:   'text-purple-400',
  ticket_resolved:       'text-green-400',
  sp_earned:             'text-amber-400',
  role_changed:          'text-pink-400',
  warning_received:      'text-orange-400',
  suspension:            'text-red-400',
  ban:                   'text-red-500',
};

function ActivitySection({ userId, onRefresh }) {
  const [activities, setActivities] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [page,  setPage]    = useState(1);
  const [pages, setPages]   = useState(1);

  const fetchPage = (p, isInitial) => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true); setError(null);
    axiosClient
      .get(`/user-management/users/${userId}/activity?page=${p}&limit=20`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        setActivities(Array.isArray(data.activities) ? data.activities : []);
        setPage(data.page || 1);
        setPages(data.pages || 1);
        setLoading(false);
        if (isInitial && onRefresh && data.user) onRefresh({ user: data.user });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[ActivitySection]', err);
        setError(err.response?.data?.error || 'Failed to load activity');
        setLoading(false);
      });
    return () => { cancelled = true; };
  };

  useEffect(() => {
    if (!userId) { setActivities([]); return; }
    setPage(1);
    const cleanup = fetchPage(1, true);
    return cleanup;
  }, [userId]);

  const handlePage = (p) => { fetchPage(p, false); };

  return (
    <div>
      <SectionHeading>Activity</SectionHeading>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
          <RefreshCw size={14} className="animate-spin" />
          Loading activity…
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 py-6 text-red-400 text-sm">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {!loading && !error && activities.length === 0 && (
        <div className="py-8 text-center text-slate-500 text-sm italic">
          No activity recorded yet.
        </div>
      )}

      {!loading && !error && activities.length > 0 && (
        <>
          <div className="mt-3 space-y-1">
            {activities.map((act, i) => {
              const colour = ACTION_COLOURS[act.action] || 'text-slate-300';
              return (
                <div key={act._id ?? i} className="flex gap-3 py-3 border-b border-white/5 last:border-0">
                  {/* Timeline dot */}
                  <div className="mt-1 shrink-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${colour.replace('text-', 'bg-')}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${colour}`}>
                      {act.description || act.action?.replace(/_/g, ' ') || '—'}
                    </p>
                    {act.metadata && JSON.stringify(act.metadata) !== '{}' && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {typeof act.metadata === 'object'
                          ? Object.entries(act.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')
                          : String(act.metadata)}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                      <Clock size={10} />
                      <span>{timeAgo(act.createdAt)}</span>
                      <span className="opacity-50">·</span>
                      <span>{new Date(act.createdAt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                disabled={page <= 1 || loading}
                onClick={() => handlePage(page - 1)}
                className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-100 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-slate-500 min-w-[48px] text-center">
                {page} / {pages}
              </span>
              <button
                disabled={page >= pages || loading}
                onClick={() => handlePage(page + 1)}
                className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-100 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Moderation section ───────────────────────────────────────────────────────
const MOD_ACTIONS = {
  suspend:    { label: 'Suspended',     colour: 'text-orange-400', dot: 'bg-orange-400'  },
  unsuspend:  { label: 'Unsuspended',   colour: 'text-green-400',  dot: 'bg-green-400'   },
  ban:        { label: 'Banned',        colour: 'text-red-500',    dot: 'bg-red-500'     },
  unban:      { label: 'Unbanned',      colour: 'text-emerald-400',dot: 'bg-emerald-400' },
  role_change:{ label: 'Role Changed',  colour: 'text-blue-400',   dot: 'bg-blue-400'    },
  warning:    { label: 'Warning',       colour: 'text-amber-400',  dot: 'bg-amber-400'   },
  sp_change:  { label: 'SP Adjusted',   colour: 'text-purple-400', dot: 'bg-purple-400'  },
};

function ModerationSection({ userId, onRefresh }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [page,  setPage]  = useState(1);
  const [pages, setPages] = useState(1);

  const fetchPage = (p, isInitial) => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true); setError(null);
    axiosClient
      .get(`/user-management/users/${userId}/moderation-log?page=${p}&limit=20`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setPage(data.page || 1);
        setPages(data.pages || 1);
        setLoading(false);
        if (isInitial && onRefresh && data.user) onRefresh({ user: data.user });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[ModerationSection]', err);
        setError(err.response?.data?.error || 'Failed to load moderation log');
        setLoading(false);
      });
    return () => { cancelled = true; };
  };

  useEffect(() => {
    if (!userId) { setLogs([]); return; }
    setPage(1);
    const cleanup = fetchPage(1, true);
    return cleanup;
  }, [userId]);

  const handlePage = (p) => { fetchPage(p, false); };

  const resolvedAction = (log) => {
    const key = log.action?.toLowerCase();
    if (MOD_ACTIONS[key]) return MOD_ACTIONS[key];
    return { label: log.action || 'Moderation Action', colour: 'text-slate-300', dot: 'bg-slate-400' };
  };

  const performedBy = (log) => {
    if (typeof log.performedBy === 'object' && log.performedBy !== null) {
      return log.performedBy.fullName || log.performedBy.username || log.performedBy.email || 'Admin';
    }
    return log.performedBy || 'Admin';
  };

  return (
    <div>
      <SectionHeading>Moderation History</SectionHeading>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
          <RefreshCw size={14} className="animate-spin" />
          Loading moderation log…
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 py-6 text-red-400 text-sm">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="py-8 text-center text-slate-500 text-sm italic">
          No moderation history found.
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <>
          <div className="mt-3 space-y-1">
            {logs.map((log, i) => {
              const { label, colour, dot } = resolvedAction(log);
              return (
                <div key={log._id ?? i} className="flex gap-3 py-3 border-b border-white/5 last:border-0">
                  {/* Timeline dot */}
                  <div className="mt-1 shrink-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${dot}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${colour}`}>{label}</span>
                      {log.reason && (
                        <span className="text-xs text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                          {log.reason}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      By <span className="text-slate-300">{performedBy(log)}</span>
                    </p>
                    {log.notes && (
                      <p className="mt-1 text-xs text-slate-500 bg-white/5 rounded p-2 border border-white/5">
                        {log.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                      <Clock size={10} />
                      <span>{timeAgo(log.createdAt)}</span>
                      <span className="opacity-50">·</span>
                      <span>{new Date(log.createdAt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                disabled={page <= 1 || loading}
                onClick={() => handlePage(page - 1)}
                className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-100 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-slate-500 min-w-[48px] text-center">
                {page} / {pages}
              </span>
              <button
                disabled={page >= pages || loading}
                onClick={() => handlePage(page + 1)}
                className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-100 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Rewards section ─────────────────────────────────────────────────────────
function RewardControl({ label, value, onUpdate, accent = 'indigo', user }) {
  const [inputVal, setInputVal] = useState('');
  const [loading,  setLoading]  = useState(false);

  const ACCENT_MAP = {
    indigo:  { text: 'text-indigo-400',  btn:  'bg-indigo-500/30 hover:bg-indigo-500/50',  spinner: 'border-indigo-400'  },
    amber:   { text: 'text-amber-400',   btn:  'bg-amber-500/30 hover:bg-amber-500/50',   spinner: 'border-amber-400'   },
    emerald: { text: 'text-emerald-400', btn:  'bg-emerald-500/30 hover:bg-emerald-500/50',spinner: 'border-emerald-400' },
  };
  const s = ACCENT_MAP[accent] || ACCENT_MAP.indigo;

  const submit = (operator) => {
    const raw = parseInt(inputVal, 10);
    if (isNaN(raw) || raw <= 0) { toast.error('Enter a positive number'); return; }
    setLoading(true);
    const payload = operator === 'add'
      ? { operation: 'add',    amount: raw }
      : { operation: 'remove', amount: raw };

    const REWARD_ENDPOINT_MAP = {
      'SP': 'sp',
      'Pizza': 'pizza',
      'Slices': 'slices'
    };
    const endpoint = REWARD_ENDPOINT_MAP[label] || label.toLowerCase();
    
    console.log(`Sending PATCH to /user-management/users/${user._id}/${endpoint}`);
    
    axiosClient
      .patch(`/user-management/users/${user._id}/${endpoint}`, payload)
      .then((res) => {
        onUpdate(res.data.user || res.data);
        setInputVal('');
        toast.success(`${label} ${operator === 'add' ? 'added' : 'removed'}`);
      })
      .catch((err) => {
        console.error("PATCH request failed:", err.response?.data || err.message);
        toast.error(err.response?.data?.error || `Failed to update ${label.toLowerCase()}`);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex items-center gap-2">
      {/* Current value */}
      <span className={`text-lg font-bold min-w-[40px] text-right ${s.text}`}>{value ?? 0}</span>

      {/* Input */}
      <input
        type="number"
        min="1"
        placeholder="Amt"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        disabled={loading}
        className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-40 transition"
      />

      {/* Add */}
      <button
        disabled={loading}
        onClick={() => submit('add')}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:opacity-40 ${s.btn}`}
      >
        {loading
          ? <span className={`w-3 h-3 border border-t-transparent rounded-full animate-spin ${s.spinner}`} />
          : <Plus size={12} />}
        Add
      </button>

      {/* Remove */}
      <button
        disabled={loading}
        onClick={() => submit('remove')}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:opacity-40 ${s.btn}`}
      >
        {loading
          ? <span className={`w-3 h-3 border border-t-transparent rounded-full animate-spin ${s.spinner}`} />
          : <Minus size={12} />}
        Remove
      </button>
    </div>
  );
}

function RewardsSection({ user, onUpdate }) {
  if (!user) return null;
  return (
    <div>
      <SectionHeading>Rewards Controls</SectionHeading>
      <div className="mt-3 space-y-3">
        <RewardControl
          label="SP"
          value={user.spurtiPoints}
          onUpdate={onUpdate}
          accent="indigo"
          user={user}
        />
        <RewardControl
          label="Pizza"
          value={user.pizzaSlices}
          onUpdate={onUpdate}
          accent="amber"
          user={user}
        />
        <RewardControl
          label="Slices"
          value={user.pizzaSlices}
          onUpdate={onUpdate}
          accent="emerald"
          user={user}
        />
      </div>
    </div>
  );
}

// ─── Status section ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active',    icon: <ShieldCheck  size={14} />, cls: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'  },
  { value: 'suspended', label: 'Suspended', icon: <ShieldAlert   size={14} />, cls: 'text-orange-400 border-orange-500/40 bg-orange-500/10' },
  { value: 'banned',    label: 'Banned',    icon: <ShieldX       size={14} />, cls: 'text-red-400    border-red-500/40    bg-red-500/10'    },
];

function StatusSection({ user, onUpdate }) {
  const [selected, setSelected] = useState('');
  const [saving,   setSaving]   = useState(false);

  // Sync local radio with user state whenever drawer opens / user changes
  useEffect(() => {
    if (!user) { setSelected(''); return; }
    const s = user.isBanned ? 'banned' : user.isSuspended ? 'suspended' : 'active';
    setSelected(s);
  }, [user?._id, user?.isBanned, user?.isSuspended]);

  const handleSave = () => {
    if (!selected || saving) return;
    setSaving(true);

    axiosClient
      .post(`/user-management/users/${user._id}/status`, { status: selected })
      .then((res) => {
        // Merge status fields from API response into drawer user state
        const updated = res.data.user
          ? { ...res.data.user }
          : { isSuspended: res.data.isSuspended, isBanned: res.data.isBanned };
        onUpdate((prev) => ({ ...prev, ...updated }));
        toast.success(`Status changed to ${selected}`);
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Failed to update status');
      })
      .finally(() => setSaving(false));
  };

  const currentStatus = user?.isBanned ? 'banned' : user?.isSuspended ? 'suspended' : 'active';
  const isDirty = selected !== currentStatus;

  return (
    <div>
      <SectionHeading>Account Status</SectionHeading>

      {/* Current live indicator */}
      <div className="flex items-center gap-2 mt-3 mb-4">
        <span className="text-xs text-slate-500">Current:</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
          currentStatus === 'active'    ? 'text-emerald-400 border-emerald-500/40' :
          currentStatus === 'suspended' ? 'text-orange-400 border-orange-500/40' :
                                          'text-red-400    border-red-500/40'
        }`}>
          {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
        </span>
      </div>

      {/* Radio group */}
      <div className="flex flex-col gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
              selected === opt.value
                ? opt.cls
                : 'border-white/10 text-slate-400 hover:border-white/20'
            }`}
          >
            <input
              type="radio"
              name="account-status"
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => setSelected(opt.value)}
              className="sr-only"
            />
            {opt.icon}
            <span className="text-sm font-medium">{opt.label}</span>
            {selected === opt.value && (
              <span className="ml-auto">✓</span>
            )}
          </label>
        ))}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || !isDirty}
        className={`mt-4 w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
          isDirty && !saving
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
            : 'bg-white/5 text-slate-600 cursor-not-allowed'
        }`}
      >
        {saving
          ? <span className="flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Saving…</span>
          : 'Save Status'}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function UserManagementTab() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [page,    setPage]    = useState(1);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);

  // Toolbar state
  const [search,           setSearch]           = useState('');
  const [filter,           setFilter]           = useState('all');
  const [role,             setRole]             = useState('all');
  const [sortBy,           setSortBy]           = useState('createdAt_desc');
  const [debouncedSearch,  setDebouncedSearch]  = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const limit = 15;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [sortField, sortOrder] = sortBy.split('_');
      const params = new URLSearchParams({
        search:   debouncedSearch,
        filter:   filter === 'all' ? '' : filter,
        role:     role === 'all' ? '' : role,
        sortBy:   sortField,
        order:    sortOrder,
        page,
        limit,
      });
      const res = await axiosClient.get(`/user-management/users?${params}`);
      setUsers(Array.isArray(res.data.users) ? res.data.users : []);
      setTotal(res.data.total ?? 0);
      setPages(res.data.pages ?? 1);
    } catch (err) {
      console.error('[UserManagementTab] fetchUsers failed:', err);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter, role, sortBy, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Reset to page 1 on filter/search/sort change
  useEffect(() => { setPage(1); }, [debouncedSearch, filter, role, sortBy]);

  const openDrawer = async (user) => {
    setDrawerUser(user);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setDrawerUser(null), 300); // clear after animation
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search username, name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition"
          />
        </div>

        <span className="text-sm text-slate-400 font-medium px-2">
          {total} user{total !== 1 ? 's' : ''}
        </span>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60 cursor-pointer"
        >
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v} style={{ background: '#1a1a2e' }}>{l}</option>
          ))}
        </select>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60 cursor-pointer"
        >
          {Object.entries(ROLE_LABELS).map(([v, l]) => (
            <option key={v} value={v} style={{ background: '#1a1a2e' }}>{l}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60 cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#1a1a2e' }}>{o.label}</option>
          ))}
        </select>

        <button
          onClick={fetchUsers}
          className="flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-500/30 transition cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              {['Username', 'Email', 'Role', 'SP', 'Pizza', 'Slices', 'Status', 'Joined', 'Actions'].map((col) => (
                <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-slate-400">
                  <div className="flex justify-center items-center gap-2">
                    <RefreshCw size={16} className="animate-spin" />
                    Loading…
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-slate-500">
                  No users match your filters.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="border-b border-white/5 hover:bg-white/4 transition">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-200">{u.fullName || '—'}</span>
                    {u.username && u.username !== u.fullName && (
                      <span className="ml-1.5 text-slate-500 text-xs">@{u.username}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{u.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-300 capitalize">{u.role || 'user'}</td>
                  <td className="px-4 py-3 text-slate-300 font-medium">{u.spurtiPoints ?? 0}</td>
                  <td className="px-4 py-3 text-slate-300">{u.pizzaSlices ?? 0}</td>
                  <td className="px-4 py-3 text-slate-500">{u.pizzaSlices ?? 0}</td>
                  <td className="px-4 py-3">
                    <StatusBadge isSuspended={u.isSuspended} isBanned={u.isBanned} />
                  </td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDrawer(u)}
                      className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-indigo-500/30 transition cursor-pointer"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Showing {users.length} of {total} users</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-medium text-slate-300">Page {page} of {pages}</span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Drawer ──────────────────────────────────────────────────────────── */}
      <Drawer isOpen={drawerOpen} onClose={closeDrawer} user={drawerUser} onUserUpdate={setDrawerUser} />
    </div>
  );
}