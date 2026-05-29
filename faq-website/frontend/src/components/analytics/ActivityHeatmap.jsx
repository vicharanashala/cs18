import React from 'react';
import { motion } from 'framer-motion';

export default function ActivityHeatmap({ data }) {
  // data format: [{ hour: 0, count: 5, label: '12 AM' }, ...]
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="glass-card rounded-3xl p-6 md:p-8 border border-emerald-900/30 relative overflow-hidden bg-gradient-to-br from-emerald-950/20 to-transparent">
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
          <h3 className="text-lg font-bold font-bricolage text-slate-100">Student Activity Pulse</h3>
          <p className="text-sm text-slate-400">Peak question hours over last 30 days</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-bricolage">Live</span>
        </div>
      </div>

      <div className="relative h-48 flex items-end gap-1 sm:gap-2 z-10 mt-8">
        {data.map((d, idx) => {
          const heightPercent = (d.count / maxCount) * 100;
          const isPeak = heightPercent > 80;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-emerald-300 font-bold mb-2">
                {d.count}
              </div>
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ duration: 1, delay: idx * 0.02, type: 'spring' }}
                className={`w-full rounded-t-sm transition-all duration-300 ${
                  isPeak 
                    ? 'bg-gradient-to-t from-emerald-500/20 to-emerald-400 shadow-[0_-5px_15px_rgba(52,211,153,0.3)]' 
                    : 'bg-gradient-to-t from-emerald-900/20 to-emerald-700/50 hover:to-emerald-500/80'
                }`}
              />
              <div className="text-[9px] text-slate-500 mt-2 rotate-[-45deg] origin-top-left translate-y-2 translate-x-1 sm:rotate-0 sm:translate-y-0 sm:translate-x-0 hidden sm:block">
                {idx % 3 === 0 ? d.label : ''}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Background ambient glow matching the peak */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-emerald-500/10 blur-[40px] pointer-events-none" />
    </div>
  );
}
