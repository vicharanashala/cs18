/**
 * Centralized banned-user theme logic.
 * All theme-aware components should use helpers from here
 * instead of duplicating user.isBanned checks.
 */

/**
 * Returns true if the given user object represents a banned account.
 * Safe to call with null/undefined user.
 */
export function isBannedUser(user) {
  return !!(user && user.isBanned === true);
}

/**
 * Returns the banned attribute string for injecting into root elements.
 * Use as: <div data-banned={isBannedUser(user) ? "true" : "false"} ...>
 */
export function getBannedAttr(user) {
  return isBannedUser(user) ? 'true' : 'false';
}

/**
 * Returns 'banned' or 'normal' for conditional class composition.
 */
export function getThemeMode(user) {
  return isBannedUser(user) ? 'banned' : 'normal';
}

/**
 * Extra-safe variant — also checks user object existence.
 * Use this in ProtectedRoute or middleware-level checks.
 */
export function isActiveBannedAccount(user) {
  return isBannedUser(user);
}