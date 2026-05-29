import React, { useState } from 'react';
import ExpandableText from './ExpandableText';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, UserCheck, Link2, Clock } from 'lucide-react';
import Avatar from './Avatar';

/**
 * Shows a collapsible list of who joined a cluster and how.
 *
 * Props:
 *   participants  — [{ userId, joinedAt, joinMethod, question }]
 *   relatedQueries — [{ userId, joinedAt, joinMethod, question }]
 *   totalCount    — submissionsCount (legacy field)
 */
export default function JoinedUsersAccordion({ participants = [], relatedQueries = [], totalCount = 0 }) {
  const [open, setOpen] = useState(false);

  // Deduplicate by userId — prefer the richer record
  const userMap = new Map();

  for (const p of participants) {
    if (!p?.userId) continue;
    const uid = p.userId._id || p.userId;
    if (!userMap.has(uid)) {
      userMap.set(uid, {
        userId: p.userId,
        joinedAt: p.joinedAt,
        joinMethod: p.joinMethod || 'MANUAL',
        question: p.question || null,
      });
    }
  }

  for (const r of relatedQueries) {
    if (!r?.userId) continue;
    const uid = r.userId._id || r.userId;
    if (userMap.has(uid)) continue; // keep the participant record if it exists
    userMap.set(uid, {
      userId: r.userId,
      joinedAt: r.joinedAt,
      joinMethod: r.joinMethod || 'AUTO_CLUSTERED',
      question: r.question || null,
    });
  }

  const users = Array.from(userMap.values());

  if (users.length === 0) return null;

  const autoCount = users.filter(u => u.joinMethod === 'AUTO_CLUSTERED').length;
  const manualCount = users.filter(u => u.joinMethod === 'MANUAL').length;

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-1 py-1.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
      >
        <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-300 transition-colors flex items-center gap-2 font-bricolage">
          <Users size={13} />
          {users.length} {users.length === 1 ? 'person' : 'people'} joined
          {autoCount > 0 && (
            <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full">
              {autoCount} auto-merged
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp size={14} className="text-slate-500" />
        ) : (
          <ChevronDown size={14} className="text-slate-500" />
        )}
      </button>

      {/* Expanded list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-2 pb-1">
              {users.map((entry) => {
                const user = entry.userId;
                const isAuto = entry.joinMethod === 'AUTO_CLUSTERED';
                const timeStr = entry.joinedAt
                  ? new Date(entry.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : '';

                return (
                  <div key={user._id} className="flex items-start gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                    <Avatar user={user} size={26} className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-300 font-bricolage">
                          {user.username || user.email || 'Anonymous'}
                        </span>
                        {/* Join method badge */}
                        {isAuto ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full font-bricolage">
                            <Link2 size={9} /> auto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bricolage">
                            <UserCheck size={9} /> manual
                          </span>
                        )}
                      </div>
                      {/* Their typed question variant */}
                      {entry.question && entry.question !== user.question && (
                        <ExpandableText
                          text={`"${entry.question}"`}
                          maxLines={2}
                          expandText="Read More"
                          collapseText="Show Less"
                          className="text-[11px] text-slate-500 italic leading-relaxed"
                          toggleClassName="mt-0.5 text-[10px]"
                        />
                      )}
                    </div>
                    {timeStr && (
                      <span className="text-[10px] text-slate-600 flex-shrink-0 mt-1 flex items-center gap-1">
                        <Clock size={9} />{timeStr}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Users({ size = 14, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}