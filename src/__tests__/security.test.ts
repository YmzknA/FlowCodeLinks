import { sanitizeExternalLinks, auditHtmlContent, sanitizeHighlightedCode, escapeHtml } from '../utils/security';

describe('Security utilities', () => {
  describe('sanitizeExternalLinks', () => {
    test('adds noopener noreferrer to external links', () => {
      const html = '<a href="https://example.com">External Link</a>';
      const result = sanitizeExternalLinks(html);
      
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).toContain('target="_blank"');
    });

    test('preserves existing rel attributes and adds security attributes', () => {
      const html = '<a href="https://example.com" rel="bookmark">External Link</a>';
      const result = sanitizeExternalLinks(html);
      
      expect(result).toContain('rel="bookmark noopener noreferrer"');
    });

    test('does not modify internal links', () => {
      const html = '<a href="/internal">Internal Link</a>';
      const result = sanitizeExternalLinks(html);
      
      expect(result).toBe(html); // Should remain unchanged
    });

    test('does not modify relative links', () => {
      const html = '<a href="./relative">Relative Link</a>';
      const result = sanitizeExternalLinks(html);
      
      expect(result).toBe(html); // Should remain unchanged
    });

    test('does not modify hash links', () => {
      const html = '<a href="#section">Hash Link</a>';
      const result = sanitizeExternalLinks(html);
      
      expect(result).toBe(html); // Should remain unchanged
    });
  });

  describe('auditHtmlContent', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('detects javascript: URLs in development', () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

      const html = '<a href="javascript:alert(1)">Malicious Link</a>';
      auditHtmlContent(html, 'test');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Security Audit] Suspicious pattern found in test:'),
        expect.objectContaining({
          pattern: expect.stringContaining('javascript:'),
        })
      );

      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
    });

    test('does not log in production', () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

      const html = '<a href="javascript:alert(1)">Malicious Link</a>';
      auditHtmlContent(html, 'test');

      expect(consoleSpy).not.toHaveBeenCalled();

      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
    });

    test('detects script tags', () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

      const html = '<script>alert("xss")</script>';
      auditHtmlContent(html, 'test');

      expect(consoleSpy).toHaveBeenCalled();

      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
    });
  });

  describe('sanitizeHighlightedCode', () => {
    test('sanitizes HTML and preserves allowed tags', () => {
      const html = '<span class="token">code</span><script>alert("xss")</script>';
      const result = sanitizeHighlightedCode(html);
      
      expect(result).toContain('<span class="token">code</span>');
      expect(result).not.toContain('<script>');
    });

    test('preserves method data attributes', () => {
      const html = '<span class="cursor-pointer" data-method-name="testMethod">testMethod</span>';
      const result = sanitizeHighlightedCode(html);
      
      expect(result).toContain('data-method-name="testMethod"');
    });
  });

  describe('escapeHtml', () => {
    test('escapes HTML special characters', () => {
      const unsafe = '<script>alert("xss")</script>';
      const result = escapeHtml(unsafe);
      
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    test('escapes ampersands', () => {
      const unsafe = 'Tom & Jerry';
      const result = escapeHtml(unsafe);
      
      expect(result).toBe('Tom &amp; Jerry');
    });
  });
});