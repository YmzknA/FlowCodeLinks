import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';

describe('Question Mark Method Clickability', () => {
  test('should detect question mark methods and make them clickable', () => {
    const content = `class User
  def notifications_enabled?
    true
  end
  
  def test_method
    notifications_enabled?
    self.notifications_enabled?
    user.notifications_enabled?
  end
end`;

    const file: ParsedFile = {
      path: 'test.rb',
      language: 'ruby' as Language,
      content,
      directory: '',
      fileName: 'test.rb',
      totalLines: content.split('\n').length,
      methods: []
    };

    const methods = analyzeMethodsInFile(file);
    
    // Check that notifications_enabled? method is detected
    const questionMarkMethod = methods.find(m => m.name === 'notifications_enabled?');
    expect(questionMarkMethod).toBeDefined();
    
    // Check that method calls with ? are detected
    const testMethod = methods.find(m => m.name === 'test_method');
    const calls = testMethod?.calls || [];
    const questionMarkCalls = calls.filter(c => c.methodName === 'notifications_enabled?');
    
    expect(questionMarkCalls).toHaveLength(3);
    expect(questionMarkCalls[0].context).toBe('notifications_enabled?');
    expect(questionMarkCalls[1].context).toBe('self.notifications_enabled?');
    expect(questionMarkCalls[2].context).toBe('user.notifications_enabled?');
  });

  test('should handle exclamation mark methods', () => {
    const content = `class User
  def save!
    # save logic
  end
  
  def test_method
    save!
    user.save!
  end
end`;

    const file: ParsedFile = {
      path: 'test.rb',
      language: 'ruby' as Language,
      content,
      directory: '',
      fileName: 'test.rb',
      totalLines: content.split('\n').length,
      methods: []
    };

    const methods = analyzeMethodsInFile(file);
    
    // Check that save! method is detected
    const exclamationMethod = methods.find(m => m.name === 'save!');
    expect(exclamationMethod).toBeDefined();
    
    // Check that method calls with ! are detected
    const testMethod = methods.find(m => m.name === 'test_method');
    const calls = testMethod?.calls || [];
    const exclamationCalls = calls.filter(c => c.methodName === 'save!');
    
    expect(exclamationCalls).toHaveLength(2);
  });

  test('should test regex patterns used in CodeContent', () => {
    const methodName = 'notifications_enabled?';
    
    // Test the special handling for ? methods
    const baseMethodName = methodName.slice(0, -1);
    const suffix = methodName.slice(-1);
    const escapedBase = baseMethodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Use the same pattern as in CodeContent component
    const pattern = new RegExp(
      `(${escapedBase})(<span class="token operator">${escapedSuffix}</span>)`,
      'g'
    );
    
    // Test basic case that should match
    const testCase = 'notifications_enabled<span class="token operator">?</span>';
    const match = pattern.exec(testCase);
    
    expect(match).toBeTruthy();
    if (match) {
      expect(match[1]).toBe('notifications_enabled');
      expect(match[2]).toBe('<span class="token operator">?</span>');
    }
    
    // Test replacement functionality
    const testHTML = 'notifications_enabled<span class="token operator">?</span>';
    const replaced = testHTML.replace(pattern, 
      `<span class="cursor-pointer" data-method-name="${methodName}">$1$2</span>`
    );
    
    expect(replaced).toContain('cursor-pointer');
    expect(replaced).toContain(`data-method-name="${methodName}"`);
    expect(replaced).toContain('notifications_enabled<span class="token operator">?</span>');
  });
});