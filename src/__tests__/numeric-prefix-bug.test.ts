import { replaceMethodNameInText } from '@/utils/method-highlighting';

describe('Numeric Prefix Bug Prevention', () => {
  it('should not add numeric prefixes to method names', () => {
    // 実際の問題：メソッド名の前に数字が追加される現象をテスト
    const html = `def uid_required?`;
    const result = replaceMethodNameInText(html, 'uid', 'uid');
    
    console.log('=== Numeric Prefix Test ===');
    console.log('Input:', html);
    console.log('Output:', result);
    console.log('=== End Test ===');
    
    // 数字プレフィックスが追加されていないことを確認
    expect(result).not.toContain('0uid_required');
    expect(result).not.toContain('1uid_required');
    expect(result).not.toContain('2uid_required');
    expect(result).not.toContain('3uid_required');
    
    // 正しい結果であることを確認
    expect(result).toContain('<span class="cursor-pointer" data-method-name="uid">uid</span>_required?');
  });

  it('should handle multiple protect markers without numeric contamination', () => {
    // 複数の保護マーカーが使用されても数字が混入しないことを確認
    const html = `<span class="method uid">def uid_required?</span> and <span class="method email">def email_valid?</span>`;
    
    // 複数のメソッド名を順次処理
    let result = replaceMethodNameInText(html, 'uid', 'uid');
    result = replaceMethodNameInText(result, 'email', 'email');
    
    console.log('=== Multiple Markers Test ===');
    console.log('Input:', html);
    console.log('Output:', result);
    console.log('=== End Test ===');
    
    // 各メソッド名の前に数字が追加されていないことを確認
    expect(result).not.toMatch(/\d+uid_required/);
    expect(result).not.toMatch(/\d+email_valid/);
    
    // class属性が保護されていることを確認
    expect(result).toContain('class="method uid"');
    expect(result).toContain('class="method email"');
  });

  it('should test protect marker restoration integrity', () => {
    // 保護マーカーの復元が正しく行われることを確認
    const protectMarker = `__PROTECT_${Math.random().toString(36).substr(2, 9)}__`;
    const protectMap = new Map<string, string>();
    
    // テスト用のマーカー生成
    const marker1 = `${protectMarker}0`;
    const marker2 = `${protectMarker}1`;
    
    protectMap.set(marker1, 'original_content_1');
    protectMap.set(marker2, 'original_content_2');
    
    let testString = `some text ${marker1} and ${marker2} more text`;
    
    console.log('=== Marker Restoration Test ===');
    console.log('Before restoration:', testString);
    
    // 復元処理をテスト
    protectMap.forEach((originalContent, marker) => {
      const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      testString = testString.replace(new RegExp(escapedMarker, 'g'), originalContent);
    });
    
    console.log('After restoration:', testString);
    console.log('=== End Test ===');
    
    // マーカーが完全に復元されていることを確認
    expect(testString).toBe('some text original_content_1 and original_content_2 more text');
    expect(testString).not.toContain('__PROTECT_');
    expect(testString).not.toMatch(/\d+/); // 数字が残っていない
  });

  it('should test real-world method name patterns', () => {
    // 実際のRubyメソッド名パターンをテスト
    const testCases = [
      'uid_required?',
      'completed_tasks_hidden?', 
      'social_profile',
      'set_values',
      'notifications_enabled?'
    ];
    
    testCases.forEach((methodName, index) => {
      const html = `def ${methodName}`;
      const baseMethodName = methodName.replace(/[?!]$/, '');
      const result = replaceMethodNameInText(html, baseMethodName, baseMethodName);
      
      console.log(`=== Test Case ${index + 1}: ${methodName} ===`);
      console.log('Input:', html);
      console.log('Output:', result);
      
      // 数字プレフィックスがないことを確認
      expect(result).not.toMatch(new RegExp(`\\d+${methodName.replace(/[?!]/, '\\$&')}`));
      
      console.log('✅ No numeric prefix found');
      console.log('=== End Test Case ===');
    });
  });
});