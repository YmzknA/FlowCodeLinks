import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CodeContent } from '@/components/CodeContent';
import { ParsedFile, Method } from '@/types/codebase';
// Setup Prism for testing
const Prism = {
  highlight: jest.fn((code: string) => {
    // Simulate actual Prism.js Ruby tokenization for testing
    // Match the exact output from the actual test
    if (code.includes('notifications_enabled?')) {
      return `<span class="token keyword">def</span> <span class="token method-definition"><span class="token function">notifications_enabled</span></span><span class="token operator">?</span>
  is_notifications_enabled <span class="token operator">==</span> <span class="token boolean">true</span>
<span class="token keyword">end</span>

<span class="token keyword">def</span> <span class="token method-definition"><span class="token function">check_status</span></span>
  <span class="token keyword">return</span> <span class="token boolean">false</span> <span class="token keyword">unless</span> notifications_enabled<span class="token operator">?</span>
  <span class="token boolean">true</span>
<span class="token keyword">end</span>`;
    }
    
    if (code.includes('save!')) {
      return `<span class="token keyword">def</span> <span class="token method-definition"><span class="token function">save</span></span><span class="token operator">!</span>
  <span class="token variable">@saved</span> <span class="token operator">=</span> <span class="token boolean">true</span>
<span class="token keyword">end</span>

<span class="token keyword">def</span> <span class="token method-definition"><span class="token function">process</span></span>
  save<span class="token operator">!</span>
<span class="token keyword">end</span>`;
    }
    
    return code;
  }),
  languages: {
    ruby: {}
  }
};

(global as any).Prism = Prism;

// Mock sanitizeContent
jest.mock('@/utils/security', () => ({
  sanitizeContent: (content: string) => content
}));

describe('Method Definition Clickability', () => {
  const mockOnMethodClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should make notifications_enabled? method definition clickable', async () => {
    const file: ParsedFile = {
      path: 'test.rb',
      directory: '',
      fileName: 'test.rb',
      totalLines: 8,
      content: `def notifications_enabled?
  is_notifications_enabled == true
end

def check_status
  return false unless notifications_enabled?
  true
end`,
      language: 'ruby',
      methods: [
        {
          name: 'notifications_enabled?',
          type: 'method',
          startLine: 1,
          endLine: 3,
          filePath: 'test.rb',
          code: 'def notifications_enabled?\n  is_notifications_enabled == true\nend',
          calls: [],
          isPrivate: false,
          parameters: []
        },
        {
          name: 'check_status',
          type: 'method',
          startLine: 5,
          endLine: 8,
          filePath: 'test.rb',
          code: 'def check_status\n  return false unless notifications_enabled?\n  true\nend',
          calls: [{ methodName: 'notifications_enabled?', line: 6, context: 'return false unless notifications_enabled?' }],
          isPrivate: false,
          parameters: []
        }
      ] as Method[]
    };

    const { container } = render(
      <CodeContent
        file={file}
        onMethodClick={mockOnMethodClick}
      />
    );

    // Wait for Prism highlighting to complete
    await waitFor(() => {
      const content = container.innerHTML;
      expect(content).toContain('notifications_enabled');
    }, { timeout: 3000 });

    // Debug: Log the actual HTML to see what was generated
    console.log('Generated HTML:');
    console.log(container.innerHTML);

    // Check that notifications_enabled? method definition is clickable
    const clickableElements = container.querySelectorAll('[data-method-name="notifications_enabled?"]');
    console.log(`Found ${clickableElements.length} clickable elements for notifications_enabled?`);
    
    // Should find both method definition and method call
    expect(clickableElements.length).toBeGreaterThan(0);
    
    if (clickableElements.length > 0) {
      // Click on the first occurrence (should be the method definition)
      fireEvent.click(clickableElements[0]);
      expect(mockOnMethodClick).toHaveBeenCalledWith('notifications_enabled?');
    }
  });

  it('should make save! method definition clickable', async () => {
    const file: ParsedFile = {
      path: 'test.rb',
      directory: '',
      fileName: 'test.rb',
      totalLines: 7,
      content: `def save!
  @saved = true
end

def process
  save!
end`,
      language: 'ruby',
      methods: [
        {
          name: 'save!',
          type: 'method',
          startLine: 1,
          endLine: 3,
          filePath: 'test.rb',
          code: 'def save!\n  @saved = true\nend',
          calls: [],
          isPrivate: false,
          parameters: []
        },
        {
          name: 'process',
          type: 'method',
          startLine: 5,
          endLine: 7,
          filePath: 'test.rb',
          code: 'def process\n  save!\nend',
          calls: [{ methodName: 'save!', line: 6, context: 'save!' }],
          isPrivate: false,
          parameters: []
        }
      ] as Method[]
    };

    const { container } = render(
      <CodeContent
        file={file}
        onMethodClick={mockOnMethodClick}
      />
    );

    // Wait for rendering
    await waitFor(() => {
      const content = container.innerHTML;
      expect(content).toContain('save');
    }, { timeout: 3000 });

    // Check that save! method definition is clickable
    const clickableElements = container.querySelectorAll('[data-method-name="save!"]');
    expect(clickableElements.length).toBeGreaterThan(0);
    
    if (clickableElements.length > 0) {
      fireEvent.click(clickableElements[0]);
      expect(mockOnMethodClick).toHaveBeenCalledWith('save!');
    }
  });
});