import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FAQ_CATEGORIES } from '../utils/constants';

export const FALLBACK_CATEGORIES = FAQ_CATEGORIES;

const dropdownStyles = `
  .premium-dropdown-container {
    position: relative;
    width: 100%;
  }
  
  .premium-dropdown-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-radius: 16px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    outline: none;
    cursor: pointer;
  }

  :root .premium-dropdown-trigger {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(0, 0, 0, 0.06);
    color: #111827;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  }

  :root .premium-dropdown-trigger:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.85);
    border-color: rgba(0, 0, 0, 0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  }

  :root .premium-dropdown-trigger:focus:not(:disabled) {
    border-color: rgba(139, 92, 246, 0.4);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1), 0 4px 12px rgba(0, 0, 0, 0.04);
  }

  [data-theme='dark'] .premium-dropdown-trigger {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  [data-theme='dark'] .premium-dropdown-trigger:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  [data-theme='dark'] .premium-dropdown-trigger:focus:not(:disabled) {
    border-color: rgba(167, 139, 250, 0.4);
    box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.15), 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  .premium-dropdown-trigger:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .premium-dropdown-trigger .placeholder {
    color: #6b7280;
  }
  [data-theme='dark'] .premium-dropdown-trigger .placeholder {
    color: rgba(255, 255, 255, 0.42);
  }

  .premium-dropdown-panel {
    /* Set via inline styles when rendered in Portal */
    z-index: 9999;
    border-radius: 24px;
    overflow: hidden;
    isolation: isolate;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    box-shadow:
      0 40px 120px rgba(0, 0, 0, 0.18),
      0 12px 40px rgba(0, 0, 0, 0.10),
      inset 0 1px 0 rgba(255, 255, 255, 0.35);
  }

  .premium-dropdown-panel::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.05),
      transparent 45%
    );
    pointer-events: none;
    border-radius: inherit;
    z-index: 10;
  }

  :root .premium-dropdown-panel {
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.65);
  }

  [data-theme='dark'] .premium-dropdown-panel {
    background: rgba(10, 10, 18, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 
      0 40px 120px rgba(0, 0, 0, 0.55),
      0 12px 40px rgba(0, 0, 0, 0.32),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .premium-dropdown-search-container {
    padding: 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    position: relative;
    z-index: 20;
  }
  
  :root .premium-dropdown-search-container {
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }

  .premium-dropdown-search-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
    border-radius: 14px;
    padding: 12px 14px;
    transition: all 0.2s ease;
  }

  :root .premium-dropdown-search-wrapper {
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(0, 0, 0, 0.12);
  }

  :root .premium-dropdown-search-wrapper:focus-within {
    border-color: rgba(139, 92, 246, 0.4);
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.14);
  }

  [data-theme='dark'] .premium-dropdown-search-wrapper {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  [data-theme='dark'] .premium-dropdown-search-wrapper:focus-within {
    border-color: rgba(167, 139, 250, 0.4);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.14);
  }

  .premium-dropdown-search-input {
    background: transparent;
    border: none;
    outline: none;
    font-size: 14px;
    width: 100%;
  }

  :root .premium-dropdown-search-input {
    color: #111827;
  }

  :root .premium-dropdown-search-input::placeholder {
    color: #6b7280;
  }

  [data-theme='dark'] .premium-dropdown-search-input {
    color: #ffffff;
  }

  [data-theme='dark'] .premium-dropdown-search-input::placeholder {
    color: rgba(255, 255, 255, 0.42);
  }

  .premium-dropdown-list {
    max-height: 320px;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    z-index: 20;
  }

  /* Custom premium scrollbar */
  .premium-dropdown-list::-webkit-scrollbar {
    width: 6px;
  }
  .premium-dropdown-list::-webkit-scrollbar-track {
    background: transparent;
  }
  .premium-dropdown-list::-webkit-scrollbar-thumb {
    border-radius: 10px;
  }
  :root .premium-dropdown-list::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
  }
  [data-theme='dark'] .premium-dropdown-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.18);
  }

  .premium-dropdown-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-radius: 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s ease;
    text-align: left;
    outline: none;
  }

  :root .premium-dropdown-item {
    color: #4b5563;
  }

  :root .premium-dropdown-item:hover {
    background: rgba(0, 0, 0, 0.04);
    color: #111827;
  }

  :root .premium-dropdown-item.selected {
    background: rgba(139, 92, 246, 0.14);
    color: #7c3aed;
    font-weight: 600;
  }

  [data-theme='dark'] .premium-dropdown-item {
    color: rgba(255, 255, 255, 0.72);
  }

  [data-theme='dark'] .premium-dropdown-item:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #ffffff;
  }

  [data-theme='dark'] .premium-dropdown-item.selected {
    background: rgba(139, 92, 246, 0.14);
    color: #ffffff;
    font-weight: 600;
  }

  .premium-dropdown-empty {
    padding: 16px;
    text-align: center;
    font-size: 13px;
    font-style: italic;
  }

  :root .premium-dropdown-empty {
    color: #6b7280;
  }

  [data-theme='dark'] .premium-dropdown-empty {
    color: rgba(255, 255, 255, 0.42);
  }

  .dropdown-backdrop {
    position: fixed;
    inset: 0;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    background: rgba(0, 0, 0, 0.08);
    z-index: 9990;
  }
`;

export default function CategoryDropdown({ value, onChange, disabled, categories }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({});
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      // Find both the trigger ref and the dropdown panel
      const isInsideTrigger = ref.current && ref.current.contains(e.target);
      const isInsidePanel = e.target.closest('.premium-dropdown-panel');
      const isInsideSearch = e.target.closest('.premium-dropdown-search-wrapper');
      
      if (!isInsideTrigger && !isInsidePanel && !isInsideSearch) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const updatePosition = () => {
    if (ref.current && isOpen) {
      const rect = ref.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + 12}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      // Listen to scroll and resize events
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Sync category lists and ALWAYS push "Other" to the very bottom
  const activeCategories = categories.length > 0 ? categories : FAQ_CATEGORIES;
  const filtered = activeCategories.filter(cat => cat.toLowerCase() !== 'other');
  const normalizedCategories = [...filtered, 'Other'];

  const filteredList = normalizedCategories.filter(cat =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="premium-dropdown-container" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: dropdownStyles }} />
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="premium-dropdown-trigger"
      >
        <span className={value ? '' : 'placeholder'}>
          {value || 'Select FAQ category'}
        </span>
        <ChevronDown
          size={16}
          className="transition-transform text-slate-400"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <>
            {createPortal(
              <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />,
              document.body
            )}
            {createPortal(
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="premium-dropdown-panel"
                style={dropdownStyle}
              >
                {/* Search inside dropdown */}
                <div className="premium-dropdown-search-container">
                  <div className="premium-dropdown-search-wrapper">
                    <Search size={14} className="text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search categories..."
                      className="premium-dropdown-search-input"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Options List */}
                <div className="premium-dropdown-list">
                  {filteredList.length === 0 ? (
                    <div className="premium-dropdown-empty">
                      No matching categories
                    </div>
                  ) : (
                    filteredList.map(cat => {
                      const isSelected = value === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            onChange(cat);
                            setIsOpen(false);
                            setSearchTerm('');
                          }}
                          className={`premium-dropdown-item ${isSelected ? 'selected' : ''}`}
                        >
                          <span>{cat}</span>
                          {isSelected && (
                            <Check size={14} className="text-purple-400 animate-pulse" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>,
              document.body
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
