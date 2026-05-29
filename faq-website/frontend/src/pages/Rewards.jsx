import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import { Pizza, Star, ArrowRightLeft, ShieldCheck, History, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Rewards() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [userRes, transRes] = await Promise.all([
        axiosClient.get('/auth/me'),
        axiosClient.get('/rewards/transactions')
      ]);
      setUser(userRes.data.user);
      setTransactions(transRes.data.transactions);
    } catch (err) {
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleConvert = async () => {
    if (!user || user.pizzas < 2) return toast.error('You need at least 2 Pizzas!');
    setConverting(true);
    try {
      // Backend expects amountToTrade in multiples of 2
      await axiosClient.post('/rewards/trade', { currency: 'pizza', amountToTrade: 2 });
      toast.success('Successfully converted 2 Pizzas to 1 Spurti Point! 🎉');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400">Loading wallet...</div>;

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-inter text-slate-800 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl bg-white shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-bold font-space text-3xl text-slate-900 tracking-tight">Wallet</h1>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
            <ShieldCheck size={18} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-600">Reputation: {user?.reputation || 0}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          
          {/* Pizza Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Pizza size={160} />
            </div>
            <div className="relative z-10">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Pizzas Earned</h2>
              <div className="flex items-end gap-3 mb-6">
                <span className="text-6xl font-bold font-space tracking-tighter text-slate-900">{user?.pizzas || 0}</span>
                <Pizza className="w-8 h-8 mb-1 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500 max-w-[200px] leading-relaxed">
                Earn 1 Pizza by providing the absolute best answer to a community discussion.
              </p>
            </div>
          </div>

          {/* Spurti Point Card */}
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-lg relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
              <Star size={160} className="text-white" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Spurti Points</h2>
                <div className="flex items-end gap-3 mb-6">
                  <span className="text-6xl font-bold font-space tracking-tighter text-white">{user?.spurtiPoints || 0}</span>
                  <span className="text-2xl mb-1">⭐</span>
                </div>
              </div>
              
              <button 
                onClick={handleConvert}
                disabled={converting || user?.pizzas < 2}
                className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <ArrowRightLeft size={16} />
                {converting ? 'Converting...' : 'Convert 2 Pizzas to 1 Spurti Point'}
              </button>
            </div>
          </div>

        </div>

        {/* Transactions */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <History size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800">Transaction History</h2>
          </div>
          
          {transactions.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No recent transactions.</p>
          ) : (
            <div className="space-y-4">
              {transactions.map(t => (
                <div key={t._id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-semibold text-sm text-slate-800 mb-1">{t.description}</p>
                    <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className={`font-bold text-sm flex items-center gap-1.5 ${t.type === 'EARN' ? 'text-green-600' : 'text-slate-600'}`}>
                    {t.type === 'EARN' ? '+' : '-'}{t.amount} {t.currency === 'pizza' ? <Pizza className="w-4 h-4 inline-block text-slate-300" /> : '⭐'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}