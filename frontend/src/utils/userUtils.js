/**
 * Utility functions for user-related operations
 */

/**
 * Generate user initials from full name
 * @param {string} fullName - The user's full name
 * @returns {string} - The initials (e.g., "John Doe" -> "JD")
 */
export const generateInitials = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return 'U'; // Default fallback
  }

  const names = fullName.trim().split(' ');
  
  if (names.length === 1) {
    // Single name - take first two characters
    return names[0].substring(0, 2).toUpperCase();
  } else {
    // Multiple names - take first character of first two names
    return names
      .slice(0, 2)
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase();
  }
};

/**
 * Get user display name for greetings
 * @param {string} fullName - The user's full name
 * @returns {string} - The first name for greeting
 */
export const getDisplayName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return 'User';
  }

  const names = fullName.trim().split(' ');
  return names[0];
};
