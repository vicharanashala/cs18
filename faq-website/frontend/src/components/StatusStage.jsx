import React from 'react';
import { motion } from 'framer-motion';
import { Check, Hourglass, UserCheck, ShieldCheck, CheckCircle } from 'lucide-react';

const ICONS = {
  submitted: Check,
  under_review: Hourglass,
  assigned_to_peer: UserCheck,
  admin_review: ShieldCheck,
  resolved: CheckCircle
};

const LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  assigned_to_peer: 'Assigned to Peer',
  admin_review: 'Admin Review',
  resolved: 'Resolved'
};

export default function StatusStage({ stage, currentStatus, index, totalStages }) {
  const STAGE_ORDER = ['submitted', 'under_review', 'assigned_to_peer', 'admin_review', 'resolved'];
  
  const currentIndex = STAGE_ORDER.indexOf(currentStatus);
  const stageIndex = STAGE_ORDER.indexOf(stage);
  
  const isCompleted = stageIndex < currentIndex;
  const isActive = stageIndex === currentIndex;
  const isPending = stageIndex > currentIndex;

  const Icon = ICONS[stage] || Check;
  const label = LABELS[stage] || stage;

  return (
    <div className="relative flex flex-row sm:flex-col items-center sm:flex-1 z-10 w-full sm:w-auto gap-4 sm:gap-0">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
        className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 shadow-sm shrink-0
          ${isActive 
            ? 'bg-emerald-500 border-emerald-400 text-white shadow-md scale-110' 
            : isCompleted 
              ? 'bg-emerald-600 border-emerald-500 text-white dark:bg-emerald-700' 
              : 'bg-white/50 border-slate-200 text-slate-400 dark:border-white/10 dark:bg-black/20 dark:text-slate-500'}`}
      >
        <Icon size={16} strokeWidth={2.5} className={isActive ? 'animate-pulse' : ''} />
      </motion.div>
      <span className={`sm:mt-3 text-[13px] font-bold font-bricolage text-left sm:text-center transition-colors duration-500 tracking-wide
        ${isActive 
          ? 'text-emerald-700 dark:text-emerald-400' 
          : isCompleted 
            ? 'text-slate-700 dark:text-slate-300' 
            : 'text-slate-400 dark:text-slate-500'}`}
      >
        {label}
      </span>
    </div>
  );
}
