import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CodeContent } from '@/components/CodeContent';
import { ParsedFile, Method } from '@/types/codebase';

// Mock Prism
const Prism = {
  highlight: jest.fn((code: string) => `<span class="token">${code}</span>`),
  languages: {
    ruby: {},
    javascript: {}
  }
};

(global as any).Prism = Prism;

// Mock sanitizeContent
jest.mock('@/utils/security', () => ({
  sanitizeContent: (content: string) => content
}));

describe('CodeContent Component', () => {
  const mockOnMethodClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Method names with special characters', () => {
    it('should make methods with ? clickable', async () => {
      const file: ParsedFile = {
        path: 'test.rb',
        directory: '',
        content: `class User
  def admin?
    @role == 'admin'
  end

  def check_permissions
    return true if admin?
    false
  end
end`,
        language: 'ruby',
        methods: [
          {
            name: 'admin?',
            type: 'method',
            startLine: 2,
            endLine: 4,
            filePath: 'test.rb',
            code: 'def admin?\n  @role == \'admin\'\nend',
            calls: [],
            isPrivate: false,
            parameters: []
          },
          {
            name: 'check_permissions',
            type: 'method',
            startLine: 6,
            endLine: 9,
            filePath: 'test.rb',
            code: 'def check_permissions\n  return true if admin?\n  false\nend',
            calls: [{ methodName: 'admin?', line: 7, context: 'return true if admin?' }],
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
        const clickableElements = container.querySelectorAll('[data-method-name="admin?"]');
        expect(clickableElements.length).toBeGreaterThan(0);
      });

      // Check that admin? is clickable
      const adminMethodElements = container.querySelectorAll('[data-method-name="admin?"]');
      expect(adminMethodElements.length).toBeGreaterThan(0);
      
      // Click on the method
      fireEvent.click(adminMethodElements[0]);
      expect(mockOnMethodClick).toHaveBeenCalledWith('admin?');
    });

    it('should make methods with ! clickable', async () => {
      const file: ParsedFile = {
        path: 'test.rb',
        directory: '',
        content: `class Article
  def save!
    @saved = true
  end

  def publish
    save!
    notify_subscribers!
  end
  
  def notify_subscribers!
    # notify logic
  end
end`,
        language: 'ruby',
        methods: [
          {
            name: 'save!',
            type: 'method',
            startLine: 2,
            endLine: 4,
            filePath: 'test.rb',
            code: 'def save!\n  @saved = true\nend',
            calls: [],
            isPrivate: false,
            parameters: []
          },
          {
            name: 'publish',
            type: 'method',
            startLine: 6,
            endLine: 9,
            filePath: 'test.rb',
            code: 'def publish\n  save!\n  notify_subscribers!\nend',
            calls: [
              { methodName: 'save!', line: 7, context: 'save!' },
              { methodName: 'notify_subscribers!', line: 8, context: 'notify_subscribers!' }
            ],
            isPrivate: false,
            parameters: []
          },
          {
            name: 'notify_subscribers!',
            type: 'method',
            startLine: 11,
            endLine: 13,
            filePath: 'test.rb',
            code: 'def notify_subscribers!\n  # notify logic\nend',
            calls: [],
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

      // Wait for Prism highlighting
      await waitFor(() => {
        const clickableElements = container.querySelectorAll('[data-method-name="save!"]');
        expect(clickableElements.length).toBeGreaterThan(0);
      });

      // Check that save! is clickable
      const saveMethodElements = container.querySelectorAll('[data-method-name="save!"]');
      expect(saveMethodElements.length).toBeGreaterThan(0);
      
      // Check that notify_subscribers! is clickable
      const notifyMethodElements = container.querySelectorAll('[data-method-name="notify_subscribers!"]');
      expect(notifyMethodElements.length).toBeGreaterThan(0);
      
      // Click on save!
      fireEvent.click(saveMethodElements[0]);
      expect(mockOnMethodClick).toHaveBeenCalledWith('save!');
      
      // Click on notify_subscribers!
      fireEvent.click(notifyMethodElements[0]);
      expect(mockOnMethodClick).toHaveBeenCalledWith('notify_subscribers!');
    });

    it('should not make partial method names clickable', async () => {
      const file: ParsedFile = {
        path: 'test.rb',
        directory: '',
        content: `class Test
  def admin
    # This is not admin? method
  end

  def admin?
    true
  end

  def check
    admin # should be clickable
    admin? # should be clickable
    administrator # should NOT be clickable for admin
  end
end`,
        language: 'ruby',
        methods: [
          {
            name: 'admin',
            type: 'method',
            startLine: 2,
            endLine: 4,
            filePath: 'test.rb',
            code: 'def admin\n  # This is not admin? method\nend',
            calls: [],
            isPrivate: false,
            parameters: []
          },
          {
            name: 'admin?',
            type: 'method',
            startLine: 6,
            endLine: 8,
            filePath: 'test.rb',
            code: 'def admin?\n  true\nend',
            calls: [],
            isPrivate: false,
            parameters: []
          },
          {
            name: 'check',
            type: 'method',
            startLine: 10,
            endLine: 14,
            filePath: 'test.rb',
            code: 'def check\n  admin\n  admin?\n  administrator\nend',
            calls: [
              { methodName: 'admin', line: 11, context: 'admin' },
              { methodName: 'admin?', line: 12, context: 'admin?' }
            ],
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
        const content = container.textContent || '';
        expect(content).toContain('administrator');
      });

      // Check that 'administrator' is not wrapped with clickable span for 'admin'
      const adminElements = container.querySelectorAll('[data-method-name="admin"]');
      adminElements.forEach(element => {
        expect(element.textContent).toBe('admin');
        expect(element.textContent).not.toBe('administrator');
      });
    });
  });
});