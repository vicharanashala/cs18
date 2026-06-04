import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import axiosClient from '../api/axiosClient';

export const FALLBACK_CATEGORIES = ['General', 'Admissions', 'Academics', 'Hostel', 'Fees & Finance', 'Other'];

const PopoverStyles = `
  .cat-popover-wrapper {
    position: relative;
    width: 100%;
  }

  .cat-popover-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-radius: 14px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    outline: none;
    cursor: pointer;
    border: 1px solid transparent;
  }

  :root .cat-popover-trigger {
    background: rgba(255, 255, 255, 0.6);
    border-color: rgba(0, 0, 0, 0.08);
    color: #111827;
  }

  :root .cat-popover-trigger:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.85);
    border-color: rgba(0, 0, 0, 0.12);
  }

  :root .cat-popover-trigger:focus:not(:disabled) {
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
  }

  [data-theme='dark'] .cat-popover-trigger {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
    color: #cbd5e1;
  }

  [data-theme='dark'] .cat-popover-trigger:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.14);
  }

  [data-theme='dark'] .cat-popover-trigger:focus:not(:disabled) {
    border-color: rgba(167, 139, 250, 0.5);
    box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.15);
  }

  .cat-popover-trigger:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .cat-popover-trigger-placeholder {
    color: #9ca3af;
  }

  .cat-popover-selected-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
  }

  :root .cat-popover-selected-tag {
    background: rgba(139, 92, 246, 0.12);
    color: #7c3aed;
    border: 1px solid rgba(139, 92, 246, 0.2);
  }

  [data-theme='dark'] .cat-popover-selected-tag {
    background: rgba(139, 92, 246, 0.15);
    color: #c4b5fd;
    border: 1px solid rgba(139, 92, 246, 0.25);
  }

  .cat-popover-panel {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 200;
    border-radius: 16px;
    max-height: 280px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
    overflow: hidden;
  }

  :root .cat-popover-panel {
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  [data-theme='dark'] .cat-popover-panel {
    background: rgba(15, 15, 25, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .cat-popover-search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  :root .cat-popover-search {
    border-color: rgba(0, 0, 0, 0.06);
  }

  .cat-popover-search-icon {
    color: #9ca3af;
    flex-shrink: 0;
  }

  .cat-popover-search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 14px;
    color: inherit;
  }

  :root .cat-popover-search-input {
    color: #111827;
  }

  :root .cat-popover-search-input::placeholder {
    color: #9ca3af;
  }

  [data-theme='dark'] .cat-popover-search-input {
    color: #e2e8f0;
  }

  [data-theme='dark'] .cat-popover-search-input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .cat-popover-clear {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: #9ca3af;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: color 0.15s;
  }

  .cat-popover-clear:hover {
    color: #6b7280;
  }

  [data-theme='dark'] .cat-popover-clear {
    color: rgba(255, 255, 255, 0.4);
  }

  [data-theme='dark'] .cat-popover-clear:hover {
    color: rgba(255, 255, 255, 0.7);
  }

  .cat-popover-list {
    max-height: 240px;
    overflow-y: auto;
    padding: 6px;
  }

  .cat-popover-list::-webkit-scrollbar {
    width: 4px;
  }

  .cat-popover-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .cat-popover-list::-webkit-scrollbar-thumb {
    border-radius: 10px;
  }

  :root .cat-popover-list::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.12);
  }

  [data-theme='dark'] .cat-popover-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
  }

  .cat-popover-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    background: transparent;
    transition: background 0.12s ease;
    text-align: left;
    color: inherit;
    outline: none;
  }

  .cat-popover-item:hover,
  .cat-popover-item.highlighted {
    border-radius: 10px;
  }

  :root .cat-popover-item:hover,
  :root .cat-popover-item.highlighted {
    background: rgba(139, 92, 246, 0.08);
    color: #111827;
  }

  [data-theme='dark'] .cat-popover-item:hover,
  [data-theme='dark'] .cat-popover-item.highlighted {
    background: rgba(139, 92, 246, 0.12);
    color: #f1f5f9;
  }

  .cat-popover-item.selected {
    font-weight: 700;
  }

  :root .cat-popover-item.selected {
    color: #7c3aed;
  }

  [data-theme='dark'] .cat-popover-item.selected {
    color: #c4b5fd;
  }

  .cat-popover-check {
    color: #a78bfa;
    flex-shrink: 0;
  }

  .cat-popover-empty {
    padding: 20px 14px;
    text-align: center;
    font-size: 13px;
    color: #9ca3af;
    font-style: italic;
  }

  .cat-popover-hint {
    padding: 8px 14px 10px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.3);
    text-align: center;
    letter-spacing: 0.02em;
  }

  :root .cat-popover-hint {
    color: rgba(0, 0, 0, 0.35);
  }
`;

