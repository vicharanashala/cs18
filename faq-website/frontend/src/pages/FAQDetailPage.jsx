import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Book, ArrowLeft, Eye, Tag, Clock, ThumbsUp, Share2, Lock } from 'lucide-react';
import AttachmentDisplay from '../components/AttachmentDisplay';
import FAQPromotionModal from '../components/FAQPromotionModal';

function normalizeCategory(cat) {
  if (!cat) return 'General';
  if (typeof cat === 'object') return cat.name || 'General';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function FAQDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [faq, setFaq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPromo, setShowPromo] = useState(false);
  const isLoggedIn = Boolean(localStorage.getItem('token'));

  useEffect(() => {
    if (!id) { navigate('/faqs'); return; }

    // ── Fast path: use the faq object already passed via navigate() state ──
    // FAQListPage.jsx calls navigate(`/faq/${faq._id}`, { state: { faq } })
    // so we can skip the API round-trip entirely for list→detail navigation.
    const stateData = location.state?.faq;
    if (stateData && (stateData._id === id || stateData.id === id)) {
      setFaq(stateData);
      setLoading(false);
      return;
    }

    // ── Slow path: direct URL load or stale state → fetch from backend ──
    axiosClient.get(`/faqs/${id}`, { timeout: 10000 })
      .then(r => setFaq(r.data.faq || r.data))
      .catch(() => {
        navigate('/faqs');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, location.state]);

  async function handleView() {
    if (!faq) return;
    try {
      await axiosClient.post(`/faqs/${faq._id}/view-session`, { readTimeInSeconds: 30 });
    } catch { /* best-effort */ }
  }

  useEffect(() => {
    if (faq) handleView();
  }, [faq?._id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh font-inter flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
      </div>
    );
  }

  if (!faq) return null;

  const answerText = faq.canonicalAnswer
    ? faq.canonicalAnswer.replace(/<[^>]+>/g, '')
    : (faq.answer || '').replace(/<[^>]+>/g, '');

  return (
    <div className="min-h-screen bg-mesh font-inter">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <Book size={16} className="text-slate-300" />
            </div>
            <span className="font-bold font-bricolage text-lg text-slate-100 truncate">FAQ Detail</span>
          </div>
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

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Category + views */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-slate-500 font-bricolage">
            <Tag size={11} />{normalizeCategory(faq.category || faq.categoryId)}
          </span>
          {faq.viewCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-600 font-bricolage">
              <Eye size={11} />{faq.viewCount} views
            </span>
          )}
          {faq.wordCount && (
            <span className="flex items-center gap-1 text-xs text-slate-600 font-bricolage">
              <Clock size={11} />{Math.ceil((faq.wordCount || 0) / 200)} min read
            </span>
          )}
        </div>

        {/* Question */}
        <h1 className="text-2xl font-bold font-bricolage text-slate-100 mb-6 leading-snug tracking-tight">
          {faq.canonicalQuestion || faq.question || faq.title}
        </h1>

        {/* Answer */}
        <div className="glass-strong rounded-2xl border border-white/10 p-6 mb-6">
          <p className="text-sm text-slate-300 leading-relaxed font-inter whitespace-pre-wrap">
            {answerText || 'No answer provided yet.'}
          </p>
        </div>

        {/* Attachments */}
        {faq.attachments?.length > 0 && (
          <div className="mb-6">
            <AttachmentDisplay attachments={faq.attachments} showUploader />
          </div>
        )}

        {/* Helpful? */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <ThumbsUp size={15} className="text-slate-600" />
            <span className="text-xs text-slate-600 font-bricolage">Was this helpful?</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (!isLoggedIn) { setShowPromo(true); return; } navigate('/discussions'); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 font-bricolage transition-all"
            >
              <Lock size={11} className="text-amber-400/60" /> Ask Follow-up
            </button>
            <button
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 font-bricolage transition-all"
            >
              <Share2 size={11} /> Share
            </button>
          </div>
        </div>

        {/* Back to list */}
        <button onClick={() => navigate('/faqs')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 font-bricolage transition-colors">
          <ArrowLeft size={14} /> Back to FAQs
        </button>
      </main>

      <FAQPromotionModal isOpen={showPromo} onClose={() => setShowPromo(false)} />
    </div>
  );
}