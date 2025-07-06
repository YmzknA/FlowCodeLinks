/**
 * Secure storage utility for sensitive data
 * Uses simple base64 encoding for obfuscation (not true encryption)
 */

const STORAGE_KEY_PREFIX = '__CodeFlow_';

/**
 * Simple base64 encode for obfuscation
 */
const encode = (data: string): string => {
  try {
    return btoa(data);
  } catch (error) {
    console.warn('Failed to encode data:', error);
    return data;
  }
};

/**
 * Simple base64 decode for obfuscation
 */
const decode = (data: string): string => {
  try {
    return atob(data);
  } catch (error) {
    console.warn('Failed to decode data:', error);
    return data;
  }
};

/**
 * Securely store data in sessionStorage
 */
export const secureSessionStorage = {
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    
    try {
      const encodedValue = encode(value);
      sessionStorage.setItem(STORAGE_KEY_PREFIX + key, encodedValue);
    } catch (error) {
      console.warn('Failed to store data securely:', error);
    }
  },

  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const encodedValue = sessionStorage.getItem(STORAGE_KEY_PREFIX + key);
      if (!encodedValue) return null;
      
      return decode(encodedValue);
    } catch (error) {
      console.warn('Failed to retrieve data securely:', error);
      return null;
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.removeItem(STORAGE_KEY_PREFIX + key);
    } catch (error) {
      console.warn('Failed to remove data securely:', error);
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
      console.warn('Failed to clear secure storage:', error);
    }
  }
};

/**
 * Manage method highlighting state securely
 */
export const methodHighlightStorage = {
  setOriginalMethod: (methodName: string): void => {
    // Store in both window object and secure session storage
    if (typeof window !== 'undefined') {
      (window as any).__originalClickedMethod = methodName;
      secureSessionStorage.setItem('originalClickedMethod', methodName);
    }
  },

  getOriginalMethod: (): string | null => {
    if (typeof window === 'undefined') return null;
    
    // Try window object first, then secure session storage
    const windowMethod = (window as any).__originalClickedMethod;
    if (windowMethod) return windowMethod;
    
    const storedMethod = secureSessionStorage.getItem('originalClickedMethod');
    if (storedMethod) {
      // Restore to window object for consistency
      (window as any).__originalClickedMethod = storedMethod;
      return storedMethod;
    }
    
    return null;
  },

  clearOriginalMethod: (): void => {
    if (typeof window !== 'undefined') {
      delete (window as any).__originalClickedMethod;
      secureSessionStorage.removeItem('originalClickedMethod');
    }
  }
};