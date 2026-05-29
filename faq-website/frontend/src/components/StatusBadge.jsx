import React from 'react';
import { useBannedClass } from '../hooks/useBannedTheme';

export default function StatusBadge({ variant = 'gray', icon: Icon, children, className = '' }) {
  const { badgeYellow } = useBannedClass();

  const variants = {
    yellow: badgeYellow,
    purple: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30",
    green: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
    red: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30",
    gray: "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/30",
  };

  const selectedVariant = variants[variant] || variants.gray;

  return (
    <div className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm text-xs font-bold whitespace-nowrap font-bricolage transition-all hover:brightness-95 dark:hover:brightness-110 ${selectedVariant} ${className}`}>
      {Icon && <Icon size={14} />}
      {children}
    </div>
  );
}