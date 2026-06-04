import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import StatusBadge from '../../components/StatusBadge';


export default function ReviewQueueTab({ openPromotionModal }) {
  const [queue, setQueue] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editStates, setEditStates] = useState({});
  const [submittingAction, setSubmittingAction] = useState(null);

  const fetchQueue = async () => {
    try {
      const [queueRes, catRes] = await Promise.all([
        axiosClient.get('/admin/review-queue'),
        axiosClient.get('/faqs/categories').catch(() => ({ data: { categories: [] } }))
      ]);
      const clusters = queueRes.data.clusters;
      const cats = catRes.data.categories?.length > 0 ? catRes.data.categories.map(c => c.name) : ['General', 'Other'];
      setCategories(cats);
      setQueue(clusters);

      const initial = {};
      clusters.forEach(c => {
        const matchedCat = cats.find(cat => cat.toLowerCase() === (c.category || '').toLowerCase());
        initial[c._id] = {
          editedQuestion: c.canonicalQuestion || '',
          editedOriginalQuestion: c.originalQuestion || '',
          editedAnswer: c.aiGeneratedAnswer || '',
          categoryName: matchedCat || 'Other',
          customCategory: c.customCategory || '',
          tags: (c.tags || []).join(', ')
        };
      });
      setEditStates(initial);
    } catch (err) {
      toast.error('Failed to load review queue');
    }
  };

  useEffect(() => {
    fetchQueue();
    const intervalId = setInterval(fetchQueue, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const handleEditChange = (clusterId, field, value) => {
    setEditStates(prev => ({
      ...prev,
      [clusterId]: {
        ...prev[clusterId],
        [field]: value
      }
    }));
  };

  const rejectCluster = async (clusterId) => {
    if (!window.confirm("Are you sure you want to reject this cluster? This action is permanent.")) return;
    setSubmittingAction(`reject-${clusterId}`);
    try {
      await axiosClient.post('/admin/reject-faq', { clusterId });
      toast.success('Cluster rejected');
      fetchQueue();
    } catch {
      toast.error('Failed to reject');
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold font-bricolage tracking-tight text-slate-100">Review Queue (General Queries)</h2>
        <StatusBadge variant="purple">
          {queue.length} Pending
        </StatusBadge>
      </div>

      {queue.length === 0 ? (
        <div className="glass-strong rounded-3xl p-16 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 font-semibold border border-slate-200 dark:border-white/5 shadow-sm bg-white dark:bg-transparent">
          <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-full mb-4">
            <CheckCircle size={32} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-lg text-slate-800 dark:text-slate-300">No discussions pending review — all caught up!</p>
          <p className="text-xs font-normal mt-2 flex items-center gap-1"><RefreshCw size={12} className="animate-spin-slow" /> Auto-refreshing...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {queue.map(cluster => {
            const edits = editStates[cluster._id] || {};
            return (
              <motion.div
                key={cluster._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong rounded-3xl overflow-hidden border border-white/5 shadow-2xl"
              >
                <div className="px-9 py-8 border-b border-white/5 bg-white/[0.005]">
                  <div className="flex justify-between items-start gap-6 mb-6">
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-1.5 font-bricolage">Generalized Title / Question</label>
                        <input
                          type="text"
                          value={edits.editedQuestion || ''}
                          onChange={e => handleEditChange(cluster._id, 'editedQuestion', e.target.value)}
                          placeholder="Normalize and edit the question..."
                          className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-slate-100 focus:outline-none focus:border-purple-400/50 transition-all font-inter"
                        />
                      </div>
                    </div>
                    <StatusBadge variant="purple" className="self-start mt-6">
                      {cluster.submissionsCount === 0
                        ? 'No merges yet'
                        : `${cluster.submissionsCount} merged`}
                    </StatusBadge>
                  </div>

                  {cluster.originalQuestion && (
                    <div className="mt-4">
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-1.5 font-bricolage">Original Student Ticket (Editable)</label>
                      <input
                        type="text"
                        value={edits.editedOriginalQuestion || ''}
                        onChange={e => handleEditChange(cluster._id, 'editedOriginalQuestion', e.target.value)}
                        placeholder="Edit the original question..."
                        className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-slate-300 focus:outline-none focus:border-purple-400/50 transition-all font-inter italic"
                      />
                    </div>
                  )}
                </div>

                <div className="px-9 py-8 space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-2 font-bricolage">Answer Description</label>
                    <textarea
                      rows={4}
                      value={edits.editedAnswer || ''}
                      onChange={e => handleEditChange(cluster._id, 'editedAnswer', e.target.value)}
                      placeholder="Refine the public answer..."
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-slate-100 focus:outline-none focus:border-purple-400/50 transition-all resize-none font-inter"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-2 font-bricolage">Category</label>
                      <select
                        value={edits.categoryName || ''}
                        onChange={e => handleEditChange(cluster._id, 'categoryName', e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-slate-200 focus:outline-none focus:border-purple-400/50 transition-all font-inter"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat} className="bg-slate-950 text-slate-200">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {edits.categoryName === 'Other' && (
                      <div className="animate-in fade-in duration-200">
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-2 font-bricolage">Rename Custom Category</label>
                        <input
                          type="text"
                          value={edits.customCategory || ''}
                          onChange={e => handleEditChange(cluster._id, 'customCategory', e.target.value)}
                          placeholder="e.g. Yaksha Chat, Offer Letter"
                          className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-slate-100 focus:outline-none focus:border-purple-400/50 transition-all font-inter"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-2 font-bricolage">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      value={edits.tags || ''}
                      onChange={e => handleEditChange(cluster._id, 'tags', e.target.value)}
                      placeholder="e.g. certificates, dates, noc"
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-sm text-slate-100 focus:outline-none focus:border-purple-400/50 transition-all font-inter"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 font-bricolage pt-4 border-t border-white/5">
                    <button
                      onClick={() => {
                        const payload = { ...edits, clusterId: cluster._id };
                        // We attach the edited data so the modal knows what to promote
                        openPromotionModal('oaq', { ...cluster, edits: payload });
                      }}
                      disabled={submittingAction === cluster._id}
                      className="flex-1 badge-green py-4 rounded-2xl font-bold hover:bg-green-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-green-900 dark:text-green-300 bg-green-100 dark:bg-green-900/30"
                    >
                      {submittingAction === cluster._id ? <span className="animate-spin text-lg">⏳</span> : <CheckCircle size={18} />}
                      Promote to FAQ
                    </button>
                    <button
                      onClick={() => rejectCluster(cluster._id)}
                      disabled={submittingAction === `reject-${cluster._id}`}
                      className="flex-1 badge-red py-4 rounded-2xl font-bold hover:bg-red-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-red-900 dark:text-red-300 bg-red-100 dark:bg-red-900/30"
                    >
                      {submittingAction === `reject-${cluster._id}` ? <span className="animate-spin text-lg">⏳</span> : <XCircle size={18} />}
                      Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
