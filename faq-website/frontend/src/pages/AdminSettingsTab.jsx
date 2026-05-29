/**
 * AdminSettingsTab — Pizza Slice + Public FAQ settings management.
 *
 * Phase 2G only. No analytics, no audit log UI, no other sections.
 *
 * Layout: single-column card with three sections:
 *   1. Pizza Slice Configuration
 *   2. Public FAQ Toggles
 *   3. Migration (Apply To Existing Users)
 */

import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';
import { Pizza, Settings2, Eye, EyeOff, BarChart2, RefreshCw, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ────────────────────────────────────────────────────────────────

const PIZZA_OPTIONS = [0, 1, 3, 5, 6, 10];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ label, description, value, onChange, disabled }) {
  return (
    <label className={`flex items-center justify-between gap-4 py-4 border-b border-white/[0.05] last:border-0 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-200 leading-snug">{label}</div>
        {description && (
          <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => !disabled && onChange(!value)}
        className={[
          'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent',
          'transition-colors duration-200 ease-in-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
          value ? 'bg-emerald-500/80' : 'bg-white/10',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform',
            'transition duration-200 ease-in-out',
            value ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </label>
  );
}

function SectionCard({ icon: Icon, title, badge, children, footer }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl overflow-hidden border border-white/5 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.05] bg-white/[0.005]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10">
          <Icon size={15} className="text-slate-300" />
        </div>
        <span className="text-sm font-bold font-bricolage text-slate-100">{title}</span>
        {badge && (
          <span className="ml-auto text-[10px] font-bold font-bricolage px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 uppercase tracking-widest">
            {badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-6">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-6 py-4 border-t border-white/[0.05] bg-white/[0.005]">
          {footer}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminSettingsTab() {
  // ── Settings state ────────────────────────────────────────────────────────
  const [settings, setSettings] = useState({
    defaultPizzaSlices: 1,
    publicFAQEnabled: true,
    guestFAQSearchEnabled: true,
    guestAnalyticsTrackingEnabled: false,
    updatedBy: '—',
    updatedAt: null,
  });

  // ── Edit state ─────────────────────────────────────────────────────────────
  const [selectedPizzaSlices, setSelectedPizzaSlices]   = useState(null); // null = not changed
  const [savingPizza,  setSavingPizza]  = useState(false);
  const [savingToggles, setSavingToggles] = useState(false);
  const [migrating, setMigrating]       = useState(false);
  const [migrateResult, setMigrateResult] = useState(null); // { count, amount }
  const [loading, setLoading]           = useState(true);

  // ── Load settings ─────────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    try {
      const res = await axiosClient.get('/admin/settings');
      const s = res.data.settings;
      setSettings(s);
      setSelectedPizzaSlices(null); // reset pending selection
    } catch (err) {
      toast.error('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ── Pizza slice save ───────────────────────────────────────────────────────
  const handleSavePizza = async () => {
    if (selectedPizzaSlices === null) return;
    setSavingPizza(true);
    try {
      const res = await axiosClient.patch('/admin/settings/pizza', {
        defaultPizzaSlices: selectedPizzaSlices,
      });
      toast.success(res.data.message || 'Pizza settings updated.');
      setSettings(prev => ({
        ...prev,
        defaultPizzaSlices: selectedPizzaSlices,
        updatedBy: 'you',
        updatedAt: new Date().toISOString(),
      }));
      setSelectedPizzaSlices(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update pizza settings.');
    } finally {
      setSavingPizza(false);
    }
  };

  // ── Toggle save ───────────────────────────────────────────────────────────
  const [pendingToggles, setPendingToggles] = useState({});

  const handleToggleChange = (key, value) => {
    setPendingToggles(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveToggles = async () => {
    setSavingToggles(true);
    try {
      const res = await axiosClient.patch('/admin/settings/public-faq', pendingToggles);
      toast.success(res.data.message || 'Public FAQ settings updated.');
      setSettings(prev => ({
        ...prev,
        ...pendingToggles,
        updatedBy: 'you',
        updatedAt: new Date().toISOString(),
      }));
      setPendingToggles({});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update settings.');
    } finally {
      setSavingToggles(false);
    }
  };

  // ── Apply migration ────────────────────────────────────────────────────────
  const handleApplyMigration = async () => {
    const confirmed = window.confirm(
      'This will grant the current default pizza slice amount to every user who has 0 slices.\n\n' +
      'Already-initialised users will not be affected. Continue?',
    );
    if (!confirmed) return;

    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await axiosClient.post('/admin/settings/pizza/apply-migration');
      setMigrateResult({ count: res.data.migratedCount, amount: res.data.amount });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Migration failed.');
    } finally {
      setMigrating(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const hasPendingToggles = Object.keys(pendingToggles).length > 0;

  const fmtDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(iso));
    } catch { return iso; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-slate-500" />
      </div>
    );
  }

  const currentPizza    = selectedPizzaSlices !== null ? selectedPizzaSlices : settings.defaultPizzaSlices;
  const effectiveToggles = { ...settings, ...pendingToggles };

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── 1. Pizza Slice Configuration ──────────────────────────────────── */}
      <SectionCard
        icon={Pizza}
        title="Pizza Slice Configuration"
        badge="Economy"
        footer={
          <div className="flex items-center justify-between gap-4">
            {/* Last updated meta */}
            <div className="text-xs text-slate-500">
              <span>Last updated </span>
              <span className="text-slate-400">{fmtDate(settings.updatedAt)}</span>
              {settings.updatedBy && (
                <>
                  <span className="mx-1">·</span>
                  <span className="text-slate-400">by {settings.updatedBy}</span>
                </>
              )}
            </div>

            {/* Save button */}
            <button
              type="button"
              disabled={selectedPizzaSlices === null || savingPizza}
              onClick={handleSavePizza}
              className={[
                'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold font-bricolage',
                'transition-all duration-200',
                selectedPizzaSlices !== null && !savingPizza
                  ? 'bg-emerald-500/80 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 cursor-pointer'
                  : 'bg-white/5 text-slate-500 cursor-not-allowed',
              ].join(' ')}
            >
              {savingPizza
                ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                : <><ChevronRight size={14} /> Apply</>
              }
            </button>
          </div>
        }
      >
        {/* Current value display */}
        <div className="py-5 border-b border-white/[0.05]">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 font-bricolage">
            Current Default
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black font-bricolage text-slate-100">
              {settings.defaultPizzaSlices}
            </span>
            <span className="text-slate-400 text-sm font-medium">pizza slice{settings.defaultPizzaSlices !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Slice selector */}
        <div className="py-5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 font-bricolage">
            New Default — select a value
          </div>
          <div className="grid grid-cols-6 gap-2">
            {PIZZA_OPTIONS.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setSelectedPizzaSlices(val)}
                className={[
                  'py-3 rounded-xl text-sm font-bold font-bricolage border transition-all duration-150',
                  currentPizza === val
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-inner'
                    : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:border-white/[0.15] hover:text-slate-200 cursor-pointer',
                ].join(' ')}
              >
                {val}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-3">
            Allowed values: {PIZZA_OPTIONS.join(', ')}
          </p>
        </div>
      </SectionCard>

      {/* ── 2. Public FAQ Toggles ─────────────────────────────────────────── */}
      <SectionCard
        icon={Settings2}
        title="Public FAQ Access"
        footer={
          hasPendingToggles && (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={savingToggles}
                onClick={handleSaveToggles}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold font-bricolage bg-emerald-500/80 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 cursor-pointer"
              >
                {savingToggles
                  ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                  : <><ChevronRight size={14} /> Save Changes</>
                }
              </button>
            </div>
          )
        }
      >
        <Toggle
          label="Public FAQ Enabled"
          description="Allow guests to browse and read the FAQ knowledge base."
          value={effectiveToggles.publicFAQEnabled}
          onChange={v => handleToggleChange('publicFAQEnabled', v)}
        />
        <Toggle
          label="Guest FAQ Search"
          description="Allow unauthenticated users to search FAQs."
          value={effectiveToggles.guestFAQSearchEnabled}
          onChange={v => handleToggleChange('guestFAQSearchEnabled', v)}
        />
        <Toggle
          label="Guest Analytics Tracking"
          description="Record view counts and basic engagement from guests (does not track identities)."
          value={effectiveToggles.guestAnalyticsTrackingEnabled}
          onChange={v => handleToggleChange('guestAnalyticsTrackingEnabled', v)}
        />
      </SectionCard>

      {/* ── 3. Apply To Existing Users ───────────────────────────────────── */}
      <SectionCard
        icon={RefreshCw}
        title="Apply to Existing Users"
        badge="Migration"
      >
        <div className="py-5 space-y-4">
          <p className="text-sm text-slate-400 leading-relaxed">
            Grants the current default pizza slice amount (
            <strong className="text-slate-200">{settings.defaultPizzaSlices}</strong>) to every
            user who currently has{' '}
            <strong className="text-slate-200">0 slices</strong>.
          </p>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <div className="mt-0.5">
              <Eye size={15} className="text-amber-400/70" />
            </div>
            <p className="text-xs text-amber-300/70 leading-relaxed">
              <strong>Warning:</strong> Only affects users who have never received
              initialization slices. Already-initialised users (any non-zero balance)
              are skipped automatically.
            </p>
          </div>

          {/* Migration result */}
          <AnimatePresence>
            {migrateResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-sm text-emerald-300/80"
              >
                <BarChart2 size={15} className="flex-shrink-0" />
                Applied {migrateResult.amount} pizza slice{migrateResult.amount !== 1 ? 's' : ''} to{' '}
                <strong>{migrateResult.count}</strong> eligible user{migrateResult.count !== 1 ? 's' : ''}.
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            disabled={migrating}
            onClick={handleApplyMigration}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold font-bricolage bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {migrating
              ? <><Loader2 size={13} className="animate-spin" /> Migrating…</>
              : <><RefreshCw size={13} /> Apply To Existing Users</>
            }
          </button>
        </div>
      </SectionCard>

    </div>
  );
}