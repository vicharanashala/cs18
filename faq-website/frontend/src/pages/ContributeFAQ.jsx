import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import {
  MessageSquare, Book, Wallet, LogOut, X, Sparkles, Check, Plus, Menu, Pizza
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GoldenTicketIcon from '../components/GoldenTicketIcon';
import BannedUserBanner from '../components/BannedUserBanner';
import ThemeToggle from '../components/ThemeToggle';
import { formatPizzas } from '../utils/pizzaFormatter';
import Avatar from '../components/Avatar';
import CategoryDropdown, { FALLBACK_CATEGORIES } from '../components/CategoryDropdown';
import { useBannedTheme } from '../hooks/useBannedTheme';

export default function ContributeFAQ() {
  const [user, setUser] = useState(null);

  useBannedTheme(user);
  const navigate = useNavigate();

  // Contribution state
  const [categories, setCategories] = useState([]);
  const [contribCategory, setContribCategory] = useState('');
  const [contribCustomCategory, setContribCustomCategory] = useState('');
  const [contribQuestion, setContribQuestion] = useState('');
  const [contribAnswer, setContribAnswer] = useState('');
  const [isContributing, setIsContributing] = useState(false);
  const [contribResult, setContribResult] = useState(null); // { generatedQuestion, generatedAnswer }
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    axiosClient.get('/auth/me').then(r => setUser(r.data.user)).catch(() => { });
    // Fetch categories dynamically
    axiosClient.get('/faqs/categories')
      .then(r => {
        const names = r.data.categories.map(c => c.name);
        setCategories(names.length > 0 ? names : FALLBACK_CATEGORIES);
      })
      .catch(() => setCategories(FALLBACK_CATEGORIES));
  }, []);

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!contribCategory) return toast.error('Please select a category');
    if (contribCategory === 'Other' && (!contribCustomCategory || !contribCustomCategory.trim())) {
      return toast.error('Please specify your custom category');
    }
    if (!contribQuestion.trim() || contribQuestion.trim().split(' ').length < 3)
      return toast.error('Question must be at least 3 words');
    if (!contribAnswer.trim() || contribAnswer.trim().split(' ').length < 5)
      return toast.error('Answer must be at least 5 words');

    setIsContributing(true);
    setContribResult(null);
    try {
      const res = await axiosClient.post('/faqs/contribute', {
        category: contribCategory,
        customCategory: contribCustomCategory,
        question: contribQuestion,
        answer: contribAnswer,
      });
      setContribResult(res.data.contribution);
      toast.success('FAQ contributed! Thank you for helping the community.');
      setContribQuestion('');
      setContribAnswer('');
      setContribCategory('');
      setContribCustomCategory('');
    } catch (err) {
      if (err.response?.data?.duplicate) {
        toast.error('A similar FAQ already exists in the knowledge base.');
      } else {
        toast.error(err.response?.data?.message || 'Contribution failed');
      }
    } finally {
      setIsContributing(false);
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

  const navSection = (close = () => { }) => (
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
          className="sidebar-button sidebar-button-normal active"
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
              <div className="flex gap-1.5 text-xs font-semibold font-bricolage">
                <span className="bg-white/5 text-slate-300 px-2.5 py-1 rounded-lg border border-white/5 shadow-sm flex items-center gap-1.5"><Pizza className="w-4 h-4 text-slate-300" /> {user.pizzas}</span>
                <span className="bg-white/5 text-slate-300 px-2.5 py-1 rounded-lg border border-white/5 shadow-sm">⭐ {user.spurtiPoints}</span>
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

          <div>
            <h1 className="font-bold font-bricolage text-2xl md:text-3xl text-slate-100 mb-2">Contribute to FAQ</h1>
            <p className="text-slate-400 text-sm md:text-base">Help expand the community knowledge base by contributing reusable FAQs.</p>
          </div>

          <div className="relative overflow-hidden rounded-3xl glass-lavender">
            {/* Background glow */}
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

            <div className="relative z-10 p-6 md:p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center">
                      <Sparkles size={16} className="text-purple-400 animate-pulse" />
                    </div>
                    <h2 className="font-bold font-bricolage text-lg text-slate-100">Contribute a new question</h2>
                  </div>
                  <p className="text-slate-400 text-xs ml-10.5">Your submission will be AI-generalized and reviewed.</p>
                </div>
              </div>

              {/* Success State */}
              <AnimatePresence mode="wait">
                {contribResult ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="badge-purple rounded-2xl p-6 space-y-4"
                  >
                    <div className="flex items-center gap-2">
                      <Check size={16} className="text-purple-400" />
                      <span className="text-purple-300 text-sm font-semibold font-bricolage">AI-Generalized FAQ Generated</span>
                    </div>
                    <div className="space-y-3 font-inter">
                      <div>
                        <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Question</span>
                        <p className="text-slate-100 text-sm font-semibold mt-1">"{contribResult.generatedQuestion}"</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Answer</span>
                        <p className="text-slate-300 text-sm mt-1 leading-relaxed whitespace-pre-wrap">{contribResult.generatedAnswer}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setContribResult(null)}
                      className="mt-2 text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 font-bricolage"
                    >
                      <Plus size={12} className="rotate-45" /> Contribute another
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleContribute}
                    className="space-y-5"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 tracking-wider mb-2 uppercase font-bricolage">Category</label>
                      <CategoryDropdown
                        value={contribCategory}
                        onChange={(val) => { setContribCategory(val); if (val !== 'Other') setContribCustomCategory(''); }}
                        disabled={false}
                        categories={categories}
                      />
                    </div>

                    {contribCategory === 'Other' && (
                      <div className="animate-in fade-in duration-200">
                        <label className="block text-[10px] font-bold text-slate-500 tracking-wider mb-2 uppercase font-bricolage">Specify custom category</label>
                        <input
                          type="text"
                          required
                          value={contribCustomCategory}
                          onChange={e => setContribCustomCategory(e.target.value)}
                          placeholder="e.g. Hostels & Accommodation"
                          className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500/30 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm"
                        />
                      </div>
                    )}

                    {/* Question */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 tracking-wider mb-2 uppercase font-bricolage">Question</label>
                      <input
                        type="text"
                        value={contribQuestion}
                        onChange={e => setContribQuestion(e.target.value)}
                        placeholder="Ask the question exactly as students might ask it..."
                        className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500/30 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm"
                      />
                    </div>

                    {/* Answer */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 tracking-wider mb-2 uppercase font-bricolage">Answer</label>
                      <textarea
                        value={contribAnswer}
                        onChange={e => setContribAnswer(e.target.value)}
                        placeholder="Provide a clear, helpful answer..."
                        rows={4}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500/30 focus:ring-1 focus:ring-purple-500/30 transition-all text-sm resize-none"
                      />
                    </div>

                    {/* Submit */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <p className="text-[11px] text-slate-500 font-semibold italic hidden sm:block">AI will generalize and normalize your FAQ automatically</p>
                      <button
                        type="submit"
                        disabled={isContributing}
                        className="relative group overflow-hidden flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-60 cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                          boxShadow: isContributing ? 'none' : '0 0 20px rgba(124, 58, 237, 0.3)',
                        }}
                      >
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                        {isContributing ? (
                          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles size={15} /> Submit FAQ</>
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
