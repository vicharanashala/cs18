import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';
import { Activity, Folder, Plus, Trash2, Edit2, Check, X, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminCategoryTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const fetchCategoryStats = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/admin/categories/stats');
      setCategories(res.data.categories || []);
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryStats();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await axiosClient.post('/admin/categories', { name: newCategoryName });
      toast.success('Category created');
      setNewCategoryName('');
      fetchCategoryStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create category');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await axiosClient.delete(`/admin/categories/${id}`);
      toast.success('Category deleted');
      fetchCategoryStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete category');
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat._id);
    setEditName(cat.name);
  };

  const saveEdit = async (id) => {
    try {
      await axiosClient.put(`/admin/categories/${id}`, { name: editName });
      toast.success('Category updated');
      setEditingId(null);
      fetchCategoryStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update category');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-bricolage text-slate-100 flex items-center gap-2">
            <Folder className="text-indigo-400" size={24} /> System Categories
          </h2>
          <p className="text-sm text-slate-400 mt-1">Manage semantic categories used across the platform.</p>
        </div>
        <button
          onClick={fetchCategoryStats}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white/5 text-slate-300 hover:bg-white/10 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Stats
        </button>
      </div>

      <div className="glass-strong p-6 rounded-2xl border border-white/5">
        <h3 className="font-bold text-slate-200 mb-4">Create New Category</h3>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="Category Name"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
          <button type="submit" disabled={!newCategoryName.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center gap-2">
            <Plus size={18} /> Create
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {categories.map(cat => (
          <motion.div
            key={cat._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-3xl p-6 border border-white/5 shadow-xl transition-all group relative"
          >
            {editingId === cat._id ? (
              <div className="flex items-center gap-2 mb-4">
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-white/5 border border-indigo-500/50 rounded-lg px-2 py-1 text-slate-100 focus:outline-none"
                />
                <button onClick={() => saveEdit(cat._id)} className="text-green-400 hover:text-green-300 p-1 bg-white/5 rounded"><Check size={16} /></button>
                <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300 p-1 bg-white/5 rounded"><X size={16} /></button>
              </div>
            ) : (
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold font-bricolage text-slate-200">{cat.name}</h3>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <button onClick={() => startEdit(cat)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md text-slate-400 hover:text-indigo-400"><Edit2 size={14}/></button>
                  <button onClick={() => handleDelete(cat._id)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md text-slate-400 hover:text-red-400"><Trash2 size={14}/></button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total FAQs</p>
                <p className="text-2xl font-black text-slate-100 font-bricolage">{cat.count}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Views</p>
                <p className="text-2xl font-black text-slate-100 font-bricolage">{cat.views}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
