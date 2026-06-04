import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';
import { CheckCircle, Inbox, RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import StatusBadge from '../../components/StatusBadge';

export default function PersonalTicketsTab() {
  const [personalTickets, setPersonalTickets] = useState([]);
  const [resolvedAnswers, setResolvedAnswers] = useState({});
  const [ticketQuirks, setTicketQuirks] = useState({});
  const [submittingAction, setSubmittingAction] = useState(null);

  const fetchPersonalTickets = async () => {
    try {
      const res = await axiosClient.get('/admin/personal-tickets');
      setPersonalTickets(res.data.tickets.filter(t => t.status === 'pending'));
    } catch (err) {
      toast.error('Failed to load Personal Tickets');
    }
  };

  useEffect(() => {
    fetchPersonalTickets();
    const intervalId = setInterval(fetchPersonalTickets, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const handleResolvePersonal = async (ticketId) => {
    const resolvedAnswer = resolvedAnswers[ticketId];
    const quirks = ticketQuirks[ticketId];
    if (!resolvedAnswer || resolvedAnswer.trim().split(' ').length < 5) {
      return toast.error('Please enter a resolution answer of at least 5 words.');
    }

    setSubmittingAction(ticketId);
    try {
      await axiosClient.post('/admin/personal-tickets/resolve', {
        ticketId,
        resolvedAnswer,
        quirks
      });
      toast.success('Personal ticket resolved and stored in solved intent memory!');
      fetchPersonalTickets();
    } catch {
      toast.error('Failed to resolve personal ticket');
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold font-bricolage tracking-tight text-purple-400 flex items-center gap-2">
          <Sparkles className="text-purple-400" size={24} /> Personal Issue Escalations
        </h2>
        <StatusBadge variant="purple">
          {personalTickets.length} Pending
        </StatusBadge>
      </div>

      {personalTickets.length === 0 ? (
        <div className="glass-strong rounded-3xl p-16 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 font-semibold border border-purple-500/10 shadow-sm bg-white dark:bg-transparent">
          <div className="bg-purple-50 dark:bg-purple-500/10 p-4 rounded-full mb-4">
            <Inbox size={32} className="text-purple-400 dark:text-purple-500" />
          </div>
          <p className="text-lg text-slate-800 dark:text-slate-300">No personal issues pending review.</p>
          <p className="text-xs font-normal mt-2 flex items-center gap-1"><RefreshCw size={12} className="animate-spin-slow" /> Auto-refreshing...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {personalTickets.map(ticket => (
            <motion.div
              key={ticket._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-3xl overflow-hidden border border-purple-500/20 shadow-2xl"
            >
              <div className="px-9 py-8 border-b border-white/5 bg-purple-500/[0.005]">
                <div className="flex justify-between items-start gap-6 mb-4">
                  <div>
                    <StatusBadge variant="purple" className="uppercase tracking-wider">
                      {ticket.category || 'General'}
                    </StatusBadge>
                    <h3 className="font-bold font-bricolage text-2xl leading-snug text-slate-100 mt-3">
                      {ticket.question}
                    </h3>
                  </div>
                  <div className="bg-white/5 border border-white/5 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl shadow-sm font-bricolage">
                    🏫 {ticket.institution}
                  </div>
                </div>

                <div className="text-slate-300 bg-white/[0.005] p-6 rounded-2xl border border-white/5 font-medium leading-relaxed whitespace-pre-wrap">
                  {ticket.context}
                </div>

                {ticket.normalizedIntent && (
                  <div className="mt-4 p-3.5 bg-purple-500/[0.02] rounded-xl border border-purple-500/10 text-xs font-semibold text-purple-400 italic">
                    ✦ AI Intent Extraction: "{ticket.normalizedIntent}"
                  </div>
                )}

                <div className="mt-4 text-xs text-slate-700 dark:text-slate-400 font-medium">
                  Raised by: <span className="text-slate-600 dark:text-slate-400">{ticket.userId?.email || 'Anonymous'}</span>
                </div>
              </div>

              <div className="px-9 py-8 space-y-6 bg-white/[0.005]">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-2 font-bricolage">Verified Resolution Answer</label>
                  <textarea
                    rows={3}
                    placeholder="Provide a verified answer to resolve this issue and add to semantic memory..."
                    value={resolvedAnswers[ticket._id] || ''}
                    onChange={e => setResolvedAnswers({ ...resolvedAnswers, [ticket._id]: e.target.value })}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/50 transition-all resize-none shadow-sm text-slate-100 placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-2 font-bricolage">Institution-Specific Quirks (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Needs sign-off from both HOD and Dean of Academic Affairs"
                    value={ticketQuirks[ticket._id] || ''}
                    onChange={e => setTicketQuirks({ ...ticketQuirks, [ticket._id]: e.target.value })}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/50 transition-all shadow-sm text-slate-100 placeholder-slate-600"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-white/5">
                  <button
                    onClick={() => handleResolvePersonal(ticket._id)}
                    disabled={submittingAction === ticket._id}
                    className="badge-purple hover:bg-purple-950/20 text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 font-bold py-3.5 px-8 rounded-xl shadow-md transition-all text-sm flex items-center gap-2 font-bricolage cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingAction === ticket._id ? <span className="animate-spin text-lg">⏳</span> : <CheckCircle size={18} />}
                    Resolve & Save to Intent Memory
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