/**
 * Compact inline category selector — no portal, no extra backdrop.
 * Keeps the FAQ form fully visible while selecting.
 */
export default function CategoryDropdown({ value, onChange, disabled, categories: initialCategories }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const [categories, setCategories] = useState(initialCategories || []);

  useEffect(() => {
    if (!initialCategories || initialCategories.length === 0) {
      axiosClient.get('/faqs/categories').then(res => {
        setCategories(res.data.categories.map(c => c.name));
      }).catch(err => console.error('Failed to load categories', err));
    } else {
      setCategories(initialCategories);
    }
  }, [initialCategories]);

  // Build sorted category list: all except "Other" first, then "Other" at bottom
  const allCategories = categories.length > 0 ? categories : ['General', 'Other'];
  const filtered = allCategories.filter(c => c.toLowerCase() !== 'other');
  const sortedCategories = [...filtered, 'Other'];

  const filteredList = sortedCategories.filter(cat =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Open popover
  const openPopover = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setSearchTerm('');
    setHighlightedIndex(0);
    // Focus search after render
    setTimeout(() => searchRef.current?.focus(), 20);
  }, [disabled]);

  // Close popover
  const closePopover = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
  }, []);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inPanel = e.target.closest('.cat-popover-panel');
      if (!inTrigger && !inPanel) closePopover();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, closePopover]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openPopover();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, filteredList.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredList[highlightedIndex]) {
          onChange(filteredList[highlightedIndex]);
          closePopover();
        }
        break;
      case 'Escape':
        e.preventDefault();
        closePopover();
        break;
      case 'Tab':
        e.preventDefault();
        closePopover();
        break;
      default:
        break;
    }
  }, [isOpen, filteredList, highlightedIndex, onChange, openPopover, closePopover]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const item = listRef.current.children[highlightedIndex];
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  const selectCategory = (cat) => {
    onChange(cat);
    closePopover();
  };

  return (
    <div className="cat-popover-wrapper">
      <style dangerouslySetInnerHTML={{ __html: PopoverStyles }} />

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={isOpen ? closePopover : openPopover}
        onKeyDown={handleKeyDown}
        className="cat-popover-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {value ? (
          <span className="cat-popover-selected-tag">
            {value}
          </span>
        ) : (
          <span className="cat-popover-trigger-placeholder">Select a category</span>
        )}
        <ChevronDown
          size={15}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: '#9ca3af',
          }}
        />
      </button>

      {/* Inline Popover Panel */}
      {isOpen && !disabled && (
        <div
          className="cat-popover-panel"
          role="listbox"
          aria-label="Category list"
        >
          {/* Search bar */}
          <div className="cat-popover-search">
            <Search size={14} className="cat-popover-search-icon" />
            <input
              ref={searchRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search categories…"
              className="cat-popover-search-input"
              autoComplete="off"
              spellCheck={false}
            />
            {searchTerm && (
              <button
                type="button"
                className="cat-popover-clear"
                onClick={() => setSearchTerm('')}
                tabIndex={-1}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category list */}
          <div className="cat-popover-list" ref={listRef}>
            {filteredList.length === 0 ? (
              <div className="cat-popover-empty">No categories match "{searchTerm}"</div>
            ) : (
              filteredList.map((cat, i) => {
                const isSelected = value === cat;
                const isHighlighted = i === highlightedIndex;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`cat-popover-item${isHighlighted ? ' highlighted' : ''}${isSelected ? ' selected' : ''}`}
                    onClick={() => selectCategory(cat)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                  >
                    <span>{cat}</span>
                    {isSelected && <Check size={13} className="cat-popover-check" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Keyboard hint */}
          <div className="cat-popover-hint">
            ↑↓ navigate · Enter select · Esc close
          </div>
        </div>
      )}
    </div>
  );
}