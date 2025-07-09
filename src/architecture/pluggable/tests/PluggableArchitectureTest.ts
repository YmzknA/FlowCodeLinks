/**
 * プラガブルアーキテクチャの包括的テストスイート
 * 
 * 新しいアーキテクチャの動作確認と既存機能との互換性テスト
 */

import { ParsedFile, Method, MethodCall } from '@/types/codebase';
import { PluginRegistry, MethodAnalysisEngine } from '../index';
import { createAllPlugins } from '../plugins';
import { analyzeMethodsInFile, extractAllMethodDefinitions } from '../compat';

// テストデータ作成ヘルパー
function createTestFile(language: string, content: string, path?: string): ParsedFile {
  const fileName = path || `test.${language === 'ruby' ? 'rb' : language}`;
  return {
    path: fileName,
    language: language as ParsedFile['language'],
    content,
    directory: '',
    fileName,
    totalLines: content.split('\n').length,
    methods: []
  };
}

describe('プラガブルアーキテクチャ統合テスト', () => {
  let registry: PluginRegistry;
  let engine: MethodAnalysisEngine;

  beforeEach(() => {
    registry = new PluginRegistry();
    const plugins = createAllPlugins();
    
    plugins.forEach(plugin => {
      registry.register(plugin);
    });
    
    engine = new MethodAnalysisEngine(registry);
  });

  describe('基盤システムテスト', () => {
    test('PluginRegistry: 全プラグインが正常に登録される', () => {
      const pluginInfo = registry.getRegisteredPlugins();
      expect(pluginInfo).toHaveLength(4);
      
      const pluginNames = pluginInfo.map(p => p.name);
      expect(pluginNames).toContain('ruby');
      expect(pluginNames).toContain('javascript');
      expect(pluginNames).toContain('typescript');
      expect(pluginNames).toContain('erb');
    });

    test('MethodAnalysisEngine: 基本的な解析機能が動作する', () => {
      const rubyFile = createTestFile('ruby', `
def hello_world
  puts "Hello, World!"
end
      `);

      const methods = engine.analyzeFile(rubyFile);
      expect(methods).toHaveLength(1);
      expect(methods[0].name).toBe('hello_world');
      expect(methods[0].type).toBe('method');
    });
  });

  describe('言語別プラグインテスト', () => {
    test('Ruby: 基本的なメソッド検出', () => {
      const rubyFile = createTestFile('ruby', `
class User
  def initialize(name)
    @name = name
  end
  
  def self.create_guest
    new("Guest")
  end
  
  private
  
  def validate_name
    @name.present?
  end
end
      `);

      const methods = engine.analyzeFile(rubyFile);
      expect(methods).toHaveLength(3);
      
      const methodNames = methods.map(m => m.name);
      expect(methodNames).toContain('initialize');
      expect(methodNames).toContain('create_guest');
      expect(methodNames).toContain('validate_name');
      
      // クラスメソッドの検出
      const classMethod = methods.find(m => m.name === 'create_guest');
      expect(classMethod?.type).toBe('class_method');
      
      // プライベートメソッドの検出
      const privateMethod = methods.find(m => m.name === 'validate_name');
      expect(privateMethod?.isPrivate).toBe(true);
    });

    test('JavaScript: 複数関数パターンの検出', () => {
      const jsFile = createTestFile('javascript', `
function regularFunction(param) {
  return param;
}

const arrowFunction = (param) => {
  return param * 2;
};

class MyClass {
  constructor(value) {
    this.value = value;
  }
  
  public getValue() {
    return this.value;
  }
}
      `);

      const methods = engine.analyzeFile(jsFile);
      expect(methods.length).toBeGreaterThanOrEqual(3);
      
      const methodNames = methods.map(m => m.name);
      expect(methodNames).toContain('regularFunction');
      expect(methodNames).toContain('arrowFunction');
      expect(methodNames).toContain('getValue');
    });

    test('TypeScript: 型注釈付きメソッド検出', () => {
      const tsFile = createTestFile('typescript', `
interface User {
  name: string;
  age: number;
}

function createUser(name: string, age: number): User {
  return { name, age };
}

class UserService {
  private users: User[] = [];
  
  public addUser(user: User): void {
    this.users.push(user);
  }
  
  public getUserCount(): number {
    return this.users.length;
  }
}
      `);

      const methods = engine.analyzeFile(tsFile);
      expect(methods.length).toBeGreaterThanOrEqual(3);
      
      const methodNames = methods.map(m => m.name);
      expect(methodNames).toContain('createUser');
      expect(methodNames).toContain('addUser');
      expect(methodNames).toContain('getUserCount');
    });

    test('ERB: Railsヘルパーメソッド検出', () => {
      const erbFile = createTestFile('erb', `
<h1><%= @user.name %></h1>
<%= link_to "Edit", edit_user_path(@user) %>
<% if current_user.admin? %>
  <%= form_with model: @user do |form| %>
    <%= form.text_field :name %>
    <%= form.submit %>
  <% end %>
<% end %>
      `);

      const methods = engine.analyzeFile(erbFile);
      expect(methods.length).toBeGreaterThan(0);
      
      const methodNames = methods.map(m => m.name);
      expect(methodNames).toContain('link_to');
      expect(methodNames).toContain('edit_user_path');
      expect(methodNames).toContain('form_with');
      expect(methodNames).toContain('text_field');
      expect(methodNames).toContain('submit');
    });
  });

  describe('互換性テスト', () => {
    test('既存API: analyzeMethodsInFile が正常に動作する', () => {
      const rubyFile = createTestFile('ruby', `
def test_method
  puts "test"
end
      `);

      const methods = analyzeMethodsInFile(rubyFile);
      expect(methods).toHaveLength(1);
      expect(methods[0].name).toBe('test_method');
    });

    test('既存API: extractAllMethodDefinitions が正常に動作する', () => {
      const files = [
        createTestFile('ruby', `
def ruby_method
  puts "ruby"
end
        `),
        createTestFile('javascript', `
function jsFunction() {
  console.log("js");
}
        `)
      ];

      const definitions = extractAllMethodDefinitions(files);
      expect(definitions.has('ruby_method')).toBe(true);
      expect(definitions.has('jsFunction')).toBe(true);
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('空ファイルでもエラーが発生しない', () => {
      const emptyFile = createTestFile('ruby', '');
      const methods = engine.analyzeFile(emptyFile);
      expect(methods).toHaveLength(0);
    });

    test('未対応言語でもエラーが発生しない', () => {
      const unsupportedFile = createTestFile('python', 'def hello(): pass');
      const methods = engine.analyzeFile(unsupportedFile);
      expect(methods).toHaveLength(0);
    });

    test('不正な構文でもエラーが発生しない', () => {
      const invalidFile = createTestFile('ruby', 'invalid syntax here');
      const methods = engine.analyzeFile(invalidFile);
      expect(methods).toHaveLength(0);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量のメソッドを含むファイルの処理', () => {
      // 100個のメソッドを含むRubyファイルを生成
      const methodDefinitions = Array.from({ length: 100 }, (_, i) => `
def method_${i}
  puts "method ${i}"
end
      `).join('\n');

      const largeFile = createTestFile('ruby', methodDefinitions);
      
      const startTime = performance.now();
      const methods = engine.analyzeFile(largeFile);
      const endTime = performance.now();
      
      expect(methods).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('統計情報テスト', () => {
    test('解析統計情報が正確に取得される', () => {
      const files = [
        createTestFile('ruby', `
def ruby_method1
  puts "test1"
end

def ruby_method2
  puts "test2"
end
        `),
        createTestFile('javascript', `
function jsFunction() {
  console.log("js");
}
        `)
      ];

      const stats = engine.getAnalysisStatistics(files);
      
      expect(stats.totalFiles).toBe(2);
      expect(stats.totalMethods).toBe(3);
      expect(stats.languageStats.ruby).toBeDefined();
      expect(stats.languageStats.javascript).toBeDefined();
      expect(stats.languageStats.ruby.methodCount).toBe(2);
      expect(stats.languageStats.javascript.methodCount).toBe(1);
    });
  });
});

describe('プラグインアーキテクチャ原則テスト', () => {
  test('プラグイン間の独立性が保たれている', () => {
    const registry = new PluginRegistry();
    const plugins = createAllPlugins();
    
    plugins.forEach(plugin => {
      registry.register(plugin);
    });

    // 各プラグインが独立して動作することを確認
    const rubyFile = createTestFile('ruby', 'def ruby_method; end');
    const jsFile = createTestFile('javascript', 'function jsFunction() {}');
    
    const rubyResult = registry.analyze(rubyFile);
    const jsResult = registry.analyze(jsFile);
    
    expect(rubyResult.methods).toHaveLength(1);
    expect(jsResult.methods).toHaveLength(1);
    expect(rubyResult.methods[0].name).toBe('ruby_method');
    expect(jsResult.methods[0].name).toBe('jsFunction');
  });

  test('新しいプラグインを動的に追加できる', () => {
    const registry = new PluginRegistry();
    
    // カスタムプラグインを作成
    const customPlugin = {
      name: 'custom',
      version: '1.0.0',
      description: 'Custom test plugin',
      supports: (language: string) => language === 'custom',
      analyze: (file: ParsedFile) => ({
        methods: [{
          name: 'custom_method',
          type: 'function' as const,
          startLine: 1,
          endLine: 1,
          filePath: file.path,
          code: file.content,
          calls: [],
          isPrivate: false,
          parameters: []
        }],
        errors: [],
        metadata: { processingTime: 0, linesProcessed: 1 }
      })
    };
    
    registry.register(customPlugin);
    
    const customFile = createTestFile('custom', 'custom code');
    const result = registry.analyze(customFile);
    
    expect(result.methods).toHaveLength(1);
    expect(result.methods[0].name).toBe('custom_method');
  });
});