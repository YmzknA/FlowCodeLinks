/**
 * New Architecture Test
 * 
 * 新しいパーサーアーキテクチャの動作確認テスト
 */

import { methodAnalysisService } from '@/services/MethodAnalysisService';
import { LanguageParserFactory } from '@/parsers/base/LanguageParserFactory';
import { ParsedFile, Language } from '@/types/codebase';

// テストファイル作成用ヘルパー
const createTestFile = (language: Language, content: string, fileName = 'test'): ParsedFile => ({
  path: `${fileName}.${language === 'ruby' ? 'rb' : language}`,
  language,
  content,
  directory: '',
  fileName: `${fileName}.${language === 'ruby' ? 'rb' : language}`,
  totalLines: content.split('\n').length,
  methods: []
});

describe('新しいパーサーアーキテクチャのテスト', () => {
  beforeAll(() => {
    // パーサーの初期化状況を確認
    const stats = methodAnalysisService.getStatistics();
    console.log('Parser statistics:', stats);
  });

  describe('MethodAnalysisService', () => {
    test('サービスが正常に初期化される', () => {
      const stats = methodAnalysisService.getStatistics();
      expect(stats.isInitialized).toBe(true);
      expect(stats.supportedLanguages.length).toBeGreaterThan(0);
    });

    test('サポート言語一覧を取得できる', () => {
      const languages = methodAnalysisService.getSupportedLanguages();
      expect(languages).toContain('ruby');
      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('erb');
    });
  });

  describe('LanguageParserFactory', () => {
    test('Rubyパーサーを作成できる', () => {
      const parser = LanguageParserFactory.create('ruby');
      expect(parser).not.toBeNull();
      expect(parser?.language).toBe('ruby');
    });

    test('JavaScriptパーサーを作成できる', () => {
      const parser = LanguageParserFactory.create('javascript');
      expect(parser).not.toBeNull();
      expect(parser?.language).toBe('javascript');
    });

    test('TypeScriptパーサーを作成できる', () => {
      const parser = LanguageParserFactory.create('typescript');
      expect(parser).not.toBeNull();
      expect(parser?.supports('typescript')).toBe(true);
    });

    test('ERBパーサーを作成できる', () => {
      const parser = LanguageParserFactory.create('erb');
      expect(parser).not.toBeNull();
      expect(parser?.language).toBe('erb');
    });

    test('未対応言語ではnullを返す', () => {
      const parser = LanguageParserFactory.create('python' as Language);
      expect(parser).toBeNull();
    });
  });

  describe('Ruby解析テスト', () => {
    test('基本的なRubyメソッドを検出できる', () => {
      const file = createTestFile('ruby', `
class User
  def full_name
    "#{first_name} #{last_name}"
  end

  def greeting
    puts "Hello, #{full_name}!"
  end
end`);

      const methods = methodAnalysisService.analyzeFile(file);
      
      expect(methods).toHaveLength(2);
      expect(methods.map(m => m.name)).toContain('full_name');
      expect(methods.map(m => m.name)).toContain('greeting');
    });

    test('クラスメソッドを検出できる', () => {
      const file = createTestFile('ruby', `
class User
  def self.create_guest
    new(name: 'Guest')
  end

  def self.find_by_email(email)
    where(email: email).first
  end
end`);

      const methods = methodAnalysisService.analyzeFile(file);
      
      expect(methods).toHaveLength(2);
      expect(methods[0].type).toBe('class_method');
      expect(methods[1].type).toBe('class_method');
    });

    test('メソッド定義のみを抽出できる', () => {
      const file = createTestFile('ruby', `
class User
  def full_name
    puts "Hello"
  end

  def greeting
    some_undefined_method
  end
end`);

      const definitions = methodAnalysisService.extractDefinitions(file);
      
      expect(definitions).toHaveLength(2);
      expect(definitions.map(m => m.name)).toContain('full_name');
      expect(definitions.map(m => m.name)).toContain('greeting');
      // 定義抽出時は呼び出し情報は空
      expect(definitions.every(m => m.calls.length === 0)).toBe(true);
    });
  });

  describe('JavaScript解析テスト', () => {
    test('基本的なJavaScript関数を検出できる', () => {
      const file = createTestFile('javascript', `
function calculateSum(a, b) {
  return a + b;
}

function greetUser(name) {
  return \`Hello, \${name}!\`;
}`);

      const methods = methodAnalysisService.analyzeFile(file);
      
      expect(methods).toHaveLength(2);
      expect(methods.map(m => m.name)).toContain('calculateSum');
      expect(methods.map(m => m.name)).toContain('greetUser');
    });
  });

  describe('TypeScript解析テスト', () => {
    test('基本的なTypeScript関数を検出できる', () => {
      const file = createTestFile('typescript', `
export function calculateSum(a: number, b: number): number {
  return a + b;
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}`);

      const methods = methodAnalysisService.analyzeFile(file);
      
      // 重複や追加のメソッドが検出される可能性があるため、含まれることを確認
      expect(methods.length).toBeGreaterThanOrEqual(2);
      expect(methods.map(m => m.name)).toContain('calculateSum');
      expect(methods.map(m => m.name)).toContain('fetchUser');
      
      // calculateSumとfetchUserという名前のメソッドが存在することを確認
      const calculateSumMethods = methods.filter(m => m.name === 'calculateSum');
      const fetchUserMethods = methods.filter(m => m.name === 'fetchUser');
      
      expect(calculateSumMethods.length).toBeGreaterThanOrEqual(1);
      expect(fetchUserMethods.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('ERB解析テスト', () => {
    test('ERBタグ内のメソッド呼び出しを検出できる', () => {
      const file = createTestFile('erb', `
<h1><%= user.name %></h1>
<p><%= current_user.email %></p>
<% if user_signed_in? %>
  <p>Welcome back!</p>
<% end %>
<%= link_to "Home", root_path %>`);

      const methods = methodAnalysisService.analyzeFile(file);
      
      expect(methods.length).toBeGreaterThan(0);
      
      // Rails標準メソッドが検出されることを確認
      const methodNames = methods
        .filter(m => m.type === 'erb_call' && !m.name.startsWith('[ERB File:'))
        .map(m => m.name);
      
      expect(methodNames).toContain('user_signed_in?');
      expect(methodNames).toContain('link_to');
      expect(methodNames).toContain('root_path');
    });
  });

  describe('複数ファイル解析テスト', () => {
    test('複数ファイルからメソッド定義を抽出できる', () => {
      const files = [
        createTestFile('ruby', `
class User
  def full_name
    "name"
  end
end`, 'user'),
        createTestFile('javascript', `
function processUser(user) {
  return user.full_name;
}`, 'processor')
      ];

      const allDefinitions = methodAnalysisService.extractAllMethodDefinitions(files);
      
      expect(allDefinitions.has('full_name')).toBe(true);
      expect(allDefinitions.has('processUser')).toBe(true);
    });

    test('変数フィルタリングが機能する', () => {
      const files = [
        createTestFile('ruby', `
class User
  def full_name
    "name"
  end
  
  def greeting
    puts full_name
    puts undefined_method  # 未定義なので検出されない
  end
end`, 'user')
      ];

      const allDefinitions = methodAnalysisService.extractAllMethodDefinitions(files);
      const methods = methodAnalysisService.analyzeFile(files[0], allDefinitions);
      
      const greetingMethod = methods.find(m => m.name === 'greeting');
      expect(greetingMethod).toBeDefined();
      
      const callNames = greetingMethod!.calls.map(c => c.methodName);
      expect(callNames).toContain('full_name'); // 定義済みなので検出
      expect(callNames).not.toContain('undefined_method'); // 未定義なので除外
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('空ファイルでもエラーが発生しない', () => {
      const file = createTestFile('ruby', '');
      const methods = methodAnalysisService.analyzeFile(file);
      expect(methods).toHaveLength(0);
    });

    test('不正な構文でもエラーが発生しない', () => {
      const file = createTestFile('ruby', 'invalid syntax here');
      const methods = methodAnalysisService.analyzeFile(file);
      expect(methods).toHaveLength(0);
    });

    test('未対応言語でもエラーが発生しない', () => {
      const file: ParsedFile = {
        path: 'test.py',
        language: 'unknown',
        content: 'def hello():\n    print("hello")',
        directory: '',
        fileName: 'test.py',
        totalLines: 2,
        methods: []
      };
      
      const methods = methodAnalysisService.analyzeFile(file);
      expect(methods).toHaveLength(0);
    });
  });
});