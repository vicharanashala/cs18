import React from 'react';
import { Check } from 'lucide-react';

const STAGES = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'admin_review', label: 'Admin Review' },
  { key: 'resolved', label: 'Resolved' }
];

export default function TicketStatusMiniTimeline({ currentStatus }) {
  const currentIndex = STAGES.findIndex(s => s.key === currentStatus) || 0;
  
  return (
    <div className="relative pt-4 pb-2">
      {/* Background track line */}
      <div className="absolute top-6 left-4 right-4 h-0.5 bg-white/5 rounded-full" />
      
      {/* Active progress line */}
      <div 
        className="absolute top-6 left-4 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
        style={{ width: `calc(${(currentIndex / (STAGES.length - 1)) * 100}% - 32px)` }}
      />

      <div className="flex justify-between relative z-10">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;
          
          return (
            <div key={stage.key} className="flex flex-col items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all duration-500 
                ${isCompleted ? 'bg-emerald-500 text-white shadow-sm' : ''}
                ${isActive ? 'bg-teal-400 text-slate-900 shadow-md ring-2 ring-teal-400/20' : ''}
                ${!isCompleted && !isActive ? 'bg-slate-800 border border-slate-600 text-slate-500' : ''}
              `}>
                {isCompleted ? <Check size={12} strokeWidth={3} /> : <span className="font-bold">{idx + 1}</span>}
              </div>
              <span className={`text-[10px] font-bold font-bricolage text-center leading-tight hidden sm:block
                ${isActive ? 'text-emerald-300' : isCompleted ? 'text-slate-300' : 'text-slate-500'}
              `}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
