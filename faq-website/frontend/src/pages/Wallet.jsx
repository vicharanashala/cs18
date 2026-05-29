import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import {
  MessageSquare, Book, Wallet, LogOut, X, Sparkles, Plus,
  Flame, History, Award, Ticket, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GoldenTicketIcon from '../components/GoldenTicketIcon';
import BannedUserBanner from '../components/BannedUserBanner';
import ThemeToggle from '../components/ThemeToggle';
import PizzaSliceSVG from '../components/PizzaSliceSVG';
import { formatPizzas } from '../utils/pizzaFormatter';
import Avatar from '../components/Avatar';
import { useBannedTheme, useIsBanned } from '../hooks/useBannedTheme';

const SLICES_PER_SP = 6;

// ── Inline pizza-slice SVG icon (sidebar/badges, no emojis) ──────────────────
function PizzaSliceIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2 L22 20 Q12 24 2 20 Z"
        fill="currentColor"
        opacity="0.85"
      />
      <circle cx="12" cy="14" r="1.5" fill="rgba(253,224,71,0.7)" />
      <circle cx="8" cy="17" r="1.2" fill="rgba(253,224,71,0.5)" />
      <circle cx="16" cy="16" r="1" fill="rgba(253,224,71,0.5)" />
    </svg>
  );
}

const getTransactionTags = (tx) => {
  if (tx.tags && tx.tags.length > 0) return tx.tags;
  const tags = [];
  const type = tx.type;
  const direction = tx.direction;
  const amount = tx.amount;
  const description = tx.description || tx.title || '';

  if (type === 'GOLDEN_TICKET_SPENT' || type === 'golden_ticket_creation' || description.toLowerCase().includes('golden ticket')) {
    tags.push('sp_spent', 'golden_ticket');
  } else if (type === 'GOLDEN_TICKET_REFUND') {
    tags.push('sp_earned', 'golden_ticket');
  } else if (type === 'pizza_redemption' || type === 'PIZZA_REDEEMED' || (type === 'REDEEM' && (tx.currency === 'pizza' || description.toLowerCase().includes('pizza')))) {
    tags.push('pizza', 'sp_earned', 'rewards');
  } else if (type === 'pizza_slice_earned' || type === 'PIZZA_SLICE_EARNED') {
    tags.push('pizza', 'rewards');
  } else if (type === 'EARNED_SP') {
    tags.push('sp_earned');
  } else if (type === 'SPENT_SP') {
    tags.push('sp_spent');
  } else if (type === 'PIZZA_EARNED') {
    tags.push('pizza');
  } else if (['ADMIN_REWARD', 'DISCUSSION_REWARD', 'FAQ_CONTRIBUTION_REWARD'].includes(type)) {
    tags.push('sp_earned', 'rewards');
  } else if (type === 'SYSTEM_ADJUSTMENT') {
    if (direction === 'credit' || amount > 0) tags.push('sp_earned');
    if (direction === 'debit' || amount < 0) tags.push('sp_spent');
  }

  if (amount < 0 && !tags.includes('sp_spent') && !tags.includes('pizza')) {
    tags.push('sp_spent');
  }
  if (amount > 0 && direction === 'credit' && !tags.includes('pizza') && !tags.includes('sp_earned')) {
    tags.push('sp_earned');
  }
  return Array.from(new Set(tags));
};

