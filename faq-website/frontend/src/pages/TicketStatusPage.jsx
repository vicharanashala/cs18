import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import {
  MessageSquare, Wallet, LogOut, X,
  Menu, Sparkles, CheckSquare, Search, Zap
, Book } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GoldenTicketIcon from '../components/GoldenTicketIcon';
import BannedUserBanner from '../components/BannedUserBanner';
import ThemeToggle from '../components/ThemeToggle';
import StatusTimeline from '../components/StatusTimeline';
import AppealCard from '../components/AppealCard';
import { useBannedTheme } from '../hooks/useBannedTheme';
import StaffToolsNav from '../components/StaffToolsNav';

// Extracted NavItem from existing layout conventions
const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300
      ${active
        ? 'bg-gradient-to-r from-pink-500/10 to-orange-500/5 text-pink-300 font-bold border border-pink-500/20 shadow-[0_2px_10px_rgba(236,72,153,0.05)]'
        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 font-semibold border border-transparent'
      } font-bricolage text-[15px]`}
  >
    <div className="flex items-center gap-3">
      <Icon size={18} strokeWidth={active ? 2.5 : 2} className={active ? 'text-pink-400' : 'text-slate-500'} />
      {label}
    </div>
  </button>
);

export default function TicketStatusPage() {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useBannedTheme(user);
  const [user, setUser] = useState(null);
  
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
    fetchTicket();
  }, [ticketId]);

  const fetchUser = async () => {
    try {
      const r = await axiosClient.get('/auth/me');
      setUser(r.data.user);
    } catch {
      // Handle error implicitly
    }
  };

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/personal-issues/${ticketId}`);
      setTicket(res.data.ticket);
    } catch (err) {
      toast.error('Failed to load ticket status.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const navSection = (close = () => {}) => (
    <nav className="space-y-1.5">
      <NavItem icon={Book} label="FAQ" active={false} onClick={() => { navigate('/faqs'); close(); }} />
      <NavItem icon={MessageSquare} label="Once Asked Questions" active={false} onClick={() => { navigate('/discussions'); close(); }} />
      <NavItem icon={Wallet} label="Wallet" active={false} onClick={() => { navigate('/wallet'); close(); }} />
      <div className="pt-3 space-y-2 border-t border-white/5 mt-3">
        <button onClick={() => { navigate('/raise-ticket'); close(); }} className="sidebar-button sidebar-button-normal">
          <Search size={18} strokeWidth={2.5} className="flex-shrink-0" /> Raise a Ticket
        </button>
        <button onClick={() => { navigate('/contribute-faq'); close(); }} className="sidebar-button sidebar-button-normal">
          <Sparkles size={18} strokeWidth={2.5} className="flex-shrink-0" /> Contribute FAQ
        </button>
        <button onClick={() => { navigate('/golden-ticket'); close(); }} className="sidebar-button sidebar-button-golden group">
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"></div>
          <GoldenTicketIcon size={18} className="flex-shrink-0 drop-shadow-md" />
          <span className="drop-shadow-md tracking-wide">Golden Ticket</span>
        </button>
      </div>
      <StaffToolsNav close={close} />
    </nav>
  );

  const handleStatusChange = (newStatus) => {
    setTicket(prev => ({ ...prev, status: newStatus }));
  };

  return (
    <div data-banned={user?.isBanned ? "true" : "false"} className="flex h-screen bg-[#f4faf7] dark:bg-[#0b1814] overflow-hidden font-inter text-slate-800 dark:text-slate-300 relative transition-colors duration-500">
      {user?.isBanned && <BannedUserBanner />}
      {/* Premium subtle green gradient overlays */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-400/10 dark:bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-teal-300/10 dark:bg-teal-800/10 rounded-full blur-[140px] pointer-events-none" />

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 h-16 glass-strong border-b border-white/5">
        <span className="font-bold font-bricolage text-lg text-slate-100">FAQ Hive</span>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-xl text-slate-300 hover:bg-white/5 transition-colors">
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="w-72 h-full glass-strong flex flex-col p-6 sidebar-shadow"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <span className="font-bold font-bricolage text-xl text-slate-100">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-xl hover:bg-white/5 transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
              {navSection(() => setIsMobileMenuOpen(false))}
              <div className="mt-auto pt-6 border-t border-white/5">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-slate-100 hover:bg-white/5 text-sm font-semibold transition-colors font-bricolage">
                  <LogOut size={18} /> Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-72 flex-col justify-between py-8 px-5 glass-strong sidebar-shadow z-20">
        <div>
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Book size={16} className="text-slate-300" strokeWidth={2} />
            </div>
            <span className="font-bold font-bricolage text-lg text-slate-100">FAQ Hive</span>
            </div>
            <ThemeToggle />
          </div>
          {navSection()}
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col h-[calc(100vh-4rem)] md:h-screen pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto px-5 py-8 md:p-10 lg:p-14">
          <div className="max-w-3xl mx-auto w-full relative z-10">
            <h1 className="font-bold font-bricolage text-3xl md:text-4xl text-emerald-950 dark:text-slate-100 mb-8 tracking-tight">
              Track Status
            </h1>

            {loading ? (
              <div className="flex justify-center items-center py-24">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${user?.isBanned ? 'border-red-500' : 'border-pink-500'}`}></div>
              </div>
            ) : ticket ? (
              <div className="space-y-6">
                
                {/* Top Success/Info Card */}
                <div className="glass-card bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] backdrop-blur-xl">
                  <div>
                    <h2 className="font-bold font-bricolage text-emerald-800 dark:text-emerald-400 text-lg md:text-xl flex items-center gap-2 tracking-tight">
                      Ticket Submitted! 🎉
                    </h2>
                    <p className="text-emerald-700/80 dark:text-emerald-200/60 text-sm mt-1.5 font-medium">
                      Your ticket ID: <span className="font-bold text-emerald-900 dark:text-emerald-100 bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded-md">{ticket.ticketNumber || ticket._id.slice(-6).toUpperCase()}</span> &middot; Auto-email sent to your registered email
                    </p>
                    <div className="mt-4">
                      <button onClick={() => navigate('/raise-ticket')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl transition-colors font-bricolage text-sm shadow-md">
                        Done
                      </button>
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 dark:shadow-emerald-900/40 border border-emerald-300/20">
                    <CheckSquare size={28} className="text-white drop-shadow-sm" />
                  </div>
                </div>

                {/* Middle Timeline Component */}
                <StatusTimeline currentStatus={ticket.status} />

                {/* Bottom Appeal Card */}
                <AppealCard 
                  ticketId={ticket._id} 
                  currentStatus={ticket.status} 
                  onStatusChange={handleStatusChange} 
                />

                {/* Context Overview */}
                <div className="glass-card rounded-3xl p-6 md:p-8 border border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-black/10 backdrop-blur-xl shadow-sm mt-8">
                  <h3 className="font-bold font-bricolage text-slate-800 dark:text-slate-200 mb-5 text-lg">Ticket Details</h3>
                  
                  {ticket.trackerInfo && ticket.trackerInfo.autoRouted && (
                    <div className="mb-6 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={16} className="text-blue-500" />
                        <span className="font-bold font-bricolage text-sm text-blue-500">Auto-Routed</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm mt-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Routing Reason</p>
                          <p className="font-medium text-slate-800 dark:text-slate-300">{ticket.trackerInfo.routingReason || 'High Severity Score'}</p>
                        </div>
                        {ticket.trackerInfo.assignedMentor && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Assigned SME</p>
                            <p className="font-medium text-slate-800 dark:text-slate-300">{ticket.trackerInfo.assignedMentor.fullName || ticket.trackerInfo.assignedMentor.username}</p>
                          </div>
                        )}
                        <div>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Severity Score</p>
                           <p className="font-medium text-slate-800 dark:text-slate-300">{ticket.severityScore}/100</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Status</p>
                          <p className="font-medium text-slate-800 dark:text-slate-300 capitalize">{ticket.status.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bricolage mb-1.5">Question</p>
                      <p className="text-slate-800 dark:text-slate-300 text-[15px] leading-relaxed font-medium">{ticket.question}</p>
                    </div>
                    {ticket.context && (
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bricolage mb-1.5">Context Provided</p>
                        <div className="p-4 rounded-2xl bg-white/60 dark:bg-black/20 border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                          {ticket.context}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="glass-card p-12 text-center rounded-3xl border border-white/5">
                <p className="text-slate-400 font-medium">Ticket not found or you don't have permission to view it.</p>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
