import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { motion, AnimatePresence } from 'framer-motion';

// Generate a random anonymous session ID for voting if not logged in
const getSessionId = () => {
  let sid = localStorage.getItem('faq_voter_session');
  if (!sid) {
    sid = 'session_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('faq_voter_session', sid);
  }
  return sid;
};

export default function HelpfulFeedback({ faqId }) {
  const [voted, setVoted] = useState(false);
  const [isHovered, setIsHovered] = useState(null);
  
  // To preserve UI stability across re-renders for already voted items, we can check localStorage
  useEffect(() => {
    const votedFaqs = JSON.parse(localStorage.getItem('faq_votes') || '{}');
    if (votedFaqs[faqId]) {
      setVoted(true);
    }
  }, [faqId]);

  const handleVote = async (helpful) => {
    if (voted) return;

    // Optimistic UI update
    setVoted(true);
    
    // Store locally to prevent re-voting on refresh
    const votedFaqs = JSON.parse(localStorage.getItem('faq_votes') || '{}');
    votedFaqs[faqId] = true;
    localStorage.setItem('faq_votes', JSON.stringify(votedFaqs));

    try {
      const sessionId = getSessionId();
      await axiosClient.post(`/faqs/${faqId}/feedback`, { helpful, sessionId });
    } catch (err) {
      console.error('Failed to submit FAQ feedback', err);
      // We fail silently to avoid toast spam, but could revert the vote if absolutely needed
    }
  };

  return (
    <div className="mt-5 pt-4 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between transition-all duration-300">
      <AnimatePresence mode="wait">
        {!voted ? (
          <motion.div
            key="voting"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-3 w-full"
          >
            <span className="text-[11px] font-bold font-bricolage text-slate-500 dark:text-slate-400 uppercase tracking-widest mr-2">
              Was this helpful?
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleVote(true); }}
                onMouseEnter={() => setIsHovered('up')}
                onMouseLeave={() => setIsHovered(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-inter transition-all duration-300 border backdrop-blur-sm
                  ${isHovered === 'up' 
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
                    : 'border-slate-200 bg-white/50 text-slate-600 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-400'}
                `}
              >
                <ThumbsUp size={14} strokeWidth={2.5} className={isHovered === 'up' ? 'scale-110 transition-transform' : ''} />
                Yes
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); handleVote(false); }}
                onMouseEnter={() => setIsHovered('down')}
                onMouseLeave={() => setIsHovered(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-inter transition-all duration-300 border backdrop-blur-sm
                  ${isHovered === 'down' 
                    ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.1)]' 
                    : 'border-slate-200 bg-white/50 text-slate-600 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-400'}
                `}
              >
                <ThumbsDown size={14} strokeWidth={2.5} className={isHovered === 'down' ? 'scale-110 transition-transform' : ''} />
                No
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="voted"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-4 py-1.5 rounded-full backdrop-blur-sm shadow-sm"
          >
            <ThumbsUp size={14} strokeWidth={2.5} />
            <span className="text-xs font-bold font-bricolage tracking-wide">Thanks for the feedback</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
