import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

/**
 * PizzaSliceSVG — A visual 6-slice circular pizza rendered in pure SVG.
 * Each slice activates as slices are earned, with Framer Motion animations.
 *
 * Props:
 *   slices {number}  — how many slices are earned (0–6)
 *   size   {number}  — diameter in px (default 160)
 */
export default function PizzaSliceSVG({ slices = 0, size = 160 }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;           // pizza radius (with small inset for border ring)
  const crustR = r + 2;             // crust ring just outside slices

  // Build 6 wedge paths (each 60°)
  const TOTAL_SLICES = 6;
  const sliceAngle = (2 * Math.PI) / TOTAL_SLICES;

  function polarToCartesian(angle, radius) {
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  }

  function describeWedge(index) {
    // Offset by -90° so slice 0 starts at top
    const startAngle = index * sliceAngle - Math.PI / 2;
    const endAngle = startAngle + sliceAngle;
    const innerR = r * 0.08; // small inner gap for center gap
    const outer = polarToCartesian(startAngle + sliceAngle * 0.03, r); // slight inset for gap
    const outerEnd = polarToCartesian(endAngle - sliceAngle * 0.03, r);
    const inner = polarToCartesian(startAngle + sliceAngle * 0.03, innerR);
    const innerEnd = polarToCartesian(endAngle - sliceAngle * 0.03, innerR);

    return [
      `M ${inner.x} ${inner.y}`,
      `L ${outer.x} ${outer.y}`,
      `A ${r} ${r} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerR} ${innerR} 0 0 0 ${inner.x} ${inner.y}`,
      'Z'
    ].join(' ');
  }

  // Cheese bubble decoration path for active slices
  function describeBubble(index) {
    const midAngle = index * sliceAngle - Math.PI / 2 + sliceAngle / 2;
    const br = r * 0.52; // bubble radial position
    const bx = cx + br * Math.cos(midAngle);
    const by = cy + br * Math.sin(midAngle);
    const bubbleR = r * 0.09;
    return { cx: bx, cy: by, r: bubbleR };
  }

  const isFull = slices >= TOTAL_SLICES;

  const emptyStroke = isDark ? 'rgba(255,255,255,0.04)' : '#f59e0b';
  const emptyFill = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(251,191,36,0.16)';
  const dividerStroke = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(217,119,6,0.45)';
  const centerDotEmpty = isDark ? 'rgba(255,255,255,0.06)' : '#fbbf24';
  const glowFilter = isDark ? 'none' : 'drop-shadow(0 0 12px rgba(251,191,36,0.18))';

  return (
    <div className="relative" style={{ width: size, height: size, filter: glowFilter }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        {/* ── Crust ring ── */}
        <circle
          cx={cx}
          cy={cy}
          r={crustR}
          fill="none"
          stroke={isFull ? 'rgba(251,191,36,0.25)' : emptyStroke}
          strokeWidth="3"
          style={{ transition: 'stroke 0.6s ease' }}
        />

        {/* ── Full pizza shimmer ring when complete ── */}
        {isFull && (
          <>
            <circle
              cx={cx}
              cy={cy}
              r={crustR + 3}
              fill="none"
              stroke="rgba(251,191,36,0.15)"
              strokeWidth="6"
              style={{
                animation: 'pizza-ring-pulse 2.4s ease-in-out infinite',
              }}
            />
            <circle
              cx={cx}
              cy={cy}
              r={crustR + 8}
              fill="none"
              stroke="rgba(251,191,36,0.06)"
              strokeWidth="10"
              style={{
                animation: 'pizza-ring-pulse 2.4s ease-in-out infinite 0.3s',
              }}
            />
          </>
        )}

        {/* ── 6 Wedge slices ── */}
        {Array.from({ length: TOTAL_SLICES }).map((_, i) => {
          const isActive = i < slices;
          const wedgePath = describeWedge(i);
          const bubble = describeBubble(i);

          return (
            <g key={i}>
              {/* Slice fill */}
              <motion.path
                d={wedgePath}
                initial={false}
                animate={{
                  fill: isActive
                    ? 'rgba(245,158,11,0.85)'
                    : emptyFill,
                  filter: isActive
                    ? 'drop-shadow(0 0 6px rgba(251,191,36,0.55))'
                    : 'none',
                  scale: isActive ? 1 : 0.97,
                }}
                transition={{
                  duration: 0.45,
                  ease: [0.34, 1.56, 0.64, 1], // spring-like ease
                  delay: isActive ? i * 0.04 : 0,
                }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
              />
              {/* Crust arc per slice */}
              <motion.path
                d={wedgePath}
                fill="none"
                animate={{
                  stroke: isActive
                    ? 'rgba(234,179,8,0.4)'
                    : dividerStroke,
                  strokeWidth: isActive ? 1.5 : 0.5,
                }}
                transition={{ duration: 0.3 }}
              />
              {/* Cheese bubble on active slice */}
              <AnimatePresence>
                {isActive && (
                  <motion.circle
                    cx={bubble.cx}
                    cy={bubble.cy}
                    r={bubble.r}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 0.75, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
                    fill={isFull ? 'rgba(254,240,138,0.55)' : 'rgba(253,224,71,0.35)'}
                    style={{ transformOrigin: `${bubble.cx}px ${bubble.cy}px` }}
                  />
                )}
              </AnimatePresence>
            </g>
          );
        })}

        {/* ── Center dot ── */}
        <circle
          cx={cx}
          cy={cy}
          r={r * 0.06}
          fill={slices > 0 ? 'rgba(251,191,36,0.6)' : centerDotEmpty}
          style={{ transition: 'fill 0.4s ease' }}
        />
      </svg>

      {/* ── CSS keyframe for ring pulse (injected as style tag) ── */}
      <style>{`
        @keyframes pizza-ring-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 0.8; transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}
