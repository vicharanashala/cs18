import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, UserCheck, Link2, Clock, Users as UsersIcon } from 'lucide-react';
import Avatar from './Avatar';

/**
 * JoinedUsersAccordion — shows who joined a cluster.
 *
 * Props:
 *   participants   — [{ userId, joinedAt, joinMethod, question }]
 *   relatedQueries — [{ userId, joinedAt, question }]
 *   totalCount     — fallback count (submissionsCount), optional
 *
 * Shows a "N people joined ▼" toggle. Clicking expands to list each user
 * with their avatar, name, join method badge, and their typed question.
 *
 * Empty state: renders nothing (no broken dropdown).
 */
export default function JoinedUsersAccordion({
  participants = [],
  relatedQueries = [],
  totalCount,
}) {
  const [open, setOpen] = useState(false);

  // Deduplicate by userId — prefer the richer participant record
  const userMap = new Map();

  for (const p of participants) {
    if (!p?.userId) continue;
    const uid = typeof p.userId === 'object' ? p.userId._id : p.userId;
    if (!userMap.has(uid)) {
      userMap.set(uid, {
        userId:     p.userId,
        joinedAt:   p.joinedAt,
        joinMethod: p.joinMethod || 'MANUAL',
        question:   p.question || null,
      });
    }
  }

  for (const r of relatedQueries) {
    if (!r?.userId) continue;
    const uid = typeof r.userId === 'object' ? r.userId._id : r.userId;
    if (userMap.has(uid)) continue;
    userMap.set(uid, {
      userId:     r.userId,
      joinedAt:   r.joinedAt,
      joinMethod: 'AUTO_CLUSTERED',
      question:   r.question || null,
    });
  }

  const users = Array.from(userMap.values());

  // Never render a broken/empty accordion
  if (users.length === 0) return null;

  const autoCount    = users.filter(u => u.joinMethod === 'AUTO_CLUSTERED').length;
  const manualCount  = users.filter(u => u.joinMethod === 'MANUAL').length;

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="joined-users-list"
        className="w-full flex items-center justify-between px-1 py-1.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-400 group-hover:text-slate-300 transition-colors font-bricolage">
          <UsersIcon size={13} className="text-slate-500" />
          {users.length} {users.length === 1 ? 'person' : 'people'} joined
          {autoCount > 0 && (
            <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full">
              {autoCount} auto
            </span>
          )}
          {manualCount > 0 && (
            <span className="text-[10px] text-emerald-400/70 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
              {manualCount} manual
            </span>
          )}
        </span>

        {/* Animated chevron — rotates 180° when open */}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="text-slate-500"
        >
          <ChevronDown size={14} />
        </motion.span>
      </button>

      {/* Expanded user list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="joined-users-list"
            role="list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-3 pb-1">
              {users.map((entry) => {
                const user     = entry.userId;
                const userData = typeof user === 'object' ? user : { _id: user };
                const isAuto   = entry.joinMethod === 'AUTO_CLUSTERED';
                const timeStr  = entry.joinedAt
                  ? new Date(entry.joinedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : '';

                return (
                  <div
                    key={userData._id}
                    role="listitem"
                    className="flex items-start gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.02] transition-colors"
                  >
                    <Avatar user={userData} size={28} className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-300 font-bricolage">
                          {userData.username || userData.email || 'Anonymous'}
                        </span>
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
                      {entry.question && (
                        <p className="text-[11px] text-slate-500 italic leading-relaxed break-words whitespace-normal mt-0.5">
                          &ldquo;{entry.question}&rdquo;
                        </p>
                      )}
                    </div>
                    {timeStr && (
                      <span className="text-[10px] text-slate-600 flex-shrink-0 mt-1 flex items-center gap-1">
                        <Clock size={9} />
                        {timeStr}
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