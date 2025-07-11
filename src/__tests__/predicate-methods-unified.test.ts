import { replaceMethodNameInText } from '@/utils/method-highlighting';

describe('Predicate Methods Unified Implementation', () => {
  test('should handle predicate methods with ? suffix', () => {
    const html = `
      <div class="line">
        <span class="token method-definition">
          <span class="token function">other_guest_milestone</span>
        </span>
        <span class="token operator">?</span>
      </div>
    `;
    
    const result = replaceMethodNameInText(
      html,
      'other_guest_milestone?',
      'other_guest_milestone\\?',
      undefined,
      undefined,
      '/app/controllers/test_controller.rb'
    );
    
    expect(result).toContain('data-method-name="other_guest_milestone?"');
    expect(result).toContain('cursor-pointer');
    expect(result).toContain('*');
  });

  test('should handle predicate methods with ! suffix', () => {
    const html = `
      <div class="line">
        <span class="token method-definition">
          <span class="token function">save_user</span>
        </span>
        <span class="token operator">!</span>
      </div>
    `;
    
    const result = replaceMethodNameInText(
      html,
      'save_user!',
      'save_user\\!',
      undefined,
      undefined,
      '/app/models/user.rb'
    );
    
    expect(result).toContain('data-method-name="save_user!"');
    expect(result).toContain('cursor-pointer');
    expect(result).toContain('*');
  });

  test('should handle predicate method calls', () => {
    const html = `
      <div class="line">
        other_guest_milestone<span class="token operator">?</span>(milestone)
      </div>
    `;
    
    const result = replaceMethodNameInText(
      html,
      'other_guest_milestone?',
      'other_guest_milestone\\?',
      undefined,
      undefined,
      '/app/controllers/test_controller.rb'
    );
    
    expect(result).toContain('data-method-name="other_guest_milestone?"');
    expect(result).toContain('cursor-pointer');
    expect(result).toContain('*');
  });

  test('should not process external library methods', () => {
    const html = `
      <div class="line">
        console<span class="token operator">.</span>log<span class="token operator">?</span>
      </div>
    `;
    
    const result = replaceMethodNameInText(
      html,
      'console.log?',
      'console\\.log\\?',
      undefined,
      undefined,
      '/app/controllers/test_controller.rb'
    );
    
    // 外部ライブラリメソッドは処理されない
    expect(result).toBe(html);
  });
});