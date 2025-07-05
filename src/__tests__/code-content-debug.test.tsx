import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { CodeContent } from '@/components/CodeContent';
import { ParsedFile } from '@/types/codebase';
import '@testing-library/jest-dom';

// Mock the security module to return content as-is for testing
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

describe('CodeContent - Debug Output', () => {
  const createFileWithMethods = (content: string, methods: any[]): ParsedFile => ({
    path: '/test/file.rb',
    language: 'ruby',
    content,
    directory: '/test',
    fileName: 'file.rb',
    totalLines: content.split('\n').length,
    methods
  });

  test('debug: show actual rendered output for method with question mark', async () => {
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

    // Wait for the component to update
    await waitFor(() => {
      const preElement = container.querySelector('pre');
      expect(preElement).toBeInTheDocument();
    });

    // Debug: Print the actual HTML content
    const codeElement = container.querySelector('code');
    console.log('Rendered HTML:', codeElement?.innerHTML);

    // Check what's actually in the DOM
    const allSpans = container.querySelectorAll('span');
    console.log('Total spans found:', allSpans.length);
    
    allSpans.forEach((span, index) => {
      console.log(`Span ${index}:`, {
        className: span.className,
        dataMethodName: span.getAttribute('data-method-name'),
        textContent: span.textContent
      });
    });

    // Also check the raw HTML
    const preElement = container.querySelector('pre');
    console.log('Pre element HTML:', preElement?.innerHTML);
  });
});