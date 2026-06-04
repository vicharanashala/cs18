import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import {
  Book, Search, Tag, TrendingUp, Clock, ChevronRight,
  LogIn, UserPlus, Sparkles, HelpCircle,
} from 'lucide-react';
import FAQPromotionModal from '../components/FAQPromotionModal';
import { usePublishedFaqs, useFaqCategories } from '../hooks/useQueries';

/** Normalize a category name for grouping */
function normalizeCategory(cat) {
  if (!cat) return 'General';
  if (typeof cat === 'object') return cat.name || 'General';
  const s = String(cat);
  const c = s.charAt(0).toUpperCase() + s.slice(1);
  return c;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { data: faqs = [], isLoading: loadingFaqs } = usePublishedFaqs();
  const { data: categories = [] } = useFaqCategories();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [promoSource, setPromoSource] = useState(null);
  const [popularSearches, setPopularSearches] = useState([]);
  const [didYouMean, setDidYouMean] = useState([]);

  const loading = loadingFaqs;
  const isLoggedIn = Boolean(localStorage.getItem('token'));

  // Fetch popular searches
  useEffect(() => {
    axiosClient.get('/search/popular')
      .then(r => setPopularSearches(r.data.popular || []))
      .catch(() => {});
  }, []);

  // Live search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const faqRes = await axiosClient.get('/search', { params: { q: searchQuery, type: 'faq' } });
        const merged = (faqRes.data.matches || []).slice(0, 8);
        setSearchResults(merged);

        // Did you mean? — get suggestions if no exact-ish results
        if (merged.length === 0) {
          const sugRes = await axiosClient.get('/search/suggest', { params: { q: searchQuery } });
          setDidYouMean(sugRes.data.suggestions || []);
        } else {
          setDidYouMean([]);
        }
      } catch { setSearchResults([]); setDidYouMean([]); }
      finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  function handleDidYouMeanClick(term) {
    setSearchQuery(term);
  }

  const popular = [...faqs].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5);
  const recent = [...faqs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  function openFaq(faq) {
    navigate(`/faq/${faq._id}`, { state: { faq } });
  }

  function handleAskQuestion() {
    if (!isLoggedIn) { setShowPromo(true); return; }
    navigate('/discussions');
  }

  return (
    <div className="min-h-screen bg-mesh font-inter">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 glass-strong border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Book size={16} className="text-slate-300" strokeWidth={2} />
            </div>
            <span className="font-bold font-bricolage text-lg text-slate-100">FAQ Hive</span>
          </button>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <button onClick={() => navigate('/faqs')} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-slate-100 hover:bg-white/5 transition-all font-bricolage">
              FAQs
            </button>
            <button onClick={() => navigate('/categories')} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-slate-100 hover:bg-white/5 transition-all font-bricolage">
              Categories
            </button>
            <button onClick={() => document.getElementById('home-search')?.focus()} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-slate-100 hover:bg-white/5 transition-all font-bricolage">
              Search
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-200 transition-all font-bricolage border border-white/5">
                <Book size={14} /> Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-slate-100 hover:bg-white/5 transition-all font-bricolage">
                  <LogIn size={14} /> Sign In
                </button>
                <button onClick={() => navigate('/register')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/15 text-slate-100 transition-all font-bricolage border border-white/10">
                  <UserPlus size={14} /> Create Account
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Search */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <HelpCircle size={28} className="text-amber-400" />
          <h1 className="text-3xl font-bold font-bricolage text-slate-100 tracking-tight">Frequently Asked Questions</h1>
        </div>
        <p className="text-slate-400 mb-8 font-bricolage">Find instant answers to common questions</p>

        {/* Search bar */}
        <div className="relative" id="home-search">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search FAQs…"
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.06] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.08] transition-all font-inter"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            </div>
          )}
          {/* Live results */}
          {searchQuery && (
            <div className="absolute top-full mt-2 left-0 right-0 glass-strong rounded-2xl border border-white/10 overflow-hidden z-20 shadow-xl max-h-80 overflow-y-auto">
              {/* Did you mean? */}
              {didYouMean.length > 0 && (
                <div className="px-5 py-3 bg-amber-500/5 border-b border-amber-500/10 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-bricolage">Did you mean?</span>
                  {didYouMean.map(s => (
                    <button
                      key={s}
                      onClick={() => handleDidYouMeanClick(s)}
                      className="text-xs text-amber-300 hover:text-amber-200 underline underline-offset-2 font-bricolage transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {searchResults.length === 0 && !isSearching && (
                <p className="px-5 py-4 text-sm text-slate-500 text-center">No results for "{searchQuery}"</p>
              )}
              {searchResults.map(faq => (
                <button
                  key={faq._id}
                  onClick={() => { openFaq(faq); setSearchQuery(''); }}
                  className="w-full text-left px-5 py-3.5 hover:bg-white/[0.06] border-b border-white/[0.05] last:border-0 transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-200 font-bricolage line-clamp-1">
                    {faq.canonicalQuestion || faq.question || faq.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {normalizeCategory(faq.category)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-600 mt-3">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 font-mono">Esc</kbd> to clear
        </p>

        {/* Popular searches */}
        {!searchQuery && popularSearches.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest font-bricolage">Popular:</span>
            {popularSearches.map(term => (
              <button
                key={term}
                onClick={() => setSearchQuery(term)}
                className="text-xs text-slate-400 hover:text-amber-400 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-amber-500/10 border border-white/[0.05] hover:border-amber-500/20 transition-all font-bricolage"
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Category Pills */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-8">
          <div className="flex items-center gap-2 flex-wrap">
            <Tag size={13} className="text-slate-500 flex-shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => navigate('/categories', { state: { highlight: cat.name } })}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-all font-bricolage"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Main Content Grid */}
      <main className="max-w-6xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-20">
            <HelpCircle size={40} className="text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-bricolage">No FAQs published yet. Be the first to contribute!</p>
            <button onClick={() => navigate('/register')} className="mt-4 px-6 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-sm font-semibold font-bricolage transition-all">
              Create Account to Contribute
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Most Popular */}
            <div className="glass-strong rounded-2xl border border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-amber-400" />
                <h2 className="font-bold font-bricolage text-slate-100 text-sm">Most Popular</h2>
              </div>
              <div className="space-y-2">
                {popular.map((faq, i) => (
                  <button key={faq._id} onClick={() => openFaq(faq)}
                    className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group">
                    <span className={`text-[10px] font-bold font-bricolage w-4 mt-0.5 flex-shrink-0 ${i === 0 ? 'text-amber-400' : 'text-slate-600'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-300 group-hover:text-slate-100 font-bricolage line-clamp-2 leading-snug">{faq.canonicalQuestion || faq.question || faq.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-600">{normalizeCategory(faq.category)}</span>
                        <span className="text-[10px] text-slate-700">{(faq.viewCount || 0)} views</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent FAQs */}
            <div className="glass-strong rounded-2xl border border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={14} className="text-cyan-400" />
                <h2 className="font-bold font-bricolage text-slate-100 text-sm">Recent FAQs</h2>
              </div>
              <div className="space-y-2">
                {recent.map((faq, i) => (
                  <button key={faq._id} onClick={() => openFaq(faq)}
                    className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group">
                    <span className="text-[10px] font-bold font-bricolage w-4 mt-0.5 flex-shrink-0 text-slate-600">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-300 group-hover:text-slate-100 font-bricolage line-clamp-2 leading-snug">{faq.canonicalQuestion || faq.question || faq.title}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{new Date(faq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Browse Categories */}
            <div className="glass-strong rounded-2xl border border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Tag size={14} className="text-violet-400" />
                <h2 className="font-bold font-bricolage text-slate-100 text-sm">Browse Categories</h2>
              </div>
              <div className="space-y-1.5">
                {categories.slice(0, 8).map((cat) => (
                  <button key={cat.name} onClick={() => navigate('/categories', { state: { highlight: cat.name } })}
                    className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors group">
                    <span className="text-sm font-semibold text-slate-400 group-hover:text-slate-200 font-bricolage">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600 font-bricolage">{cat.count}</span>
                      <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
              {categories.length > 8 && (
                <button onClick={() => navigate('/categories')} className="w-full mt-3 py-2 text-xs font-semibold text-amber-400/70 hover:text-amber-400 font-bricolage text-center transition-colors">
                  + {categories.length - 8} more categories
                </button>
              )}
            </div>

          </div>
        )}

        {/* Ask / Contribute CTA */}
        <div className="mt-10 glass-strong rounded-2xl border border-white/10 p-8 text-center">
          <HelpCircle size={32} className="text-amber-400/60 mx-auto mb-3" />
          <h3 className="text-lg font-bold font-bricolage text-slate-100 mb-1">Didn't find what you need?</h3>
          <p className="text-sm text-slate-500 mb-5">Ask a question or contribute your own FAQ to help others.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button onClick={handleAskQuestion}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-sm font-semibold font-bricolage transition-all">
              <HelpCircle size={15} /> Ask a Question
            </button>
            <button onClick={() => isLoggedIn ? navigate('/contribute-faq') : (setShowPromo(true))}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-semibold font-bricolage transition-all">
              <Sparkles size={15} /> Contribute FAQ
            </button>
          </div>
        </div>
      </main>

      <FAQPromotionModal isOpen={showPromo} onClose={() => setShowPromo(false)} source={promoSource} />
    </div>
  );
}