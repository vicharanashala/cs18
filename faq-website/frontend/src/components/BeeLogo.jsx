import React from 'react';

const BeeLogo = ({ variant = 'medium', className = '', ...props }) => {
  // Variants mapping to Tailwind size classes
  const sizes = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-10 h-10',
    'icon-only': 'w-8 h-8',
    'full-brand': 'h-8'
  };

  const sizeClass = sizes[variant] || sizes.medium;

  // Premium, geometric SaaS Bee mark
  // Combines a honeycomb hexagon with fluid inner curves (wings/intelligence spark)
  const IconSVG = (
    <svg 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`flex-shrink-0 ${variant !== 'full-brand' ? sizeClass : 'h-full w-auto'} ${className}`} 
      {...props}
    >
      {/* Outer Honeycomb */}
      <path d="M24 4L41.32 14V34L24 44L6.68 34V14L24 4Z" fill="#FFC107"/>
      {/* Deep black inner section */}
      <path d="M24 10L34.39 16V28L24 34L13.61 28V16L24 10Z" fill="#111111"/>
      {/* The 'Spark' / stinger / core */}
      <path d="M24 16L28 20V26L24 30L20 26V20L24 16Z" fill="#FFC107"/>
      <circle cx="24" cy="23" r="1.5" fill="#111111"/>
    </svg>
  );

  if (variant === 'full-brand') {
    return (
      <div className={`flex items-center gap-2.5 select-none ${className}`}>
        {IconSVG}
        <span className="font-bricolage font-bold text-xl tracking-tight text-slate-100">
          Bee
        </span>
      </div>
    );
  }

  return IconSVG;
};

export default BeeLogo;
