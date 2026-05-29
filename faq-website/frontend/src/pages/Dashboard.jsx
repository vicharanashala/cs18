import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import JoinedUsersAccordion from '../components/JoinedUsersAccordion';
import VariantsDropdown from '../components/VariantsDropdown';
import {
  MessageSquare, Book, Plus, Wallet, LogOut, X, Send,
  Menu, ChevronDown, ChevronRight, Trash2, Users, ChevronUp,
  Lock, ShieldCheck, Search, Sparkles, Flame, TrendingUp, Hourglass, CheckCircle, Clock, Layers,
} from 'lucide-react';
import HelpfulFeedback from '../components/HelpfulFeedback';
import { motion, AnimatePresence } from 'framer-motion';
import BannedUserBanner from '../components/BannedUserBanner';
import { FAQ_CATEGORIES, normalizeCategory } from '../utils/constants';

// Inline pizza slice SVG icon — no emojis, no Lucide Pizza
function PizzaSliceIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 2 L22 20 Q12 24 2 20 Z" fill="currentColor" opacity="0.85" />
      <circle cx="12" cy="14" r="1.5" fill="rgba(253,224,71,0.7)" />
      <circle cx="8" cy="17" r="1.2" fill="rgba(253,224,71,0.5)" />
      <circle cx="16" cy="16" r="1" fill="rgba(253,224,71,0.5)" />
    </svg>
  );
}

function getReadTimeString(wordCount) {
  if (!wordCount || wordCount <= 0) return '< 1 min';
  const minutes = Math.ceil(wordCount / 200);
  if (minutes <= 1) return '< 1 min';
  return `${minutes} min`;
}
import GoldenTicketIcon from '../components/GoldenTicketIcon';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';
import SearchBar from '../components/SearchBar';
import { formatPizzas } from '../utils/pizzaFormatter';

// ─── Deterministic per-user shuffle (Fisher-Yates) ───────────────────────────
const SHUFFLE_SEED = 42; // fixed seed = same order every load for same user
function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Returns clusters with visited/answered items sunk to bottom,
 *  urgent items floated to top, and first 50 non-urgent non-visited
 *  items shuffled per-user for fair distribution. */
function buildSortedClusters({ clusters, urgentClusters, visitedIds, userId }) {
  const urgentIds = new Set((urgentClusters || []).map(x => x._id));
  const visited = visitedIds || new Set();

  // Split into urgent, seen, and fresh non-urgent
  const seen = [];      // opened by this user (answered or not)
  const fresh = [];     // never opened, never answered

  for (const cluster of clusters) {
    const hasAnswered = (cluster.answerCount || 0) > 0;
    if (visited.has(cluster._id) || hasAnswered) {
      seen.push(cluster);
    } else {
      fresh.push(cluster);
    }
  }

  // Urgent clusters → oldest first
  const urgentSorted = [...urgentClusters].sort((a, b) =>
    new Date(a.createdAt) - new Date(b.createdAt)
  );

  // First 50 fresh → shuffled with user id as seed (deterministic per user)
  const seed = userId ? userId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) : 0;
  const freshHead = fresh.slice(0, 50);
  const freshTail = fresh.slice(50);
  const shuffledHead = seededShuffle(freshHead, seed + SHUFFLE_SEED);

  // Sunk-to-bottom → oldest first
  const seenSorted = [...seen].sort((a, b) =>
    new Date(a.createdAt) - new Date(b.createdAt)
  );

  return [...urgentSorted, ...shuffledHead, ...freshTail, ...seenSorted];
}

const CONSENSUS_LOCK = 9;

// ─── Sidebar NavItem ──────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`sidebar-button ${active ? 'sidebar-button-normal active' : 'sidebar-button-normal'}`}
    >
      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className="flex-shrink-0" />
      <span>{label}</span>
    </button>
  );
}

