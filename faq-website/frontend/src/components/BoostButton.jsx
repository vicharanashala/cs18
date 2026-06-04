import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

/**
 * BoostButton — appears on ClusterCard and TrackQueryCard.
 *
 * Props:
 *   clusterId  — SemanticCluster._id  (for cluster boost)
 *   ticketId   — PersonalTicket._id   (for ticket boost; pass one or the other)
 *   isBoosted  — whether a boost is currently active (from server state)
 *   boostedUntil — countdown string like "09:42" (MM:SS)
 *   canBoost   — whether the current user is eligible to boost (is participant / owner)
 *   pizzaSlices — user's current pizza slice balance (for display)
 *   onBoosted  — callback after successful boost (parent refreshes state)
 *   size       — 'sm' | 'md'  (button size)
 */
export default function BoostButton({
  clusterId,
  ticketId,
  isBoosted,
  boostedUntil,
  canBoost,
  pizzaSlices,
  onBoosted,
  size = 'sm',
}) {
  const [isBoosting, setIsBoosting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isActive = !!isBoosted;

  const handleBoost = async () => {
    setIsBoosting(true);
    setShowConfirm(false);
    try {
      let res;
      if (clusterId) {
        res = await axiosClient.post(`/boost/cluster/${clusterId}`);
      } else if (ticketId) {
        res = await axiosClient.post(`/boost/ticket/${ticketId}`);
      }
      toast.success('🚀 Boost activated for 10 minutes!');
      if (onBoosted) onBoosted(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Boost failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsBoosting(false);
    }
  };

  // ── Active boost badge ─────────────────────────────────────────────────────
  if (isActive) {
    return (
      <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-300 font-bricolage shadow-sm"
        title={`Boost expires in ${boostedUntil || 'a few minutes'}`}
      >
        🚀 Boosted
        {boostedUntil && (
          <span className="text-amber-400/80 tabular-nums">{boostedUntil}</span>
        )}
      </div>
    );
  }

  // ── No boost active — not eligible: render disabled button so feature is discoverable
  if (!canBoost) {
    const label = size === 'sm'
      ? <><span className="hidden sm:inline">🚀 Boost</span><span className="sm:hidden">🚀</span> <span className="opacity-60">1🍕</span></>
      : '🚀 Boost (1 Pizza Slice)';
    return (
      <button
        disabled
        className="inline-flex items-center gap-1 text-[10px] font-bold font-bricolage px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-500 cursor-not-allowed opacity-60 relative"
        title="You need 1 Pizza Slice to boost this discussion"
      >
        {label}
      </button>
    );
  }

  const label = size === 'sm'
    ? <><span className="hidden sm:inline">🚀 Boost</span><span className="sm:hidden">🚀</span> <span className="opacity-60">1🍕</span></>
    : '🚀 Boost (1 Pizza Slice)';

  return (
    <>
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute right-0 top-full mt-2 z-50 w-52 glass-card border border-white/10 rounded-2xl p-4 shadow-xl"
          >
            <p className="text-slate-200 text-xs font-semibold mb-3 leading-relaxed font-bricolage">
              Spend <span className="text-amber-400 font-bold">1 Pizza Slice</span> to boost for 10 minutes?
            </p>
            {pizzaSlices !== undefined && (
              <p className="text-slate-500 text-[10px] mb-3">You have {pizzaSlices} slice{pizzaSlices !== 1 ? 's' : ''}.</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 text-slate-400 hover:text-slate-200 text-xs font-semibold py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-bricolage"
              >
                Cancel
              </button>
              <button
                onClick={handleBoost}
                disabled={isBoosting}
                className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold py-2 rounded-xl transition-colors font-bricolage disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isBoosting
                  ? <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  : '🚀 Boost'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
        disabled={isBoosting}
        className="inline-flex items-center gap-1 text-[10px] font-bold font-bricolage px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/40 transition-all disabled:opacity-40 relative"
        title="Boost for 1 Pizza Slice (10 min)"
      >
        {isBoosting
          ? <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          : <>{label}</>}
      </button>
    </>
  );
}