import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';
import { isValidJavaScriptMethod } from '@/config/javascript-keywords';

describe('Debug Filtering Test', () => {
  test('Check method filtering logic', () => {
    const definedMethods = new Set(['validateUser', 'saveToDatabase']);
    
    console.log('unknownMethod isValid:', isValidJavaScriptMethod('unknownMethod', definedMethods));
    console.log('randomFunction isValid:', isValidJavaScriptMethod('randomFunction', definedMethods));
    console.log('validateUser isValid:', isValidJavaScriptMethod('validateUser', definedMethods));
    console.log('console isValid:', isValidJavaScriptMethod('console', definedMethods));
    
    expect(true).toBe(true);
  });
});