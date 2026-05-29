import React from 'react';
import { TrendingUp, Hash } from 'lucide-react';

export default function TopicTrendsWidget({ data }) {
  // data format: [{ topic: 'Offer Letter', count: 45 }, ...]

  return (
    <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5 relative bg-white/[0.01]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
          <TrendingUp size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-lg font-bold font-bricolage text-slate-100">Rising Topics</h3>
          <p className="text-xs text-slate-400">Most discussed student issues</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {data.map((item, idx) => (
          <div 
            key={idx}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/50 border border-white/5 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all group"
          >
            <Hash size={14} className="text-slate-500 group-hover:text-teal-400 transition-colors" />
            <span className="text-sm font-semibold text-slate-200">{item.topic}</span>
            <div className="ml-2 px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-slate-400 group-hover:bg-teal-500/20 group-hover:text-teal-300 transition-colors">
              {item.count}
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className="text-slate-500 text-sm font-medium w-full text-center py-4">No trending topics found.</div>
        )}
      </div>
    </div>
  );
}