// ── Pizza Inventory Card ──────────────────────────────────────────────────────
function PizzaInventoryCard({ pizzaSlices, onRedeem, redeeming }) {
  const slicesInWheel = pizzaSlices % SLICES_PER_SP;
  const isFull = pizzaSlices >= SLICES_PER_SP && slicesInWheel === 0 && pizzaSlices > 0;
  const pizzasToRedeem = Math.floor(pizzaSlices / SLICES_PER_SP);

  return (
    <div className="relative overflow-hidden rounded-3xl p-8 glass-pizza">
      {/* Ambient glow (Optimized) */}
      <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none"
        style={{ background: isFull ? 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(120,80,0,0.08) 0%, transparent 70%)' }}
      />

      <div className="flex items-center justify-between mb-5">
        <div>
          <span className="text-slate-400 font-semibold text-sm block">Pizza Slice Inventory</span>
          <p className="text-[11px] text-slate-600 font-medium mt-0.5">
            {SLICES_PER_SP} slices = 1 Spurti Point
          </p>
        </div>
        {isFull && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider 'bg-amber-400/10 text-amber-300 border border-amber-400/20'`}
          >
            Ready to Redeem
          </motion.span>
        )}
      </div>

      {/* Visual Pizza */}
      <div className="flex flex-col items-center gap-5 py-2">
        <PizzaSliceSVG slices={slicesInWheel} size={164} />

        {/* Slice counter formatted */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black font-bricolage tracking-tight text-slate-100">
            {formatPizzas(pizzaSlices)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-[200px] h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: isFull ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #92400e, #b45309)' }}
            initial={{ width: 0 }}
            animate={{ width: `${(slicesInWheel / SLICES_PER_SP) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Redemption section */}
      <div className="mt-6 pt-5 border-t border-white/5">
        {pizzasToRedeem > 0 ? (
          <motion.button
            onClick={onRedeem}
            disabled={redeeming}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, boxShadow: '0 0 28px rgba(251,191,36,0.25)' }}
            whileTap={{ scale: 0.98 }}
            className="w-full relative overflow-hidden group flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl font-bold text-sm font-bricolage cursor-pointer transition-all disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.08) 100%)',
              border: '1px solid rgba(251,191,36,0.3)',
              color: 'var(--icon-golden)',
              boxShadow: '0 0 20px rgba(251,191,36,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Shimmer sweep */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
            <PizzaSliceIcon size={15} className={`flex-shrink-0 ${'text-amber-300'}`} />
            {redeeming ? 'Redeeming...' : `Redeem ${pizzasToRedeem} Pizza${pizzasToRedeem > 1 ? 's' : ''} for ${pizzasToRedeem} SP`}
          </motion.button>
        ) : (
          <p className="text-center text-xs font-medium text-slate-500 leading-relaxed">
            <span className={`${'text-amber-500/70'} font-bold`}>{SLICES_PER_SP - slicesInWheel} more {SLICES_PER_SP - slicesInWheel === 1 ? 'slice' : 'slices'} needed</span>{' '}
            to redeem 1 Spurti Point
          </p>
        )}
      </div>
    </div>
  );
}

