const fs = require('fs');

let content = fs.readFileSync('/Users/animeshpathak/ocfaqproj/faq-website/frontend/src/components/UserManagementTab.jsx', 'utf-8');

const replacement = `// ─── Activity section ─────────────────────────────────────────────────────────
const ACTION_COLOURS = {
  question_asked:        'text-blue-600 dark:text-blue-400',
  contribution_submitted:'text-indigo-600 dark:text-indigo-400',
  faq_approved:          'text-emerald-600 dark:text-emerald-400',
  answer_posted:         'text-cyan-600 dark:text-cyan-400',
  attachment_uploaded:   'text-purple-600 dark:text-purple-400',
  ticket_resolved:       'text-green-600 dark:text-green-400',
  sp_earned:             'text-amber-600 dark:text-amber-400',
  role_changed:          'text-pink-600 dark:text-pink-400',
  warning_received:      'text-orange-600 dark:text-orange-400',
  suspension:            'text-red-600 dark:text-red-400',
  ban:                   'text-red-700 dark:text-red-500',
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
      .get(\`/user-management/users/\${userId}/activity?page=\${p}&limit=20\`)
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
      <SectionHeading>Activity Timeline</SectionHeading>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-500 dark:text-slate-400 text-sm">
          <RefreshCw size={14} className="animate-spin" />
          Loading activity…
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 py-6 text-red-500 dark:text-red-400 text-sm">
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
              const colour = ACTION_COLOURS[act.action] || 'text-slate-500 dark:text-slate-400';
              return (
                <div key={act._id ?? i} className="flex gap-3 py-3 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                  <div className="mt-1 shrink-0">
                    <div className={\`w-2 h-2 rounded-full mt-1.5 \${colour.replace(/text-/g, 'bg-')}\`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={\`text-sm font-medium \${colour}\`}>
                      {act.description || act.action?.replace(/_/g, ' ') || '—'}
                    </p>
                    {act.metadata && JSON.stringify(act.metadata) !== '{}' && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                        {typeof act.metadata === 'object'
                          ? Object.entries(act.metadata).map(([k, v]) => \`\${k}: \${v}\`).join(' · ')
                          : String(act.metadata)}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-500">
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

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                disabled={page <= 1 || loading}
                onClick={() => handlePage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-slate-500 min-w-[48px] text-center">
                {page} / {pages}
              </span>
              <button
                disabled={page >= pages || loading}
                onClick={() => handlePage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
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
  suspend:    { label: 'Suspended',     colour: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500 dark:bg-orange-400'  },
  unsuspend:  { label: 'Unsuspended',   colour: 'text-green-600 dark:text-green-400',  dot: 'bg-green-500 dark:bg-green-400'   },
  ban:        { label: 'Banned',        colour: 'text-red-600 dark:text-red-500',    dot: 'bg-red-500 dark:bg-red-500'     },
  unban:      { label: 'Unbanned',      colour: 'text-emerald-600 dark:text-emerald-400',dot: 'bg-emerald-500 dark:bg-emerald-400' },
  role_change:{ label: 'Role Changed',  colour: 'text-blue-600 dark:text-blue-400',   dot: 'bg-blue-500 dark:bg-blue-400'    },
  warning:    { label: 'Warning',       colour: 'text-amber-600 dark:text-amber-400',  dot: 'bg-amber-500 dark:bg-amber-400'   },
  sp_change:  { label: 'SP Adjusted',   colour: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500 dark:bg-purple-400'  },
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
      .get(\`/user-management/users/\${userId}/moderation-log?page=\${p}&limit=20\`)
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
    return { label: log.action || 'Moderation Action', colour: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-500 dark:bg-slate-400' };
  };

  const performedBy = (log) => {
    if (typeof log.performedBy === 'object' && log.performedBy !== null) {
      return log.performedBy.fullName || log.performedBy.username || log.performedBy.email || 'Moderator';
    }
    return log.performedBy || 'Moderator';
  };

  return (
    <div>
      <SectionHeading>Moderation History</SectionHeading>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-500 dark:text-slate-400 text-sm">
          <RefreshCw size={14} className="animate-spin" />
          Loading moderation log…
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 py-6 text-red-500 dark:text-red-400 text-sm">
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
                <div key={log._id ?? i} className="flex gap-3 py-3 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                  <div className="mt-1 shrink-0">
                    <div className={\`w-2 h-2 rounded-full mt-1.5 \${dot}\`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={\`text-sm font-semibold \${colour}\`}>{label}</span>
                      {log.reason && (
                        <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded">
                          {log.reason}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      By <span className="text-slate-700 dark:text-slate-300">{performedBy(log)}</span>
                    </p>
                    {log.notes && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 rounded p-2 border border-slate-100 dark:border-white/5">
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

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                disabled={page <= 1 || loading}
                onClick={() => handlePage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-slate-500 min-w-[48px] text-center">
                {page} / {pages}
              </span>
              <button
                disabled={page >= pages || loading}
                onClick={() => handlePage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
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
    indigo:  { text: 'text-indigo-600 dark:text-indigo-400',  btn:  'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30',  spinner: 'border-indigo-400'  },
    amber:   { text: 'text-amber-600 dark:text-amber-400',   btn:  'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30',   spinner: 'border-amber-400'   },
    emerald: { text: 'text-emerald-600 dark:text-emerald-400', btn:  'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30',spinner: 'border-emerald-400' },
  };
  const s = ACCENT_MAP[accent] || ACCENT_MAP.indigo;

  const submit = (operator) => {
    const raw = parseInt(inputVal, 10);
    if (isNaN(raw) || raw <= 0) { toast.error('Enter a positive number'); return; }
    setLoading(true);
    const payload = operator === 'add'
      ? { operation: 'add',    amount: raw }
      : { operation: 'remove', amount: raw };
    const endpoint = label.toLowerCase() + 'S';   // 'sp' | 'pizza' | 'slices'
    axiosClient
      .patch(\`/user-management/users/\${user._id}/\${endpoint}\`, payload)
      .then((res) => {
        onUpdate(res.data.user || res.data);
        setInputVal('');
        toast.success(\`\${label} \${operator === 'add' ? 'added' : 'removed'}\`);
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || \`Failed to update \${label.toLowerCase()}\`);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex items-center gap-2">
      {/* Current value */}
      <span className={\`text-lg font-bold min-w-[40px] text-right \${s.text}\`}>{value ?? 0}</span>

      {/* Input */}
      <input
        type="number"
        min="1"
        placeholder="Amt"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        disabled={loading}
        className="w-20 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40 transition"
      />

      {/* Add */}
      <button
        disabled={loading}
        onClick={() => submit('add')}
        className={\`flex items-center justify-center gap-1 w-[80px] py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-40 \${s.btn}\`}
      >
        {loading
          ? <span className={\`w-3 h-3 border border-t-transparent rounded-full animate-spin \${s.spinner}\`} />
          : <Plus size={12} />}
        Add
      </button>

      {/* Remove */}
      <button
        disabled={loading}
        onClick={() => submit('remove')}
        className={\`flex items-center justify-center gap-1 w-[80px] py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-40 \${s.btn}\`}
      >
        {loading
          ? <span className={\`w-3 h-3 border border-t-transparent rounded-full animate-spin \${s.spinner}\`} />
          : <Minus size={12} />}
        Remove
      </button>
    </div>
  );
}

function RewardsSection({ user, onUpdate }) {
  if (!user) return null;
  return (
    <div className="mt-6">
      <SectionHeading>Rewards Controls</SectionHeading>
      <div className="mt-4 space-y-3 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
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
      </div>
    </div>
  );
}

// ─── Status section ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active',    icon: <ShieldCheck  size={16} />, cls: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:border-emerald-500/30'  },
  { value: 'suspended', label: 'Suspend', icon: <ShieldAlert   size={16} />, cls: 'text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-200 dark:text-orange-400 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 dark:border-orange-500/30' },
  { value: 'banned',    label: 'Ban',    icon: <ShieldX       size={16} />, cls: 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:border-red-500/30'    },
];

function StatusSection({ user, onUpdate }) {
  const [saving,   setSaving]   = useState(false);

  const handleStatusChange = (newStatus) => {
    if (saving) return;
    setSaving(true);

    axiosClient
      .post(\`/user-management/users/\${user._id}/status\`, { status: newStatus })
      .then((res) => {
        const updated = res.data.user
          ? { ...res.data.user }
          : { isSuspended: res.data.isSuspended, isBanned: res.data.isBanned };
        onUpdate((prev) => ({ ...prev, ...updated }));
        toast.success(\`Status changed to \${newStatus}\`);
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Failed to update status');
      })
      .finally(() => setSaving(false));
  };

  const currentStatus = user?.isBanned ? 'banned' : user?.isSuspended ? 'suspended' : 'active';

  return (
    <div>
      <SectionHeading>Account Moderation</SectionHeading>
      <div className="grid grid-cols-3 gap-3 mt-4">
        {STATUS_OPTIONS.map(opt => {
          const isActive = currentStatus === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              disabled={saving}
              className={\`flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border transition \${opt.cls} \${isActive ? 'ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-current' : 'opacity-70 hover:opacity-100'}\`}
            >
              {opt.icon}
              <span className="text-sm font-semibold">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}`;

content = content.replace(/\/\/ ─── Activity section[\s\S]*?(?=\/\/ ─── Main Component)/, replacement + '\n\n');
fs.writeFileSync('/Users/animeshpathak/ocfaqproj/faq-website/frontend/src/components/UserManagementTab.jsx', content);
console.log("Sections rewritten");
