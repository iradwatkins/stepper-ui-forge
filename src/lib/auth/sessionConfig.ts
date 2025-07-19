// Session configuration for persistent login
export const SESSION_CONFIG = {
  // Session duration in seconds (7 days)
  EXPIRY_DURATION: 7 * 24 * 60 * 60, // 604800 seconds
  
  // Refresh token before it expires (1 hour before expiry)
  REFRESH_THRESHOLD: 60 * 60, // 3600 seconds
  
  // Storage keys
  STORAGE_KEYS: {
    SESSION: 'stepper-auth-session',
    EXPIRY: 'stepper-auth-expiry',
    REMEMBER_ME: 'stepper-remember-me'
  }
};

// Check if session should be refreshed
export const shouldRefreshSession = (expiresAt?: number): boolean => {
  if (!expiresAt) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = expiresAt - now;
  
  return timeUntilExpiry < SESSION_CONFIG.REFRESH_THRESHOLD;
};

// Get session expiry time (7 days from now)
export const getSessionExpiry = (): number => {
  return Math.floor(Date.now() / 1000) + SESSION_CONFIG.EXPIRY_DURATION;
};

// Check if user chose to be remembered
export const isRememberMeEnabled = (): boolean => {
  try {
    return localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.REMEMBER_ME) === 'true';
  } catch {
    return false;
  }
};

// Set remember me preference
export const setRememberMe = (remember: boolean): void => {
  try {
    if (remember) {
      localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.REMEMBER_ME, 'true');
    } else {
      localStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.REMEMBER_ME);
    }
  } catch (error) {
    console.error('Failed to set remember me preference:', error);
  }
};

// Clear all session data
export const clearSessionData = (): void => {
  try {
    Object.values(SESSION_CONFIG.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear session data:', error);
  }
};