import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, Trash2 } from 'lucide-react';

export default function DeleteTicketModal({ isOpen, onClose, onConfirm, isDeleting, ticketNumber }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#131b17] border border-emerald-900/30 w-full max-w-sm rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.05)] relative overflow-hidden"
        >
          {/* Subtle gradient glow in background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none" />

          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center text-center mt-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-900/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
              <Trash2 size={24} strokeWidth={1.5} />
            </div>
            
            <h3 className="text-lg font-bold font-bricolage text-slate-100 mb-2">Delete Tracking Record?</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              You are about to remove ticket <span className="font-bold text-emerald-300">{ticketNumber}</span> from your tracking dashboard. This action will also close the associated request.
            </p>

            <div className="flex w-full gap-3 font-bricolage">
              <button 
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] text-slate-300 font-semibold text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                ) : (
                  'Yes, delete'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