export default function WalletPage() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState({ spurtiPoints: 0, pizzaSlices: 0, lifetimeEarned: 100, lifetimeSpent: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletError, setWalletError] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [user, setUser] = useState(null);

  useBannedTheme(user);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchWalletData = async () => {
    try {
      const [balRes, histRes, userRes] = await Promise.all([
        axiosClient.get('/wallet/balance', { timeout: 3000 }),
        axiosClient.get('/wallet/history', { timeout: 3000 }),
        axiosClient.get('/auth/me', { timeout: 3000 })
      ]);
      setBalance(balRes.data);

      const mappedTransactions = histRes.data.transactions.map(tx => ({
        ...tx,
        tags: (tx.tags && tx.tags.length > 0) ? tx.tags : getTransactionTags(tx)
      }));
      setTransactions(mappedTransactions);
      setUser(userRes.data.user);
      setWalletError(false);
    } catch (err) {
      console.error('Wallet fetch error:', err);
      setWalletError(true);
      toast.error('Could not load wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWalletData(); }, []);

  const handleRedeem = async () => {
    setRedeeming(true);
    try {
      const res = await axiosClient.post('/wallet/redeem-pizza');
      toast.success(res.data.message || 'Pizza slice redemption successful!');

      // Optimistic update: immediately decrement displayed slices
      setBalance(prev => ({
        ...prev,
        pizzaSlices: res.data.pizzaSlices,
        spurtiPoints: res.data.spurtiPoints
      }));

      await fetchWalletData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Redemption failed');
    } finally {
      setRedeeming(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (activeFilter === 'All') return true;
      const filterTagMap = {
        'SP Earned': 'sp_earned',
        'SP Spent': 'sp_spent',
        'Pizza': 'pizza',
        'Golden Tickets': 'golden_ticket',
        'Rewards': 'rewards'
      };
      const targetTag = filterTagMap[activeFilter];
      return t.tags && t.tags.includes(targetTag);
    });
  }, [transactions, activeFilter]);

  const getTransactionIcon = (type) => {
    const upperType = type.toUpperCase();
    if (upperType.includes('PIZZA') || type === 'pizza_redemption' || type === 'pizza_slice_earned') {
      return <PizzaSliceIcon size={16} className={'text-amber-400'} />;
    }
    if (upperType.includes('GOLDEN_TICKET') || type === 'golden_ticket_creation') {
      return <Ticket className={`animate-pulse ${'text-yellow-400'}`} size={16} />;
    }
    if (upperType === 'ADMIN_REWARD' || upperType === 'SYSTEM_ADJUSTMENT') {
      return <Award className="text-purple-400" size={16} />;
    }
    return <Flame className="text-green-400 animate-pulse" size={16} />;
  };

  const getTransactionStyle = (tx) => {
    const tags = tx.tags || [];
    const isCredit = tx.direction === 'credit' || (tx.amount > 0 && !tags.includes('sp_spent'));

    if (tags.includes('golden_ticket')) {
      return { glow: 'glass-card hover:border-yellow-500/20 hover:shadow-[0_0_20px_rgba(234,179,8,0.05)]', amountColor: 'text-yellow-500 dark:text-yellow-400' };
    }
    if (tags.includes('pizza') && !tags.includes('sp_earned')) {
      return { glow: `glass-card hover:border-${user?.isBanned ? 'red' : 'amber'}-500/20 hover:shadow-[0_0_20px_rgba(${user?.isBanned ? '244,63,94' : '245,158,11'},0.07)]`, amountColor: 'text-amber-500 dark:text-amber-400' };
    }
    if (tags.includes('rewards')) {
      return { glow: 'glass-card hover:border-purple-500/20 hover:shadow-[0_0_20px_rgba(168,85,247,0.05)]', amountColor: isCredit ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400' };
    }
    if (isCredit) {
      return { glow: 'glass-card hover:border-green-500/20 hover:shadow-[0_0_20px_rgba(34,197,94,0.05)]', amountColor: 'text-green-500 dark:text-green-400' };
    }
    return { glow: 'glass-card hover:border-red-500/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.05)]', amountColor: 'text-red-500 dark:text-red-400' };
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
      <NavItem icon={Wallet} label="Wallet" active={true} onClick={() => { navigate('/wallet'); close(); }} />
      <div className="pt-3 space-y-2 border-t border-white/5 mt-3">
        <button onClick={() => { navigate('/raise-ticket'); close(); }} className="sidebar-button sidebar-button-normal">
          <Plus size={18} strokeWidth={2.5} className="flex-shrink-0" /> Raise Ticket
        </button>
        <button onClick={() => { navigate('/contribute-faq'); close(); }} className="sidebar-button sidebar-button-normal">
          <Sparkles size={18} strokeWidth={2.5} className="flex-shrink-0" /> Contribute FAQ
        </button>
        <button onClick={() => { navigate('/golden-ticket'); close(); }} className="sidebar-button sidebar-button-golden group">
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12" />
          <GoldenTicketIcon size={18} className="flex-shrink-0 drop-shadow-md" />
          <span className="drop-shadow-md tracking-wide">Golden Ticket</span>
        </button>
      </div>
    </nav>
  );

  const pizzaSlices = balance?.pizzaSlices ?? 0;

  return (
    <div data-banned={user?.isBanned ? "true" : "false"} className="flex h-screen bg-mesh overflow-hidden font-inter text-slate-300">
      {user?.isBanned && <BannedUserBanner />}

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 h-16 glass-card">
        <span className="font-bold font-bricolage text-lg text-slate-100">Wallet</span>
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
              className="w-72 h-full glass-card flex flex-col p-6"
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
      <aside className="hidden md:flex w-72 flex-col justify-between py-8 px-5 glass-card z-20 border-r-0">
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
                <span className={`glass-card px-3 py-1.5 rounded-xl border shadow-sm flex items-center gap-2 ${user?.isBanned ? 'text-rose-400 border-red-500/10' : 'text-amber-400 border-amber-500/10'}`}>
                              <PizzaSliceIcon size={13} className={'text-amber-400'} />
                  {formatPizzas(pizzaSlices)}
                </span>
                <span className="bg-white/5 text-slate-300 px-2.5 py-1 rounded-lg border border-white/5 shadow-sm">
                  ⭐ {user.spurtiPoints}
                </span>
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
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <div className={`w-10 h-10 border-4 rounded-full animate-spin ${'border-amber-500/20 border-t-amber-500'}`} />
              <p className={`font-semibold text-sm animate-pulse ${'text-amber-500/60'}`}>Loading Vault...</p>
            </div>
          </div>
        ) : walletError ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px] px-4">
            <div className="glass-card rounded-3xl p-10 flex flex-col items-center justify-center text-center border border-white/5 max-w-md w-full">
              <Wallet size={40} className="text-slate-500 mb-4 opacity-50" />
              <p className="text-slate-300 font-bold font-bricolage text-xl">Could not fetch wallet data</p>
              <p className="text-slate-500 text-sm mt-2">The server may be unavailable. Please try again later.</p>
            </div>
          </div>
        ) : (
          <main className="p-6 md:p-10 lg:py-12 max-w-4xl mx-auto w-full space-y-8 flex-1">

          <div>
            <h1 className="font-bold font-bricolage text-2xl md:text-3xl text-slate-100 mb-2">Central Wallet</h1>
            <p className="text-slate-400 text-sm md:text-base">Track your platform rewards, pizza slice inventory, and premium Golden Ticket balances.</p>
          </div>

          {/* ── Balance Overview Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* SP Card */}
            <div className="relative overflow-hidden rounded-3xl p-8 glass-premium">
              {/* Ambient background glows (Optimized) */}
              <div className="absolute top-0 left-0 w-[500px] h-[500px] pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(139,92,246,0.04) 0%, transparent 70%)' }} />
              <div className="absolute bottom-0 right-0 w-[500px] h-[500px] pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 70% 70%, rgba(234,179,8,0.03) 0%, transparent 70%)' }} />
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400 font-semibold text-sm">Spurti Point Balance</span>
                <Flame className="text-green-400 animate-pulse" size={24} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black font-bricolage tracking-tight">{balance.spurtiPoints}</span>
                <span className="text-slate-400 font-bold text-sm">SP</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5 text-xs font-semibold">
                <div>
                  <span className="text-slate-500 block mb-1">Lifetime Earned</span>
                  <span className="text-green-400 font-bold text-sm font-bricolage">+{balance.lifetimeEarned} SP</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Lifetime Spent</span>
                  <span className="text-red-400 font-bold text-sm font-bricolage">-{balance.lifetimeSpent} SP</span>
                </div>
              </div>
            </div>

            {/* Pizza Inventory Card */}
            <PizzaInventoryCard
              pizzaSlices={pizzaSlices}
              onRedeem={handleRedeem}
              redeeming={redeeming}
            />
          </div>

          {/* ── Transaction History Section ── */}
          <div className="glass-card rounded-3xl p-6 md:p-8">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-2">
                <History className="text-slate-400" size={20} />
                <h2 className="font-bold font-bricolage text-lg text-slate-200">Transaction History</h2>
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/5">
                {['All', 'SP Earned', 'SP Spent', 'Pizza', 'Golden Tickets', 'Rewards'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeFilter === filter ? 'bg-white/10 text-slate-100 shadow-sm border border-white/5' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-white/5 rounded-3xl">
                <p className="text-slate-500 font-medium text-sm">No wallet activity matches your filter.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredTransactions.map(tx => {
                  const styles = getTransactionStyle(tx);
                  const tags = tx.tags || [];
                  const isCredit = tx.direction === 'credit' || (tx.amount > 0 && !tags.includes('sp_spent'));
                  const isPizzaTx = tags.includes('pizza') && tx.type !== 'pizza_redemption';
                  const currencyLabel = isPizzaTx ? 'slices' : 'SP';

                  return (
                    <div
                      key={tx._id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between py-4 px-3 rounded-2xl border border-transparent transition-all duration-300 ${styles.glow} group`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shadow-sm">
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[0.95rem] text-slate-200">{tx.description || tx.title}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {tags.map(tag => {
                                let badgeClass = '';
                                let label = '';
                                if (tag === 'sp_earned') { badgeClass = 'badge-green'; label = 'SP Earned'; }
                                else if (tag === 'sp_spent') { badgeClass = 'badge-red'; label = 'SP Spent'; }
                                else if (tag === 'pizza') { badgeClass = 'badge-yellow'; label = 'Pizza'; }
                                else if (tag === 'golden_ticket') { badgeClass = 'badge-gold'; label = 'Golden Ticket'; }
                                else if (tag === 'rewards') { badgeClass = 'badge-purple'; label = 'Rewards'; }
                                else return null;
                                return (
                                  <span key={tag} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeClass}`}>
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                            {new Date(tx.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 sm:mt-0 self-start sm:self-auto pl-14 sm:pl-0 flex items-center gap-2">
                        <span className={`text-base font-black font-bricolage tracking-tight ${styles.amountColor}`}>
                          {isCredit ? '+' : '-'}{Math.abs(tx.amount)} {currencyLabel}
                        </span>
                      </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
          </main>
        )}
      </div>
    </div>
  );
}
