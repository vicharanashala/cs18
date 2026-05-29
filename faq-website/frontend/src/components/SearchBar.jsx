import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Sparkles, Tag, X } from 'lucide-react';

const DEBOUNCE_MS = 350;
const MIN_QUERY   = 2;

// ─── Match Badge (exported for use in result lists) ───────────────────────────
export function MatchBadge({ matchType, matchPercentage }) {
  if (!matchType || matchType === 'none') return null;
  const isSemantic = matchType === 'semantic';
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider font-bricolage px-1.5 py-0.5 rounded-full ${
      isSemantic
        ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
    }`}>
      <Sparkles size={8} />
      {matchPercentage}% match
    </span>
  );
}

// ─── SearchBar ─────────────────────────────────────────────────────────────────
//
// Supports two modes:
//
//  ✦ Controlled (onSearch):  Parent owns fetching. SearchBar is a dumb input.
//     <SearchBar onSearch={handleSearch} />
//     handleSearch = {(query) => { /* fetch + setState */ }}
//
//  ✦ Self-contained (onResults):  SearchBar fetches internally and streams
//     results to the parent for rendering.
//     <SearchBar onResults={(matches, type, clusters, insight) => {...}} />
//
// Both modes debounce and handle keyboard shortcuts identically.
//
export default function SearchBar({
  placeholder  = "Ask anything…",
  onSearch,      // controlled: parent fetches (legacy / Dashboard / RaiseTicket)
  onResults,     // smart:      SearchBar fetches, passes results up
  initialQuery = '',
  className    = '',
}) {
  const isControlled = Boolean(onSearch);

  const [query,          setQuery]          = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [loading,        setLoading]        = useState(false);
  const [suggestions,    setSuggestions]    = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const abortRef = useRef(null);
  const inputRef  = useRef(null);

  // ── Debounce ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // ── Sync initialQuery ─────────────────────────────────────────────────────
  useEffect(() => {
    if (initialQuery !== query) setQuery(initialQuery);
  }, [initialQuery]);

  // ── Controlled: emit to parent, don't fetch internally ───────────────────
  useEffect(() => {
    if (!isControlled) return;
    if (debouncedQuery.length < MIN_QUERY) {
      onSearch && onSearch('');
      return;
    }
    onSearch && onSearch(debouncedQuery);
  }, [debouncedQuery, isControlled]);

  // ── Smart mode: internal fetch ────────────────────────────────────────────
  useEffect(() => {
    if (isControlled || debouncedQuery.length < MIN_QUERY) {
      setLoading(false);
      return;
    }

    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const tid = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}&type=faq`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!controller.signal.aborted) {
          setLoading(false);
          onResults && onResults(
            data.matches  || [],
            data.matchType || 'none',
            data.clusters  || [],
            data.insight   || ''
          );
        }
      } catch {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS + 80);

    return () => { clearTimeout(tid); controller.abort(); };
  }, [debouncedQuery, isControlled]);

  // ── Autocomplete suggestions ──────────────────────────────────────────────
  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY) { setSuggestions([]); return; }
    const controller = new AbortController();
    const tid = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(debouncedQuery)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!controller.signal.aborted) setSuggestions(data.suggestions || []);
      } catch {
        // abort is expected
      }
    }, 180);
    return () => { clearTimeout(tid); controller.abort(); };
  }, [debouncedQuery]);

  const handleClear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setDebouncedQuery('');
    setShowSuggestions(false);
    if (isControlled) onSearch && onSearch('');
    else onResults && onResults([], 'none', [], '');
    inputRef.current?.focus();
  }, [isControlled, onSearch, onResults]);

  const handleSuggestionClick = useCallback((s) => {
    setQuery(s);
    setDebouncedQuery(s);
    setShowSuggestions(false);
    // Force an immediate search emit in controlled mode
    if (isControlled) onSearch && onSearch(s);
  }, [isControlled, onSearch]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') handleClear();
    if (e.key === 'Enter')  setShowSuggestions(false);
  }, [handleClear]);

  const inputClasses = [
    'w-full bg-white/5 border border-white/10 hover:border-white/20',
    'focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20',
    'rounded-2xl py-4 pl-14 pr-12 text-slate-100 placeholder-slate-500',
    'outline-none transition-all duration-300 shadow-inner font-medium text-lg',
    loading ? 'text-slate-200' : '',
  ].join(' ');

  return (
    <div className={`relative group ${className}`}>
      {/* Decorative gradient glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-teal-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none" />

      <div className="relative flex items-center w-full">
        {/* Left icon */}
        <div className="absolute left-5 flex items-center justify-center text-slate-400 pointer-events-none">
          {loading
            ? <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            : <Search className="w-5 h-5" strokeWidth={2.5} />
          }
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
          onKeyDown={handleKeyDown}
          className={inputClasses}
          autoComplete="off"
          spellCheck="false"
        />

        {/* Right slot: clear or loading dots */}
        {!loading && query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-5 text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            <X size={15} />
          </button>
        )}
        {loading && (
          <span className="absolute right-5 flex gap-0.5 items-center">
            {[0, 120, 240].map(delay => (
              <span
                key={delay}
                className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        )}
      </div>

      {/* Autocomplete suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-2 bg-[#13111c] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => handleSuggestionClick(s)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                <Search size={13} className="text-slate-500 flex-shrink-0" />
                <span>{s}</span>
                <Tag size={11} className="text-slate-600 ml-auto flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}