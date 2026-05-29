import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import { ArrowRight, RefreshCcw } from 'lucide-react';
import { useBannedClass } from '../hooks/useBannedTheme';

export default function AppealCard({ ticketId, currentStatus, onStatusChange }) {
  const [isAppealing, setIsAppealing] = useState(false);
  const { borderAmber, borderAmberLight, bgAmber, bgAmberDark, textAmber, textAmberDark } = useBannedClass();

  const canAppeal = currentStatus === 'resolved' || currentStatus === 'rejected';

  const handleAppeal = async () => {
    if (!canAppeal) return;
    setIsAppealing(true);
    try {
      const res = await axiosClient.post(`/personal-issues/${ticketId}/appeal`);
      toast.success(res.data.message || 'Ticket appealed successfully.');
      if (onStatusChange) onStatusChange('under_review');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to appeal ticket.');
    } finally {
      setIsAppealing(false);
    }
  };

  const cardClass = [
    'glass-card rounded-3xl p-6 md:p-8',
    'flex flex-col md:flex-row items-start md:items-center justify-between gap-5',
    'backdrop-blur-xl shadow-sm mt-8',
    borderAmber,
    bgAmber,
  ].join(' ');

  const iconClass = [
    'p-2 rounded-xl h-fit shrink-0 border shadow-sm',
    bgAmberDark,
    textAmber,
    borderAmberLight,
  ].join(' ');

  return (
    <div className={cardClass}>
      <div className="flex gap-4">
        <div className={iconClass}>
          <RefreshCcw size={18} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="font-bold font-bricolage text-slate-800 dark:text-slate-200 text-base md:text-lg">Query Appeal / Re-escalation</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-relaxed">Not satisfied with the resolution? Appeal to a higher authority.</p>
        </div>
      </div>

      <button
        onClick={handleAppeal}
        disabled={!canAppeal || isAppealing}
        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold font-bricolage transition-all duration-300 border w-full md:w-auto shrink-0 shadow-sm
          ${canAppeal
            ? 'border-emerald-300/50 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-800/40 hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] cursor-pointer'
            : 'border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-black/20 cursor-not-allowed opacity-70'}`}
      >
        {isAppealing ? 'Appealing...' : 'Appeal'}
        <ArrowRight size={16} strokeWidth={2.5} className={isAppealing ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}