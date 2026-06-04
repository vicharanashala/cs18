import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';
import { Mic, Save, RefreshCw, Activity, Zap, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminVoiceTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    beeSystemPrompt: '',
    beeEnabled: true,
  });
  
  const [stats, setStats] = useState({
    totalCalls: 0,
    activeSessions: 0,
    avgLatency: '0ms',
    tokenUsage: '0'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, statsRes] = await Promise.all([
        axiosClient.get('/admin/voice/config'),
        axiosClient.get('/admin/voice/stats')
      ]);
      
      if (configRes.data.success) {
        setSettings({
          beeSystemPrompt: configRes.data.config.beeSystemPrompt || '',
          beeEnabled: configRes.data.config.beeEnabled !== false,
        });
      }
      
      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
    } catch (err) {
      toast.error('Failed to load voice assistant settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosClient.put('/admin/voice/config', settings);
      toast.success('Voice assistant settings saved');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
        <RefreshCw className="animate-spin" size={20} />
        <span className="font-bricolage text-lg">Loading Voice Settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold font-bricolage text-slate-100 flex items-center gap-2">
          <Mic className="text-purple-400" size={24} /> Bee Assistant Management
        </h2>
        <p className="text-sm text-slate-400 mt-1">Manage Groq integrations, system prompts, and AI capabilities.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-strong rounded-3xl p-6 border border-white/5 shadow-lg">
          <div className="text-xs font-bold text-slate-500 uppercase mb-2">Total Queries</div>
          <div className="text-3xl font-black font-bricolage text-slate-100">{stats.totalCalls.toLocaleString()}</div>
        </div>
        <div className="glass-strong rounded-3xl p-6 border border-white/5 shadow-lg">
          <div className="text-xs font-bold text-slate-500 uppercase mb-2">Active Sessions</div>
          <div className="text-3xl font-black font-bricolage text-emerald-400">{stats.activeSessions}</div>
        </div>
        <div className="glass-strong rounded-3xl p-6 border border-white/5 shadow-lg">
          <div className="text-xs font-bold text-slate-500 uppercase mb-2">Avg Latency (Groq)</div>
          <div className="text-3xl font-black font-bricolage text-blue-400 flex items-center gap-2">
            <Zap size={20} /> {stats.avgLatency}
          </div>
        </div>
        <div className="glass-strong rounded-3xl p-6 border border-white/5 shadow-lg">
          <div className="text-xs font-bold text-slate-500 uppercase mb-2">Token Usage</div>
          <div className="text-3xl font-black font-bricolage text-purple-400 flex items-center gap-2">
            <Cpu size={20} /> {stats.tokenUsage}
          </div>
        </div>
      </div>

      <div className="glass-strong rounded-3xl p-8 border border-white/5 shadow-xl max-w-4xl">
        <h3 className="text-xl font-bold font-bricolage text-slate-100 mb-6">Core Settings</h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
            <div>
              <h4 className="font-bold text-slate-200">Enable Voice Assistant</h4>
              <p className="text-sm text-slate-400">Allow students to use the Bee voice assistant globally.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.beeEnabled}
                onChange={e => setSettings({ ...settings, beeEnabled: e.target.checked })}
              />
              <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-2">System Prompt</label>
            <p className="text-sm text-slate-400 mb-4">This prompt is prepended to every conversation. It defines Bee's personality, constraints, and knowledge scope.</p>
            <textarea
              rows={8}
              value={settings.beeSystemPrompt}
              onChange={e => setSettings({ ...settings, beeSystemPrompt: e.target.value })}
              className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500/50 resize-none font-inter text-sm"
              placeholder="You are Bee..."
            />
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
