import React from 'react';
import { motion } from 'framer-motion';
import StatusStage from './StatusStage';

export default function StatusTimeline({ currentStatus }) {
  const STAGE_ORDER = ['submitted', 'under_review', 'assigned_to_peer', 'admin_review', 'resolved'];
  
  // Treat 'pending' as 'submitted' for the UI
  const normalizedStatus = currentStatus === 'pending' ? 'submitted' : currentStatus;
  
  const currentIndex = STAGE_ORDER.indexOf(normalizedStatus) !== -1 ? STAGE_ORDER.indexOf(normalizedStatus) : 0;

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 w-full border border-emerald-100/50 dark:border-white/5 bg-white/40 dark:bg-black/10 backdrop-blur-xl shadow-sm mb-6 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-8 md:mb-10">
        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-sm font-bold font-bricolage text-slate-700 dark:text-slate-200">Real-Time Status</h3>
      </div>
      
      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center w-full mt-4 pb-2 gap-8 sm:gap-0">
        {/* Background Line */}
        <div className="absolute left-[19px] sm:left-[10%] top-[20px] bottom-[20px] sm:bottom-auto sm:right-[10%] w-[2px] sm:w-auto sm:h-[2px] bg-emerald-100 dark:bg-white/10 -z-0" />
        
        {/* Animated Progress Line */}
        <motion.div 
          initial={{ height: 0, width: 0 }}
          animate={{ 
            height: typeof window !== 'undefined' && window.innerWidth < 640 ? `${(currentIndex / (STAGE_ORDER.length - 1)) * 100}%` : '2px',
            width: typeof window !== 'undefined' && window.innerWidth >= 640 ? `${(currentIndex / (STAGE_ORDER.length - 1)) * 80 + 10}%` : '2px'
          }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="absolute left-[19px] sm:left-[10%] top-[20px] sm:top-[20px] w-[2px] sm:w-auto sm:h-[2px] bg-gradient-to-b sm:bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(52,211,153,0.5)] -z-0" 
        />
        
        {STAGE_ORDER.map((stage, index) => (
          <StatusStage 
            key={stage} 
            stage={stage} 
            currentStatus={normalizedStatus} 
            index={index} 
            totalStages={STAGE_ORDER.length} 
          />
        ))}
      </div>
    </div>
  );
}
