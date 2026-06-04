import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';
import { RefreshCw, Activity, ShieldAlert, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

import ActivityHeatmap from '../../components/analytics/ActivityHeatmap';
import EscalationWidget from '../../components/analytics/EscalationWidget';
import FaqEffectivenessWidget from '../../components/analytics/FaqEffectivenessWidget';
import FrictionZoneCard from '../../components/analytics/FrictionZoneCard';
import SearchFailureWidget from '../../components/analytics/SearchFailureWidget';
import TopicTrendsWidget from '../../components/analytics/TopicTrendsWidget';

export default function AdminAnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/analytics/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load analytics dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const intervalId = setInterval(fetchAnalytics, 60000); // refresh every minute
    return () => clearInterval(intervalId);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
        <RefreshCw className="animate-spin" size={20} />
        <span className="font-bricolage text-lg">Aggregating Metrics...</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Top Level Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-strong rounded-3xl p-6 border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-transparent shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <Activity className="text-purple-400" size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Deflection Rate</p>
            <h3 className="text-3xl font-black font-bricolage text-slate-100">{data.healthMetrics?.deflectionRate || '0'}%</h3>
          </div>
        </div>
        
        <div className="glass-strong rounded-3xl p-6 border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-transparent shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
            <Zap className="text-emerald-400" size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total FAQs Served</p>
            <h3 className="text-3xl font-black font-bricolage text-slate-100">{data.healthMetrics?.totalViews || '0'}</h3>
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-6 border border-red-500/20 bg-gradient-to-br from-red-950/20 to-transparent shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <ShieldAlert className="text-red-400" size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pending Escalations</p>
            <h3 className="text-3xl font-black font-bricolage text-slate-100">{data.healthMetrics?.pendingEscalations || '0'}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Main Charts) */}
        <div className="lg:col-span-2 space-y-8">
          <ActivityHeatmap data={data.activityPulse || []} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FaqEffectivenessWidget data={data.faqEffectiveness || []} />
            <TopicTrendsWidget data={data.topicTrends || []} />
          </div>
        </div>

        {/* Right Column (Side Widgets) */}
        <div className="space-y-8">
          <EscalationWidget data={data.escalationHotspots || []} />
          <SearchFailureWidget data={data.searchFailures || []} />
          
          <FrictionZoneCard data={data.frictionZones || []} />
        </div>
      </div>
    </div>
  );
}
