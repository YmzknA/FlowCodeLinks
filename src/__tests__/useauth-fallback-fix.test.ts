/**
 * useAuth fallback clickability fix test
 */

import { replaceMethodNameInText } from '@/utils/method-highlighting';

describe('useAuth Fallback Clickability Fix', () => {
  test('should make useAuth clickable when findMethodDefinition is not provided (fallback mode)', () => {
    const htmlContent = 'const { currentUser, autoLogin } = useAuth();';
    const methodName = 'useAuth';
    const escapedMethodName = 'useAuth';
    
    // Fallback mode: no findMethodDefinition provided
    const result = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName
      // No additional parameters - this simulates fallback mode
    );
    
    // Should be clickable in fallback mode
    expect(result).toContain('data-method-name="useAuth"');
    expect(result).toContain('cursor-pointer');
  });

  test('should not make useAuth clickable when definition not found (smart mode)', () => {
    const htmlContent = 'const { currentUser, autoLogin } = useAuth();';
    const methodName = 'useAuth';
    const escapedMethodName = 'useAuth';
    
    // Smart mode: findMethodDefinition returns null (not found)
    const findMethodDefinition = (name: string) => {
      return null; // useAuth not found
    };
    
    const result = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName,
      findMethodDefinition
    );
    
    // Should NOT be clickable when definition not found in smart mode
    expect(result).toBe(htmlContent);
    expect(result).not.toContain('data-method-name');
  });

  test('should make useAuth clickable when definition found (smart mode)', () => {
    const htmlContent = 'const { currentUser, autoLogin } = useAuth();';
    const methodName = 'useAuth';
    const escapedMethodName = 'useAuth';
    
    // Smart mode: findMethodDefinition finds the definition
    const findMethodDefinition = (name: string) => {
      if (name === 'useAuth') {
        return { methodName: name, filePath: 'front/src/api/auth.ts' };
      }
      return null;
    };
    
    const result = replaceMethodNameInText(
      htmlContent,
      methodName,
      escapedMethodName,
      findMethodDefinition
    );
    
    // Should be clickable when definition found
    expect(result).toContain('data-method-name="useAuth"');
    expect(result).toContain('cursor-pointer');
  });
});