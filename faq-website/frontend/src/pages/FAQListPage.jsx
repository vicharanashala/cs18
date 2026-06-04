import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Search, Book, Tag, ChevronRight, Filter } from 'lucide-react';
import FAQPromotionModal from '../components/FAQPromotionModal';
import { usePublishedFaqs } from '../hooks/useQueries';

function normalizeCategory(cat) {
  if (!cat) return 'General';
  if (typeof cat === 'object') return cat.name || 'General';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function FAQListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: faqs = [], isLoading } = usePublishedFaqs();
  const loading = isLoading;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showPromo, setShowPromo] = useState(false);
  const [didYouMean, setDidYouMean] = useState([]);
  const isLoggedIn = Boolean(localStorage.getItem('token'));

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const faqRes = await axiosClient.get('/search', { params: { q: searchQuery, type: 'faq' } });
        const faqs2 = (faqRes.data.matches || []).slice(0, 15);
        setSearchResults(faqs2);
        
        if (faqs2.length === 0) {
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

  // All unique categories
  const allCategories = [...new Set(faqs.map(f => normalizeCategory(f.category)))].sort();

  // Filtered list
  const displayList = searchQuery
    ? searchResults
    : selectedCategory
      ? faqs.filter(f => normalizeCategory(f.category) === selectedCategory)
      : faqs;

  function openFaq(faq) {
    navigate(`/faq/${faq._id}`, { state: { faq } });
  }

  return (
    <div className="min-h-screen bg-mesh font-inter">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Book size={16} className="text-slate-300" strokeWidth={2} />
            </div>
            <span className="font-bold font-bricolage text-lg text-slate-100">FAQ Hive</span>
          </button>
          <div className="flex items-center gap-2">
            {isLoggedIn
              ? <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-200 font-bricolage border border-white/5">Dashboard</button>
              : <>
                  <button onClick={() => navigate('/login')} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-slate-100 font-bricolage">Sign In</button>
                  <button onClick={() => navigate('/register')} className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/15 text-slate-100 font-bricolage border border-white/10">Create Account</button>
                </>
            }
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold font-bricolage text-slate-100 mb-6 tracking-tight">All FAQs</h1>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search FAQs…" autoFocus
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.06] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-amber-500/40 transition-all font-inter"
          />
          {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />}
        </div>

        {/* Live results */}
        {searchQuery && (
          <div className="mb-6 glass-strong rounded-2xl border border-white/10 overflow-hidden">
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
              <button key={faq._id} onClick={() => { openFaq(faq); setSearchQuery(''); }}
                className="w-full text-left px-5 py-3.5 hover:bg-white/[0.06] border-b border-white/[0.05] last:border-0 transition-colors">
                <p className="text-sm font-semibold text-slate-200 font-bricolage line-clamp-1">
                  {faq.canonicalQuestion || faq.question || faq.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{normalizeCategory(faq.category)}</p>
              </button>
            ))}
          </div>
        )}

        {/* Category filter */}
        {!searchQuery && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Filter size={13} className="text-slate-600 flex-shrink-0" />
            <button onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-bricolage border transition-all ${!selectedCategory ? 'bg-white/10 border-white/15 text-slate-200' : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300'}`}>
              All
            </button>
            {allCategories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-bricolage border transition-all ${selectedCategory === cat ? 'bg-white/10 border-white/15 text-slate-200' : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300'}`}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* FAQ list */}
        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
          ))}</div>
        ) : displayList.length === 0 ? (
          <div className="text-center py-20 text-slate-500 font-bricolage">
            {searchQuery ? `No FAQs match "${searchQuery}"` : 'No FAQs in this category yet.'}
          </div>
        ) : (
          <div className="space-y-2">
            {displayList.map(faq => (
              <button key={faq._id} onClick={() => openFaq(faq)}
                className="w-full text-left glass-card rounded-2xl p-5 hover:bg-white/[0.04] border-white/5 transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 font-bricolage group-hover:text-slate-100 line-clamp-2 leading-snug">
                      {faq.canonicalQuestion || faq.question || faq.title}
                    </p>
                    {faq.canonicalAnswer && (
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{faq.canonicalAnswer.replace(/<[^>]+>/g, '')}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[10px] text-slate-600 font-bricolage">
                        <Tag size={9} />{normalizeCategory(faq.category)}
                      </span>
                      {faq.viewCount > 0 && (
                        <span className="text-[10px] text-slate-700">{faq.viewCount} views</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <FAQPromotionModal isOpen={showPromo} onClose={() => setShowPromo(false)} />
    </div>
  );
}