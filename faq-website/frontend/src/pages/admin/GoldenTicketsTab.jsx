import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import StatusBadge from '../../components/StatusBadge';
import GoldenTicketIcon from '../../components/GoldenTicketIcon';

export default function GoldenTicketsTab({ openPromotionModal }) {
  const [goldenQueue, setGoldenQueue] = useState([]);
  const [submittingAction, setSubmittingAction] = useState(null);

  const fetchGoldenTickets = async () => {
    try {
      const res = await axiosClient.get('/golden-tickets/admin');
      setGoldenQueue(res.data.tickets);
    } catch (err) {
      toast.error('Failed to load Golden Tickets');
    }
  };

  useEffect(() => {
    fetchGoldenTickets();
    const intervalId = setInterval(fetchGoldenTickets, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const rejectGoldenTicket = async (ticketId) => {
    if (!window.confirm("Reject this Golden Ticket? The user will be BANNED for 72 hours. This is a destructive action.")) return;
    setSubmittingAction(`reject-${ticketId}`);
    try {
      await axiosClient.post(`/golden-tickets/admin/${ticketId}/reject`);
      toast.success('Golden Ticket rejected. User banned.');
      fetchGoldenTickets();
    } catch {
      toast.error('Failed to reject ticket');
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold font-bricolage tracking-tight flex items-center gap-2 text-yellow-400">
          <GoldenTicketIcon size={24} className="text-yellow-400" /> Golden Ticket Escalations
        </h2>
        <StatusBadge variant="yellow">
          {goldenQueue.length} Active
        </StatusBadge>
      </div>

      {goldenQueue.length === 0 ? (
        <div className="glass-strong rounded-3xl p-16 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 font-semibold shadow-sm bg-white dark:bg-transparent border border-yellow-500/10">
          <div className="p-4 rounded-full mb-4 bg-yellow-50 dark:bg-yellow-500/10">
            <GoldenTicketIcon size={32} className="opacity-50 text-yellow-400 dark:text-yellow-500" />
          </div>
          <p className="text-lg text-slate-800 dark:text-slate-300">No active Golden Tickets.</p>
          <p className="text-xs font-normal mt-2 flex items-center gap-1"><RefreshCw size={12} className="animate-spin-slow" /> Auto-refreshing...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {goldenQueue.map(ticket => (
            <motion.div
              key={ticket._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-3xl overflow-hidden shadow-2xl border border-yellow-500/20"
            >
              <div className="px-9 py-8 border-b border-white/5 bg-yellow-500/[0.005]">
                <div className="flex justify-between items-start gap-6 mb-4">
                  <h3 className="font-bold font-bricolage text-2xl leading-snug text-slate-900 dark:text-slate-100 flex-1">
                    {ticket.title}
                  </h3>
                  <StatusBadge variant="yellow">
                    🔥 {ticket.spurtiSpent} SP Weight
                  </StatusBadge>
                </div>
                
                <div className="text-slate-300 bg-white/[0.005] p-6 rounded-2xl border border-white/5 font-medium leading-relaxed whitespace-pre-wrap">
                  {ticket.context}
                </div>
                
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-400 font-semibold">
                  <span className="text-slate-700 dark:text-slate-400">Escalated by:</span>
                  <span className="text-slate-900 dark:text-slate-300">{ticket.createdBy?.email}</span>
                  <span className="text-slate-400 px-2">•</span>
                  <span className="text-slate-700 dark:text-slate-400">Reputation:</span>
                  <span className="font-bold text-slate-300">{ticket.createdBy?.reputation}</span>
                </div>
              </div>

              <div className="px-9 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 font-bricolage bg-black/20">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-400">
                  Golden Tickets are strictly admin-only.
                </p>
                <div className="flex items-center gap-4">
                  <button onClick={() => rejectGoldenTicket(ticket._id)}
                    disabled={submittingAction === `reject-${ticket._id}`}
                    className="group flex items-center gap-2 px-6 py-3 rounded-xl text-red-900 dark:text-red-400 bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-950/20 font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingAction === `reject-${ticket._id}` ? <span className="animate-spin text-lg">⏳</span> : <XCircle size={18} className="group-hover:scale-105 transition-transform" />}
                    Reject & Ban User
                  </button>
                  <button
                    onClick={() => openPromotionModal('golden-ticket', ticket)}
                    disabled={submittingAction === ticket._id}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-lg transition-all border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-yellow-500 to-amber-400 dark:from-yellow-600 dark:to-amber-500 hover:from-yellow-400 hover:to-amber-300 text-black shadow-yellow-500/20 border-yellow-400/30"
                  >
                    {submittingAction === ticket._id ? <span className="animate-spin text-lg">⏳</span> : <CheckCircle size={18} />}
                    Promote to FAQ
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
