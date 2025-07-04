import { sanitizeExternalLinks, auditHtmlContent } from '../utils/security';

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
      process.env.NODE_ENV = 'development';

      const html = '<a href="javascript:alert(1)">Malicious Link</a>';
      auditHtmlContent(html, 'test');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Security Audit] Suspicious pattern found in test:'),
        expect.objectContaining({
          pattern: expect.stringContaining('javascript:'),
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    test('does not log in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const html = '<a href="javascript:alert(1)">Malicious Link</a>';
      auditHtmlContent(html, 'test');

      expect(consoleSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    test('detects script tags', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const html = '<script>alert("xss")</script>';
      auditHtmlContent(html, 'test');

      expect(consoleSpy).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});