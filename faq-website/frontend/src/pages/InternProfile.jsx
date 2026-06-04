import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import {
  ChevronLeft, Loader, Shield, AlertTriangle, Clock,
  MessageSquare, FileText, CheckCircle, Upload, Star,
  TrendingUp, Award, Ban, PauseCircle, UserCog, Pizza,
  Activity,
} from 'lucide-react';

const ROLE_COLORS = {
  admin:     { bg: '#3b3b00', border: '#fbbf24', text: '#fbbf24', label: 'Admin'     },
  mentor:    { bg: '#3b1e5f', border: '#c084fc', text: '#c084fc', label: 'Mentor / SME' },
  user:      { bg: '#1f1f1f', border: '#6b7280', text: '#9ca3af', label: 'User'      },
};

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.user;
  return (
    <span className="inline-flex items-center rounded text-xs font-semibold font-bricolage px-2 py-1 tracking-wide"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#161b22] border border-[#21262d]">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: accent + '22' }}>
        <Icon size={14} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-200 font-bricolage">{value ?? 0}</p>
        <p className="text-[10px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function TimelineItem({ item }) {
  const icons = {
    question_asked:           MessageSquare,
    contribution_submitted:   FileText,
    faq_approved:             CheckCircle,
    answer_posted:            MessageSquare,
    attachment_uploaded:      Upload,
    ticket_resolved:          CheckCircle,
    sp_earned:                Star,
    role_changed:             UserCog,
    warning_received:         AlertTriangle,
    suspension:               PauseCircle,
    ban:                      Ban,
  };
  const Icon = icons[item.action] || Activity;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#21262d] last:border-0">
      <div className="w-7 h-7 rounded-full bg-[#21262d] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={12} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-300 font-bricolage">{item.description}</p>
        <p className="text-[10px] text-slate-600 mt-0.5">
          {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function ModerationEntry({ entry }) {
  const icons = {
    warning:      AlertTriangle,
    suspension:   PauseCircle,
    ban:          Ban,
    unban:        CheckCircle,
    unsuspend:    CheckCircle,
    role_change:  UserCog,
    mentor_assign:Star,
    mentor_remove:Star,
  };
  const Icon = icons[entry.action] || Shield;
  const actionColors = {
    warning:      'text-amber-400',
    suspension:   'text-orange-400',
    ban:          'text-red-400',
    unban:        'text-emerald-400',
    unsuspend:    'text-emerald-400',
    role_change:  'text-blue-400',
    mentor_assign:'text-violet-400',
    mentor_remove:'text-slate-400',
  };
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#21262d] last:border-0">
      <div className="w-7 h-7 rounded-full bg-[#21262d] flex items-center justify-center flex-shrink-0">
        <Icon size={12} className={actionColors[entry.action] || 'text-slate-400'} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold font-bricolage text-slate-300 capitalize">{entry.action.replace(/_/g, ' ')}</span>
          {entry.performedBy && (
            <span className="text-[10px] text-slate-600">by {entry.performedBy.fullName || entry.performedBy.username || 'Admin'}</span>
          )}
        </div>
        {entry.reason && <p className="text-[10px] text-slate-500">{entry.reason}</p>}
        <p className="text-[10px] text-slate-600 mt-0.5">
          {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

export default function InternProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    axiosClient.get(`/users/profile/${userId}`)
      .then(r => setProfile(r.data))
      .catch(e => console.error('[Profile]', e))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <div className="min-h-screen bg-[#010409] flex items-center justify-center">
      <Loader size={24} className="text-slate-500 animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-[#010409] flex flex-col items-center justify-center gap-3">
      <Shield size={32} className="text-slate-700" />
      <p className="text-slate-500 text-sm font-bricolage">User not found</p>
      <button onClick={() => navigate(-1)} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors">
        <ChevronLeft size={14} /> Go Back
      </button>
    </div>
  );

  const { identity, activity, rewards, moderation, engagement, timeline } = profile;
  const c = ROLE_COLORS[identity.role] || ROLE_COLORS.user;
  const initials = (identity.fullName || identity.username || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const TABS = [
    { key: 'activity',     label: 'Activity',     icon: Activity   },
    { key: 'moderation',   label: 'Moderation',   icon: Shield     },
    { key: 'timeline',     label: 'Timeline',     icon: Clock      },
  ];

  return (
    <div className="min-h-screen bg-[#010409] text-slate-200" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
      {/* Back nav */}
      <div className="border-b border-[#21262d] bg-[#0d1117] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/users/directory')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            <ChevronLeft size={14} /> Directory
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-slate-500 truncate">{identity.fullName || identity.username}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Identity card */}
        <div className="rounded-2xl bg-[#0d1117] border border-[#21262d] p-6 mb-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold font-bricolage flex-shrink-0"
              style={{ background: c.bg + 'aa', color: c.text, border: `2px solid ${c.border}` }}>
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg font-bold text-slate-100 font-bricolage">{identity.fullName || 'Unknown'}</h1>
                <RoleBadge role={identity.role} />
              </div>
              <p className="text-sm text-slate-500 mb-3">@{identity.username || 'no username'}</p>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 w-16">Email</span>
                  <span className="text-xs text-slate-400 truncate">{identity.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 w-16">Joined</span>
                  <span className="text-xs text-slate-400">
                    {new Date(identity.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 w-16">Institute</span>
                  <span className="text-xs text-slate-400">{identity.institution || 'General'}</span>
                </div>
                {identity.bio && (
                  <div className="flex items-center gap-2 col-span-2">
                    <span className="text-[10px] text-slate-600 w-16">Bio</span>
                    <span className="text-xs text-slate-400">{identity.bio}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status flags */}
          {(moderation.isSuspended || moderation.isBanned) && (
            <div className="mt-4 pt-4 border-t border-[#21262d] flex items-center gap-3">
              {moderation.isSuspended && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <PauseCircle size={12} className="text-amber-400" />
                  <span className="text-xs text-amber-400 font-bricolage">
                    Suspended {moderation.suspendedUntil ? `until ${new Date(moderation.suspendedUntil).toLocaleDateString('en-IN')}` : ''}
                  </span>
                </div>
              )}
              {moderation.isBanned && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <Ban size={12} className="text-red-400" />
                  <span className="text-xs text-red-400 font-bricolage">Banned</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          <StatCard icon={MessageSquare}  label="Questions Raised"         value={activity.questionsRaised}     accent="#58a6ff" />
          <StatCard icon={FileText}       label="Contributions Submitted"   value={activity.contributionsSubmitted} accent="#a855f7" />
          <StatCard icon={CheckCircle}    label="FAQs Approved"             value={activity.faqsApproved}      accent="#22c55e" />
          <StatCard icon={MessageSquare}  label="Answers Posted"            value={activity.answersPosted}     accent="#f59e0b" />
          <StatCard icon={Upload}         label="Attachments Uploaded"      value={activity.attachmentsUploaded} accent="#64748b" />
          <StatCard icon={TrendingUp}     label="Tickets Resolved"          value={engagement.ticketsResolved} accent="#06b6d4" />
        </div>

        {/* Rewards */}
        <div className="rounded-xl bg-[#0d1117] border border-[#21262d] p-4 mb-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-bricolage mb-3">Rewards</h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-amber-400" />
              <div>
                <p className="text-sm font-bold text-slate-200 font-bricolage">{rewards.spurtiPoints}</p>
                <p className="text-[10px] text-slate-500">Spurti Points</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Pizza size={16} className="text-orange-400" />
              <div>
                <p className="text-sm font-bold text-slate-200 font-bricolage">{rewards.pizzas}</p>
                <p className="text-[10px] text-slate-500">Pizzas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Award size={16} className="text-emerald-400" />
              <div>
                <p className="text-sm font-bold text-slate-200 font-bricolage">{rewards.pizzaSlices}</p>
                <p className="text-[10px] text-slate-500">Slices</p>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement stats */}
        <div className="rounded-xl bg-[#0d1117] border border-[#21262d] p-4 mb-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-bricolage mb-3">Engagement</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm font-bold text-slate-200 font-bricolage">{engagement.deflectionAttempts ?? 0}</p>
              <p className="text-[10px] text-slate-500">Deflection Attempts</p>
            </div>
            <div className="text-center border-x border-[#21262d]">
              <p className="text-sm font-bold text-slate-200 font-bricolage">{engagement.ticketsResolved ?? 0}</p>
              <p className="text-[10px] text-slate-500">Tickets Resolved</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-200 font-bricolage">{engagement.avgSeverityScore ?? 0}</p>
              <p className="text-[10px] text-slate-500">Avg Severity</p>
            </div>
          </div>
        </div>

        {/* SME Categories */}
        {profile.roleSpecific?.mentorCategories && profile.roleSpecific.mentorCategories.length > 0 && (
          <div className="rounded-xl bg-[#0d1117] border border-[#21262d] p-4 mb-5 border-l-4 border-l-emerald-500">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-bricolage mb-3 flex items-center gap-2">
              <Award size={14} /> Assigned SME Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.roleSpecific.mentorCategories.map(mc => (
                <span key={mc.category} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-400">
                  {mc.category}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Expertise Breakdown */}
        {profile.categoryExpertise && Object.keys(profile.categoryExpertise).length > 0 && (
          <div className="rounded-xl bg-[#0d1117] border border-[#21262d] p-4 mb-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-bricolage mb-3">Expertise Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(profile.categoryExpertise)
                .sort((a, b) => b[1].answersGiven - a[1].answersGiven)
                .map(([category, stats]) => {
                  const resRate = stats.answersGiven > 0 ? ((stats.acceptedAnswers / stats.answersGiven) * 100).toFixed(0) : 0;
                  const avgTime = stats.answersGiven > 0 ? (stats.totalResponseTimeMs / stats.answersGiven) : 0;
                  const avgTimeFormatted = avgTime > 0 
                    ? (avgTime < 3600000 ? `${Math.ceil(avgTime / 60000)}m` : `${(avgTime / 3600000).toFixed(1)}h`)
                    : 'N/A';

                  return (
                    <div key={category} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-[#161b22] border border-[#21262d]">
                      <div className="mb-2 sm:mb-0">
                        <p className="text-sm font-bold text-slate-200 font-bricolage">{category}</p>
                        <p className="text-[10px] text-slate-500">
                          {stats.answersGiven} answers • {stats.helpfulVotes} helpful
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-center">
                        <div>
                          <p className="text-xs font-bold text-emerald-400 font-bricolage">{resRate}%</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Resolution</p>
                        </div>
                        <div className="w-px h-6 bg-[#21262d]"></div>
                        <div>
                          <p className="text-xs font-bold text-blue-400 font-bricolage">{avgTimeFormatted}</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider">Avg Time</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[#21262d] mb-4">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold font-bricolage border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#58a6ff] text-[#58a6ff]'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon size={12} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="rounded-xl bg-[#0d1117] border border-[#21262d] p-4">
          {activeTab === 'activity' && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-bricolage mb-3">Activity Summary</h3>
              {timeline && timeline.length > 0 ? (
                timeline.slice(0, 15).map(item => <TimelineItem key={item._id} item={item} />)
              ) : (
                <p className="text-xs text-slate-600 text-center py-6">No activity recorded yet</p>
              )}
            </div>
          )}

          {activeTab === 'moderation' && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-bricolage mb-3">Moderation History</h3>
              {moderation.history && moderation.history.length > 0 ? (
                moderation.history.map(entry => <ModerationEntry key={entry._id} entry={entry} />)
              ) : (
                <p className="text-xs text-slate-600 text-center py-6">No moderation actions on record</p>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-bricolage mb-3">Chronological Activity</h3>
              {timeline && timeline.length > 0 ? (
                timeline.map(item => <TimelineItem key={item._id} item={item} />)
              ) : (
                <p className="text-xs text-slate-600 text-center py-6">No activity recorded yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}