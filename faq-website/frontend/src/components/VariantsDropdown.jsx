import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';

/**
 * Shows a "N similar questions" button that expands into a dropdown
 * listing the semantic variants that were grouped under this card.
 */
export default function VariantsDropdown({ variants = [], onOpenThread }) {
  const [open, setOpen] = useState(false);

  if (!variants || variants.length === 0) return null;

  return (
    <div className="mt-3">
      {/* Toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/8 border border-purple-500/20 hover:bg-purple-500/15 transition-all text-[11px] font-bold font-bricolage text-purple-300"
      >
        <Layers size={12} />
        {variants.length} similar question{variants.length !== 1 ? 's' : ''} grouped
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {/* Expanded list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-1.5">
              {variants.map((v) => (
                <button
                  key={v._id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenThread) onOpenThread(v._id);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all text-[12px] text-slate-400 hover:text-slate-200 font-bricolage italic"
                >
                  "{v.question}"
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}