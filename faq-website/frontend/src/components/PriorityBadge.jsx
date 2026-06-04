import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function PriorityBadge({ level, score, breakdown }) {
  if (!level) return null;
  const colors = {
    CRITICAL: 'bg-red-500/10 border-red-500/20 text-red-500',
    URGENT: 'bg-orange-500/10 border-orange-500/20 text-orange-500',
    HIGH: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
    MODERATE: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    LOW: 'bg-slate-500/10 border-slate-500/20 text-slate-500',
  };
  const colorClass = colors[level] || colors.LOW;
  
  let tooltip = '';
  if (breakdown) {
    tooltip = `Language: ${breakdown.D1_LanguageUrgency || 0} | Category: ${breakdown.D2_CategoryBaseline || 0} | Time: ${breakdown.D3_TimeDecay || 0} | Repeat: ${breakdown.D4_RepeatBehavior || 0} | Engagement: ${breakdown.D5_EngagementSignal || 0} | Attachments: ${breakdown.D6_AttachmentEvidence || 0}`;
  }

  return (
    <div title={tooltip} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold font-bricolage tracking-wider uppercase shadow-sm cursor-help ${colorClass}`}>
      <AlertCircle size={12} />
      {level} {score !== undefined ? `(Score: ${score})` : ''}
    </div>
  );
}
