/**
 * ExpandableText
 * A reusable component for truncating long text with a "Read More / Show Less" toggle.
 *
 * Features:
 * - Line-clamp preview with animated expand/collapse
 * - "Read More" / "Show Less" toggle button
 * - Customizable clamp lines
 * - Works with any content: questions, answers, descriptions, messages
 */

import React, { useState, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function ExpandableText({
  children,
  text,
  maxLines = 3,
  expandText = 'Read More',
  collapseText = 'Show Less',
  className = '',
  toggleClassName = '',
  expanded: controlledExpanded,
  onToggle,
  showToggle = true,
}) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const content = text || children || '';

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.(!expanded);
    } else {
      setInternalExpanded((v) => !v);
    }
  };

  if (!content) return null;

  return (
    <div className={`expandable-text ${className}`}>
      <div
        className={`
          break-words overflow-hidden
          transition-all duration-300 ease-in-out
          ${expanded ? 'max-h-none' : `max-h-[calc(1.5em_*_${maxLines})]`}
        `}
        style={expanded ? {} : { display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical' }}
        aria-expanded={expanded}
      >
        {children ? (
          children
        ) : (
          <span className="break-words whitespace-pre-wrap">{text}</span>
        )}
      </div>

      {showToggle && (
        <button
          onClick={handleToggle}
          className={`
            group flex items-center gap-1 mt-1.5 text-xs font-semibold
            text-sky-400 hover:text-sky-300 transition-all duration-200
            focus:outline-none focus-visible:underline
            ${toggleClassName}
          `}
          aria-label={expanded ? collapseText : expandText}
        >
          <span className="relative">
            {/* Underline animation */}
            <span className={`
              absolute -bottom-px left-0 h-px bg-sky-400/40
              transition-all duration-300
              ${expanded ? 'w-full' : 'w-0 group-hover:w-full'}
            `} />
            {expanded ? collapseText : expandText}
          </span>
          <span className="flex-shrink-0 transition-transform duration-300">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        </button>
      )}
    </div>
  );
}