// ─── Single FAQ Row for Search Results ────────────────────────────────────────
function FaqSearchResultCard({ faq, matchType, onTagClick }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="glass-card rounded-3xl overflow-hidden mb-4 border border-white/5">
      {/* Header row — outer div, expand/collapse is a separate button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-7 py-5 gap-4">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="leading-snug break-words whitespace-normal font-medium text-slate-100">{faq.question}</p>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-full shadow-sm flex-shrink-0 min-w-[65px]" title="Estimated read time">
              <Hourglass size={12} className="opacity-70 text-slate-300" /> {getReadTimeString(faq.wordCount)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {faq.recentViewsBoost > 1.5 && (
              <span className="inline-flex items-center gap-1 trending-badge px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-bricolage">
                <Flame size={10} className="animate-pulse" /> Trending
              </span>
            )}
            {faq.engagementScore > 3.0 && (
              <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-400 border-yellow-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-bricolage">
                <Sparkles size={10} /> Most Helpful
              </span>
            )}
            {faq.recentViewsBoost > 0.4 && faq.recentViewsBoost <= 1.5 && (
              <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-bricolage">
                <TrendingUp size={10} /> Rising
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
          {matchType === 'semantic' && faq.matchPercentage && (
            <span className="text-[10px] font-bold font-bricolage badge-purple px-3 py-1.5 rounded-full shadow-sm">
              {faq.matchPercentage}% semantic match
            </span>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }} className="border-t border-white/5 bg-white/[0.01]"
          >
            <div className="px-7 py-6">
              <p className="text-slate-300 text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words">{faq.answer}</p>
              <div className="flex flex-wrap gap-2 mt-6 min-h-[28px]">
                {(faq.hashtags || []).map(tag => (
                  <button
                    key={tag}
                    onClick={() => { if (onTagClick) onTagClick(tag); }}
                    className="font-bricolage text-[11px] font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all hover:-translate-y-0.5 bg-pink-500/10 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20 dark:border-pink-500/20 hover:bg-pink-500/20 hover:shadow-sm"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
              <HelpfulFeedback faqId={faq._id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── FAQ Item Component with view time tracking ────────────────────────────────
const FAQItem = memo(function FAQItem({ faq, expanded, onToggle, onTagClick }) {
  const startTimeRef = useRef(null);
  const faqRef = useRef(null);

  const reportSessionTime = async (seconds) => {
    if (seconds < 1.0) return;
    try {
      await axiosClient.post(`/faqs/${faq._id}/view-session`, { readTimeInSeconds: seconds });
    } catch (err) {
      console.error('[FAQ View-Time API Error]', err);
    }
  };

  useEffect(() => {
    if (expanded) {
      startTimeRef.current = Date.now();
    } else {
      if (startTimeRef.current) {
        const sec = (Date.now() - startTimeRef.current) / 1000;
        reportSessionTime(sec);
        startTimeRef.current = null;
      }
    }
    return () => {
      if (startTimeRef.current) {
        const sec = (Date.now() - startTimeRef.current) / 1000;
        reportSessionTime(sec);
        startTimeRef.current = null;
      }
    };
  }, [expanded]);

  // Tab visibility change detection (AFK/Tab switches)
  useEffect(() => {
    if (!expanded) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (startTimeRef.current) {
          const sec = (Date.now() - startTimeRef.current) / 1000;
          reportSessionTime(sec);
          startTimeRef.current = null;
        }
      } else {
        if (!startTimeRef.current) {
          startTimeRef.current = Date.now();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [expanded]);

  // IntersectionObserver for scroll-away detection
  useEffect(() => {
    if (!expanded) return;

    let observer;
    if ('IntersectionObserver' in window && faqRef.current) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.15) {
            if (startTimeRef.current) {
              const sec = (Date.now() - startTimeRef.current) / 1000;
              reportSessionTime(sec);
              startTimeRef.current = null;
            }
          } else {
            if (!startTimeRef.current) {
              startTimeRef.current = Date.now();
            }
          }
        });
      }, {
        threshold: [0.0, 0.15, 0.5, 1.0]
      });

      observer.observe(faqRef.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [expanded]);

  return (
    <div ref={faqRef} className="bg-white/[0.005]">
      {/* Header row — outer div, expand/collapse is a separate button */}
      <div className="flex items-center justify-between px-7 py-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 pr-6 leading-snug flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <p className="break-words whitespace-normal font-medium text-slate-100">{faq?.question}</p>
            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded-full shadow-sm flex-shrink-0 min-w-[60px]" title="Estimated read time">
              <Hourglass size={10} className="opacity-70 text-slate-300" /> {getReadTimeString(faq?.wordCount || 0)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {faq.recentViewsBoost > 1.5 && (
              <span className="inline-flex items-center gap-1 trending-badge px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-bricolage">
                <Flame size={10} className="animate-pulse" /> Trending
              </span>
            )}
            {faq.engagementScore > 3.0 && (
              <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-400 border-yellow-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-bricolage">
                <Sparkles size={10} /> Most Helpful
              </span>
            )}
            {faq.recentViewsBoost > 0.4 && faq.recentViewsBoost <= 1.5 && (
              <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-bricolage">
                <TrendingUp size={10} /> Rising
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200 flex-shrink-0"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="px-7 pb-6 pt-2 bg-white/[0.015]">
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">{faq?.answer}</p>
              <div className="flex flex-wrap gap-2 mt-4 min-h-[24px]">
                {(faq?.hashtags || []).map(tag => (
                  <button
                    key={tag}
                    onClick={() => { if (onTagClick) onTagClick(tag); }}
                    className="font-bricolage text-[10px] font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all hover:-translate-y-0.5 bg-pink-500/10 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20 dark:border-pink-500/20 hover:bg-pink-500/20 hover:shadow-sm"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
              <HelpfulFeedback faqId={faq._id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── FAQ Two-Level Collapsible ────────────────────────────────────────────────
function CategoryCard({ category, faqs, isTargeted, onTagClick }) {
  const [open, setOpen] = useState(isTargeted || false);
  const [expandedFaqs, setExpandedFaqs] = useState([]);
  const [sortedFaqs, setSortedFaqs] = useState([]);
  
  useEffect(() => {
    if (isTargeted) setOpen(true);
  }, [isTargeted]);

  const toggleFaq = id =>
    setExpandedFaqs(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id]);

  const getFaqRank = (faq) => {
    const engagementScore = faq.engagementScore || 0;
    const recentViewsBoost = faq.recentViewsBoost || 0;
    return (engagementScore * 0.7) + (recentViewsBoost * 0.3);
  };

  const sortFaqsList = (list) => {
    return [...(list || [])].sort((a, b) => getFaqRank(b) - getFaqRank(a));
  };

  // Initial list sorting setup
  useEffect(() => {
    setSortedFaqs(sortFaqsList(faqs));
  }, [faqs]);

  // Re-sort only on category reopen
  useEffect(() => {
    if (open) {
      setSortedFaqs(sortFaqsList(faqs));
    }
  }, [open]);

  // Periodic check to sort when user is not actively reading
  useEffect(() => {
    const interval = setInterval(() => {
      if (expandedFaqs.length === 0) {
        setSortedFaqs(sortFaqsList(faqs));
      }
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [faqs, expandedFaqs]);

  return (
    <div id={`category-${category}`} className="glass-card rounded-3xl overflow-hidden mb-4 border border-white/5">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-7 py-5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className={`w-2 h-2 rounded-full transition-colors ${open ? 'bg-slate-200 shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'bg-slate-700'}`} />
          <span className="font-bold font-bricolage text-lg text-slate-100 tracking-tight">{category}</span>
          <span className="text-xs font-semibold text-slate-400 bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full">{faqs.length}</span>
        </div>
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={18} className="text-slate-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }} className="overflow-hidden border-t border-white/5"
          >
            <div className="divide-y divide-white/5">
              <AnimatePresence initial={false}>
                {sortedFaqs.map(faq => {
                  const expanded = expandedFaqs.includes(faq._id);
                  return (
                    <motion.div
                      layout
                      key={faq._id}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    >
                      <FAQItem
                        faq={faq}
                        expanded={expanded}
                        onToggle={() => toggleFaq(faq._id)}
                        onTagClick={onTagClick}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Discussion Card (feed) ───────────────────────────────────────────────────
// ─── Urgency badge helper ─────────────────────────────────────────────────────
function UrgencyBadge({ cluster }) {
  // Shows how many slots are left and time urgency
  const hoursOld = cluster.createdAt
    ? Math.floor((Date.now() - new Date(cluster.createdAt).getTime()) / 3_600_000)
    : 0;
  const slotsLeft = 10 - (cluster.answerCount || 0);
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm urgent-badge"
      title={`${slotsLeft} answer ${slotsLeft === 1 ? 'slot' : 'slots'} remaining — ${hoursOld}h old`}>
      <Clock size={11} strokeWidth={2.5} />
      <span className="text-[11px] font-bold font-bricolage">{slotsLeft}/10 · {hoursOld}h</span>
    </div>
  );
}

const ClusterCard = memo(function ClusterCard({ cluster, onOpenThread, onTagClick }) {
  const isUrgent = cluster.isUrgent;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={isUrgent
        ? 'rounded-3xl p-7 cursor-pointer group border border-orange-500/20 bg-gradient-to-b from-orange-950/20 to-transparent hover:border-orange-500/30 hover:shadow-[0_0_20px_rgba(251,191,36,0.06)] transition-all'
        : 'glass-card rounded-3xl p-7 cursor-pointer group border border-white/5'}
      onClick={() => onOpenThread(cluster._id)}
    >
      {/* Urgent ambient glow */}
      {isUrgent && <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/[0.04] rounded-full blur-[60px] pointer-events-none" />}

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4 relative z-10">
        <h3 className="font-bold font-bricolage text-xl text-slate-100 leading-snug group-hover:underline decoration-wavy decoration-pink-400/50 transition-all flex-1">
          {cluster?.canonicalQuestion || 'Loading...'}
        </h3>
        <div className="flex flex-wrap md:flex-row gap-2 self-start">
          {isUrgent && <UrgencyBadge cluster={cluster} />}
          {cluster?.matchPercentage && (
            <div className="flex items-center badge-pink px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap">
              <span className="text-[11px] font-bold font-bricolage">{cluster.matchPercentage}% match</span>
            </div>
          )}
          {(cluster.participants?.length || cluster.submissionsCount || 0) > 0 && (
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap min-w-[95px]">
              <Users size={13} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-300">
                {(cluster.participants?.length || cluster.submissionsCount || 0) + ((cluster._groupedCount || 1) - 1)} joined
              </span>
            </div>
          )}
          {(cluster._groupedCount > 1) && (
            <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-full whitespace-nowrap">
              <Layers size={12} className="text-purple-400" />
              <span className="text-[11px] font-bold text-purple-300">+{(cluster._groupedCount || 1) - 1} similar</span>
            </div>
          )}
        </div>
      </div>
      {cluster.originalQuestion && (
        <div className="relative pl-4 mb-4">
          <div className={`absolute left-0 top-0 h-full w-0.5 rounded-full ${isUrgent ? 'bg-orange-500/40' : 'bg-pink-500/30'}`} />
          <p className="text-slate-300 text-sm font-semibold break-words whitespace-normal">"{cluster.originalQuestion}"</p>
          <p className="text-slate-500 text-sm leading-relaxed break-words whitespace-normal">{cluster.context}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4 mb-2 min-h-[24px]">
        {(cluster.hashtags || []).map(tag => (
          <button
            key={tag}
            onClick={(e) => { e.stopPropagation(); if (onTagClick) onTagClick(tag); }}
            className="font-bricolage text-[10px] font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all hover:-translate-y-0.5 bg-pink-500/10 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20 dark:border-pink-500/20 hover:bg-pink-500/20 hover:shadow-sm"
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Semantic variants grouped under this card */}
      <VariantsDropdown
        variants={cluster._groupedVariants}
        onOpenThread={onOpenThread}
      />

      {/* Joined users accordion — shows variants + join methods */}
      <JoinedUsersAccordion
        participants={cluster.participants}
        relatedQueries={cluster.relatedQueries}
        totalCount={cluster.participants?.length || cluster.submissionsCount || 0}
      />

      <div className={`text-xs font-semibold flex items-center gap-1.5 mt-3 border-t pt-4 ${isUrgent ? 'text-orange-400 group-hover:text-orange-300' : 'text-slate-400 group-hover:text-pink-300'} transition-colors`}>
        <span>{isUrgent ? '⚡ Needs answers — View' : 'View Thread'}</span>
        <ChevronRight size={13} />
      </div>
    </motion.div>
  );
});

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="glass-premium rounded-3xl w-full max-w-sm p-8"
      >
        <p className="text-slate-200 font-semibold text-[1.05rem] mb-7 text-center leading-relaxed font-bricolage">{message}</p>
        <div className="flex gap-3 font-bricolage">
          <button onClick={onCancel} className="flex-1 glass border border-white/5 text-slate-300 font-semibold py-3 rounded-2xl hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 badge-red text-red-300 font-semibold py-3 rounded-2xl hover:bg-red-950/20 transition-colors shadow-md">
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Single Answer Card with delete ──────────────────────────────────────────
const AnswerCard = memo(function AnswerCard({ answer, consensusLocked, onDeleted }) {
  const handleDelete = async () => {
    if (!window.confirm('Delete this answer permanently?')) return;
    try {
      await axiosClient.delete(`/answers/${answer._id}`);
      toast.success('Answer deleted.');
      onDeleted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete answer');
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 mb-4">
      <p className="text-slate-200 leading-relaxed text-[0.95rem]">{answer?.text}</p>
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between font-inter text-xs">
        <span className="font-bold text-slate-500 uppercase tracking-widest">
          Rep at post: {answer.userReputationAtTimeOfPost}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">
            {new Date(answer.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
          {answer.isOwner && (
            consensusLocked ? (
              <span title="Answers cannot be removed after consensus phase begins." className="flex items-center gap-1 text-slate-500 cursor-not-allowed ml-2">
                <Lock size={11} /> Locked
              </span>
            ) : (
              <div className="flex items-center gap-1 ml-2">
                <button onClick={handleDelete}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                  title="Delete answer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Discussion Thread Panel ──────────────────────────────────────────────────
function DiscussionPanel({ clusterId, user, onBack, refreshClusters, onRaiseTicket }) {
  const [cluster, setCluster] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answerCount, setAnswerCount] = useState(0);
  const [consensusLocked, setConsensusLocked] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [myAnswer, setMyAnswer] = useState('');
  const [joining, setJoining] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => { fetchDiscussion(); }, [clusterId]);

  const fetchDiscussion = async () => {
    try {
      const res = await axiosClient.get(`/discussions/clusters/${clusterId}`);
      setCluster(res.data.cluster);
      setAnswers(res.data.answers);
      setAnswerCount(res.data.answerCount);
      setConsensusLocked(res.data.consensusLocked);
      setHasAnswered(res.data.hasAnswered ?? false);
    } catch {
      toast.error('Failed to load thread');
      onBack();
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      await axiosClient.post(`/discussions/clusters/${cluster._id}/join`);
      toast.success('Marked as interested!');
      fetchDiscussion();
      refreshClusters();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not join');
    } finally {
      setJoining(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axiosClient.delete(`/discussions/clusters/${cluster._id}`);
      toast.success('Question deleted.');
      refreshClusters();
      onBack();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!myAnswer.trim()) return;
    try {
      await axiosClient.post('/answers/submit', { clusterId, text: myAnswer });
      setMyAnswer('');
      toast.success('Answer posted!');
      // Mark this cluster as visited so it sinks below on next visit
      setVisitedClusterIds(prev => {
        const next = new Set(prev);
        next.add(clusterId);
        return next;
      });
      fetchDiscussion();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to post');
    }
  };

  if (!cluster) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-slate-500 border-t-purple-400 rounded-full animate-spin" />
    </div>
  );

  const isCreator = cluster.isCreator;
  const remainingSlots = 10 - answerCount;

  return (
    <>
      <AnimatePresence>
        {showDeleteConfirm && (
          <ConfirmModal
            message="Permanently delete this question and all its answers?"
            onConfirm={() => { setShowDeleteConfirm(false); handleDelete(); }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pb-16">
        {/* ── Back + creator controls ── */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-100 transition-colors font-bricolage">
            <ChevronDown size={16} className="rotate-90" /> Back to feed
          </button>
          {isCreator && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 text-sm font-semibold badge-red px-4 py-2 hover:bg-red-950/30 rounded-xl transition-colors font-bricolage"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>

        {/* ── Urgency banner ── */}
        {cluster.isUrgent && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-2xl border border-orange-500/25 bg-orange-950/30 text-orange-300 text-xs font-semibold font-bricolage shadow-[0_0_16px_rgba(251,191,36,0.06)]">
            <Clock size={14} className="text-orange-400 flex-shrink-0" />
            <span>This question has less than 10 answers after 3+ hours — consider contributing!</span>
          </div>
        )}

        {/* ── Cluster card ── */}
        <div className="glass-strong rounded-3xl p-8 md:p-10 mb-8 border border-white/5">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <h2 className="font-bold font-bricolage text-3xl md:text-4xl text-slate-100 leading-tight flex-1 flex items-center gap-3 flex-wrap">
              {cluster.canonicalQuestion}
              {isCreator && (
                <span className="badge-purple px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider text-purple-300 bg-purple-500/20 border border-purple-500/20 shadow-sm align-middle flex items-center gap-1">
                  <ShieldCheck size={10} /> Owner
                </span>
              )}
            </h2>
            {consensusLocked && (
              <div className="flex items-center gap-1.5 badge-yellow text-xs font-bold px-3 py-1.5 rounded-full mt-1 flex-shrink-0">
                <Lock size={11} /> Consensus Locked
              </div>
            )}
          </div>

          {cluster.originalQuestion && (
            <div className="relative pl-5 mb-6">
              <div className="absolute left-0 top-0 h-full w-0.5 rounded-full bg-slate-800" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-bricolage">Original Ticket</p>
              <p className="text-slate-200 font-medium italic text-[0.95rem] mb-1">"{cluster.originalQuestion}"</p>
              <p className="text-slate-400 text-sm leading-relaxed">{cluster.context}</p>
            </div>
          )}

          {cluster.history && cluster.history.length > 0 && (
            <div className="space-y-2 mb-8 pt-4 border-t border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-bricolage">Question Timeline</p>
              {cluster.history.map((evt, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-white/5 px-3 py-2 rounded-xl border border-white/5 w-fit shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400/50" />
                  {evt.event} <span className="text-slate-500 ml-1 opacity-60">({new Date(evt.timestamp).toLocaleDateString()})</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Creator ownership notice / Join button ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-white/5">
            {cluster.submissionsCount > 0 ? (
              <div className="flex items-center gap-2">
                <Users size={15} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-400">
                  {cluster.submissionsCount} {cluster.submissionsCount === 1 ? 'person has' : 'people have'} this question
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Users size={15} className="text-slate-600" />
                <span className="text-sm text-slate-500">No one else has joined yet</span>
              </div>
            )}

            {isCreator ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-white/5 px-3 py-2 rounded-xl border border-white/5 shadow-sm">
                <ShieldCheck size={14} className="text-purple-400" />
                You own this question
              </div>
            ) : cluster.hasJoined ? (
              <span className="text-xs font-semibold text-pink-300 flex items-center gap-1">
                ✓ Joined
              </span>
            ) : cluster.status === 'OPEN' ? (
              <button onClick={handleJoin} disabled={joining}
                className="glass text-slate-200 hover:bg-white/5 font-semibold py-2.5 px-5 rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Plus size={15} strokeWidth={2.5} /> I have this question too
              </button>
            ) : null}
          </div>
        </div>

        {/* ── Answers section ── */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="font-bold font-bricolage text-xl text-slate-100">
              Community Answers ({cluster.answerCount || answerCount}/10)
            </h3>
            {consensusLocked && (
              <div className="flex items-center gap-1.5 text-xs font-bold badge-yellow px-3 py-1.5 rounded-full">
                <Lock size={11} />
                <span title="Answers cannot be modified after consensus phase begins.">Immutable</span>
              </div>
            )}
          </div>

          {answers.length === 0 && (
            <p className="text-slate-500 italic py-4 text-sm">No answers yet. Be the first to help the community!</p>
          )}

          {answers.map(ans => (
            <AnswerCard
              key={ans._id}
              answer={ans}
              consensusLocked={consensusLocked}
              onDeleted={fetchDiscussion}
            />
          ))}
        </div>

        {/* ── Answer input / status footer ── */}
        {isCreator ? (
          <div className="glass-card rounded-2xl p-6 text-center flex items-center justify-center gap-2 border border-white/5">
            <ShieldCheck size={16} className="text-slate-500" />
            <p className="text-slate-400 text-sm font-medium">
              You created this question — answering your own question is not allowed.
            </p>
          </div>
        ) : hasAnswered ? (
          <div className="glass-card rounded-2xl p-6 text-center flex items-center justify-center gap-2 border border-white/5">
            <CheckCircle size={16} className="text-emerald-500" />
            <p className="text-slate-400 text-sm font-medium">
              You have already contributed to this question.
            </p>
          </div>
        ) : cluster.status !== 'OPEN' ? (
          <div className="glass-card rounded-2xl p-6 text-center border border-white/5">
            <p className="text-slate-400 text-sm font-medium">This thread is closed and pending AI synthesis for FAQ promotion.</p>
          </div>
        ) : consensusLocked ? (
          <div className="glass-card rounded-2xl p-6 text-center flex items-center justify-center gap-2 border border-white/5">
            <Lock size={15} className="text-slate-500" />
            <p className="text-slate-400 text-sm font-medium">
              Consensus Lock Phase — answer submission is now closed. AI synthesis is preparing.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-500 font-semibold text-right mb-2 mr-1">
              {remainingSlots} {remainingSlots === 1 ? 'slot' : 'slots'} remaining before consensus lock
            </p>
            <form onSubmit={handleAnswerSubmit}
              className="flex flex-col sm:flex-row gap-3 bg-white/[0.01] border border-white/5 p-3 rounded-3xl shadow-sm"
            >
              <input type="text" required
                placeholder="Share your experience or knowledge…"
                className="flex-1 rounded-2xl bg-white/[0.02] border border-white/5 px-5 py-3.5 focus:ring-1 focus:ring-purple-400/50 outline-none text-sm text-slate-100 placeholder-slate-600 font-medium transition-all"
                value={myAnswer}
                onChange={e => setMyAnswer(e.target.value)}
              />
              <button type="submit"
                className="glass-dark text-white hover:bg-white/5 border border-white/5 hover:border-white/10 px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold shadow-md transition-all font-bricolage cursor-pointer"
              >
                <Send size={16} /> Post
              </button>
            </form>
          </div>
        )}

        {/* ── Branching Escalation CTA ── */}
        <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
          <button 
            onClick={onRaiseTicket} 
            className="text-slate-400 hover:text-slate-200 font-semibold py-2 px-4 rounded-xl hover:bg-white/5 transition-colors text-sm flex items-center gap-2 font-bricolage"
          >
            <Plus size={14} /> Still unresolved? Raise a Similar Ticket
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // Data States
  const [faqs, setFaqs] = useState([]);
  const [faqsError, setFaqsError] = useState(false);
  const [clusters, setClusters] = useState([]);
  const [urgentClusters, setUrgentClusters] = useState([]);
  const [visitedClusterIds, setVisitedClusterIds] = useState(new Set());
  const [discussionsError, setDiscussionsError] = useState(false);
  
  // Search States
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [faqSearchResults, setFaqSearchResults] = useState([]);
  const [discussionSearchResults, setDiscussionSearchResults] = useState([]);
  const [searchInsight, setSearchInsight] = useState('');
  const [faqMatchType, setFaqMatchType] = useState('none'); // 'keyword' | 'semantic' | 'none'

  // UI States
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') === 'discussions' ? 'discussions' : 'faq';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [targetCategory, setTargetCategory] = useState(null);
  const [activeCluster, setActiveCluster] = useState(queryParams.get('clusterId') || null);

  // Sync state if URL changes dynamically (e.g. user clicks "Back" button)
  useEffect(() => {
    const tab = queryParams.get('tab') === 'discussions' ? 'discussions' : 'faq';
    const clusterId = queryParams.get('clusterId') || null;
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
    if (clusterId !== activeCluster) {
      setActiveCluster(clusterId);
    }
  }, [location.search]);

  // Sync URL if state changes dynamically (e.g. user clicks sidebar button inside Dashboard)
  useEffect(() => {
    const tab = queryParams.get('tab') === 'discussions' ? 'discussions' : 'faq';
    const clusterId = queryParams.get('clusterId') || null;
    const newParams = new URLSearchParams();
    newParams.set('tab', activeTab);
    if (activeCluster) {
      newParams.set('clusterId', activeCluster);
    }
    const newUrl = `/dashboard?${newParams.toString()}`;
    if (location.search !== `?${newParams.toString()}` && location.search !== `?tab=${activeTab}&clusterId=${activeCluster}`) {
      navigate(newUrl, { replace: true });
    }
  }, [activeTab, activeCluster]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const userController = new AbortController();
    const faqsController = new AbortController();
    const clustersController = new AbortController();

    fetchUser({ signal: userController.signal });
    fetchFaqs({ signal: faqsController.signal });
    fetchClusters({ signal: clustersController.signal });

    return () => {
      userController.abort();
      faqsController.abort();
      clustersController.abort();
    };
  }, []);

  // Auto-scroll logic for category jumping
  useEffect(() => {
    if (targetCategory && activeTab === 'faq' && !searchQuery) {
      setTimeout(() => {
        const el = document.getElementById(`category-${targetCategory}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [targetCategory, activeTab, searchQuery]);

  const fetchUser = async (options = {}) => {
    try { 
      const r = await axiosClient.get('/auth/me', { timeout: 10000, signal: options.signal }); 
      setUser(r.data.user); 
    } catch (err) { 
      if (!axiosClient.isCancel?.(err) && err.name !== 'CanceledError') {
        toast.error('Failed to load user profile'); 
      }
    }
  };

  const fetchFaqs = async (options = {}) => {
    try { 
      const r = await axiosClient.get('/faqs', { timeout: 10000, signal: options.signal }); 
      setFaqs(r.data.faqs || []); 
      setFaqsError(false);
    } catch (err) { 
      if (!axiosClient.isCancel?.(err) && err.name !== 'CanceledError') {
        console.error('[FAQs Fetch Error]', err);
        setFaqsError(true);
        toast.error('Failed to load FAQs'); 
      }
    }
  };

  const fetchClusters = async (options = {}) => {
    try { 
      const r = await axiosClient.get('/discussions/clusters', { timeout: 10000, signal: options.signal }); 
      setClusters(r.data.clusters || []); 
      setDiscussionsError(false);
    } catch (err) { 
      if (!axiosClient.isCancel?.(err) && err.name !== 'CanceledError') {
        console.error('[Clusters Fetch Error]', err);
        setDiscussionsError(true);
        toast.error('Failed to load questions'); 
      }
    }
  };

  // ── Derived: sorted + shuffled cluster list ─────────────────────────────────
  const sortedClusters = useMemo(() => buildSortedClusters({
    clusters,
    urgentClusters,
    visitedClusterIds,
    userId: user?._id,
  }), [clusters, urgentClusters, visitedClusterIds, user?._id]);

  const handleOpenCluster = (clusterId) => {
    setVisitedClusterIds(prev => {
      const next = new Set(prev);
      next.add(clusterId);
      return next;
    });
    setActiveCluster(clusterId);
  };

  // Handle Search
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query) {
      setFaqSearchResults([]);
      setDiscussionSearchResults([]);
      setSearchInsight('');
      setFaqMatchType('none');
      return;
    }
    
    setHasSearched(true);
    setIsSearching(true);
    try {
      if (activeTab === 'faq') {
        // Fire both in parallel
        const [resFaq, resDisc] = await Promise.all([
          axiosClient.get('/search', { params: { q: query, type: 'faq' } }),
          axiosClient.get('/search', { params: { q: query, type: 'discussion' } })
        ]);
        setFaqSearchResults(resFaq.data.matches);
        setSearchInsight(resFaq.data.insight || '');
        setFaqMatchType(resFaq.data.matchType || 'none');
        setDiscussionSearchResults(resDisc.data.matches);
      } else {
        const res = await axiosClient.get('/search', { params: { q: query, type: 'discussion' } });
        setDiscussionSearchResults(res.data.matches);
      }
    } catch (err) {
      console.error(err);
      toast.error('Search failed', { id: 'search-error' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const groupedFaqs = faqs.reduce((acc, faq) => {
    const key = normalizeCategory(faq.category || faq.categoryId?.name || faq.categoryId || 'Other');
    if (!acc[key]) acc[key] = [];
    acc[key].push(faq);
    return acc;
  }, {});

  // FAQ NavItem with Desktop Hover Explorer
  const FaqNavItemWithExplorer = ({ close }) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
      <div 
        className="relative" 
        onMouseEnter={() => setIsHovered(true)} 
        onMouseLeave={() => setIsHovered(false)}
      >
        <NavItem icon={Book} label="FAQ" active={activeTab === 'faq' && !activeCluster}
          onClick={() => { navigate('/faq'); setActiveCluster(null); setSearchQuery(''); close(); }} />
        
        <AnimatePresence>
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-0 left-full ml-4 w-64 glass-strong p-4 rounded-3xl sidebar-shadow z-[60] hidden md:block border border-white/10"
            >
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-2 font-bricolage">Categories</h3>
              <div className="space-y-1.5">
                {FAQ_CATEGORIES.map(catName => {
                  return (
                    <button 
                      key={catName}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/faq');
                        setActiveCluster(null);
                        setSearchQuery('');
                        setTargetCategory(catName);
                        setIsHovered(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl transition-all font-bricolage"
                    >
                      {catName} ({(groupedFaqs[catName] || []).length})
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const navSection = (close = () => {}) => (
    <nav className="space-y-1.5">
      <FaqNavItemWithExplorer close={close} />
      <NavItem icon={MessageSquare} label="Once Asked Questions" active={activeTab === 'discussions' && !activeCluster}
        onClick={() => { navigate('/discussions'); setActiveCluster(null); setSearchQuery(''); close(); }} />
      <NavItem icon={Wallet} label="Wallet" active={false}
        onClick={() => { navigate('/wallet'); close(); }} />
      <div className="pt-3 space-y-2 border-t border-white/5 mt-3">
        <button onClick={() => { navigate('/raise-ticket'); close(); }}
          className="sidebar-button sidebar-button-normal"
        >
          <Plus size={18} strokeWidth={2.5} className="flex-shrink-0" /> Raise Ticket
        </button>
        <button onClick={() => { navigate('/contribute-faq'); close(); }}
          className="sidebar-button sidebar-button-normal"
        >
          <Sparkles size={18} strokeWidth={2.5} className="flex-shrink-0" /> Contribute FAQ
        </button>
        <button onClick={() => { navigate('/golden-ticket'); close(); }}
          className="sidebar-button sidebar-button-golden group"
        >
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
          <GoldenTicketIcon size={18} className="flex-shrink-0 drop-shadow-md" />
          <span className="drop-shadow-md tracking-wide">Golden Ticket</span>
        </button>
      </div>
    </nav>
  );

  const pageTitle = activeTab === 'faq' ? 'FAQ'
    : activeCluster ? 'Question Thread' : 'Once Asked Questions';

  return (
    <div data-banned={user?.isBanned ? "true" : "false"} className="flex h-screen bg-mesh overflow-hidden font-inter text-slate-300">
      {user?.isBanned && <BannedUserBanner />}

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 h-16 glass-strong border-b border-white/5">
        <span className="font-bold font-bricolage text-lg text-slate-100">FAQ Hive</span>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <ThemeToggle />
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-xl text-slate-300 hover:bg-white/5 transition-colors">
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="w-72 h-full glass-strong flex flex-col p-6 sidebar-shadow"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <span className="font-bold font-bricolage text-xl text-slate-100">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-xl hover:bg-white/5 transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
              {navSection(() => setIsMobileMenuOpen(false))}
              <div className="mt-auto pt-6 border-t border-white/5">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-slate-100 hover:bg-white/5 text-sm font-semibold transition-colors font-bricolage">
                  <LogOut size={18} /> Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-72 flex-col justify-between py-8 px-5 glass-strong sidebar-shadow z-20">
        <div>
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { navigate('/faq'); setActiveCluster(null); setSearchQuery(''); }}>
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md transition-colors hover:bg-white/10">
                <Book size={16} className="text-slate-300" strokeWidth={2} />
              </div>
              <span className="font-bold font-bricolage text-xl text-slate-100 tracking-tight">FAQ Hive</span>
            </div>
            <ThemeToggle />
            <NotificationBell />
          </div>
          {navSection()}
        </div>
        <div className="space-y-3">
          {user && (
            <div className="glass-card rounded-2xl p-4 flex flex-col items-center">
              <Avatar user={user} size={48} className="mb-3" showGlow={user.role === 'admin' || user.isGoldenTicket} />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-bricolage text-center">Reputation</p>
              <p className="text-3xl font-bold font-bricolage text-slate-100 mb-3 text-center">{user.reputation}</p>
              <div className="flex gap-1.5 text-xs font-semibold font-bricolage flex-wrap">
                <span className="glass-card px-3 py-1.5 rounded-xl border shadow-sm flex items-center gap-1.5 text-amber-400 border-amber-500/10 pizza-badge">
                  <PizzaSliceIcon size={13} className="text-amber-400 pizza-icon" />
                  {formatPizzas(user.pizzaSlices)}
                </span>
                <span className="bg-white/5 text-slate-300 px-2.5 py-1 rounded-lg border border-white/5 shadow-sm flex items-center gap-1">
                  <Sparkles size={11} className="text-slate-400" /> {user.spurtiPoints} SP
                </span>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-slate-100 hover:bg-white/5 text-sm font-semibold transition-colors font-bricolage">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden pt-16 md:pt-0">
        <header className="flex-shrink-0 flex items-center justify-between px-8 py-5 glass-card border-b-0 z-10 shadow-sm">
          <h1 className="font-bold font-bricolage text-2xl text-slate-100 tracking-tight">{pageTitle}</h1>
        </header>

        <div className="flex-1 overflow-y-auto scroll-smooth">
          <main className="p-6 md:p-10 max-w-4xl mx-auto">

            {/* Search Bar for FAQ and Discussions */}
            {!activeCluster && (
              <SearchBar 
                placeholder={`Search ${activeTab === 'faq' ? 'FAQs' : 'once asked questions'}...`} 
                onSearch={handleSearch} 
                loading={isSearching}
                externalQuery={searchQuery}
                className="mb-8"
              />
            )}

            {activeTab === 'faq' && !activeCluster && (
              <div className="space-y-4">
                {searchQuery ? (
                  <>
                    {searchInsight && (
                      <div className="mb-6 flex items-start gap-3 p-5 rounded-2xl bg-purple-500/[0.03] border border-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.02)]">
                        <Sparkles size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold tracking-wider text-purple-400 uppercase font-bricolage">AI Search Insight</span>
                          <p className="text-slate-300 font-medium text-sm mt-1 leading-relaxed italic">"{searchInsight}"</p>
                        </div>
                      </div>
                    )}
                    {isSearching && (
                      <div className="flex items-center gap-3 py-8 justify-center text-slate-500 text-sm">
                        <div className="w-4 h-4 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin" />
                        Searching semantically…
                      </div>
                    )}
                    
                    {!isSearching && faqSearchResults.length === 0 && discussionSearchResults.length === 0 && (
                      <div className="text-center py-24 flex flex-col items-center">
                        <p className="text-slate-500 font-medium mb-6">No strongly related FAQs found.</p>
                        <button onClick={() => navigate('/raise-ticket')} className="glass-dark text-white font-semibold py-3.5 px-6 rounded-2xl hover:bg-white/5 border border-white/5 transition-all text-sm flex items-center gap-2 font-bricolage cursor-pointer">
                          <Plus size={16} /> Didn't find what you need? Raise a Ticket
                        </button>
                      </div>
                    )}

                    {!isSearching && faqSearchResults.length > 0 && faqSearchResults[0].matchPercentage < 50 && (
                      <h3 className="font-bold font-bricolage text-lg text-slate-400 mb-4 px-2 mt-4 flex items-center gap-2">
                        <Search size={16} className="opacity-50" /> Possible related FAQs
                      </h3>
                    )}

                    {faqSearchResults.map(faq => (
                      <FaqSearchResultCard key={faq._id} faq={faq} matchType={faqMatchType} onTagClick={handleSearch} />
                    ))}

                    {!isSearching && discussionSearchResults.length > 0 && (
                      <div className="mt-10 mb-2">
                        <h3 className="font-bold font-bricolage text-lg text-slate-300 mb-4 px-2">Related Student Questions</h3>
                        <div className="grid gap-4">
                          {discussionSearchResults.map(c => <ClusterCard key={c._id} cluster={c} onOpenThread={handleOpenCluster} onTagClick={handleSearch} />)}
                        </div>
                      </div>
                    )}

                    {!isSearching && (faqSearchResults.length > 0 || discussionSearchResults.length > 0) && (
                      <div className="mt-8 pt-8 border-t border-white/5 flex justify-center">
                        <button onClick={() => navigate('/raise-ticket')} className="glass text-slate-300 font-semibold py-3 px-6 rounded-2xl hover:bg-white/5 border border-white/5 transition-all text-sm flex items-center gap-2 font-bricolage cursor-pointer">
                          <Plus size={16} /> Still need help? Raise a Ticket
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {faqsError ? (
                      <div className="text-center py-24 flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                          <X size={20} className="text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-200 mb-2 font-bricolage">Unable to load FAQs</h3>
                        <p className="text-slate-400 text-sm max-w-md">We're having trouble connecting to the server. You can still search offline cached items or try again later.</p>
                        <button onClick={fetchFaqs} className="mt-6 text-emerald-400 font-bold text-sm hover:underline">Retry Connection</button>
                      </div>
                    ) : (
                      <>
                        {FAQ_CATEGORIES.map(catName => {
                          return (
                            <CategoryCard 
                              key={catName} 
                              category={catName} 
                              faqs={groupedFaqs[catName] || []} 
                              isTargeted={targetCategory === catName}
                              onTagClick={handleSearch}
                            />
                          );
                        })}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'discussions' && !activeCluster && (
              <>
                {/* ── Urgent Questions CTA band ── */}
                {urgentClusters.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-bold text-orange-400 uppercase tracking-widest font-bricolage">⚡ Needs your answers</span>
                      <div className="flex-1 h-px bg-orange-500/20" />
                    </div>
                    <div className="grid gap-4">
                      {urgentClusters.slice(0, 3).map(cluster => (
                        <ClusterCard
                          key={cluster._id}
                          cluster={cluster}
                          onOpenThread={id => { handleOpenCluster(id); setSearchQuery(''); }}
                          onTagClick={handleSearch}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-5">
                {searchQuery ? (
                  <>
                    {isSearching && (
                      <div className="flex items-center gap-3 py-8 justify-center text-slate-500 text-sm">
                        <div className="w-4 h-4 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin" />
                        Searching semantically…
                      </div>
                    )}
                    {!isSearching && discussionSearchResults.length === 0 && (
                      <div className="text-center py-24 flex flex-col items-center">
                        <p className="text-slate-500 font-medium mb-6">No strongly related questions found.</p>
                        <button onClick={() => navigate('/raise-ticket')} className="glass-dark text-white font-semibold py-3 px-6 rounded-2xl hover:bg-white/5 border border-white/5 transition-all text-sm flex items-center gap-2 font-bricolage cursor-pointer">
                          <Plus size={16} /> Didn't find what you need? Raise a Ticket
                        </button>
                      </div>
                    )}
                    {discussionSearchResults.map(c => <ClusterCard key={c._id} cluster={c} onOpenThread={handleOpenCluster} onTagClick={handleSearch} />)}
                    
                    {!isSearching && discussionSearchResults.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-white/5 flex justify-center">
                        <button onClick={() => navigate('/raise-ticket')} className="glass text-slate-300 font-semibold py-3 px-6 rounded-2xl hover:bg-white/5 border border-white/5 transition-all text-sm flex items-center gap-2 font-bricolage cursor-pointer">
                          <Plus size={16} /> Still need help? Raise a Ticket
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {discussionsError ? (
                      <div className="text-center py-24 flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                          <X size={20} className="text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-200 mb-2 font-bricolage">Unable to load questions</h3>
                        <p className="text-slate-400 text-sm max-w-md">We're having trouble connecting to the server. Please try again later.</p>
                        <button onClick={fetchClusters} className="mt-6 text-emerald-400 font-bold text-sm hover:underline">Retry Connection</button>
                      </div>
                    ) : clusters.length === 0 ? (
                      <div className="text-center py-24 text-slate-500 font-medium font-bricolage">No active questions yet. Be the first!</div>
                    ) : (
                      sortedClusters
                        .filter(c => !urgentClusters.find(u => u._id === c._id))
                        .map(c => <ClusterCard key={c._id} cluster={c} onOpenThread={handleOpenCluster} onTagClick={handleSearch} />)
                    )}
                  </>
                )}
              </div>
              </>
            )}

            {activeCluster && (
              <DiscussionPanel
                clusterId={activeCluster}
                user={user}
                onBack={() => setActiveCluster(null)}
                refreshClusters={fetchClusters}
                onRaiseTicket={() => navigate('/raise-ticket')}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

