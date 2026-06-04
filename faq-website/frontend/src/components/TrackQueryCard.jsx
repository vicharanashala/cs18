import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Hash, Clock, ExternalLink, Star, Hash as HashIcon, Zap } from 'lucide-react';
import TicketStatusMiniTimeline from './TicketStatusMiniTimeline';
import DeleteTicketModal from './DeleteTicketModal';
import Avatar from './Avatar';
import AttachmentDisplay from './AttachmentDisplay';
import PriorityBadge from './PriorityBadge';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

/** Live countdown hook — returns MM:SS string that updates every second */
function useCountdown(boostedUntilIso) {
  const [display, setDisplay] = useState(null);
  useEffect(() => {
    if (!boostedUntilIso) { setDisplay(null); return; }
    const update = () => {
      const ms = new Date(boostedUntilIso) - Date.now();
      if (ms <= 0) { setDisplay(null); return; }
      const totalSec = Math.floor(ms / 1000);
      setDisplay(`${String(Math.floor(totalSec / 60)).padStart(2,'0')}:${String(totalSec % 60).padStart(2,'0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [boostedUntilIso]);
  return display;
}

export default function TrackQueryCard({
  ticket,
  redirectId,
  redirectType,
  onDeleteSuccess,
  canConvertToGT   = false,
  userPizzaSlices  = 0,
  userSpurtiPoints = 0,
  currentUserId    = null,
  onGTConverted,
}) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting]               = useState(false);
  const [showGTModal, setShowGTModal]             = useState(false);
  const [localBoosted, setLocalBoosted]           = useState(null);
  const [localClusterBoosted, setLocalClusterBoosted] = useState(null);
  const [localIsGT, setLocalIsGT]                 = useState(false);
  const [localPizzaSlices, setLocalPizzaSlices]   = useState(userPizzaSlices);
  const [isBoosting, setIsBoosting]               = useState(false);

  const pt = ticket.personalTicket;
  const isOrphanedPT = ticket.isOrphanedPT;

  const isPersonal = ticket.type === 'personal';
  const isOwner    = currentUserId && ticket.userId?.toString() === currentUserId.toString();
  const alreadyGT  = localIsGT || pt?.isConvertedToGT;
  const isResolved = ticket.status === 'resolved';
  const isRejected = ticket.status === 'rejected';

  // Boosted state
  const boostedUntilIso  = (pt?.boostedAt && pt?.boostedUntil && new Date(pt.boostedUntil) > new Date())
    ? new Date(pt.boostedUntil).toISOString() : null;
  const liveCountdown    = useCountdown(boostedUntilIso);
  const boostedUntilStr  = liveCountdown || pt?.boostedUntil || null;

  const clusterBoostedIso = (ticket.clusterBoostedUntil && new Date(ticket.clusterBoostedUntil) > new Date())
    ? new Date(ticket.clusterBoostedUntil).toISOString() : null;
  const clusterLiveCountdown = useCountdown(clusterBoostedIso);
  const clusterBoostedStr    = clusterLiveCountdown || (ticket.clusterBoostedUntil ? ticket.clusterBoostedUntil : null);

  const isBoostActive = !!(localBoosted || (pt?.isBoosted && boostedUntilIso) || (ticket.clusterBoosted && clusterBoostedIso));
  const effectiveBoostedUntil = ticket.clusterId
    ? (clusterLiveCountdown || localClusterBoosted?.until || clusterBoostedStr)
    : boostedUntilStr;

  // Boost eligibility
  const canBoostPersonal = isPersonal && isOwner && !isResolved && !isRejected && !alreadyGT && !isBoostActive && localPizzaSlices >= 1;
  const canBoostCluster  = !isPersonal && ticket.isClusterParticipant && !isResolved && !isRejected && !isBoostActive && localPizzaSlices >= 1;
  const canBoost         = canBoostPersonal || canBoostCluster;

  // GT conversion eligibility — ALL ticket types, not just personal
  const canConvert = canConvertToGT && isOwner && !alreadyGT && !isResolved && !isRejected && userSpurtiPoints >= 1;

  // ── Boost handler ───────────────────────────────────────────────────────
  const handleBoost = async () => {
    if (!canBoost || isBoosting) return;
    setIsBoosting(true);
    try {
      let res;
      if (ticket.clusterId) {
        res = await axiosClient.post(`/boost/cluster/${ticket.clusterId}`);
      } else if (pt?._id) {
        res = await axiosClient.post(`/boost/ticket/${pt._id}`);
      } else {
        throw new Error('No boost target');
      }
      const newSlices = res.data.pizzaSlices ?? localPizzaSlices - 1;
      setLocalPizzaSlices(newSlices);
      if (ticket.clusterId) {
        setLocalClusterBoosted({ until: res.data.boostedUntil });
      } else {
        setLocalBoosted({ until: res.data.boostedUntil });
      }
      toast.success('Discussion boosted for 10 minutes!');
      if (onGTConverted) onGTConverted(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Boost failed');
    } finally {
      setIsBoosting(false);
    }
  };

  // ── GT conversion handler ───────────────────────────────────────────────
  const handleGTConvert = async () => {
    if (!canConvert || isBoosting) return;
    // Determine the reference ID: for personal tickets use personalTicket._id,
    // for general tickets use the clusterId, for orphaned PTs use pt._id
    const targetId = pt?._id || ticket.clusterId;
    if (!targetId) { toast.error('No convertible target found'); return; }
    setIsBoosting(true);
    try {
      const res = await axiosClient.post(`/boost/convert-to-golden/${targetId}`, {
        ticketType: ticket.clusterId ? 'cluster' : 'personal'
      });
      setLocalIsGT(true);
      toast.success('Converted to Golden Ticket!');
      if (onGTConverted) onGTConverted(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Conversion failed');
    } finally {
      setIsBoosting(false);
      setShowGTModal(false);
    }
  };

  const handleDelete = async () => {
    if (isOrphanedPT) { toast.error("This ticket can't be removed."); return; }
    setIsDeleting(true);
    try {
      await axiosClient.delete(`/tickets/${ticket.ticketNumber}`);
      setIsDeleteModalOpen(false);
      onDeleteSuccess(ticket.ticketNumber);
      toast.success(`Tracking removed for ${ticket.ticketNumber}`);
    } catch {
      toast.error('Failed to remove tracking record');
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDate = new Date(ticket.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  // Card border color: gold tint when GT active
  const cardBorderClass = alreadyGT
    ? 'border-amber-400/40 hover:border-amber-400/60'
    : 'border-white/5 hover:border-emerald-500/20';

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative group bg-white/[0.015] ${cardBorderClass} rounded-2xl p-5 md:p-6 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.05)] overflow-hidden ${alreadyGT ? 'bg-amber-500/[0.03]' : ''}`}
      >
        {/* Hover gradient */}
        <div className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${alreadyGT ? 'bg-gradient-to-br from-amber-500/5 to-transparent opacity-100' : 'bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100'}`} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">

          {/* ── Left: Ticket info ───────────────────────────────────────── */}
          <div className="space-y-1 w-full md:max-w-[65%]">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {ticket.ticketNumber ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-bricolage tracking-wide">
                  <Hash size={12} /> {ticket.ticketNumber}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold font-bricolage tracking-wide">
                  <HashIcon size={12} /> Personal Issue
                </span>
              )}
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Clock size={12} /> {formattedDate}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                isPersonal
                  ? 'bg-purple-500/10 border border-purple-500/20 text-purple-300'
                  : 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
              }`}>
                {isPersonal ? 'personal' : 'general'}
              </span>
              <PriorityBadge level={ticket.priorityLevel} score={ticket.severityScore} breakdown={ticket.severityBreakdown} />
            </div>
            <p className="text-slate-100 font-bold font-bricolage text-[0.95rem] md:text-base leading-snug break-words whitespace-normal">
              {ticket.question}
            </p>
            {(pt?.attachments?.length > 0 || ticket.attachments?.length > 0) && (
              <div className="mt-3">
                <AttachmentDisplay attachments={pt?.attachments || ticket.attachments} />
              </div>
            )}
          </div>

          {/* ── Right: Actions + status ─────────────────────────────────── */}
          <div className="flex flex-col items-end justify-start gap-2 w-full md:w-auto mt-4 md:mt-0">
            <div className="hidden md:block">
              <span className={`text-xs font-bold uppercase tracking-wider font-bricolage ${
                ticket.status === 'resolved' ? 'text-emerald-400'
                : ticket.status === 'rejected' ? 'text-red-400'
                : 'text-teal-400'
              }`}>
                {ticket.status.replace('_', ' ')}
              </span>
            </div>

            {/* Action row: View Question | Boost | Convert GT | Delete */}
            <div className="flex items-center gap-2 flex-wrap justify-end">

              {/* View Question */}
              {redirectId && (
                <button
                  onClick={() => {
                    if (redirectType === 'cluster') window.location.href = `/dashboard?tab=discussions&clusterId=${redirectId}`;
                    else if (redirectType === 'personal') window.location.href = `/track-status/${redirectId}`;
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 hover:border-sky-400/40 transition-all"
                >
                  <ExternalLink size={12} />
                  <span className="hidden sm:inline">View Question</span>
                  <span className="sm:hidden">View</span>
                </button>
              )}

              {/* 🚀 BOOST button — only shown when NOT actively boosted */}
              {!isBoostActive && !alreadyGT && (
                <button
                  onClick={handleBoost}
                  disabled={!canBoost || isBoosting}
                  title={localPizzaSlices < 1 ? 'You need 1 Pizza Slice to boost this discussion' : 'Boost this discussion for 10 minutes (costs 1 Pizza Slice)'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    canBoost
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 hover:border-amber-400/50 cursor-pointer'
                      : 'bg-slate-500/5 text-slate-500 border-slate-500/10 cursor-not-allowed opacity-50'
                  }`}
                >
                  {isBoosting ? (
                    <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  ) : (
                    <Zap size={12} />
                  )}
                  <span className="hidden sm:inline">
                    {canBoost ? 'Boost Discussion' : 'Need 1🍕 to Boost'}
                  </span>
                  <span className="sm:hidden">{canBoost ? 'Boost' : 'Need🍕'}</span>
                </button>
              )}

              {/* 🚀 Boosted active badge — only shown WHEN boosted */}
              {isBoostActive && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Zap size={12} />
                  <span>Boosted {effectiveBoostedUntil ? `· ${effectiveBoostedUntil}` : ''}</span>
                </span>
              )}

              {/* ⭐ CONVERT TO GT button — ALL ticket types when eligible */}
              {canConvert && !alreadyGT && (
                <button
                  onClick={handleGTConvert}
                  disabled={isBoosting}
                  title="Convert this ticket to a Golden Ticket"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:border-purple-400/50 transition-all disabled:opacity-50"
                >
                  <Star size={12} />
                  <span className="hidden sm:inline">Convert To Golden Ticket</span>
                  <span className="sm:hidden">To GT</span>
                </button>
              )}

              {/* ⭐ Golden Ticket Active state */}
              {alreadyGT && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-400/40 text-amber-300 shadow-sm">
                  <Star size={12} />
                  <span>Golden Ticket Active</span>
                </span>
              )}

              {/* Admin indicator */}
              {ticket.assignedTo && !alreadyGT && (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                  <Avatar user={{ email: ticket.assignedTo, role: 'admin' }} size={14} />
                  <span className="text-[10px] font-semibold text-emerald-400">{ticket.assignedTo.split('@')[0]}</span>
                </div>
              )}

              {/* Delete */}
              {!isOrphanedPT && !alreadyGT && (
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-1.5 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20"
                  title="Stop tracking this ticket"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status timeline */}
        <div className="mt-5 bg-black/20 rounded-xl p-3 border border-white/5">
          <TicketStatusMiniTimeline currentStatus={ticket.status} />
        </div>
      </motion.div>

      {!isOrphanedPT && (
        <DeleteTicketModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
          ticketNumber={ticket.ticketNumber}
        />
      )}
    </>
  );
}