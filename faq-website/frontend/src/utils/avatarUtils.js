/**
 * Premium color palette for generated avatars.
 * Inspired by modern SaaS platforms (Linear, Notion, Slack).
 */
const AVATAR_PALETTE = [
  '#3E8E7E', // Emerald
  '#4A6FA5', // Muted Blue
  '#7C5CFC', // Indigo
  '#D97757', // Coral
  '#2D6A4F', // Forest Green
  '#5C8065', // Sage
  '#E09F3E', // Amber
  '#355C7D', // Deep Teal
];

/**
 * Extracts 1-2 initials from an email address or name.
 * Example: animesh.pathak@college.edu -> AP
 * Example: admin@test.com -> AD
 * 
 * @param {string} identifier - The email or name
 * @returns {string} The initials (uppercase)
 */
export const getInitials = (identifier) => {
  if (!identifier) return 'U';
  
  // If it's an email, extract the part before @
  const base = identifier.includes('@') ? identifier.split('@')[0] : identifier;
  
  // Split by dot, underscore, or space
  const parts = base.split(/[._\s-]/).filter(p => p.length > 0);
  
  if (parts.length >= 2) {
    // Take first letter of first two parts
    return (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    // Take first two letters of the single part
    return parts[0].substring(0, 2).toUpperCase();
  } else if (parts.length === 1) {
    // Fallback to single letter
    return parts[0][0].toUpperCase();
  }
  
  return 'U';
};

/**
 * Deterministically generates a color from the premium palette based on a string seed.
 * 
 * @param {string} seed - The string to hash (usually email)
 * @returns {string} Hex color code
 */
export const generateAvatarColor = (seed) => {
  if (!seed) return AVATAR_PALETTE[0];
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert negative hash to positive before modulo
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
};
