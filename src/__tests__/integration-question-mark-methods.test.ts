import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';
import fs from 'fs';
import path from 'path';

describe('Integration Test: Question Mark Methods Detection', () => {
  test('should detect all question mark methods in test Ruby file', () => {
    // Read the actual test Ruby file
    const testFilePath = path.join(process.cwd(), 'test_ruby_methods.rb');
    let content: string;
    
    try {
      content = fs.readFileSync(testFilePath, 'utf-8');
    } catch (error) {
      // If file doesn't exist in Docker, use embedded content
      content = `# Test Ruby file to check method detection with question marks

class User
  attr_accessor :admin, :active, :verified

  def initialize(admin: false, active: true, verified: false)
    @admin = admin
    @active = active
    @verified = verified
  end

  # Methods with question marks
  def admin?
    @admin == true
  end

  def active?
    @active
  end

  def verified?
    @verified == true
  end

  def can_edit?
    admin? || active?
  end

  def can_publish?
    verified? && active?
  end

  # Methods that call question mark methods
  def check_permissions
    if admin?
      puts "User is admin"
    end

    if active?
      puts "User is active"
    end

    # Method calls in various contexts
    result = verified? ? "verified" : "not verified"
    
    # Multiple method calls
    if admin? && active? && verified?
      puts "Full access granted"
    end

    # Method call in string interpolation
    puts "Admin status: #{admin?}"
    puts "Can edit: #{can_edit?}"
    
    # Chained method calls
    status = self.active? && self.verified?
    
    # Method calls as arguments
    grant_access(admin?, active?)
  end

  def grant_access(is_admin, is_active)
    # Some logic here
  end

  # Test edge cases
  def complex_check
    # Method call after dot notation
    user.admin?
    user.active?
    
    # Method call with parentheses
    admin?()
    active?()
    
    # Multiple dots
    self.can_edit?
    self.can_publish?
  end

  private

  def internal_check?
    true
  end

  def private_verification
    internal_check?
  end
end`;
    }

    const file: ParsedFile = {
      path: 'test_ruby_methods.rb',
      language: 'ruby' as Language,
      content,
      directory: '',
      fileName: 'test_ruby_methods.rb',
      totalLines: content.split('\n').length,
      methods: []
    };

    const methods = analyzeMethodsInFile(file);

    // Check that all methods with ? are detected
    const questionMarkMethods = methods.filter(m => m.name.includes('?'));
    const questionMarkMethodNames = questionMarkMethods.map(m => m.name);

    expect(questionMarkMethodNames).toContain('admin?');
    expect(questionMarkMethodNames).toContain('active?');
    expect(questionMarkMethodNames).toContain('verified?');
    expect(questionMarkMethodNames).toContain('can_edit?');
    expect(questionMarkMethodNames).toContain('can_publish?');
    expect(questionMarkMethodNames).toContain('internal_check?');

    // Check visibility
    const internalCheck = methods.find(m => m.name === 'internal_check?');
    expect(internalCheck?.isPrivate).toBe(true);

    // Check method calls detection
    const checkPermissionsMethod = methods.find(m => m.name === 'check_permissions');
    const checkPermissionsCalls = checkPermissionsMethod?.calls.map(c => c.methodName) || [];

    // Method calls with ?
    expect(checkPermissionsCalls).toContain('admin?');
    expect(checkPermissionsCalls).toContain('active?');
    expect(checkPermissionsCalls).toContain('verified?');
    expect(checkPermissionsCalls).toContain('can_edit?');

    // Check complex_check method
    const complexCheckMethod = methods.find(m => m.name === 'complex_check');
    const complexCheckCalls = complexCheckMethod?.calls.map(c => c.methodName) || [];

    expect(complexCheckCalls).toContain('admin?');
    expect(complexCheckCalls).toContain('active?');
    expect(complexCheckCalls).toContain('can_edit?');
    expect(complexCheckCalls).toContain('can_publish?');

    // Count total method calls with ?
    const allCalls = methods.flatMap(m => m.calls);
    const questionMarkCalls = allCalls.filter(c => c.methodName.includes('?'));

    console.log('Detected methods with ?:', questionMarkMethodNames);
    console.log('Total question mark method calls:', questionMarkCalls.length);
    console.log('Question mark calls by method:', 
      questionMarkCalls.reduce((acc, call) => {
        acc[call.methodName] = (acc[call.methodName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    );

    // Ensure we have a reasonable number of question mark calls
    expect(questionMarkCalls.length).toBeGreaterThan(10);
  });

  test('should handle question marks in string interpolation', () => {
    const content = `class Test
  def admin?
    true
  end

  def status_message
    "Admin: #{admin?}"
    "Status: #{user.active?}"
  end
end`;

    const file: ParsedFile = {
      path: 'test.rb',
      language: 'ruby' as Language,
      content,
      directory: '',
      fileName: 'test.rb',
      totalLines: content.split('\n').length,
      methods: []
    };

    const methods = analyzeMethodsInFile(file);
    const statusMethod = methods.find(m => m.name === 'status_message');
    const calls = statusMethod?.calls.map(c => c.methodName) || [];

    expect(calls).toContain('admin?');
    expect(calls).toContain('active?');
  });

  test('should handle question marks with parentheses', () => {
    const content = `class Test
  def valid?
    true
  end

  def check
    valid?()
    self.valid?()
    user.valid?()
  end
end`;

    const file: ParsedFile = {
      path: 'test.rb',
      language: 'ruby' as Language,
      content,
      directory: '',
      fileName: 'test.rb',
      totalLines: content.split('\n').length,
      methods: []
    };

    const methods = analyzeMethodsInFile(file);
    const checkMethod = methods.find(m => m.name === 'check');
    const validCalls = checkMethod?.calls.filter(c => c.methodName === 'valid?') || [];

    // Should detect all three valid? calls
    expect(validCalls.length).toBe(3);
  });
});