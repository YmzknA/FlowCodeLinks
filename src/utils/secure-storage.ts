/**
 * Simple storage utility for UI state
 * No encryption needed for non-sensitive UI data
 */

const STORAGE_KEY_PREFIX = 'codeflow_';

/**
 * Simple sessionStorage wrapper
 */
export const simpleStorage = {
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.setItem(STORAGE_KEY_PREFIX + key, value);
    } catch (error) {
      // Silently fail if storage is not available
    }
  },

  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      return sessionStorage.getItem(STORAGE_KEY_PREFIX + key);
    } catch (error) {
      return null;
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.removeItem(STORAGE_KEY_PREFIX + key);
    } catch (error) {
      // Silently fail if storage is not available
    }
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;
    
    try {
      // Only clear items with our prefix
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      // Silently fail if storage is not available
    }
  }
};

// Legacy compatibility - will be removed after Context API migration
export const methodHighlightStorage = {
  setOriginalMethod: (methodName: string): void => {
    simpleStorage.setItem('originalClickedMethod', methodName);
  },

  getOriginalMethod: (): string | null => {
    return simpleStorage.getItem('originalClickedMethod');
  },

  clearOriginalMethod: (): void => {
    simpleStorage.removeItem('originalClickedMethod');
  }
};