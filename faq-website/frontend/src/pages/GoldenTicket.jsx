import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Book, Wallet, LogOut, X, Sparkles, Plus, Menu,
  Lock, Crown, ShieldAlert, Ticket, Pizza
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GoldenTicketIcon from '../components/GoldenTicketIcon';
import ThemeToggle from '../components/ThemeToggle';
import { formatPizzas } from '../utils/pizzaFormatter';
import Avatar from '../components/Avatar';
import BannedUserBanner from '../components/BannedUserBanner';
import { useBannedTheme } from '../hooks/useBannedTheme';

function PizzaSliceIcon({ size = 16, className = '' }) {
  return <Pizza size={size} className={className} />;
}

export default function GoldenTicket() {
  const [user, setUser] = useState(null);

  useBannedTheme(user);
  const [leaderboard, setLeaderboard] = useState([]);
  
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [spurtiSpent, setSpurtiSpent] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [userRes, boardRes] = await Promise.all([
        axiosClient.get('/auth/me', { timeout: 3000 }),
        axiosClient.get('/golden-tickets/leaderboard', { timeout: 3000 })
      ]);
      setUser(userRes.data.user);
      setLeaderboard(boardRes.data.leaderboard);
      
      // Calculate countdown if restricted
      if (userRes.data.user.bannedUntil && new Date(userRes.data.user.bannedUntil).getTime() > Date.now()) {
        setTimeRemaining(new Date(userRes.data.user.bannedUntil).getTime() - Date.now());
      } else if (userRes.data.user.goldenTicketCooldownUntil && new Date(userRes.data.user.goldenTicketCooldownUntil).getTime() > Date.now()) {
        setTimeRemaining(new Date(userRes.data.user.goldenTicketCooldownUntil).getTime() - Date.now());
      } else {
        setTimeRemaining(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Golden Ticket data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;
    
    // Only recreate interval if timeRemaining > 0 status changes
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timeRemaining > 0]);

  const formatTime = (ms) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')} : ${minutes.toString().padStart(2, '0')} : ${seconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !context) return toast.error('Please fill in all fields');
    if (spurtiSpent < 1) return toast.error('Minimum 1 SP required');
    if (spurtiSpent > user.spurtiPoints) return toast.error('Insufficient SP');

    setSubmitting(true);
    try {
      await axiosClient.post('/golden-tickets', {
        title,
        context,
        spurtiSpent: Number(spurtiSpent)
      });
      toast.success('Golden Ticket created! Admin has been notified.');
      setTitle('');
      setContext('');
      fetchData(); // Refresh to trigger cooldown state
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create Golden Ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const NavItem = ({ icon: Icon, label, active, onClick }) => (
    <button onClick={onClick}
      className={`sidebar-button ${active ? 'sidebar-button-normal active' : 'sidebar-button-normal'}`}
    >
      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className="flex-shrink-0" />
      <span>{label}</span>
    </button>
  );

  const navSection = (close = () => {}) => (
    <nav className="space-y-1.5">
      <NavItem icon={Book} label="FAQ" active={false} onClick={() => { navigate('/faq'); close(); }} />
      <NavItem icon={MessageSquare} label="Once Asked Questions" active={false} onClick={() => { navigate('/discussions'); close(); }} />
      <NavItem icon={Wallet} label="Wallet" active={false} onClick={() => { navigate('/wallet'); close(); }} />
      <div className="pt-3 space-y-2 border-t border-white/5 mt-3">
        <button onClick={() => { navigate('/raise-ticket'); close(); }}
          className="sidebar-button sidebar-button-normal"
        >
          <Plus size={18} strokeWidth={2.5} className="flex-shrink-0" /> Raise Ticket
        </button>
        <button onClick={() => { navigate('/contribute-faq'); close(); }}
          className="sidebar-button sidebar-button-normal"
        >
          <Sparkles size={18} strokeWidth={2.5} className="flex-shrink-0" /> Contribute FAQ
        </button>
        <button onClick={() => { navigate('/golden-ticket'); close(); }}
          className="sidebar-button sidebar-button-golden active group"
        >
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"></div>
          <GoldenTicketIcon size={18} className="flex-shrink-0 drop-shadow-md" />
          <span className="drop-shadow-md tracking-wide">Golden Ticket</span>
        </button>
      </div>
    </nav>
  );

  const isBanned = user?.bannedUntil && new Date(user.bannedUntil).getTime() > Date.now();
  const isCooldown = user?.goldenTicketCooldownUntil && new Date(user.goldenTicketCooldownUntil).getTime() > Date.now();
  const isLocked = isBanned || isCooldown;
  const maxSp = user?.spurtiPoints || 0;

  return (
    <div data-banned={user?.isBanned ? "true" : "false"} className="flex h-screen bg-mesh overflow-hidden font-inter text-slate-300">
      {user?.isBanned && <BannedUserBanner />}
      
      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 h-16 glass-strong border-b border-white/5">
        <span className="font-bold font-bricolage text-lg text-slate-100 flex items-center gap-1.5">
          <Crown className={'text-yellow-400'} size={18} /> Golden Ticket
        </span>
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
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md transition-colors hover:bg-white/10">
                <Book size={16} className="text-slate-300" strokeWidth={2} />
              </div>
              <span className="font-bold font-bricolage text-xl text-slate-100 tracking-tight">FAQ Hive</span>
            </div>
            <ThemeToggle />
          </div>
          {navSection()}
        </div>
        <div className="space-y-3">
          {user && (
            <div className="glass-card rounded-2xl p-4 flex flex-col items-center">
              <Avatar user={user} size={48} className="mb-3" showGlow={user.role === 'admin' || user.isGoldenTicket} />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-bricolage text-center">Reputation</p>
              <p className="text-3xl font-bold font-bricolage text-slate-100 mb-3 text-center">{user.reputation}</p>
              <div className="flex gap-1.5 text-xs font-semibold font-bricolage flex-wrap">
                <span className={`glass-card px-3 py-1.5 rounded-xl border shadow-sm flex items-center gap-1.5 ${'text-amber-400 border-amber-500/10'}`}>
                  <PizzaSliceIcon size={13} className={'text-amber-400'} />
                  {formatPizzas(user.pizzaSlices)}
                </span>
                <span className="bg-white/5 text-slate-300 px-2.5 py-1 rounded-lg border border-white/5 shadow-sm flex items-center gap-1.5"><Sparkles size={11} className="text-slate-400" /> {user.spurtiPoints} SP</span>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-slate-100 hover:bg-white/5 text-sm font-semibold transition-colors font-bricolage">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-y-auto scroll-smooth pt-16 md:pt-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-yellow-500 font-bricolage min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-yellow-700 border-t-yellow-400 rounded-full animate-spin" />
              <span>Entering Premium Channel...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="absolute top-0 right-0 w-[400px] h-[400px] pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 70% 30%, rgba(234,179,8,0.06) 0%, transparent 70%)' }} />
            
            <header className="flex-shrink-0 flex items-center justify-between px-8 py-5 glass-strong border-b border-white/5 z-10 relative">
              <h1 className="font-bold font-bricolage text-2xl text-slate-100 tracking-tight flex items-center gap-2">
                <Crown className="text-yellow-400" size={24} /> Golden Ticket
              </h1>
            </header>

            <main className="p-6 md:p-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
              {/* Left Column: Form & Lock */}
              <div className="lg:col-span-2 space-y-6">
                
                <div className="relative">
                  {/* Lock Overlay */}
                  {isLocked && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl overflow-hidden">
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-md border border-yellow-500/10 rounded-3xl"></div>
                      <div className="relative z-30 flex flex-col items-center text-center p-8">
                        <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-6 border border-yellow-500/20 shadow-[0_0_40px_rgba(234,179,8,0.15)]">
                          {isBanned ? <ShieldAlert className="text-yellow-400" size={32} /> : <Lock className="text-yellow-400" size={32} />}
                        </div>
                        <h2 className="text-2xl font-bold font-bricolage text-white mb-2">
                          {isBanned ? 'Account Restricted' : 'Cooldown Active'}
                        </h2>
                        <p className="text-slate-400 text-sm mb-8 max-w-md">
                          {isBanned 
                            ? "Your previous Golden Ticket was rejected for misuse. Community participation is temporarily restricted." 
                            : "You may raise another Golden Ticket after the cooldown expires."}
                        </p>
                        <div className="bg-black/50 border border-yellow-500/20 px-8 py-4 rounded-2xl">
                          <div className="text-3xl font-mono font-bold text-yellow-400 tracking-wider drop-shadow-md">
                            {formatTime(timeRemaining)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Main Form */}
                  <form onSubmit={handleSubmit} className={`glass-premium rounded-3xl p-8 relative ${isLocked ? 'opacity-30 pointer-events-none filter blur-sm grayscale-[50%]' : ''}`}>
                    
                    <div 
                      className="mb-8 p-6 rounded-2xl bg-yellow-500/[0.02] border border-yellow-500/10 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300"
                      style={{
                        boxShadow: `0 0 ${Math.min(60, spurtiSpent * 1.5)}px rgba(234,179,8,${Math.min(0.3, spurtiSpent / 150)})`,
                        borderColor: `rgba(234,179,8,${Math.max(0.1, Math.min(0.6, spurtiSpent / 100))})`
                      }}
                    >
                      <div>
                        <h3 className="text-yellow-400 font-bold font-bricolage text-lg mb-1">Spurti Point Investment</h3>
                        <p className="text-slate-400 text-xs font-semibold">Higher SP guarantees higher leaderboard priority.</p>
                      </div>
                      <div className="flex items-center gap-4 w-full md:w-1/2">
                        <input 
                          type="range" 
                          min={1} 
                          max={Math.max(1, maxSp)} 
                          step={1}
                          value={spurtiSpent} 
                          onChange={(e) => setSpurtiSpent(Number(e.target.value))}
                          className="w-full accent-yellow-400 bg-black/10 dark:bg-white/5 h-1.5 rounded-full appearance-none transition-all duration-200 cursor-pointer"
                        />
                        <div className="glass-card border-yellow-500/20 px-4 py-2 rounded-xl min-w-[100px] text-center flex items-center justify-center gap-1.5">
                          <span className="text-lg">🔥</span>
                          <span className="text-xl font-bold font-bricolage text-yellow-400">{spurtiSpent}</span>
                          <span className="text-xs text-yellow-500/70 font-bold">SP</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2 uppercase font-bricolage">Urgent Query</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Short, direct summary of the crisis..."
                          className="w-full bg-black/5 dark:bg-white/[0.02] border border-black/10 dark:border-white/5 rounded-xl px-5 py-4 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all font-medium text-sm"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2 uppercase font-bricolage">Full Context</label>
                        <textarea
                          value={context}
                          onChange={(e) => setContext(e.target.value)}
                          placeholder="Explain the escalation in detail. Admins will review this exclusively."
                          className="w-full bg-black/5 dark:bg-white/[0.02] border border-black/10 dark:border-white/5 rounded-xl px-5 py-4 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all min-h-[160px] resize-none text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                      <div className="text-sm text-slate-400 font-semibold font-bricolage">
                        Remaining: <strong className="text-yellow-400">{Math.max(0, maxSp - spurtiSpent)} SP</strong>
                      </div>
                      <button 
                        type="submit" 
                        disabled={submitting || maxSp < 1 || spurtiSpent > maxSp || spurtiSpent < 1}
                        className="relative group overflow-hidden bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-black font-bold px-8 py-3.5 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(217,119,6,0.2)] disabled:opacity-40 disabled:cursor-not-allowed font-bricolage cursor-pointer"
                      >
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12"></div>
                        <Sparkles size={16} />
                        <span>{submitting ? 'Escalating...' : 'Submit Escalation'}</span>
                      </button>
                    </div>

                  </form>
                </div>
              </div>

              {/* Right Column: Leaderboard */}
              <div className="lg:col-span-1">
                <div className="glass-gold rounded-3xl p-7 shadow-2xl sticky top-6 border border-yellow-500/20">
                  <h3 className="text-lg font-bold font-bricolage text-yellow-400 flex items-center gap-2 mb-6 pb-4 border-b border-yellow-500/10">
                    <ShieldAlert className="text-yellow-400 animate-pulse" size={18} /> Escalation Queue
                  </h3>
                  
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 italic text-sm font-semibold">
                      No active Golden Tickets.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {leaderboard.map((ticket, index) => (
                        <div key={ticket._id} className="group relative glass-card border border-black/5 dark:border-white/5 rounded-2xl p-4 hover:border-yellow-500/40 transition-all duration-300">
                          
                          {index === 0 && (
                            <div className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.4)] text-xs">
                              #1
                            </div>
                          )}
                          
                          <div className="flex justify-between items-start mb-2 font-bricolage">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ticket.username}</span>
                            {index !== 0 && <span className="text-[10px] font-bold text-slate-500">#{ticket.rank}</span>}
                          </div>
                          
                          <p className="text-sm text-slate-200 font-medium leading-snug mb-4">
                            "{ticket.queryGist}"
                          </p>
                          
                          <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold bg-yellow-500/10 w-fit px-2.5 py-1 rounded-lg border border-yellow-500/15 font-bricolage">
                            🔥 {ticket.spurtiSpent} SP
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </main>
          </>
        )}
      </div>
    </div>
  );
}
