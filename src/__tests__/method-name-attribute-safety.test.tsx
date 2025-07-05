import React from 'react';
import { render } from '@testing-library/react';
import { CodeContent } from '@/components/CodeContent';
import { ParsedFile } from '@/types/codebase';
import '@testing-library/jest-dom';

// Mock the security module
jest.mock('@/utils/security', () => ({
  sanitizeContent: (content: string) => content
}));

// Mock the performance module
jest.mock('@/utils/performance', () => ({
  debounce: (fn: Function) => fn,
  optimizedScroll: jest.fn()
}));

// Mock the custom hook
jest.mock('@/hooks/useWheelScrollIsolation', () => ({
  useWheelScrollIsolation: () => ({ handleWheel: jest.fn() })
}));

describe('CodeContent - Method Name Attribute Safety', () => {
  const createFileWithMethods = (content: string, methods: any[]): ParsedFile => ({
    path: '/test/file.rb',
    language: 'ruby',
    content,
    directory: '/test',
    fileName: 'file.rb',
    totalLines: content.split('\n').length,
    methods
  });

  beforeEach(() => {
    // Reset window.Prism before each test
    (window as any).Prism = undefined;
  });

  test('should not replace method names inside HTML attributes', async () => {
    // Mock Prism.js to return HTML with attributes that contain method names
    const mockPrismHighlight = jest.fn((code: string) => {
      return `<span class="token tag"><span class="token punctuation">&lt;</span>form<span class="token punctuation">&gt;</span></span>
  <span class="token tag"><span class="token punctuation">&lt;</span>input<span class="token punctuation">&gt;</span></span> type="text" name="email" id="email" />
  <span class="token tag"><span class="token punctuation">&lt;</span>input<span class="token punctuation">&gt;</span></span> type="password" name="password" id="password" />
<span class="token tag"><span class="token punctuation">&lt;/</span>form<span class="token punctuation">&gt;</span></span>`;
    });

    (window as any).Prism = {
      highlight: mockPrismHighlight,
      languages: {
        ruby: {}
      }
    };

    const content = `<form>
  <input type="text" name="email" id="email" />
  <input type="password" name="password" id="password" />
</form>`;

    const file = createFileWithMethods(content, [
      {
        name: 'email',
        startLine: 2,
        endLine: 2,
        calls: []
      }
    ]);

    const onMethodClick = jest.fn();
    const { container } = render(
      <CodeContent file={file} onMethodClick={onMethodClick} />
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    const htmlContent = container.querySelector('code')?.innerHTML || '';
    
    // Verify that HTML attributes are not corrupted by method name replacement
    expect(htmlContent).toContain('name="email"');
    expect(htmlContent).toContain('id="email"');
    expect(htmlContent).not.toContain('name="<span class="cursor-pointer"');
    expect(htmlContent).not.toContain('id="<span class="cursor-pointer"');
  });

  test('should still make method names clickable outside of HTML attributes', async () => {
    // Mock Prism.js to return code with method names both in attributes and in code
    const mockPrismHighlight = jest.fn((code: string) => {
      return `<span class="token keyword">def</span> <span class="token method-definition"><span class="token function">email</span></span>
  <span class="token comment"># some code</span>
<span class="token keyword">end</span>

<span class="token comment"># HTML with same method name in attribute</span>
<span class="token tag"><span class="token punctuation">&lt;</span>input<span class="token punctuation">&gt;</span></span> name="email" />`;
    });

    (window as any).Prism = {
      highlight: mockPrismHighlight,
      languages: {
        ruby: {}
      }
    };

    const content = `def email
  # some code
end

# HTML with same method name in attribute
<input name="email" />`;

    const file = createFileWithMethods(content, [
      {
        name: 'email',
        startLine: 1,
        endLine: 3,
        calls: []
      }
    ]);

    const onMethodClick = jest.fn();
    const { container } = render(
      <CodeContent file={file} onMethodClick={onMethodClick} />
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    const htmlContent = container.querySelector('code')?.innerHTML || '';
    
    // Verify that method definition is clickable
    expect(htmlContent).toContain('data-method-name="email"');
    
    // Verify that HTML attribute is NOT made clickable
    expect(htmlContent).toContain('name="email"');
    expect(htmlContent).not.toContain('name="<span class="cursor-pointer"');
  });

  test('should handle multiple method names in different contexts', async () => {
    const mockPrismHighlight = jest.fn((code: string) => {
      return `<span class="token keyword">def</span> <span class="token method-definition"><span class="token function">user</span></span>
  <span class="token variable">@user</span>
<span class="token keyword">end</span>

<span class="token keyword">def</span> <span class="token method-definition"><span class="token function">admin</span></span>
  <span class="token variable">@admin</span>
<span class="token keyword">end</span>

<span class="token tag"><span class="token punctuation">&lt;</span>form<span class="token punctuation">&gt;</span></span>
  <span class="token tag"><span class="token punctuation">&lt;</span>input<span class="token punctuation">&gt;</span></span> name="user" id="admin" />
<span class="token tag"><span class="token punctuation">&lt;/</span>form<span class="token punctuation">&gt;</span></span>`;
    });

    (window as any).Prism = {
      highlight: mockPrismHighlight,
      languages: {
        ruby: {}
      }
    };

    const content = `def user
  @user
end

def admin
  @admin
end

<form>
  <input name="user" id="admin" />
</form>`;

    const file = createFileWithMethods(content, [
      {
        name: 'user',
        startLine: 1,
        endLine: 3,
        calls: []
      },
      {
        name: 'admin',
        startLine: 5,
        endLine: 7,
        calls: []
      }
    ]);

    const onMethodClick = jest.fn();
    const { container } = render(
      <CodeContent file={file} onMethodClick={onMethodClick} />
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    const htmlContent = container.querySelector('code')?.innerHTML || '';
    
    // Verify that method definitions are clickable
    expect(htmlContent).toContain('data-method-name="user"');
    expect(htmlContent).toContain('data-method-name="admin"');
    
    // Verify that HTML attributes are NOT made clickable
    expect(htmlContent).toContain('name="user"');
    expect(htmlContent).toContain('id="admin"');
    expect(htmlContent).not.toContain('name="<span class="cursor-pointer"');
    expect(htmlContent).not.toContain('id="<span class="cursor-pointer"');
  });
});