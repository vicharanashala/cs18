import React from 'react';
import { SearchX, AlertTriangle } from 'lucide-react';

export default function SearchFailureWidget({ data }) {
  // data format: [{ query: 'hostel refund', failCount: 43 }, ...]
  const cardClass =
    'glass-card rounded-3xl p-6 md:p-8 relative border border-orange-900/20 bg-gradient-to-b from-orange-950/10 to-transparent';

  const iconBgClass =
    'w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-inner';

  const alertClass     = 'text-orange-500/70';
  const alertCountClass = 'text-orange-400';
  const hoverClass     = 'hover:border-orange-500/20';

  return (
    <div className={cardClass}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[40px] pointer-events-none" />

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className={iconBgClass}>
          <SearchX size={20} strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-lg font-bold font-bricolage text-slate-100">Search Failure Hotspots</h3>
          <p className="text-xs text-slate-400">Queries returning no results — FAQ creation guidance</p>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        {data.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-4 rounded-2xl bg-white/[0.015] border border-white/5 ${hoverClass} transition-all`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600 font-bricolage w-4">{idx + 1}.</span>
              <span className="text-sm font-semibold text-slate-200 capitalize">"{item.query}"</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className={alertClass} />
              <span className={`text-xs font-bold ${alertCountClass}`}>{item.failCount} fails</span>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className="text-slate-500 text-sm font-medium w-full text-center py-6 border border-dashed border-white/10 rounded-2xl">
            No search failures! Students are finding what they need.
          </div>
        )}
      </div>
    </div>
  );
}