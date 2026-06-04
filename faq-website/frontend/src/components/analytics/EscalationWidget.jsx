import React from 'react';
import { Flame, ArrowUpRight } from 'lucide-react';

export default function EscalationWidget({ data }) {
  // data format: [{ topic: 'Fee Payment', escalationCount: 12, riskScore: 85 }, ...]

  return (
    <div className="glass-card rounded-3xl p-6 md:p-8 border border-rose-900/20 relative bg-gradient-to-br from-rose-950/10 to-transparent">
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-[50px] pointer-events-none" />
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <Flame size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-lg font-bold font-bricolage text-slate-100">Escalation Hotspots</h3>
          <p className="text-xs text-slate-400">Rapidly increasing high-urgency tickets</p>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        {(data || []).map((item, idx) => (
          <div key={idx} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-black/20 border border-white/5 flex items-center justify-center text-xs font-bold text-slate-400">
                {idx + 1}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">{item.topic}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{item.escalationCount} Escalations</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-rose-400/70 uppercase tracking-widest mb-1">Risk Score</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-xs">
                {item.riskScore} <ArrowUpRight size={12} strokeWidth={3} />
              </div>
            </div>
          </div>
        ))}
        {(!data || data.length === 0) && (
          <div className="text-slate-500 text-sm font-medium w-full text-center py-4">No critical escalations.</div>
        )}
      </div>
    </div>
  );
}
