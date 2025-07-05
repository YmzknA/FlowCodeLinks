import { replaceMethodNameInText } from '@/utils/method-highlighting';

describe('Debug Attribute Replacement', () => {
  it('should debug the actual problem with def statements', () => {
    // Simulate the actual HTML that Prism.js generates for method definitions
    const prismHtml = `<span class="token keyword">def</span> <span class="token method-definition"><span class="token function">notifications_enabled</span></span><span class="token operator">?</span>
  is_notifications_enabled <span class="token operator">==</span> <span class="token boolean">true</span>
<span class="token keyword">end</span>`;

    // Test what happens when we apply replaceMethodNameInText to this
    const result = replaceMethodNameInText(prismHtml, 'notifications_enabled', 'notifications_enabled');
    
    console.log('Original HTML:');
    console.log(prismHtml);
    console.log('\nAfter replaceMethodNameInText:');
    console.log(result);
    
    // The function should NOT replace notifications_enabled inside HTML attributes
    // But it SHOULD replace it when it appears as text content
    expect(result).toContain('notifications_enabled');
  });

  it('should test with problematic HTML content that shows name= attributes', () => {
    // This simulates the problematic content we're seeing
    const problematicHtml = `def <span class="token method-definition"><span class="token function">notifications_enabled</span></span><span class="token operator">?</span>`;
    
    const result = replaceMethodNameInText(problematicHtml, 'notifications_enabled', 'notifications_enabled');
    
    console.log('\nProblematic HTML:');
    console.log(problematicHtml);
    console.log('\nAfter processing:');
    console.log(result);
    
    // Check if our function correctly handles this case
    expect(result).not.toContain('name="notifications_enabled"');
  });

  it('should test edge case with actual problematic pattern', () => {
    // Test the exact pattern that's causing issues
    const testHtml = `def name="test">test?`;
    
    const result = replaceMethodNameInText(testHtml, 'test', 'test');
    
    console.log('\nEdge case test:');
    console.log('Input:', testHtml);
    console.log('Output:', result);
    
    // The HTML attribute should NOT be modified
    expect(result).toContain('name="test"');
    expect(result).not.toContain('name="<span');
  });

  it('should protect class attribute names and data-method-name attributes', () => {
    // Test the actual problematic patterns found in the debug log
    const problematicHtml = `<span class="token class-name">User</span> and <span data-method-name="set_values">test</span>`;
    
    const result = replaceMethodNameInText(problematicHtml, 'name', 'name');
    
    console.log('\nClass attribute test:');
    console.log('Input:', problematicHtml);
    console.log('Output:', result);
    
    // Should NOT replace 'name' in class attribute or data-method-name
    expect(result).toContain('class-name');
    expect(result).toContain('data-method-name');
    expect(result).not.toContain('class-<span');
    expect(result).not.toContain('data-method-<span');
  });
});