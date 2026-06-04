const fs = require('fs');

let content = fs.readFileSync('/Users/animeshpathak/ocfaqproj/faq-website/frontend/src/components/UserManagementTab.jsx', 'utf-8');

const replacement = `// ─── Status badge ─────────────────────────────────────────────────────────────
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
      const res = await axiosClient.put(\`/user-management/users/\${user._id}\`, formData);
      toast.success('User updated successfully');
      onUserUpdate(res.data.user);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const isDemoUser = process.env.NODE_ENV === 'development' && (user?.email?.endsWith('@infracon.com') || user?.email?.endsWith('@test.com'));

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
                  <option value="mentor">Mentor</option>
                  <option value="moderator">Moderator</option>
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
    <div className={\`\${styles} rounded-xl border p-4 flex flex-col justify-center shadow-sm\`}>
      <span className="text-2xl font-bold mb-1 leading-none">{Number(value).toLocaleString()}</span>
      <span className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
}`;

content = content.replace(/\/\/ ─── Status badge[\s\S]*?(?=\/\/ ─── Relative time)/, replacement + '\n');
fs.writeFileSync('/Users/animeshpathak/ocfaqproj/faq-website/frontend/src/components/UserManagementTab.jsx', content);
console.log("Drawer rewritten");
