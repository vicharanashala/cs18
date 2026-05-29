import React from 'react';
import { getInitials, generateAvatarColor } from '../utils/avatarUtils';

/**
 * Premium, deterministic fallback Avatar component.
 *
 * @param {Object} props
 * @param {Object|string} props.user - User object (needs email/role) or string (email)
 * @param {number} props.size - Size of the avatar in pixels (default 32)
 * @param {string} props.className - Additional classes
 * @param {boolean} props.showGlow - Force golden glow (for Golden ticket users)
 */
export default function Avatar({ user, size = 32, className = '', showGlow = false }) {
  // Handle case where user is just an email string, or an object
  const identifier = typeof user === 'string' ? user : (user?.email || 'Unknown User');
  const role = typeof user === 'object' ? user?.role : 'student';
  const profilePicture = typeof user === 'object' ? user?.profilePicture : null;
  const isAdmin = role === 'admin';

  // Gold glow ring for admin / golden ticket users
  const adminRing = 'ring-1 ring-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.2)]';
  const adminRingFallback = 'ring-1 ring-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.15)]';
  const glowRing = 'shadow-[0_0_15px_rgba(251,191,36,0.3)] ring-1 ring-amber-400/40';
  const normalBorder = 'border border-white/5 shadow-inner';

  // If user has a custom profile picture, render that
  if (profilePicture) {
    return (
      <div
        className={`relative rounded-full overflow-hidden flex-shrink-0 ${className} ${isAdmin ? adminRing : ''} ${showGlow ? glowRing : ''}`}
        style={{ width: size, height: size }}
      >
        <img
          src={profilePicture}
          alt={`${identifier}'s profile`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Fallback to deterministic initials avatar
  const initials = getInitials(identifier);
  const bgColor = generateAvatarColor(identifier);
  const fontSize = Math.max(10, Math.floor(size * 0.4));

  return (
    <div
      className={`
        relative rounded-full flex items-center justify-center flex-shrink-0
        shadow-sm transition-all duration-300 select-none
        ${isAdmin ? adminRingFallback : normalBorder}
        ${showGlow ? glowRing : ''}
        ${className}
      `}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        color: 'white'
      }}
      title={identifier}
    >
      {/* Subtle glassmorphism overlay */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none mix-blend-overlay"></div>
      <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.15)] pointer-events-none"></div>

      {/* Text layer */}
      <span
        className="font-bricolage font-bold tracking-wider relative z-10 drop-shadow-md"
        style={{ fontSize: `${fontSize}px`, lineHeight: 1 }}
      >
        {initials}
      </span>
    </div>
  );
}