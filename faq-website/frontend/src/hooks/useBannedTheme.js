/**
 * useBannedTheme — sync user.isBanned to the <html> element's data-banned attribute.
 *
 * Also returns banned-safe CSS class strings that replace gold/amber/yellow
 * Tailwind utilities with rose/pink/red alternatives when the user is restricted.
 */
import { useEffect } from 'react';

function isRestricted() {
  return document.documentElement.getAttribute('data-banned') === 'true';
}

export function useBannedTheme(user) {
  const banned = !!(user && user.isBanned === true);

  useEffect(() => {
    // Set on <html> — same element ThemeToggle uses for data-theme.
    // This makes [data-banned='true'] selectors work correctly, including
    // compound selectors like [data-theme='dark'][data-banned='true'].
    document.documentElement.setAttribute('data-banned', banned ? 'true' : 'false');
    return () => {
      document.documentElement.removeAttribute('data-banned');
    };
  }, [banned]);

  return banned;
}

/**
 * Returns true when the document root has data-banned="true".
 * Use this in nested components where user prop isn't passed down.
 */
export function useIsBanned() {
  return isRestricted();
}

/**
 * Returns banned-safe replacements for gold/amber/yellow Tailwind classes.
 * Usage: className={`glass-card ${bannedcls('border-yellow-200', 'border-rose-200')}`}
 *
 * Maps gold/amber/yellow/orange palette → rose/red palette so restricted users
 * never see any gold UI anywhere in the app.
 */
export function bannedClass(normal, restricted) {
  return isRestricted() ? restricted : normal;
}

/**
 * Returns full restricted CSS class strings for common gold UI patterns.
 * Every property that has a gold version gets a rose equivalent here.
 */
export function useBannedClass() {
  const banned = isRestricted();

  return {
    // Border colors
    borderYellow: banned ? 'border-rose-200' : 'border-yellow-200',
    borderAmber: banned ? 'border-rose-300' : 'border-amber-300',
    borderGold: banned ? 'border-rose-300' : 'border-yellow-500/30',

    // Backgrounds
    bgYellow: banned ? 'bg-rose-50' : 'bg-yellow-50',
    bgAmber: banned ? 'bg-red-50' : 'bg-amber-50',
    bgGold: banned ? 'bg-red-50' : 'bg-amber-50/30',
    bgAmberDark: banned ? 'bg-red-900/20' : 'bg-amber-900/30',
    bgYellowDark: banned ? 'bg-red-900/20' : 'bg-yellow-900/20',

    // Text colors
    textYellow: banned ? 'text-rose-600' : 'text-yellow-400',
    textAmber: banned ? 'text-red-600' : 'text-amber-600',
    textAmberDark: banned ? 'text-rose-400' : 'text-amber-400',
    textGold: banned ? 'text-red-500' : 'text-amber-400',

    // Icon/text accent (light mode)
    textAmberLight: banned ? 'text-red-500' : 'text-amber-500',
    bgAmberLight: banned ? 'bg-red-500/10' : 'bg-amber-500/10',
    borderAmberLight: banned ? 'border-red-500/20' : 'border-amber-500/20',

    // Ring/glow
    ringAmber: banned ? 'ring-rose-400/60' : 'ring-amber-400/60',
    ringYellow: banned ? 'ring-rose-400/40' : 'ring-yellow-400/40',
    shadowAmber: banned ? 'shadow-[0_0_10px_rgba(244,63,94,0.15)]' : 'shadow-[0_0_10px_rgba(251,191,36,0.15)]',
    shadowAmberLg: banned ? 'shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'shadow-[0_0_15px_rgba(251,191,36,0.3)]',

    // Status badge type "yellow"
    badgeYellow: banned ? 'bg-red-100 text-red-900 border-red-300 dark:bg-red-900/20 dark:text-rose-400 dark:border-red-800' : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500',

    // Badge accent bg
    bgBadgeAccent: banned ? 'bg-red-100' : 'bg-amber-100',
    textBadgeAccent: banned ? 'text-red-700' : 'text-amber-700',
    borderBadgeAccent: banned ? 'border-red-200' : 'border-amber-200',

    // Gradient overrides
    gradientFromOrange: banned ? 'from-red-500/10' : 'from-orange-500/5',
    gradientViaOrange: banned ? 'via-red-500/5' : 'via-orange-500/5',
    gradientBgOrange: banned ? 'bg-red-500/5' : 'bg-orange-500/5',
    gradientBlurOrange: banned ? 'bg-red-500/5' : 'bg-orange-500/5',

    // Page accent glow
    glowYellow: banned ? 'bg-red-500/[0.02]' : 'bg-yellow-500/[0.02]',
    glowAmber: banned ? 'bg-red-500/[0.03]' : 'bg-amber-500/[0.03]',

    // Crown / title accent
    textCrown: banned ? 'text-red-400' : 'text-yellow-400',

    // Pizza slice icon color
    textPizzaAmber: banned ? 'text-red-400' : 'text-amber-400',

    // Full conditional class helper
    cls: (normal, restricted) => banned ? restricted : normal,
  };
}