import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import { Sparkles, Star } from 'lucide-react';

export default function ConvertToGTModal({ isOpen, onClose, ticket, onSuccess }) {
  const [spurtiSpent, setSpurtiSpent] = useState(10);
  const [isConverting, setIsConverting] = useState(false);

  if (!isOpen || !ticket) return null;

  const handleConvert = async () => {
    if (spurtiSpent < 1) {
      toast.error('Minimum 1 SP required.');
      return;
    }
    setIsConverting(true);
    try {
      const res = await axiosClient.post(`/boost/convert-to-golden/${ticket.personalTicket._id}`, { spurtiSpent });
      toast.success('⭐ Converted to Golden Ticket!');
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion failed.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2 }}
          className="glass-card rounded-3xl w-full max-w-md p-8 border border-purple-500/20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Star size={20} className="text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold font-bricolage text-lg text-slate-100">Convert to Golden Ticket</h3>
              <p className="text-slate-500 text-xs">Upgrade your existing ticket to GT priority</p>
            </div>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed mb-5 break-words">
            &ldquo;{ticket.question}&rdquo;
          </p>

          <div className="mb-5">
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 font-bricolage">
              Spurti Points to spend
            </label>
            <input
              type="number"
              min={1}
              max={999}
              value={spurtiSpent}
              onChange={e => setSpurtiSpent(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-black/30 border border-purple-500/30 rounded-2xl px-4 py-3 text-slate-100 font-bricolage text-lg font-bold focus:border-purple-400 outline-none transition-colors shadow-inner"
            />
            <p className="text-slate-500 text-[11px] mt-2">Higher SP = higher leaderboard position. 48h cooldown applies.</p>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-3 mb-6">
            <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold font-bricolage mb-1">
              <Sparkles size={13} /> What you get
            </div>
            <ul className="text-slate-400 text-[11px] space-y-1">
              <li>• Golden Ticket badge + priority ranking</li>
              <li>• 1.25× SP refund on resolution</li>
              <li>• 48h cooldown before next GT</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} disabled={isConverting}
              className="flex-1 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 font-semibold py-3 rounded-2xl transition-colors text-sm font-bricolage">
              Cancel
            </button>
            <button onClick={handleConvert} disabled={isConverting}
              className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-bold py-3 rounded-2xl transition-colors text-sm font-bricolage disabled:opacity-50 flex items-center justify-center gap-2">
              {isConverting
                ? <><div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" /> Converting...</>
                : <><Star size={14} /> Convert to GT</>}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}