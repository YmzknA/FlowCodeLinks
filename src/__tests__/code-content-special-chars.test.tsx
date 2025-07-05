import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeContent } from '@/components/CodeContent';
import { ParsedFile } from '@/types/codebase';
import '@testing-library/jest-dom';

// Mock Prism.js
jest.mock('prismjs', () => ({
  default: {
    highlight: (code: string) => code,
    languages: {
      ruby: {},
      javascript: {},
      typescript: {}
    }
  }
}));

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

describe('CodeContent - Special Characters in Method Names', () => {
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

  test('should create clickable spans for method names with question marks', async () => {
    const content = `class User
  def admin?
    true
  end

  def check
    admin?
  end
end`;

    const file = createFileWithMethods(content, [
      {
        name: 'admin?',
        startLine: 2,
        endLine: 4,
        calls: []
      },
      {
        name: 'check',
        startLine: 6,
        endLine: 8,
        calls: [{ methodName: 'admin?', line: 7 }]
      }
    ]);

    const onMethodClick = jest.fn();
    const { container } = render(
      <CodeContent file={file} onMethodClick={onMethodClick} />
    );

    // Wait for the component to render
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if spans with data-method-name are created
    const methodSpans = container.querySelectorAll('span[data-method-name]');
    expect(methodSpans.length).toBeGreaterThan(0);

    // Check if admin? method name is properly set in data attribute
    const adminMethodSpans = container.querySelectorAll('span[data-method-name="admin?"]');
    expect(adminMethodSpans.length).toBeGreaterThan(0);

    // Test clicking on the method
    const firstAdminSpan = adminMethodSpans[0];
    fireEvent.click(firstAdminSpan);
    expect(onMethodClick).toHaveBeenCalledWith('admin?');
  });

  test('should handle method names with exclamation marks', async () => {
    const content = `class User
  def save!
    # force save
  end

  def update_user
    save!
  end
end`;

    const file = createFileWithMethods(content, [
      {
        name: 'save!',
        startLine: 2,
        endLine: 4,
        calls: []
      },
      {
        name: 'update_user',
        startLine: 6,
        endLine: 8,
        calls: [{ methodName: 'save!', line: 7 }]
      }
    ]);

    const onMethodClick = jest.fn();
    const { container } = render(
      <CodeContent file={file} onMethodClick={onMethodClick} />
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    const saveMethodSpans = container.querySelectorAll('span[data-method-name="save!"]');
    expect(saveMethodSpans.length).toBeGreaterThan(0);

    fireEvent.click(saveMethodSpans[0]);
    expect(onMethodClick).toHaveBeenCalledWith('save!');
  });

  test('should handle method names with special regex characters', async () => {
    const content = `class Parser
  def match_pattern(text)
    # some matching logic
  end

  def test.method
    # special method name
  end

  def [](index)
    # array access method
  end

  def process
    match_pattern("test")
    self[0]
  end
end`;

    const file = createFileWithMethods(content, [
      {
        name: 'match_pattern',
        startLine: 2,
        endLine: 4,
        calls: []
      },
      {
        name: 'test.method',
        startLine: 6,
        endLine: 8,
        calls: []
      },
      {
        name: '[]',
        startLine: 10,
        endLine: 12,
        calls: []
      },
      {
        name: 'process',
        startLine: 14,
        endLine: 17,
        calls: [
          { methodName: 'match_pattern', line: 15 },
          { methodName: '[]', line: 16 }
        ]
      }
    ]);

    const onMethodClick = jest.fn();
    const { container } = render(
      <CodeContent file={file} onMethodClick={onMethodClick} />
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if special characters are properly escaped in regex
    const matchPatternSpans = container.querySelectorAll('span[data-method-name="match_pattern"]');
    expect(matchPatternSpans.length).toBeGreaterThan(0);

    const bracketMethodSpans = container.querySelectorAll('span[data-method-name="[]"]');
    expect(bracketMethodSpans.length).toBeGreaterThan(0);

    // Test clicking on methods with special characters
    fireEvent.click(bracketMethodSpans[0]);
    expect(onMethodClick).toHaveBeenCalledWith('[]');
  });

  test('should not break when method name contains quotes', async () => {
    const content = `class StringHelper
  def format_quote(text)
    text.gsub('"', '\\"')
  end

  def process
    format_quote('test"quote')
  end
end`;

    const file = createFileWithMethods(content, [
      {
        name: 'format_quote',
        startLine: 2,
        endLine: 4,
        calls: []
      },
      {
        name: 'process',
        startLine: 6,
        endLine: 8,
        calls: [{ methodName: 'format_quote', line: 7 }]
      }
    ]);

    const onMethodClick = jest.fn();
    const { container } = render(
      <CodeContent file={file} onMethodClick={onMethodClick} />
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not throw error and should create clickable spans
    const formatQuoteSpans = container.querySelectorAll('span[data-method-name="format_quote"]');
    expect(formatQuoteSpans.length).toBeGreaterThan(0);
  });

  test('should handle method names at word boundaries correctly', async () => {
    const content = `class Test
  def test
    # method test
  end

  def testing
    # method testing (should not match 'test')
  end

  def run_test
    test
    testing
  end
end`;

    const file = createFileWithMethods(content, [
      {
        name: 'test',
        startLine: 2,
        endLine: 4,
        calls: []
      },
      {
        name: 'testing',
        startLine: 6,
        endLine: 8,
        calls: []
      },
      {
        name: 'run_test',
        startLine: 10,
        endLine: 13,
        calls: [
          { methodName: 'test', line: 11 },
          { methodName: 'testing', line: 12 }
        ]
      }
    ]);

    const onMethodClick = jest.fn();
    const { container } = render(
      <CodeContent file={file} onMethodClick={onMethodClick} />
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should create separate spans for 'test' and 'testing'
    const testSpans = container.querySelectorAll('span[data-method-name="test"]');
    const testingSpans = container.querySelectorAll('span[data-method-name="testing"]');

    // 'testing' should not be matched when looking for 'test' with word boundaries
    expect(testSpans.length).toBeGreaterThan(0);
    expect(testingSpans.length).toBeGreaterThan(0);

    // Verify that 'test' within 'testing' is not clickable
    testingSpans.forEach(span => {
      expect(span.textContent).toBe('testing');
    });
  });
});