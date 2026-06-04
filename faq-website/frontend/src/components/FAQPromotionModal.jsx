/**
 * FAQPromotionModal — shared modal for promoting any knowledge source to FAQ.
 *
 * Sources: 'oaq' | 'golden-ticket' | 'contribution'
 * OAQ:    calls POST /admin/promote-faq
 * GT/C:   calls POST /admin/faqs/promote-knowledge
 *
 * Phase 2F only. No analytics, no audit log UI.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Eye, Edit3 } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import CategoryDropdown from './CategoryDropdown';

const SOURCE_LABELS = {
  'oaq':           'Once Asked Question',
  'golden-ticket': 'Golden Ticket',
  'contribution':  'FAQ Contribution',
};

export default function FAQPromotionModal({ isOpen, onClose, source, sourceItem, onPromoted }) {
  const [mode, setMode] = useState('edit'); // 'edit' | 'preview'
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  // Editable fields
  const [question, setQuestion] = useState('');
  const [answer, setAnswer]     = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags]         = useState('');

  // Load initial values from sourceItem
  useEffect(() => {
    if (!isOpen || !sourceItem) return;

    // Fetch dynamic categories
    axiosClient.get('/faqs/categories')
      .then(r => {
        const names = r.data.categories?.map(c => c.name) || ['General', 'Other'];
        setCategories(names);
        
        let initialCat = 'General';
        if (source === 'oaq') {
          setQuestion(sourceItem.canonicalQuestion || sourceItem.originalQuestion || '');
          setAnswer(sourceItem.aiGeneratedAnswer || '');
          initialCat = names.find(c => c.toLowerCase() === (sourceItem.category || '').toLowerCase()) || 'General';
          setTags((sourceItem.generatedTags || []).join(', '));
        } else if (source === 'golden-ticket') {
          setQuestion(sourceItem.title || '');
          setAnswer(sourceItem.context || '');
          initialCat = 'General';
          setTags('');
        } else if (source === 'contribution') {
          setQuestion(sourceItem.generatedQuestion || sourceItem.originalQuestion || '');
          setAnswer(sourceItem.generatedAnswer || sourceItem.originalAnswer || '');
          initialCat = names.find(c => c.toLowerCase() === (sourceItem.category || '').toLowerCase()) || 'General';
          setTags((sourceItem.hashtags || []).join(', '));
        }
        setCategory(initialCat);
        setMode('edit');
      })
      .catch(() => {
        setCategories(['General', 'Other']);
        setCategory('General');
        setMode('edit');
      });
  }, [isOpen, sourceItem, source]);

  if (!isOpen) return null;

  const canPublish = question.trim() && answer.trim() && category && category !== 'Other';

  const handlePublish = async () => {
    if (!canPublish) {
      toast.error('Question, Answer, and Category are all required.');
      return;
    }
    setLoading(true);
    try {
      if (source === 'oaq') {
        // OAQ: existing promote-faq endpoint
        const isOtherSelected = category === 'Other';
        await axiosClient.post('/admin/promote-faq', {
          clusterId: sourceItem._id,
          categoryName: isOtherSelected ? 'General' : category,
          editedQuestion: question.trim(),
          editedOriginalQuestion: (sourceItem.originalQuestion || '').trim(),
          editedAnswer: answer.trim(),
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          customCategory: isOtherSelected ? category : null,
        });
      } else {
        // GT + Contribution: new unified endpoint
        await axiosClient.post('/admin/faqs/promote-knowledge', {
          source,
          sourceId: sourceItem._id,
          question: question.trim(),
          answer: answer.trim(),
          category,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        });
      }
      toast.success('FAQ published successfully!');
      onPromoted?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to publish FAQ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-strong rounded-3xl shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-9 py-7 border-b border-white/5">
            <div>
              <div className="text-xs font-bold text-purple-400 uppercase tracking-widest font-bricolage mb-1">
                {SOURCE_LABELS[source] || source}
              </div>
              <h2 className="text-2xl font-bold font-bricolage text-slate-900 dark:text-slate-100">
                Promote to FAQ
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Mode toggle */}
              <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
                <button
                  onClick={() => setMode('edit')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold font-bricolage transition-all ${
                    mode === 'edit'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  onClick={() => setMode('preview')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold font-bricolage transition-all ${
                    mode === 'preview'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye size={14} /> Preview
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          {mode === 'edit' ? (
            <div className="px-9 py-8 space-y-6 flex-1">
              {/* Question */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-bricolage">
                  Question <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="Enter the FAQ question..."
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30 transition-all resize-none"
                />
              </div>

              {/* Answer */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-bricolage">
                  Answer <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={5}
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Enter the FAQ answer..."
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30 transition-all resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-bricolage">
                  Category <span className="text-red-400">*</span>
                </label>
                <CategoryDropdown
                  value={category}
                  onChange={val => setCategory(val)}
                  categories={categories}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-bricolage">
                  Tags <span className="text-slate-600">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="e.g. certificates, dates, noc"
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30 transition-all"
                />
              </div>
            </div>
          ) : (
            /* Preview mode — shows exactly how users will see the FAQ */
            <div className="px-9 py-8 flex-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 font-bricolage">
                FAQ Preview
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">❓</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-snug font-bricolage">
                    {question.trim() || <span className="text-slate-600 italic font-normal text-sm">No question entered</span>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">💡</span>
                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {answer.trim() || <span className="text-slate-600 italic font-normal text-sm">No answer entered</span>}
                  </div>
                </div>
                {category && category !== 'Other' && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-sm">📁</span>
                    <span className="text-sm font-semibold text-purple-400">{category}</span>
                  </div>
                )}
                {tags.trim() && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <span key={tag} className="text-xs font-bold bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Warning if missing required fields */}
              {(!question.trim() || !answer.trim() || !category || category === 'Other') && (
                <div className="mt-6 flex items-start gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>Question, Answer, and a Category are required before publishing.</span>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-9 py-7 border-t border-white/5 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-bricolage">
              {source === 'oaq' && '⚠️ This will mark the OAQ as Promoted and archive the cluster.'}
              {source === 'golden-ticket' && '⚠️ This will mark the Golden Ticket as resolved and refund the creator.'}
              {source === 'contribution' && '⚠️ This will approve the contribution.'}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl text-sm font-bold font-bricolage text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={loading || !canPublish}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold font-bricolage bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading
                  ? <span className="animate-spin text-lg">⏳</span>
                  : <CheckCircle size={16} />}
                {loading ? 'Publishing…' : 'Publish FAQ'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}