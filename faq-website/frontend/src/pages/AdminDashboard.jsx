import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import { LogOut, CheckCircle, XCircle, Sparkles, Inbox, RefreshCw, Menu, X, Settings, Ticket, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import GoldenTicketIcon from '../components/GoldenTicketIcon';
import StatusBadge from '../components/StatusBadge';
import DeduplicationSection from '../components/DeduplicationSection';
import FAQPromotionModal from '../components/FAQPromotionModal';
import { FAQ_CATEGORIES } from '../utils/constants';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [editStates, setEditStates] = useState({});
  const [goldenQueue, setGoldenQueue] = useState([]);
  const [personalTickets, setPersonalTickets] = useState([]);
  
  const [resolvedAnswers, setResolvedAnswers] = useState({}); // ticketId -> string
  const [ticketQuirks, setTicketQuirks] = useState({}); // ticketId -> string
  const [submittingAction, setSubmittingAction] = useState(null);
  const [contributions, setContributions] = useState([]); // Phase 2F
  const [promotionModal, setPromotionModal] = useState({ isOpen: false, source: null, sourceItem: null });
  const [activeSection, setActiveSection] = useState('queue');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  
  const authFailedRef = useRef(false);

  useEffect(() => { 
    const fetchAll = async () => {
      if (authFailedRef.current) return;
      await Promise.all([
        fetchQueue(),
        fetchGoldenTickets(),
        fetchPersonalTickets(),
        fetchContributions(),
      ]);
    };
    
    fetchAll();
    
    const intervalId = setInterval(() => {
      if (!authFailedRef.current) {
        fetchAll();
      } else {
        clearInterval(intervalId);
      }
    }, 15000);
    
    return () => clearInterval(intervalId);
  }, []);

  const fetchContributions = async () => {
    try {
      const res = await axiosClient.get('/admin/contributions/pending');
      setContributions(res.data.contributions || []);
    } catch (_) { /* silent */ }
  };

  const handleAuthError = (err) => {
    if (authFailedRef.current) return;
    if (err.response?.status === 401 || err.response?.status === 403) {
      authFailedRef.current = true;
      toast.error('Session expired or unauthorized. Please log in again.');
      setTimeout(() => navigate('/login'), 1500);
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await axiosClient.get('/admin/review-queue');
      const clusters = res.data.clusters;
      setQueue(clusters);

      const initial = {};
      clusters.forEach(c => {
        const matchedCat = FAQ_CATEGORIES.find(cat => cat.toLowerCase() === (c.category || '').toLowerCase());
        initial[c._id] = {
          editedQuestion: c.canonicalQuestion || '',
          editedOriginalQuestion: c.originalQuestion || '',
          editedAnswer: c.aiGeneratedAnswer || '',
          categoryName: matchedCat || 'Other',
          customCategory: c.customCategory || '',
          tags: (c.tags || []).join(', ')
        };
      });
      setEditStates(initial);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) return handleAuthError(err);
      toast.error('Failed to load review queue');
    }
  };

  const fetchGoldenTickets = async () => {
    try {
      const res = await axiosClient.get('/golden-tickets/admin');
      setGoldenQueue(res.data.tickets);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) return handleAuthError(err);
      toast.error('Failed to load Golden Tickets');
    }
  };

  const fetchPersonalTickets = async () => {
    try {
      const res = await axiosClient.get('/admin/personal-tickets');
      setPersonalTickets(res.data.tickets.filter(t => t.status === 'pending'));
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) return handleAuthError(err);
      toast.error('Failed to load Personal Tickets');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const promoteFaq = async (clusterId) => {
    const edits = editStates[clusterId];
    if (!edits) return;

    if (!edits.editedQuestion.trim()) {
      return toast.error('Please enter a question/title');
    }
    if (!edits.editedAnswer.trim()) {
      return toast.error('Please enter an answer');
    }

    const isOtherSelected = edits.categoryName === 'Other';

    const payload = {
      clusterId,
      categoryName: edits.categoryName,
      editedQuestion: edits.editedQuestion.trim(),
      editedOriginalQuestion: edits.editedOriginalQuestion.trim(),
      editedAnswer: edits.editedAnswer.trim(),
      tags: edits.tags.split(',').map(t => t.trim()).filter(Boolean),
      customCategory: isOtherSelected ? edits.customCategory.trim() : null
    };

    setSubmittingAction(clusterId);
    try {
      await axiosClient.post('/admin/promote-faq', payload);
      toast.success('FAQ successfully promoted!');
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to promote');
    } finally {
      setSubmittingAction(null);
    }
  };

  const rejectCluster = async (clusterId) => {
    if (!window.confirm("Are you sure you want to reject this cluster? This action is permanent.")) return;
    setSubmittingAction(`reject-${clusterId}`);
    try {
      await axiosClient.post('/admin/reject-faq', { clusterId });
      toast.success('Cluster rejected');
      fetchQueue();
    } catch {
      toast.error('Failed to reject');
    } finally {
      setSubmittingAction(null);
    }
  };

  const resolveGoldenTicket = async (ticketId) => {
    if (!window.confirm("Resolve this Golden Ticket and reward the user with SP?")) return;
    setSubmittingAction(ticketId);
    try {
      await axiosClient.post(`/golden-tickets/admin/${ticketId}/resolve`);
      toast.success('Golden Ticket resolved! SP rewarded.');
      fetchGoldenTickets();
    } catch {
      toast.error('Failed to resolve ticket');
    } finally {
      setSubmittingAction(null);
    }
  };

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

  const openPromotionModal = (source, sourceItem) => {
    setPromotionModal({ isOpen: true, source, sourceItem });
  };

  const handlePromoted = () => {
    fetchQueue();
    fetchGoldenTickets();
    fetchContributions();
  };

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

  const handleEditChange = (clusterId, field, value) => {
    setEditStates(prev => ({
      ...prev,
      [clusterId]: {
        ...prev[clusterId],
        [field]: value
      }
    }));
  };

  const adminNav = (close = () => {}) => (
    <nav className="space-y-1.5">
      <button onClick={() => { setActiveSection('queue'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'queue' ? 'active' : ''}`}><Inbox size={16} /> Review Queue</button>
      <button onClick={() => { setActiveSection('golden'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'golden' ? 'active' : ''}`}><Sparkles size={16} /> Golden Tickets</button>
      <button onClick={() => { setActiveSection('personal'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'personal' ? 'active' : ''}`}><Ticket size={16} /> Personal Tickets</button>
      <button onClick={() => { setActiveSection('contributions'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'contributions' ? 'active' : ''}`}><CheckCircle size={16} /> Contributions</button>
      <div className="pt-3 space-y-2 border-t border-white/5 mt-3">
        <button onClick={() => { setActiveSection('settings'); close(); }} className={`sidebar-button sidebar-button-normal w-full ${activeSection === 'settings' ? 'active' : ''}`}><Settings size={16} /> Settings</button>
        <button onClick={() => { navigate('/dashboard'); close(); }} className="sidebar-button sidebar-button-normal w-full"><BarChart2 size={16} /> User View</button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-mesh font-inter text-slate-300 overflow-hidden">

      {/* ── Sidebar ── */}
      {sidebarVisible && (
        <aside className="w-[260px] h-screen flex flex-col glass-strong border-r border-white/5 z-30 flex-shrink-0">
          <div className="flex items-center justify-between px-5 py-6 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-slate-100 text-xs font-black font-bricolage">A</span>
              </div>
              <span className="font-bold font-bricolage text-lg text-slate-100">Admin</span>
            </div>
            <button onClick={() => setSidebarVisible(false)} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-5">{adminNav()}</div>
          <div className="px-4 py-4 border-t border-white/5">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-slate-100 hover:bg-white/5 text-sm font-semibold transition-colors font-bricolage cursor-pointer"><LogOut size={16} /> Logout</button>
          </div>
        </aside>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 glass-strong px-8 py-5 border-b border-white/5 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            {!sidebarVisible && (
              <button onClick={() => setSidebarVisible(true)} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"><Menu size={20} /></button>
            )}
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md">
              <span className="text-slate-100 text-xs font-black font-bricolage">A</span>
            </div>
            <h1 className="text-xl font-bold font-bricolage tracking-tight text-slate-100">Admin Console</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {sidebarVisible && (
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 font-bricolage cursor-pointer">
                <LogOut size={17} /> Logout
              </button>
            )}
          </div>
        </header>

      <main className="p-8 md:p-12 max-w-5xl mx-auto relative z-10 space-y-16">
        
        {/* Discussion Review Queue */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold font-bricolage tracking-tight text-slate-100">Review Queue (General Queries)</h2>
            <StatusBadge variant="purple">
              {queue.length} Pending
            </StatusBadge>
          </div>

          {queue.length === 0 ? (
            <div className="glass-strong rounded-3xl p-16 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 font-semibold border border-slate-200 dark:border-white/5 shadow-sm bg-white dark:bg-transparent">
              <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-full mb-4">
                <CheckCircle size={32} className="text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-lg text-slate-800 dark:text-slate-300">No discussions pending review — all caught up!</p>
              <p className="text-xs font-normal mt-2 flex items-center gap-1"><RefreshCw size={12} className="animate-spin-slow" /> Auto-refreshing...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {queue.map(cluster => {
                const edits = editStates[cluster._id] || {};
                return (
                  <motion.div
                    key={cluster._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-strong rounded-3xl overflow-hidden border border-white/5 shadow-2xl"
                  >
                    {/* Top section */}
                    <div className="px-9 py-8 border-b border-white/5 bg-white/[0.005]">
                      <div className="flex justify-between items-start gap-6 mb-6">
                        <div className="flex-1 space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-1.5 font-bricolage">Generalized Title / Question</label>
                            <input
                              type="text"
                              value={edits.editedQuestion || ''}
                              onChange={e => handleEditChange(cluster._id, 'editedQuestion', e.target.value)}
                              placeholder="Normalize and edit the question..."
                              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-slate-100 focus:outline-none focus:border-purple-400/50 transition-all font-inter"
                            />
                          </div>
                        </div>
                        <StatusBadge variant="purple" className="self-start mt-6">
                          {cluster.submissionsCount === 0
                            ? 'No merges yet'
                            : `${cluster.submissionsCount} merged`}
                        </StatusBadge>
                      </div>

                      {cluster.originalQuestion && (
                        <div className="mt-4">
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-1.5 font-bricolage">Original Student Ticket (Editable)</label>
                          <input
                            type="text"
                            value={edits.editedOriginalQuestion || ''}
                            onChange={e => handleEditChange(cluster._id, 'editedOriginalQuestion', e.target.value)}
                            placeholder="Edit the original question..."
                            className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-slate-300 focus:outline-none focus:border-purple-400/50 transition-all font-inter italic"
                          />
                        </div>
                      )}
                    </div>

                    {/* AI answer section */}
                    <div className="px-9 py-8 space-y-6">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-2 font-bricolage">Answer Description</label>
                        <textarea
                          rows={4}
                          value={edits.editedAnswer || ''}
                          onChange={e => handleEditChange(cluster._id, 'editedAnswer', e.target.value)}
                          placeholder="Refine the public answer..."
                          className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-slate-100 focus:outline-none focus:border-purple-400/50 transition-all resize-none font-inter"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-2 font-bricolage">Category</label>
                          <select
                            value={edits.categoryName || ''}
                            onChange={e => handleEditChange(cluster._id, 'categoryName', e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-slate-200 focus:outline-none focus:border-purple-400/50 transition-all font-inter"
                          >
                            {FAQ_CATEGORIES.map(cat => (
                              <option key={cat} value={cat} className="bg-slate-950 text-slate-200">
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        {edits.categoryName === 'Other' && (
                          <div className="animate-in fade-in duration-200">
                            <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-2 font-bricolage">Rename Custom Category</label>
                            <input
                              type="text"
                              value={edits.customCategory || ''}
                              onChange={e => handleEditChange(cluster._id, 'customCategory', e.target.value)}
                              placeholder="e.g. Yaksha Chat, Offer Letter"
                              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-slate-100 focus:outline-none focus:border-purple-400/50 transition-all font-inter"
                            />
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-2 font-bricolage">Tags (Comma-separated)</label>
                        <input
                          type="text"
                          value={edits.tags || ''}
                          onChange={e => handleEditChange(cluster._id, 'tags', e.target.value)}
                          placeholder="e.g. certificates, dates, noc"
                          className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-slate-100 focus:outline-none focus:border-purple-400/50 transition-all font-inter"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 font-bricolage pt-4 border-t border-white/5">
                        <button
                          onClick={() => openPromotionModal('oaq', cluster)}
                          disabled={submittingAction === cluster._id}
                          className="flex-1 badge-green py-4 rounded-2xl font-bold hover:bg-green-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-green-900 dark:text-green-300 bg-green-100 dark:bg-green-900/30"
                        >
                          {submittingAction === cluster._id ? <span className="animate-spin text-lg">⏳</span> : <CheckCircle size={18} />}
                          Promote to FAQ
                        </button>
                        <button
                          onClick={() => rejectCluster(cluster._id)}
                          disabled={submittingAction === `reject-${cluster._id}`}
                          className="flex-1 badge-red py-4 rounded-2xl font-bold hover:bg-red-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-red-900 dark:text-red-300 bg-red-100 dark:bg-red-900/30"
                        >
                          {submittingAction === `reject-${cluster._id}` ? <span className="animate-spin text-lg">⏳</span> : <XCircle size={18} />}
                          Reject
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Deduplication Section ─────────────────────────────────────────── */}
        <DeduplicationSection />

        {/* Personal Tickets Section */}
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

        {/* Golden Tickets Section */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-2xl font-bold font-bricolage tracking-tight flex items-center gap-2 ${'text-yellow-400'}`}>
              <GoldenTicketIcon size={24} className={'text-yellow-400'} /> Golden Ticket Escalations
            </h2>
            <StatusBadge variant="yellow">
              {goldenQueue.length} Active
            </StatusBadge>
          </div>

          {goldenQueue.length === 0 ? (
            <div className={`glass-strong rounded-3xl p-16 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 font-semibold shadow-sm bg-white dark:bg-transparent border ${'border-yellow-500/10'}`}>
              <div className={`p-4 rounded-full mb-4 ${'bg-yellow-50 dark:bg-yellow-500/10'}`}>
                <GoldenTicketIcon size={32} className={`opacity-50 ${'text-yellow-400 dark:text-yellow-500'}`} />
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
                  className={`glass-strong rounded-3xl overflow-hidden shadow-2xl border ${'border-yellow-500/20'}`}
                >
                  <div className={`px-9 py-8 border-b border-white/5 ${'bg-yellow-500/[0.005]'}`}>
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
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-lg transition-all border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${'bg-gradient-to-r from-yellow-500 to-amber-400 dark:from-yellow-600 dark:to-amber-500 hover:from-yellow-400 hover:to-amber-300 text-black shadow-yellow-500/20 border-yellow-400/30'}`}
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

        {/* ─── FAQ Contributions (Phase 2F) ─────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold font-bricolage tracking-tight text-blue-400 flex items-center gap-2">
              <span>📬</span> FAQ Contributions
            </h2>
            <StatusBadge variant="blue">
              {contributions.length} Pending
            </StatusBadge>
          </div>

          {contributions.length === 0 ? (
            <div className="glass-strong rounded-3xl p-16 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 font-semibold border border-blue-500/10 shadow-sm bg-white dark:bg-transparent">
              <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-full mb-4">
                <span className="text-3xl">📪</span>
              </div>
              <p className="text-lg text-slate-800 dark:text-slate-300">No pending contributions.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {contributions.map(contrib => (
                <motion.div
                  key={contrib._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-strong rounded-3xl overflow-hidden border border-blue-500/20 shadow-xl"
                >
                  <div className="px-9 py-7 bg-blue-500/[0.03] border-b border-white/5">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex-1">
                        <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1 font-bricolage">
                          {contrib.sourceType || 'community'}
                        </div>
                        <h3 className="font-bold font-bricolage text-xl text-slate-100 leading-snug">
                          {contrib.generatedQuestion || contrib.originalQuestion}
                        </h3>
                      </div>
                      <StatusBadge variant="blue">
                        {contrib.category || 'Uncategorized'}
                      </StatusBadge>
                    </div>
                    {contrib.generatedQuestion && (
                      <p className="text-sm text-slate-500 italic">
                        Original: {contrib.originalQuestion}
                      </p>
                    )}
                  </div>

                  {contrib.generatedAnswer && (
                    <div className="px-9 py-6 border-b border-white/5">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-bricolage">AI-Generated Answer</div>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{contrib.generatedAnswer}</p>
                    </div>
                  )}

                  {contrib.hashtags?.length > 0 && (
                    <div className="px-9 py-4 flex flex-wrap gap-2 border-b border-white/5">
                      {contrib.hashtags.map(tag => (
                        <span key={tag} className="text-xs font-bold bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="px-9 py-6 flex items-center justify-between gap-4 bg-black/20">
                    <p className="text-xs text-slate-500 font-bricolage">
                      Contributed{contrib.contributedBy?.email ? ` by ${contrib.contributedBy.email}` : ''}
                      {contrib.createdAt && ` on ${new Date(contrib.createdAt).toLocaleDateString()}`}
                    </p>
                    <button
                      onClick={() => openPromotionModal('contribution', contrib)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 transition-all font-bricolage cursor-pointer"
                    >
                      <CheckCircle size={16} />
                      Promote to FAQ
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </main>
      </div>

      <FAQPromotionModal
        isOpen={promotionModal.isOpen}
        onClose={() => setPromotionModal({ isOpen: false, source: null, sourceItem: null })}
        source={promotionModal.source}
        sourceItem={promotionModal.sourceItem}
        onPromoted={handlePromoted}
      />
    </div>
  );
}