import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Activity, ShieldCheck, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

import ActivityHeatmap from '../components/analytics/ActivityHeatmap';
import TopicTrendsWidget from '../components/analytics/TopicTrendsWidget';
import SearchFailureWidget from '../components/analytics/SearchFailureWidget';
import EscalationWidget from '../components/analytics/EscalationWidget';
import FaqEffectivenessWidget from '../components/analytics/FaqEffectivenessWidget';
import FrictionZoneCard from '../components/analytics/FrictionZoneCard';

export default function AdminIntelligencePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/analytics/dashboard');
      if (res.data.success) {
        setData(res.data.data);
        if (!res.data.cached) {
          setLastUpdated(new Date());
        }
      }
    } catch (err) {
      toast.error('Failed to load support intelligence data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 5 minutes to align with backend cache
    const interval = setInterval(fetchDashboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mb-4" />
          <div className="text-emerald-400 font-bold font-bricolage tracking-widest text-sm uppercase">Loading Intelligence...</div>
        </div>
      </div>
    );
  }

  const {
    activityPulse,
    topicTrends,
    searchFailures,
    escalationHotspots,
    faqEffectiveness,
    frictionZones,
    healthMetrics
  } = data || {};

  return (
    <div className="min-h-screen bg-mesh font-inter text-slate-300 relative pb-24 overflow-x-hidden">
      {/* Calm premium emerald glows */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-emerald-500/[0.03] blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[20%] left-0 w-[400px] h-[400px] bg-teal-500/[0.03] blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass-strong px-6 md:px-10 py-5 border-b border-emerald-900/30 flex justify-between items-center shadow-lg bg-slate-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin')}
            className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-slate-400 hover:text-emerald-400"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-bricolage tracking-tight text-slate-100 flex items-center gap-2">
              <Activity className="text-emerald-400" /> Support Intelligence
            </h1>
            <p className="text-[10px] md:text-xs text-slate-500 font-semibold uppercase tracking-widest mt-1">
              Operations Center
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="hidden md:inline-block text-xs font-semibold text-slate-500">
            Last updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button 
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden md:inline">Refresh</span>
          </button>
        </div>
      </header>

      <main className="p-6 md:p-10 max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* Top Health Metrics Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-3xl p-6 border border-emerald-900/30 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 relative">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-2xl animate-ping opacity-20" />
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-100 font-bricolage">{healthMetrics?.healthScore}%</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Support Health Score</div>
            </div>
          </div>
          
          <div className="glass-card rounded-3xl p-6 border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-100 font-bricolage">{healthMetrics?.avgResolutionTimeHours}h</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Avg Resolution Time</div>
            </div>
          </div>
          
          <div className="glass-card rounded-3xl p-6 border border-rose-900/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Activity size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-100 font-bricolage">{healthMetrics?.unresolvedCount}</div>
              <div className="text-xs font-semibold text-rose-500/70 uppercase tracking-widest">Unresolved Tickets</div>
            </div>
          </div>
        </div>

        {/* First Row: Heatmap & Topic Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ActivityHeatmap data={activityPulse || []} />
          </div>
          <div className="lg:col-span-1">
            <TopicTrendsWidget data={topicTrends || []} />
          </div>
        </div>

        {/* Second Row: Friction & Failures */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SearchFailureWidget data={searchFailures || []} />
          <FrictionZoneCard data={frictionZones || []} />
        </div>

        {/* Third Row: Escalations & FAQ Effectiveness */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <EscalationWidget data={escalationHotspots || []} />
          <FaqEffectivenessWidget data={faqEffectiveness || []} />
        </div>

      </main>
    </div>
  );
}
