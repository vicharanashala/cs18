import React from 'react';
import { ThumbsUp, ThumbsDown, AlertOctagon } from 'lucide-react';

export default function FaqEffectivenessWidget({ data }) {
  // data format: [{ question: '...', helpfulCount: 10, notHelpfulCount: 5, helpfulRatio: 0.66 }, ...]

  return (
    <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5 relative bg-white/[0.01]">
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <AlertOctagon size={20} strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-lg font-bold font-bricolage text-slate-100">FAQ Effectiveness</h3>
          <p className="text-xs text-slate-400">Identify FAQs causing repeated ticket creations</p>
        </div>
      </div>

      <div className="space-y-4">
        {(data || []).map((faq, idx) => {
          const isWarning = faq.helpfulRatio < 0.5 && faq.totalFeedback > 2;
          
          return (
            <div key={idx} className={`p-4 rounded-2xl border ${isWarning ? 'bg-rose-500/5 border-rose-500/20' : 'bg-white/[0.015] border-white/5'}`}>
              <p className="text-sm font-semibold text-slate-200 mb-3 break-words whitespace-normal">
                  {faq.question}
                </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <ThumbsUp size={12} /> {faq.helpfulCount}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                    <ThumbsDown size={12} /> {faq.notHelpfulCount}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isWarning && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                      Needs Review
                    </span>
                  )}
                  <div className="text-xs font-bold font-bricolage text-slate-400">
                    {Math.round(faq.helpfulRatio * 100)}% Helpful
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden flex">
                <div style={{ width: `${faq.helpfulRatio * 100}%` }} className="h-full bg-emerald-500" />
                <div style={{ width: `${(1 - faq.helpfulRatio) * 100}%` }} className="h-full bg-rose-500" />
              </div>
            </div>
          );
        })}
        {(!data || data.length === 0) && (
          <div className="text-slate-500 text-sm font-medium w-full text-center py-4">Not enough feedback data yet.</div>
        )}
      </div>
    </div>
  );
}
