import React, { useState, useEffect, useCallback } from 'react';
import ExpandableText from './ExpandableText';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Merge, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle, XCircle, AlertTriangle, Search, Zap,
} from 'lucide-react';

/** Score badge colour by similarity tier */
function scoreColour(score) {
  if (score >= 0.95) return 'text-green-400 bg-green-500/10 border-green-500/20';
  if (score >= 0.88) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (score >= 0.82) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
}

function scoreLabel(score, method) {
  if (score >= 0.98) return '🔴 Exact duplicate';
  if (method === 'exact') return '🔴 Exact (normalized)';
  if (score >= 0.88) return '🟡 High similarity';
  if (score >= 0.82) return '🟠 Threshold match';
  return '🟠 Partial match';
}

export default function DeduplicationSection() {
  const [threshold, setThreshold]   = useState(0.82);
  const [pairs, setPairs]           = useState([]);
  const [summary, setSummary]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [running, setRunning]       = useState(false);
  const [dryRunResult, setDryResult]= useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [merging, setMerging]       = useState(null);  // pair key being merged

  const fetchPairs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/admin/duplicates?threshold=${threshold}`);
      setPairs(res.data.pairs || []);
      setSummary(res.data.summary);
    } catch (err) {
      toast.error('Failed to load duplicate suggestions');
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => { fetchPairs(); }, [fetchPairs]);

  /** Run deduplication in dry-run mode (show what would happen) */
  const handleDryRun = async () => {
    setRunning(true);
    setDryResult(null);
    try {
      const res = await axiosClient.post('/admin/run-deduplication', { apply: false, threshold });
      setDryResult(res.data);
    } catch (err) {
      toast.error('Dry run failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setRunning(false);
    }
  };

  /** Run deduplication with actual writes */
  const handleApply = async () => {
    if (!window.confirm(`This will merge ${pairs.length} duplicate cluster(s). Continue?`)) return;
    setRunning(true);
    setDryResult(null);
    try {
      const res = await axiosClient.post('/admin/run-deduplication', { apply: true, threshold });
      setDryResult(res.data);
      toast.success(`Merged ${res.data.merged} / ${res.data.summary?.total} pairs`);
      fetchPairs();  // refresh the list
    } catch (err) {
      toast.error('Deduplication failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setRunning(false);
    }
  };

  /** Merge a single pair manually */
  const handleMergeOne = async (masterId, dupId) => {
    const key = `${masterId}::${dupId}`;
    setMerging(key);
    try {
      const res = await axiosClient.post('/admin/merge-duplicate', { masterId, duplicateId: dupId });
      toast.success(res.data.message);
      setPairs(prev => prev.filter(
        p => p.master._id !== masterId || p.duplicate._id !== dupId
      ));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Merge failed');
    } finally {
      setMerging(null);
    }
  };

  return (
    <div className="mb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold font-bricolage tracking-tight text-violet-400 flex items-center gap-2">
            <Layers size={24} className="text-violet-400" />
            Semantic Deduplication
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Find and merge semantically identical question threads — old duplicates won't appear as separate cards.
          </p>
        </div>
        {summary && (
          <div className="flex flex-wrap gap-3">
            <span className="badge-violet">{summary.total} pair(s) found</span>
            <span className="badge-gray">{summary.clustersChecked} clusters checked</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
        {/* Threshold slider */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-bricolage whitespace-nowrap">
            Threshold
          </label>
          <input
            type="range"
            min={0.70}
            max={0.95}
            step={0.01}
            value={threshold}
            onChange={e => { setThreshold(parseFloat(e.target.value)); setDryResult(null); }}
            className="w-32 accent-violet-400"
          />
          <span className="text-sm font-bold font-bricolage text-violet-300 min-w-[42px]">
            {threshold.toFixed(2)}
          </span>
        </div>

        <button
          onClick={fetchPairs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-sm font-bold font-bricolage transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
          Scan
        </button>

        <button
          onClick={handleDryRun}
          disabled={running || pairs.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-300 text-sm font-bold font-bricolage transition-all cursor-pointer disabled:opacity-50"
        >
          {running ? <RefreshCw size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
          Preview Merge
        </button>

        <button
          onClick={handleApply}
          disabled={running || pairs.length === 0}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border border-violet-400/30 text-white text-sm font-bold font-bricolage shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {running ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
          Run &amp; Merge All
        </button>
      </div>

      {/* Dry-run / apply result banner */}
      <AnimatePresence>
        {dryRunResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className={`rounded-2xl p-5 border text-sm font-bricolage font-semibold ${
              dryRunResult.dryRun
                ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300'
                : dryRunResult.success
                  ? 'bg-green-500/5 border-green-500/20 text-green-300'
                  : 'bg-red-500/5 border-red-500/20 text-red-300'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {dryRunResult.dryRun ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                <span className="font-bold">
                  {dryRunResult.dryRun
                    ? `Preview: ${dryRunResult.summary?.total} merge(s) detected — no changes written`
                    : dryRunResult.success
                      ? `✅ Applied: ${dryRunResult.merged} of ${dryRunResult.summary?.total} merges completed`
                      : '❌ Some merges may have failed'}
                </span>
              </div>
              {dryRunResult.dryRun && dryRunResult.pairs?.length > 0 && (
                <p className="text-yellow-400/70 text-xs">
                  Run "Run &amp; Merge All" to execute. Clusters will be merged — this can be rolled back.
                </p>
              )}
              {dryRunResult.merged > 0 && (
                <p className="text-green-400/70 text-xs mt-1">
                  {dryRunResult.merged} cluster(s) merged successfully.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pairs list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <RefreshCw size={24} className="animate-spin mr-3" />
          <span className="font-bricolage font-semibold">Scanning clusters for duplicates…</span>
        </div>
      ) : pairs.length === 0 ? (
        <div className="rounded-3xl p-16 flex flex-col items-center justify-center text-slate-500 border border-white/5 bg-white/[0.01]">
          <Layers size={40} className="mb-4 opacity-30" />
          <p className="font-bricolage font-semibold text-lg text-slate-400">No duplicate clusters found</p>
          <p className="text-sm text-slate-600 mt-1">Try lowering the threshold if you expect duplicates.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Column header */}
          <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 px-4 text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest font-bricolage">
            <span>Master Thread (keeps)</span>
            <span />
            <span>Duplicate (merges into left)</span>
            <span>Score / Action</span>
          </div>

          {pairs.map((pair, idx) => {
            const key = `${pair.master._id}::${pair.duplicate._id}`;
            const isExpanded = expandedId === key;
            const isMerging  = merging === key;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden"
              >
                <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center px-5 py-4">
                  {/* Master */}
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-green-400 uppercase tracking-widest mb-1 font-bricolage">
                      ✓ Master
                    </div>
                    <ExpandableText
                      text={(pair.master.canonicalQuestion || pair.master.rawQuestion || '(no question)')}
                      maxLines={2}
                      expandText="Read More"
                      collapseText="Show Less"
                      className="text-sm font-semibold font-bricolage text-slate-200 leading-snug"
                      toggleClassName="text-[10px]"
                    />
                    <div className="flex gap-3 mt-1.5 text-[10px] text-slate-500">
                      <span>👥 {pair.masterStats?.participants || 0}</span>
                      <span>📝 {pair.masterStats?.submissionsCount || 0}</span>
                      <span>💬 {pair.masterStats?.answerCount || 0}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="text-slate-600 dark:text-slate-500">
                    <Merge size={16} className="rotate-90" />
                  </div>

                  {/* Duplicate */}
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-orange-400 uppercase tracking-widest mb-1 font-bricolage">
                      ↳ Duplicate
                    </div>
                    <ExpandableText
                      text={(pair.duplicate.canonicalQuestion || pair.duplicate.rawQuestion || '(no question)')}
                      maxLines={2}
                      expandText="Read More"
                      collapseText="Show Less"
                      className="text-sm font-semibold font-bricolage text-slate-400 italic"
                      toggleClassName="text-[10px]"
                    />
                    <div className="flex gap-3 mt-1.5 text-[10px] text-slate-600">
                      <span>👥 {pair.dupStats?.participants || 0}</span>
                      <span>📝 {pair.dupStats?.submissionsCount || 0}</span>
                      <span>💬 {pair.dupStats?.answerCount || 0}</span>
                    </div>
                  </div>

                  {/* Score + Action */}
                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold font-bricolage ${scoreColour(pair.score)}`}>
                      <span>{Math.round(pair.score * 100)}%</span>
                      <span className="opacity-70">{pair.method}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : key)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-all"
                        title="Details"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button
                        onClick={() => handleMergeOne(pair.master._id, pair.duplicate._id)}
                        disabled={isMerging}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 text-[11px] font-bold font-bricolage transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isMerging ? <RefreshCw size={11} className="animate-spin" /> : <Merge size={11} />}
                        Merge
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden border-t border-white/5"
                    >
                      <div className="px-5 py-4 bg-yellow-500/5 grid grid-cols-2 gap-4 text-xs font-bricolage">
                        <div>
                          <div className="font-bold text-yellow-400 mb-2 uppercase tracking-widest text-[10px]">
                            Why they match
                          </div>
                          <div className="space-y-1.5 text-slate-400">
                            <div className="flex justify-between">
                              <span>Similarity score</span>
                              <span className="font-bold text-slate-200">{Math.round(pair.score * 100)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Match method</span>
                              <span className="font-bold text-slate-200">{pair.method}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Threshold used</span>
                              <span className="font-bold text-slate-200">{threshold.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-yellow-400 mb-2 uppercase tracking-widest text-[10px]">
                            What will happen
                          </div>
                          <ul className="space-y-1.5 text-slate-400">
                            <li>• All participants migrated to master</li>
                            <li>• Duplicate marked as MERGED (not deleted)</li>
                            <li>• Submissions re-pointed to master cluster</li>
                            <li>• Both preserved in DB for rollback</li>
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}