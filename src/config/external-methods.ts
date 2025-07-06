/**
 * Configuration for external library methods that should not be clickable
 */

export const EXTERNAL_LIBRARY_METHODS = new Set([
  // Recoil
  'useRecoilValue', 'useRecoilState', 'useSetRecoilState',
  
  // React Hooks
  'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext',
  
  // HTTP clients
  'axios', 'fetch',
  
  // Built-in JavaScript/Browser APIs
  'console', 'setTimeout', 'setInterval', 'JSON', 'Object', 'Array',
  
  // Next.js Google Fonts
  'Rampart_One', 'Inter', 'Roboto', 'Open_Sans', 'Poppins', 'Nunito', 'Lato', 'Montserrat',
  'Source_Sans_Pro', 'Oswald', 'Raleway', 'PT_Sans', 'Merriweather', 'Ubuntu', 'Playfair_Display'
]);

/**
 * Check if a method name belongs to an external library
 */
export function isExternalLibraryMethod(methodName: string): boolean {
  return EXTERNAL_LIBRARY_METHODS.has(methodName);
}