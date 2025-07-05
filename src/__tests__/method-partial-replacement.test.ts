import { replaceMethodNameInText } from '@/utils/method-highlighting';

describe('Method Partial Replacement Prevention', () => {
  it('should not replace partial matches within other method names', () => {
    // social_profileメソッドの中のemailが置換されないことを確認
    const html = `def social_profile(provider)`;
    const result = replaceMethodNameInText(html, 'email', 'email');
    
    console.log('Input:', html);
    console.log('Output:', result);
    
    // social_profileは変更されず、emailが独立して存在する場合のみ置換される
    expect(result).toBe(`def social_profile(provider)`);
    expect(result).not.toContain('data-method-name="email"');
  });

  it('should replace only complete method names', () => {
    // 完全なメソッド名のみ置換されることを確認
    const html = `email and social_profile(email)`;
    const result = replaceMethodNameInText(html, 'email', 'email');
    
    console.log('Input:', html);
    console.log('Output:', result);
    
    // 最初のemailは置換される、social_profile内のemailは置換されない、引数のemailは置換される
    expect(result).toContain('<span class="cursor-pointer" data-method-name="email">email</span> and social_profile(<span class="cursor-pointer" data-method-name="email">email</span>)');
    expect(result).not.toContain('soci<span');
  });

  it('should handle method names with underscores correctly', () => {
    // アンダースコアを含むメソッド名の正確な処理
    const html = `user_email and get_user_email_address`;
    const result = replaceMethodNameInText(html, 'user_email', 'user_email');
    
    console.log('Input:', html);
    console.log('Output:', result);
    
    // user_emailは置換される、get_user_email_address内のuser_emailは置換されない
    expect(result).toContain('<span class="cursor-pointer" data-method-name="user_email">user_email</span> and get_user_email_address');
  });

  it('should not affect HTML attributes during replacement', () => {
    // HTML属性は影響を受けないことを確認
    const html = `<div class="email-field">email validation</div>`;
    const result = replaceMethodNameInText(html, 'email', 'email');
    
    console.log('Input:', html);
    console.log('Output:', result);
    
    // class属性内のemailは変更されず、保護されている
    expect(result).toContain('class="email-field"');
    // HTML属性内にメソッド名がある場合は、全体が保護されてテキスト内も置換されない
    expect(result).toBe('<div class="email-field">email validation</div>');
  });
});