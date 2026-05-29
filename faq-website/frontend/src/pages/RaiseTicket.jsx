import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import {
  MessageSquare, Book, Wallet, LogOut, X, Search,
  Menu, ChevronDown, ChevronUp, Lock, Users, ChevronRight, Check,
  Sparkles, Send, ArrowRight, Plus, Pizza
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GoldenTicketIcon from '../components/GoldenTicketIcon';
import BannedUserBanner from '../components/BannedUserBanner';
import ThemeToggle from '../components/ThemeToggle';
import SearchBar from '../components/SearchBar';
import Avatar from '../components/Avatar';
import CategoryDropdown, { FALLBACK_CATEGORIES } from '../components/CategoryDropdown';
import TrackQuerySection from '../components/TrackQuerySection';
import { formatPizzas } from '../utils/pizzaFormatter';
import { useBannedTheme } from '../hooks/useBannedTheme';

function PizzaSliceIcon({ size = 16, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c4.4 0 8-3.6 8-8V3L4 3v10c0 4.4 3.6 8 8 8z" />
      <path d="M12 3v18" />
      <path d="M4 3l8 10 8-10" />
    </svg>
  );
}



// ─── Search Result Cards ──────────────────────────────────────────────────────
function FaqSearchResultCard({ faq, matchType }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="glass-card border border-white/5 rounded-2xl overflow-hidden mb-3">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex flex-col md:flex-row md:items-center justify-between px-6 py-4 gap-4 text-left"
      >
        <span className="text-slate-100 font-bold font-bricolage text-[0.95rem] leading-snug">{faq.question}</span>
        <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
          {matchType === 'semantic' && faq.matchPercentage && (
            <span className="text-[10px] font-bold font-bricolage badge-purple px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap">
              {faq.matchPercentage}% match
            </span>
          )}
          {faq.categoryId?.name && (
            <span className="text-[10px] font-bold font-bricolage text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 whitespace-nowrap hidden sm:block">
              {faq.categoryId.name}
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden border-t border-white/5 bg-white/[0.01]"
          >
            <div className="px-6 py-5">
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Discussion Result Card ───────────────────────────────────────────────────
function DiscussionResultCard({ cluster }) {
  const navigate = useNavigate();
  return (
    <div className="glass-card border border-white/5 rounded-2xl p-5 mb-3 cursor-pointer group"
      onClick={() => navigate('/dashboard')}
    >
      <div className="flex justify-between items-start gap-4 mb-2">
        <h3 className="font-bold font-bricolage text-[0.95rem] text-slate-100 group-hover:text-pink-300 transition-colors">
          {cluster.canonicalQuestion}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          {cluster.matchPercentage && (
            <span className="text-[10px] font-bold font-bricolage badge-pink px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap">
              {cluster.matchPercentage}% match
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
        <div className="flex items-center gap-1.5"><Users size={12}/> {cluster.submissionsCount || 1} joined</div>
        <div className="flex items-center gap-1.5"><MessageSquare size={12}/> {cluster.answerCount || 0} answers</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RaiseTicket() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useBannedTheme(user);
  
  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Results
  const [faqMatches, setFaqMatches] = useState([]);
  const [faqMatchType, setFaqMatchType] = useState('none');
  const [discMatches, setDiscMatches] = useState([]);
  const [searchInsight, setSearchInsight] = useState('');
  
  // Form lock state
  const [isFormUnlocked, setIsFormUnlocked] = useState(false);
  const formRef = useRef(null);
  
  // Form data
  const [ticketType, setTicketType] = useState('general'); // 'general' | 'personal'
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Resolution feedback state
  const [personalResolution, setPersonalResolution] = useState(null); // API response
  const [selectedMatch, setSelectedMatch] = useState(null); // if MEDIUM and user picks one
  
  // UI states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [trackingRefresh, setTrackingRefresh] = useState(0);

  useEffect(() => {
    axiosClient.get('/auth/me')
      .then(r => setUser(r.data.user))
      .catch(() => {});
    
    // Fetch categories dynamically
    axiosClient.get('/faqs/categories')
      .then(r => {
        const names = r.data.categories.map(c => c.name);
        setCategories(names.length > 0 ? names : FALLBACK_CATEGORIES);
      })
      .catch(() => setCategories(FALLBACK_CATEGORIES));
  }, []);

  const [categories, setCategories] = useState([]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFaqMatches([]);
      setDiscMatches([]);
      setSearchInsight('');
      setFaqMatchType('none');
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    setIsSearching(true);
    try {
      const [resFaq, resDisc] = await Promise.all([
        axiosClient.get('/search', { params: { q: query, type: 'faq' } }),
        axiosClient.get('/search', { params: { q: query, type: 'discussion' } })
      ]);
      setFaqMatches(resFaq.data.matches);
      setFaqMatchType(resFaq.data.matchType || 'none');
      setSearchInsight(resFaq.data.insight || '');
      setDiscMatches(resDisc.data.matches);
    } catch {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUnlockForm = () => {
    setIsFormUnlocked(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) return toast.error('Please select a category');
    if (category === 'Other' && (!customCategory || !customCategory.trim())) {
      return toast.error('Please specify your custom category');
    }
    if (!title.trim() || title.trim().split(' ').length < 3) 
      return toast.error('Title must be at least 3 words');
    if (!context.trim() || context.trim().split(' ').length < 5)
      return toast.error('Context description must be at least 5 words');

    setIsSubmitting(true);
    try {
      if (ticketType === 'general') {
        const res = await axiosClient.post('/discussions/submit', {
          question: title,
          context: context,
          category,
          customCategory
        });
        toast.success(res.data.message || 'General query registered.');
        
        setTitle('');
        setContext('');
        setCategory('');
        setCustomCategory('');
        setTrackingRefresh(prev => prev + 1);
        navigate('/dashboard');
      } else {
        // Personal issue flow
        const res = await axiosClient.post('/personal-issues/resolve', {
          question: title,
          context: context,
          category,
          customCategory
        });
        
        const data = res.data;
        if (data.status === 'HIGH' || data.status === 'MEDIUM') {
          setPersonalResolution(data);
          toast.success('AI retrieved resolution guidelines.');
        } else {
          // LOW confidence creates escalation automatically on backend
          toast.success('New issue detected. Escalated to admin.');
          setTrackingRefresh(prev => prev + 1);
          navigate('/dashboard');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to submit ticket';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Feedback loop handler for personal issues
  const handlePersonalFeedback = async (helpful, matchId) => {
    try {
      setIsSubmitting(true);
      await axiosClient.post('/personal-issues/feedback', {
        matchId: matchId || personalResolution?.bestMatch?._id,
        type: selectedMatch?.type || 'faq',
        helpful,
        question: title,
        context: context,
        normalizedIntent: personalResolution?.normalizedIntent,
        category,
        customCategory
      });
      
      if (helpful) {
        toast.success('Resolution confirmed. Thank you!');
      } else {
        toast.success('Ticket escalated to admin.');
      }
      
      // Clear form & resolution state
      setPersonalResolution(null);
      setSelectedMatch(null);
      setTitle('');
      setContext('');
      setCategory('');
      setCustomCategory('');
      setTrackingRefresh(prev => prev + 1);

      if (!helpful && res.data.ticketId) {
        navigate(`/track-status/${res.data.ticketId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to submit ticket';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Escalation helper for medium confidence mismatch
  const handleEscalate = async () => {
    setIsSubmitting(true);
    try {
      const res = await axiosClient.post('/personal-issues/escalate', {
        question: title,
        context: context,
        category,
        customCategory,
        normalizedIntent: personalResolution?.normalizedIntent
      });
      toast.success('Escalated to admin.');
      
      setPersonalResolution(null);
      setSelectedMatch(null);
      setTitle('');
      setContext('');
      setCategory('');
      setCustomCategory('');
      setTrackingRefresh(prev => prev + 1);

      if (res.data.ticketId) {
        navigate(`/track-status/${res.data.ticketId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to submit ticket';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
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
          className="sidebar-button sidebar-button-normal active"
        >
          <Plus size={18} strokeWidth={2.5} className="flex-shrink-0" /> Raise Ticket
        </button>
        <button onClick={() => { navigate('/contribute-faq'); close(); }}
          className="sidebar-button sidebar-button-normal"
        >
          <Sparkles size={18} strokeWidth={2.5} className="flex-shrink-0" /> Contribute FAQ
        </button>
        <button onClick={() => { navigate('/golden-ticket'); close(); }}
          className="sidebar-button sidebar-button-golden group"
        >
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"></div>
          <GoldenTicketIcon size={18} className="flex-shrink-0 drop-shadow-md" />
          <span className="drop-shadow-md tracking-wide">Golden Ticket</span>
        </button>
      </div>
    </nav>
  );

  return (
    <div data-banned={user?.isBanned ? "true" : "false"} className="flex h-screen bg-mesh overflow-hidden font-inter text-slate-300">
      {user?.isBanned && <BannedUserBanner />}
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
      <div className="flex-1 overflow-y-auto scroll-smooth pt-16 md:pt-0">
        <main className="p-6 md:p-10 lg:py-12 max-w-3xl mx-auto space-y-6">
          
          <h1 className="font-bold font-bricolage text-2xl md:text-3xl text-slate-100 mb-8">Raise a Ticket</h1>

          <TrackQuerySection refreshTrigger={trackingRefresh} />

          <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5">
            <h2 className="font-bold font-bricolage text-lg mb-4 text-slate-200">Step 1 — Search existing answers</h2>
            <SearchBar placeholder="Search FAQs or issues (e.g. accommodation)" onSearch={handleSearch} loading={isSearching} />

            {hasSearched && (
              <div className="mt-8 space-y-8 animate-in fade-in duration-300">
                {/* SECTION A: FAQ Matches */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 font-bricolage">Matching FAQs</h3>
                  {faqMatches.length === 0 ? (
                    <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex items-center gap-3 text-sm text-slate-400">
                      <div className="w-2 h-2 rounded-full bg-slate-700" /> No FAQ match found — ticket form unlocked.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {searchInsight && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-500/[0.03] border border-purple-500/10 mb-4">
                          <Sparkles size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-[9px] font-bold tracking-wider text-purple-400 uppercase font-bricolage">AI Search Insight</span>
                            <p className="text-slate-300 text-xs mt-0.5 italic">"{searchInsight}"</p>
                          </div>
                        </div>
                      )}
                      {faqMatches.map(f => <FaqSearchResultCard key={f._id} faq={f} matchType={faqMatchType} />)}
                    </div>
                  )}
                </div>

                {/* SECTION B: Discussion Matches */}
                {discMatches.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 font-bricolage">Matching Questions</h3>
                    <div className="space-y-3">
                      {discMatches.map(d => <DiscussionResultCard key={d._id} cluster={d} />)}
                    </div>
                  </div>
                )}

                {/* UNLOCK CTA */}
                {!isSearching && !isFormUnlocked && (
                  <div className="pt-6 mt-4 border-t border-white/5 flex flex-col items-center">
                    {(faqMatches.length === 0 && discMatches.length === 0) ? (
                      <>
                        <p className="text-slate-400 text-sm mb-4">No strongly related FAQs or discussions found.</p>
                        <button onClick={handleUnlockForm} className="glass-dark text-white font-bold py-3.5 px-8 rounded-xl hover:bg-white/5 border border-white/5 transition-all text-sm font-bricolage cursor-pointer">
                          Raise New Ticket
                        </button>
                      </>
                    ) : (
                      <button onClick={handleUnlockForm} className="glass text-slate-300 font-bold py-3 px-8 rounded-xl hover:bg-white/5 border border-white/5 transition-all text-sm font-bricolage cursor-pointer">
                        Still need help?
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div ref={formRef} className="relative transition-all duration-500">
            {/* Lock Overlay */}
            {!isFormUnlocked && (
              <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl border border-white/5">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mb-4 backdrop-blur-md shadow-lg">
                  <Lock size={24} className="text-slate-300 animate-pulse" />
                </div>
                <p className="text-slate-400 font-semibold text-sm max-w-xs text-center px-4 font-bricolage">
                  Search existing FAQs and discussions before raising a ticket.
                </p>
              </div>
            )}

            <div className={`space-y-6 ${!isFormUnlocked ? 'opacity-30 pointer-events-none blur-[2px] select-none' : ''}`}>
              
              {/* STEP 2 */}
              <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5">
                <h2 className="font-bold font-bricolage text-lg mb-5 text-slate-200">Step 2 — What kind of ticket is this?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button type="button" onClick={() => { setTicketType('general'); setPersonalResolution(null); }}
                    className={`text-left p-5 rounded-2xl border transition-all ${
                      ticketType === 'general' 
                        ? 'border-slate-400 bg-white/[0.04] shadow-[0_0_25px_rgba(255,255,255,0.02)]' 
                        : 'border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 font-bold font-bricolage text-slate-100">
                      <MessageSquare size={16} /> General query
                    </div>
                    <p className="text-[13px] text-slate-400 leading-relaxed">Useful for others too — may be added to FAQ once resolved.</p>
                  </button>
                  <button type="button" onClick={() => { setTicketType('personal'); setPersonalResolution(null); }}
                    className={`text-left p-5 rounded-2xl border transition-all ${
                      ticketType === 'personal' 
                        ? 'border-slate-400 bg-white/[0.04] shadow-[0_0_25px_rgba(255,255,255,0.02)]' 
                        : 'border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 font-bold font-bricolage text-slate-100">
                      <Users size={16} /> Personal issue
                    </div>
                    <p className="text-[13px] text-slate-400 leading-relaxed">Specific to your account, NOC, dates, or offer letter.</p>
                  </button>
                </div>
              </div>

              {/* STEP 3 & Personal resolution state */}
              {personalResolution ? (
                <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5 space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center">
                      <Sparkles className="text-purple-400" size={16} />
                    </div>
                    <h2 className="font-bold font-bricolage text-lg text-slate-100">People solved similar issues using:</h2>
                  </div>

                  {personalResolution.status === 'HIGH' && (
                    <div className="space-y-5">
                      <div className="p-5 rounded-2xl bg-purple-500/[0.03] border border-purple-500/10">
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest font-bricolage">Matched query</span>
                        <p className="font-semibold text-slate-200 mt-1">"{personalResolution.normalizedIntent}"</p>
                      </div>
                      <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-bricolage">Verified Resolution</span>
                        <p className="text-slate-300 text-sm leading-relaxed mt-2 whitespace-pre-wrap">{personalResolution.bestMatch.verifiedAnswer}</p>
                        {personalResolution.bestMatch.quirks && (
                          <div className={`mt-4 pt-3 border-t border-white/5 text-xs font-medium ${'text-amber-400'}`}>
                            💡 Quirks: {personalResolution.bestMatch.quirks}
                          </div>
                        )}
                      </div>
                      <div className="p-5 bg-purple-500/[0.02] rounded-2xl border border-purple-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <span className="text-sm font-semibold text-slate-300">Did this solve your issue? If not, it will be escalated to an admin.</span>
                        <div className="flex gap-2 font-bricolage">
                          <button onClick={() => handlePersonalFeedback(true, personalResolution.bestMatch._id)} disabled={isSubmitting} className="badge-green text-green-300 font-bold py-2 px-4 rounded-xl text-xs hover:bg-green-950/20 transition-all cursor-pointer">
                            Yes, solved
                          </button>
                          <button onClick={() => handlePersonalFeedback(false, personalResolution.bestMatch._id)} disabled={isSubmitting} className="badge-red text-red-300 font-bold py-2 px-4 rounded-xl text-xs hover:bg-red-950/20 transition-all cursor-pointer">
                            No, still create ticket
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {personalResolution.status === 'MEDIUM' && (
                    <div className="space-y-5">
                      {!selectedMatch ? (
                        <>
                          <p className="text-sm text-slate-400 font-semibold font-bricolage">This issue was recently solved. Does one of these match your situation?</p>
                          <div className="space-y-3 font-bricolage mt-4">
                            {personalResolution.matches.map((m, idx) => (
                              <button key={m._id} onClick={() => setSelectedMatch(m)} className="w-full text-left p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all">
                                <div className="flex justify-between items-center">
                                  <div className="font-semibold text-sm text-slate-300">{idx + 1}. {m.normalizedIntent}</div>
                                  <span className="text-[10px] uppercase font-bold text-slate-500 border border-white/5 px-2 py-1 rounded-full">{m.type}</span>
                                </div>
                              </button>
                            ))}
                            <button onClick={handleEscalate} className="w-full text-left p-4 rounded-2xl border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] transition-all flex items-center gap-2">
                              <span className="text-slate-500">✦</span>
                              <span className="font-semibold text-sm text-slate-300">None of these — still create ticket</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-5">
                          <div className="p-5 rounded-2xl bg-purple-500/[0.03] border border-purple-500/10">
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest font-bricolage">Selected Intent</span>
                            <p className="font-semibold text-slate-200 mt-1">"{selectedMatch.normalizedIntent}"</p>
                          </div>
                          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-bricolage">Verified Resolution</span>
                            <p className="text-slate-300 text-sm leading-relaxed mt-2 whitespace-pre-wrap">{selectedMatch.verifiedAnswer}</p>
                          </div>
                          <div className="p-5 bg-purple-500/[0.02] rounded-2xl border border-purple-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <span className="text-sm font-semibold text-slate-300">Did this solve your issue? If not, it will be escalated to an admin.</span>
                            <div className="flex gap-2 font-bricolage">
                              <button onClick={() => handlePersonalFeedback(true, selectedMatch._id)} disabled={isSubmitting} className="badge-green text-green-300 font-bold py-2 px-4 rounded-xl text-xs hover:bg-green-950/20 transition-all cursor-pointer">
                                Yes, solved
                              </button>
                              <button onClick={() => handlePersonalFeedback(false, selectedMatch._id)} disabled={isSubmitting} className="badge-red text-red-300 font-bold py-2 px-4 rounded-xl text-xs hover:bg-red-950/20 transition-all cursor-pointer">
                                No, still create ticket
                              </button>
                            </div>
                          </div>
                          <button onClick={() => setSelectedMatch(null)} className="text-xs text-slate-500 hover:text-slate-300 font-bold flex items-center gap-1 font-bricolage">
                            ← Back to matches
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {personalResolution.status === 'LOW' && (
                    <div className="space-y-5">
                      <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 text-center">
                        <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-400/20 flex items-center justify-center mx-auto mb-3">
                          <Sparkles className="text-purple-400 animate-pulse" size={20} />
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
                          This appears to be a new issue we haven't resolved before. It has been escalated to an admin who will respond within 24 hours.
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <button onClick={() => { setPersonalResolution(null); navigate('/dashboard'); }} className="glass-dark text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-md font-bricolage cursor-pointer">
                          Okay
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* STEP 3 FORM */
                <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5">
                  <h2 className="font-bold font-bricolage text-lg mb-6 text-slate-200">Step 3 — Describe your issue</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2 uppercase font-bricolage">Category</label>
                      <CategoryDropdown value={category} onChange={(val) => { setCategory(val); if (val !== 'Other') setCustomCategory(''); }} disabled={!isFormUnlocked} categories={categories.length > 0 ? categories : FALLBACK_CATEGORIES} />
                    </div>

                    {category === 'Other' && (
                      <div className="animate-in fade-in duration-200">
                        <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2 uppercase font-bricolage">Specify custom category</label>
                        <input type="text" required disabled={!isFormUnlocked}
                          className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm focus:border-white/10 focus:ring-1 focus:ring-white/10 transition-all outline-none disabled:opacity-40 text-slate-100 placeholder-slate-600"
                          placeholder="e.g. Hostels & Accommodation"
                          value={customCategory} onChange={e => setCustomCategory(e.target.value)}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2 uppercase font-bricolage">Title — One clear sentence</label>
                      <input type="text" required disabled={!isFormUnlocked}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm focus:border-white/10 focus:ring-1 focus:ring-white/10 transition-all outline-none disabled:opacity-40 text-slate-100 placeholder-slate-600"
                        placeholder="e.g. NOC uploaded 3 days ago but offer letter not received"
                        value={title} onChange={e => setTitle(e.target.value)}
                      />
                      <div className="text-right mt-1.5 text-[11px] font-semibold text-slate-500 font-bricolage">{title.length} / 120</div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2 uppercase font-bricolage">Context & Description</label>
                      <textarea required disabled={!isFormUnlocked} rows={5}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm focus:border-white/10 focus:ring-1 focus:ring-white/10 transition-all outline-none resize-none disabled:opacity-40 text-slate-100 placeholder-slate-600"
                        placeholder="Describe your issue in detail. Include relevant dates, email IDs, or steps you've already tried."
                        value={context} onChange={e => setContext(e.target.value)}
                      />
                      <div className="text-right mt-1.5 text-[11px] font-semibold text-slate-500 font-bricolage">{context.length} / 800</div>
                    </div>

                    <div className="pt-6 flex items-center justify-between border-t border-white/5">
                      <button type="submit" disabled={isSubmitting || !isFormUnlocked}
                        className="glass-dark text-white font-bold py-3.5 px-8 rounded-xl shadow-md transition-all disabled:opacity-40 text-sm font-bricolage flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSubmitting && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                        {isSubmitting ? (ticketType === 'general' ? 'Submitting...' : 'Analyzing...') : (ticketType === 'general' ? 'Submit General Ticket' : 'Submit for AI Resolution')}
                      </button>
                      <span className="text-xs text-slate-500 font-semibold italic hidden sm:block">Reviewed by a senior within 24h</span>
                    </div>
                  </form>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}