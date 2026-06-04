import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search, Filter, RefreshCw, Pin, Star, Archive, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from '../../components/StatusBadge';


export default function AdminFaqTab() {
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('active'); // active, archived
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFaqs, setTotalFaqs] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'General',
    hashtags: '',
    isPinned: false,
    isFeatured: false,
  });
  const [saving, setSaving] = useState(false);

  // Selected for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [debouncedSearch, filterCategory, filterStatus, page]);

  const fetchCategories = async () => {
    try {
      const res = await axiosClient.get('/faqs/categories');
      setCategories(res.data.categories?.map(c => c.name) || ['General', 'Other']);
    } catch (err) {
      setCategories(['General', 'Other']);
    }
  };

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/admin/faqs', {
        params: {
          search: debouncedSearch,
          category: filterCategory,
          status: filterStatus,
          page,
          limit: 15
        }
      });
      setFaqs(res.data.faqs);
      setTotalPages(res.data.pages);
      setTotalFaqs(res.data.total);
    } catch (err) {
      toast.error('Failed to fetch FAQs');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (faq = null) => {
    if (faq) {
      setEditingFaq(faq);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        hashtags: (faq.hashtags || []).join(', '),
        isPinned: faq.isPinned || false,
        isFeatured: faq.isFeatured || false,
      });
    } else {
      setEditingFaq(null);
      setFormData({
        question: '',
        answer: '',
        category: categories[0] || 'General',
        hashtags: '',
        isPinned: false,
        isFeatured: false,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingFaq(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        hashtags: formData.hashtags.split(',').map(t => t.trim()).filter(Boolean)
      };

      if (editingFaq) {
        await axiosClient.put(`/admin/faqs/${editingFaq._id}`, payload);
        toast.success('FAQ updated');
      } else {
        await axiosClient.post('/admin/faqs', payload);
        toast.success('FAQ created');
      }
      closeModal();
      fetchFaqs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleState = async (id, action, currentState) => {
    try {
      const endpoint = currentState ? `un${action}` : action;
      await axiosClient.patch(`/admin/faqs/${id}/${endpoint}`);
      toast.success(`FAQ updated`);
      fetchFaqs();
    } catch (err) {
      toast.error(`Failed to update FAQ`);
    }
  };

  const handleArchiveRestore = async (id, isArchived) => {
    try {
      const action = isArchived ? 'restore' : 'archive';
      await axiosClient.patch(`/admin/faqs/${id}/${action}`);
      toast.success(`FAQ ${action}d`);
      fetchFaqs();
    } catch (err) {
      toast.error('Failed to update FAQ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this FAQ?")) return;
    try {
      await axiosClient.delete(`/admin/faqs/${id}`);
      toast.success('FAQ deleted');
      fetchFaqs();
    } catch (err) {
      toast.error('Failed to delete FAQ');
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === faqs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(faqs.map(f => f._id)));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    if (action === 'delete' && !window.confirm(`Delete ${selectedIds.size} FAQs permanently?`)) return;

    try {
      await axiosClient.patch('/admin/faqs/bulk', {
        ids: Array.from(selectedIds),
        action
      });
      toast.success(`Bulk action "${action}" applied`);
      setSelectedIds(new Set());
      fetchFaqs();
    } catch (err) {
      toast.error('Failed to apply bulk action');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-bricolage text-slate-100">Knowledge Base</h2>
          <p className="text-sm text-slate-400 mt-1">Manage FAQs, organize categories, and tune answers.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
        >
          <Plus size={16} /> Create FAQ
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-strong p-4 rounded-2xl flex flex-wrap gap-4 items-center border border-white/5 shadow-md">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search questions or answers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          className="bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none"
        >
          <option value="active">Active FAQs</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl"
          >
            <span className="text-sm font-bold text-indigo-300">{selectedIds.size} FAQs selected</span>
            <div className="flex gap-2">
              <button onClick={() => handleBulkAction('feature')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white/5 hover:bg-white/10 text-slate-300">Feature</button>
              <button onClick={() => handleBulkAction('archive')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400">Archive</button>
              <button onClick={() => handleBulkAction('delete')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400">Delete</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <div className="glass-strong rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 w-12 text-center">
                  <input type="checkbox" checked={selectedIds.size === faqs.length && faqs.length > 0} onChange={toggleSelectAll} className="rounded border-white/10 bg-white/5" />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Question & Content</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Metrics</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Attributes</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                    Loading FAQs...
                  </td>
                </tr>
              ) : faqs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">
                    No FAQs found matching your filters.
                  </td>
                </tr>
              ) : (
                faqs.map(faq => (
                  <tr key={faq._id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4 text-center">
                      <input type="checkbox" checked={selectedIds.has(faq._id)} onChange={() => toggleSelect(faq._id)} className="rounded border-white/10 bg-white/5" />
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <p className="font-bold text-slate-200 line-clamp-2">{faq.question}</p>
                      <p className="text-sm text-slate-400 line-clamp-1 mt-1">{faq.answer}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-2 py-1 bg-white/5 rounded-lg text-slate-300 whitespace-nowrap">
                        {faq.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1"><span className="text-emerald-400">↑</span> {faq.helpfulCount || 0}</span>
                        <span className="flex items-center gap-1"><span className="text-red-400">↓</span> {faq.notHelpfulCount || 0}</span>
                        <span className="flex items-center gap-1 opacity-50">• {faq.viewCount || 0} views</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleToggleState(faq._id, 'pin', faq.isPinned)} className={`p-1.5 rounded border transition-colors ${faq.isPinned ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}>
                          <Pin size={14} />
                        </button>
                        <button onClick={() => handleToggleState(faq._id, 'feature', faq.isFeatured)} className={`p-1.5 rounded border transition-colors ${faq.isFeatured ? 'border-purple-500/40 text-purple-400 bg-purple-500/10' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}>
                          <Star size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(faq)} className="p-2 rounded hover:bg-white/10 text-blue-400 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleArchiveRestore(faq._id, faq.isArchived)} className="p-2 rounded hover:bg-white/10 text-orange-400 transition-colors"><Archive size={16} /></button>
                        <button onClick={() => handleDelete(faq._id)} className="p-2 rounded hover:bg-red-500/20 text-red-400 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-sm text-slate-400">Total: {totalFaqs}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-50 text-sm">Prev</button>
              <span className="px-3 py-1.5 text-sm">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-50 text-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl glass-strong border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <h3 className="text-2xl font-bold font-bricolage text-slate-100 mb-6">
                {editingFaq ? 'Edit FAQ' : 'Create New FAQ'}
              </h3>
              
              <form onSubmit={handleSave} className="space-y-5 overflow-y-auto pr-2 custom-scrollbar flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Question</label>
                  <input
                    type="text"
                    required
                    value={formData.question}
                    onChange={e => setFormData({ ...formData, question: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Answer (Markdown Supported)</label>
                  <textarea
                    required
                    rows="6"
                    value={formData.answer}
                    onChange={e => setFormData({ ...formData, answer: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500/50 resize-none font-inter"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
                    >
                      {categories.map(cat => <option key={cat} value={cat} className="bg-slate-900">{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.hashtags}
                      onChange={e => setFormData({ ...formData, hashtags: e.target.value })}
                      placeholder="e.g. exams, dates, noc"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>
                <div className="flex gap-6 py-2 border-t border-white/5 mt-4 pt-4">
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={formData.isPinned} onChange={e => setFormData({ ...formData, isPinned: e.target.checked })} className="rounded bg-white/10 border-white/20" />
                    <Pin size={16} /> Pin to top
                  </label>
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={formData.isFeatured} onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })} className="rounded bg-white/10 border-white/20" />
                    <Star size={16} /> Featured FAQ
                  </label>
                </div>
                
                <div className="flex justify-end gap-3 pt-6">
                  <button type="button" onClick={closeModal} className="px-6 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
                    {saving ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle size={18} />} Save FAQ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
