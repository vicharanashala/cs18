import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFaqCategories } from '../hooks/useQueries';
import { Book, Tag, ChevronRight, Search } from 'lucide-react';

function normalizeCategory(cat) {
  if (!cat) return 'General';
  if (typeof cat === 'object') return cat.name || 'General';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function CategoriesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: categoriesData = [], isLoading } = useFaqCategories();
  
  const categories = categoriesData;
  const faqsCount = categories.reduce((acc, cat) => acc + cat.count, 0);
  const loading = isLoading;
  const [searchQuery, setSearchQuery] = useState('');
  const [highlight, setHighlight] = useState(null);
  const searchInputRef = useRef(null);
  
  const isLoggedIn = Boolean(localStorage.getItem('token'));

  useEffect(() => {
    if (location.state?.highlight) setHighlight(location.state.highlight);
  }, [location.state]);

  const filtered = searchQuery
    ? categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : categories;

  function openFaq(faq) {
    navigate(`/faq/${faq._id}`, { state: { faq } });
  }

  return (
    <div className="min-h-screen bg-mesh font-inter">
      <header className="sticky top-0 z-30 glass-strong border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 hover:opacity-80">
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
        <h1 className="text-2xl font-bold font-bricolage text-slate-100 mb-2 tracking-tight">Categories</h1>
        <p className="text-sm text-slate-500 mb-6 font-bricolage">{categories.length} categories · {faqsCount} total FAQs</p>

        {/* Search */}
        <div className="relative mb-7">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter categories…" autoFocus
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.06] border border-white/10 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-amber-500/40 transition-all font-inter"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500 font-bricolage">No categories match "{searchQuery}"</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(cat => (
              <button
                key={cat.name}
                onClick={() => navigate('/faqs', { state: { category: cat.name } })}
                className={`glass-card rounded-2xl p-5 text-left hover:bg-white/[0.04] border-white/5 transition-all group ${highlight === cat.name ? 'ring-1 ring-amber-500/40' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag size={13} className="text-violet-400" />
                      <h3 className="font-bold font-bricolage text-slate-100 text-sm">{cat.name}</h3>
                      {highlight === cat.name && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold font-bricolage">selected</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-bricolage mb-3">{cat.count} {cat.count === 1 ? 'FAQ' : 'FAQs'}</p>
                    {cat.recent && (
                      <p className="text-xs text-slate-600 font-bricolage line-clamp-2 leading-relaxed">
                        {cat.recent.canonicalQuestion || cat.recent.question || cat.recent.title}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}