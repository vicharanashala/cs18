import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import {
  Search, Users, Shield, Headphones, Award, UserCheck,
  UserX, ChevronRight, Loader, ChevronLeft, ChevronDown,
  Star, MessageSquare, FileText, CheckCircle, Upload,
} from 'lucide-react';

// ── Discord-style role colors ──────────────────────────────────────────────
const ROLE_COLORS = {
  admin:     { bg: '#3b3b00', border: '#fbbf24', text: '#fbbf24', label: 'Admin'     },
  mentor:    { bg: '#3b1e5f', border: '#c084fc', text: '#c084fc', label: 'Mentor / SME' },
  user:      { bg: '#1f1f1f', border: '#6b7280', text: '#9ca3af', label: 'User'      },
};

const FILTERS = [
  { key: 'all',        label: 'All Users',   icon: Users       },
  { key: 'active',     label: 'Active',       icon: UserCheck   },
  { key: 'suspended',  label: 'Suspended',    icon: UserX       },
  { key: 'banned',     label: 'Banned',       icon: Shield      },
  { key: 'mentors',    label: 'Mentors',      icon: Star        },
  { key: 'admins',     label: 'Admins',       icon: Award       },
];

function RoleBadge({ role, size = 'sm' }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.user;
  const sz = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  return (
    <span className={`inline-flex items-center rounded font-semibold font-bricolage tracking-wide ${sz}`}
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

function StatusDot({ user }) {
  if (user.isBanned)    return <span className="text-xs text-red-400">Banned</span>;
  if (user.isSuspended) return <span className="text-xs text-amber-400">Suspended</span>;
  return <span className="text-xs text-emerald-400">Active</span>;
}

function InternCard({ user, onClick }) {
  const c = ROLE_COLORS[user.role] || ROLE_COLORS.user;
  const initials = (user.fullName || user.username || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl bg-[#0d1117] border border-[#21262d] hover:border-[#30363d] transition-all group"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold font-bricolage"
          style={{ background: c.bg + '99', color: c.text, border: `1.5px solid ${c.border}` }}>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-200 font-bricolage truncate">
              {user.fullName || user.username || 'Unknown'}
            </p>
            <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
          </div>
          <p className="text-xs text-slate-500 mb-2">@{user.username || 'no username'} &middot; {user.email}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <RoleBadge role={user.role} />
            <StatusDot user={user} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#21262d]">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-300 font-bricolage">{user.questionsCount || 0}</p>
          <p className="text-[10px] text-slate-600">Questions</p>
        </div>
        <div className="text-center border-x border-[#21262d]">
          <p className="text-sm font-bold text-slate-300 font-bricolage">{user.contributionsCount || 0}</p>
          <p className="text-[10px] text-slate-600">Contribs</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-300 font-bricolage">{user.answersCount || 0}</p>
          <p className="text-[10px] text-slate-600">Answers</p>
        </div>
      </div>

      {/* SP reward row */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-amber-500/70">SP {user.spurtiPoints || 0}</span>
        <span className="text-[10px] text-slate-600">{user.institution || 'General'}</span>
      </div>
    </button>
  );
}

export default function InternDirectory() {
  const navigate = useNavigate();

  const [search, setSearch]           = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [users, setUsers]             = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(false);
  const [searchDebounce, setSearchDebounce] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const LIMIT = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filter or search changes
  useEffect(() => { setPage(1); }, [activeFilter, searchDebounce]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchDebounce,
        filter: activeFilter,
        page,
        limit: LIMIT,
      });
      const res = await axiosClient.get(`/users/directory?${params}`);
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error('[Directory]', e);
    } finally {
      setLoading(false);
    }
  }, [searchDebounce, activeFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-[#010409] text-slate-200" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
      {/* Header */}
      <div className="border-b border-[#21262d] bg-[#0d1117] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-100 font-bricolage">Intern Directory</h1>
              <p className="text-xs text-slate-500 mt-0.5">{total} total members</p>
            </div>
            <button onClick={() => navigate(-1)} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors">
              <ChevronLeft size={14} /> Back
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, username, or email..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#161b22] border border-[#30363d] text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#58a6ff] transition-colors"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map(f => {
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-bricolage border transition-all ${
                    activeFilter === f.key
                      ? 'bg-[#58a6ff]/10 border-[#58a6ff]/40 text-[#58a6ff]'
                      : 'bg-[#161b22] border-[#30363d] text-slate-400 hover:text-slate-200 hover:border-[#8b949e]'
                  }`}
                >
                  <Icon size={11} />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={24} className="text-slate-500 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <Users size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-bricolage">No users found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {users.map(u => (
                <InternCard
                  key={u._id}
                  user={u}
                  onClick={() => navigate(`/users/profile/${u._id}`)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-slate-500 font-bricolage px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}