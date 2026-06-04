import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import StatusBadge from '../../components/StatusBadge';

export default function FAQContributionsTab({ openPromotionModal }) {
  const [contributions, setContributions] = useState([]);

  const fetchContributions = async () => {
    try {
      const res = await axiosClient.get('/admin/contributions/pending');
      setContributions(res.data.contributions || []);
    } catch (_) { /* silent */ }
  };

  useEffect(() => {
    fetchContributions();
    const intervalId = setInterval(fetchContributions, 15000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold font-bricolage tracking-tight text-blue-400 flex items-center gap-2">
          <span>📬</span> FAQ Contributions
        </h2>
        <StatusBadge variant="blue">
          {contributions.length} Pending
        </StatusBadge>
      </div>

      {contributions.length === 0 ? (
        <div className="glass-strong rounded-3xl p-16 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 font-semibold border border-blue-500/10 shadow-sm bg-white dark:bg-transparent">
          <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-full mb-4">
            <span className="text-3xl">📪</span>
          </div>
          <p className="text-lg text-slate-800 dark:text-slate-300">No pending contributions.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {contributions.map(contrib => (
            <motion.div
              key={contrib._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-3xl overflow-hidden border border-blue-500/20 shadow-xl"
            >
              <div className="px-9 py-7 bg-blue-500/[0.03] border-b border-white/5">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1 font-bricolage">
                      {contrib.sourceType || 'community'}
                    </div>
                    <h3 className="font-bold font-bricolage text-xl text-slate-100 leading-snug">
                      {contrib.generatedQuestion || contrib.originalQuestion}
                    </h3>
                  </div>
                  <StatusBadge variant="blue">
                    {contrib.category || 'Uncategorized'}
                  </StatusBadge>
                </div>
                {contrib.generatedQuestion && (
                  <p className="text-sm text-slate-500 italic">
                    Original: {contrib.originalQuestion}
                  </p>
                )}
              </div>

              {contrib.generatedAnswer && (
                <div className="px-9 py-6 border-b border-white/5">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-bricolage">AI-Generated Answer</div>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{contrib.generatedAnswer}</p>
                </div>
              )}

              {contrib.hashtags?.length > 0 && (
                <div className="px-9 py-4 flex flex-wrap gap-2 border-b border-white/5">
                  {contrib.hashtags.map(tag => (
                    <span key={tag} className="text-xs font-bold bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="px-9 py-6 flex items-center justify-between gap-4 bg-black/20">
                <p className="text-xs text-slate-500 font-bricolage">
                  Contributed{contrib.contributedBy?.email ? ` by ${contrib.contributedBy.email}` : ''}
                  {contrib.createdAt && ` on ${new Date(contrib.createdAt).toLocaleDateString()}`}
                </p>
                <button
                  onClick={() => openPromotionModal('contribution', contrib)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 transition-all font-bricolage cursor-pointer"
                >
                  <CheckCircle size={16} />
                  Promote to FAQ
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
