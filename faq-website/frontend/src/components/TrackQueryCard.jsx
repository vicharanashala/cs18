import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Hash, Clock, ExternalLink, Star } from 'lucide-react';
import TicketStatusMiniTimeline from './TicketStatusMiniTimeline';
import DeleteTicketModal from './DeleteTicketModal';
import BoostButton from './BoostButton';
import ConvertToGTModal from './ConvertToGTModal';
import Avatar from './Avatar';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

export default function TrackQueryCard({
  ticket,
  redirectId,
  redirectType,
  onDeleteSuccess,
  // Eligibility flags from parent (RaiseTicket page context)
  canConvertToGT  = false,
  userPizzaSlices = 0,
  onGTConverted,
}) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const pt = ticket.personalTicket; // enriched personalTicket data from backend
  const isPersonal    = ticket.type === 'personal';
  const alreadyGT     = pt?.isConvertedToGT;
  const isResolved    = ticket.status === 'resolved';
  const isRejected    = ticket.status === 'rejected';
  const canConvert    = canConvertToGT && isPersonal && !alreadyGT && !isResolved && !isRejected;
  const canBoost      = isPersonal && !isResolved && !isRejected && !pt?.isBoosted;
  const isBoostActive = !!pt?.isBoosted;

  const handleViewQuestion = () => {
    if (!redirectId) return;
    if (redirectType === 'cluster') {
      window.location.href = `/dashboard?tab=discussions&clusterId=${redirectId}`;
    } else if (redirectType === 'personal') {
      window.location.href = `/track-status/${redirectId}`;
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await axiosClient.delete(`/tickets/${ticket.ticketNumber}`);
      setIsDeleteModalOpen(false);
      onDeleteSuccess(ticket.ticketNumber);
      toast.success(`Tracking removed for ticket ${ticket.ticketNumber}`);
    } catch (err) {
      toast.error('Failed to delete tracking record');
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDate = new Date(ticket.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <>
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative group bg-white/[0.015] border border-white/5 hover:border-emerald-500/20 rounded-2xl p-5 md:p-6 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.05)] overflow-hidden"
      >
        {/* Subtle hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1 w-full md:max-w-[70%]">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-bricolage tracking-wide">
                <Hash size={12} /> {ticket.ticketNumber}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Clock size={12} /> {formattedDate}
              </span>
            </div>
            <p className="text-slate-100 font-bold font-bricolage text-[0.95rem] md:text-base leading-snug break-words whitespace-normal">
              {ticket.question}
            </p>
            <div className="flex items-center gap-4 mt-3 pt-2 border-t border-white/5 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 capitalize">Type: <span className="text-slate-300">{ticket.type}</span></span>
              {redirectId && (
                <button
                  onClick={handleViewQuestion}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 hover:border-sky-400/40 transition-all"
                >
                  <ExternalLink size={12} />
                  View Question
                </button>
              )}
              {ticket.assignedTo && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-500/80">Admin:</span>
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                    <Avatar user={{ email: ticket.assignedTo, role: 'admin' }} size={16} />
                    <span className="text-xs font-semibold text-emerald-400">{ticket.assignedTo.split('@')[0]}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end justify-between md:items-end gap-2 w-full md:w-auto mt-4 md:mt-0">

            {/* Status badge */}
            <div className="hidden md:block text-right">
              <span className={`text-xs font-bold uppercase tracking-wider font-bricolage ${ticket.status === 'resolved' ? 'text-emerald-400' : 'text-teal-400'}`}>
                {ticket.status.replace('_', ' ')}
              </span>
            </div>

            {/* Boost button — always rendered for personal tickets */}
            {isPersonal && (
              <div className="relative">
                <BoostButton
                  ticketId={pt?._id}
                  isBoosted={isBoostActive}
                  boostedUntil={pt?.boostedUntil}
                  canBoost={canBoost}
                  pizzaSlices={userPizzaSlices}
                  onBoosted={() => {}}
                  size="sm"
                />
              </div>
            )}

            {/* Convert to GT button */}
            {canConvert && (
              <button
                onClick={() => setShowConvertModal(true)}
                className="flex items-center gap-1.5 text-[10px] font-bold font-bricolage px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/40 transition-all"
                title="Convert this ticket to a Golden Ticket"
              >
                <Star size={10} />
                <span className="hidden sm:inline">Convert to GT</span>
                <span className="sm:hidden">GT</span>
              </button>
            )}

            {alreadyGT && (
              <span className="flex items-center gap-1 text-[10px] font-bold font-bricolage px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                <Star size={10} /> ⭐ GT
              </span>
            )}

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20"
              title="Delete tracking record"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="mt-6 bg-black/20 rounded-xl p-3 border border-white/5">
          <TicketStatusMiniTimeline currentStatus={ticket.status} />
        </div>
      </motion.div>

      <DeleteTicketModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        ticketNumber={ticket.ticketNumber}
      />
      <ConvertToGTModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        ticket={ticket}
        onSuccess={onGTConverted}
      />
    </>
  );
}
