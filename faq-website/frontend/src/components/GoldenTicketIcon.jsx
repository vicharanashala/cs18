import React from 'react';

export default function GoldenTicketIcon({ size = 20, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={`relative ${className}`}
    >
      {/* Outer Ticket Border */}
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7z" />
      {/* Inner Spark/Crown Detail */}
      <path d="M12 8l2 3h3l-2.5 2 1 3-3.5-2.5L8.5 16l1-3L7 11h3l2-3z" />
    </svg>
  );
}
