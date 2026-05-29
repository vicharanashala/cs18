import React from 'react';
import { Network, Search, FileText } from 'lucide-react';

export default function FrictionZoneCard({ data }) {
  // data format: [{ topic: '...', confusionScore: 80, ticketVolume: 10, searchFails: 20 }]

  return (
    <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5 relative bg-white/[0.01]">
      <div className="flex items-center gap-3 mb-8 relative z-10">
        <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
          <Network size={20} strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-lg font-bold font-bricolage text-slate-100">Student Friction Zones</h3>
          <p className="text-xs text-slate-400">Institutional pain points (High confusion score)</p>
        </div>
      </div>

      <div className="space-y-5">
        {data.map((zone, idx) => (
          <div key={idx} className="relative p-5 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden group hover:border-fuchsia-500/30 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 rounded-full blur-[40px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-start justify-between relative z-10">
              <div>
                <h4 className="text-base font-bold text-slate-100 font-bricolage mb-1">{zone.topic}</h4>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-400 mt-2">
                  <span className="flex items-center gap-1"><FileText size={12} /> {zone.ticketVolume} Tickets</span>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1"><Search size={12} /> {zone.searchFails} Search Fails</span>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-fuchsia-500/20 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-4 border-fuchsia-500/60" style={{ clipPath: `polygon(0 0, 100% 0, 100% ${zone.confusionScore}%, 0 ${zone.confusionScore}%)` }} />
                  <span className="text-xs font-bold text-slate-200">{zone.confusionScore}</span>
                </div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Score</span>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className="text-slate-500 text-sm font-medium w-full text-center py-6 border border-dashed border-white/10 rounded-2xl">
            No significant friction zones detected.
          </div>
        )}
      </div>
    </div>
  );
}
