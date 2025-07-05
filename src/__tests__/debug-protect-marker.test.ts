import { replaceMethodNameInText } from '@/utils/method-highlighting';

describe('Debug Protect Marker', () => {
  it('should debug protect marker generation and restoration', () => {
    // 保護マーカーの生成と復元をデバッグ
    const html = `<span class="token function">uid_required</span>`;
    const result = replaceMethodNameInText(html, 'uid', 'uid');
    
    console.log('=== Protect Marker Debug ===');
    console.log('Input:', html);
    console.log('Output:', result);
    console.log('Contains digits:', /\d/.test(result));
    console.log('=== End Debug ===');
    
    // 数字が残っていないことを確認
    expect(result).not.toMatch(/^\d/); // 先頭に数字がない
    expect(result).not.toContain('0uid'); // 0が残っていない
    expect(result).not.toContain('1uid'); // 1が残っていない
  });

  it('should test protect marker with multiple methods', () => {
    // 複数のメソッドがある場合のデバッグ
    const html = `<span class="token function">uid_required</span> and <span class="token function">email_valid</span>`;
    const result1 = replaceMethodNameInText(html, 'uid', 'uid');
    const result2 = replaceMethodNameInText(result1, 'email', 'email');
    
    console.log('=== Multiple Methods Debug ===');
    console.log('Original:', html);
    console.log('After uid:', result1);
    console.log('After email:', result2);
    console.log('=== End Debug ===');
    
    // 数字が残っていないことを確認
    expect(result2).not.toMatch(/\d(?:uid|email)/);
  });
});