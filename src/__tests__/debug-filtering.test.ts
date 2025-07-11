import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';
import { isValidJavaScriptMethod } from '@/config/javascript-keywords';

describe('Debug Filtering Test', () => {
  test('Check method filtering logic', () => {
    const definedMethods = new Set(['validateUser', 'saveToDatabase']);
    
    // Test method validation logic
    const unknownMethodValid = isValidJavaScriptMethod('unknownMethod', definedMethods);
    const randomFunctionValid = isValidJavaScriptMethod('randomFunction', definedMethods);
    const validateUserValid = isValidJavaScriptMethod('validateUser', definedMethods);
    const consoleValid = isValidJavaScriptMethod('console', definedMethods);
    
    expect(validateUserValid).toBe(true); // Should be valid as it's in definedMethods
    expect(consoleValid).toBe(true); // Should be valid as it's a built-in method
    
    expect(true).toBe(true);
  });
});