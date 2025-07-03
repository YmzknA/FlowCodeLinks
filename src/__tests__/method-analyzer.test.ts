import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';

describe('メソッド解析機能のテスト', () => {
  describe('Ruby メソッド解析', () => {
    const createRubyFile = (content: string): ParsedFile => ({
      path: 'test.rb',
      language: 'ruby' as Language,
      content,
      directory: '',
      fileName: 'test.rb',
      methods: []
    });

    test('基本的なメソッドを検出できる', () => {
      const content = `class User
  def full_name
    "#{first_name} #{last_name}"
  end

  def greeting
    puts "Hello, #{full_name}!"
  end
end`;
      
      const file = createRubyFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods).toHaveLength(2);
      expect(methods[0].name).toBe('full_name');
      expect(methods[0].type).toBe('method');
      expect(methods[1].name).toBe('greeting');
    });

    test('クラスメソッドを検出できる', () => {
      const content = `class User
  def self.create_guest
    new(name: 'Guest')
  end

  def self.find_by_email(email)
    where(email: email).first
  end
end`;
      
      const file = createRubyFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods).toHaveLength(2);
      expect(methods[0].name).toBe('create_guest');
      expect(methods[0].type).toBe('class_method');
      expect(methods[1].name).toBe('find_by_email');
      expect(methods[1].type).toBe('class_method');
    });

    test('プライベートメソッドを検出できる', () => {
      const content = `class User
  def public_method
    private_method
  end

  private

  def private_method
    "This is private"
  end
end`;
      
      const file = createRubyFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods).toHaveLength(2);
      expect(methods[0].isPrivate).toBe(false);
      expect(methods[1].isPrivate).toBe(true);
    });

    test('メソッド呼び出しを検出できる', () => {
      const content = `class User
  def greeting
    puts "Hello, #{full_name}!"
    send_email
  end

  def full_name
    "#{first_name} #{last_name}"
  end
end`;
      
      const file = createRubyFile(content);
      const methods = analyzeMethodsInFile(file);
      
      const greetingMethod = methods.find(m => m.name === 'greeting');
      expect(greetingMethod?.calls).toHaveLength(1);
      expect(greetingMethod?.calls[0].methodName).toBe('full_name');
    });
  });

  describe('JavaScript メソッド解析', () => {
    const createJsFile = (content: string): ParsedFile => ({
      path: 'test.js',
      language: 'javascript' as Language,
      content,
      directory: '',
      fileName: 'test.js',
      methods: []
    });

    test('通常の関数を検出できる', () => {
      const content = `function calculateSum(a, b) {
  return a + b;
}

function greetUser(name) {
  return \`Hello, \${name}!\`;
}`;
      
      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods).toHaveLength(2);
      expect(methods[0].name).toBe('calculateSum');
      expect(methods[0].type).toBe('function');
      expect(methods[1].name).toBe('greetUser');
    });

    test('アロー関数を検出できる', () => {
      const content = `const multiply = (a, b) => {
  return a * b;
};

const formatDate = (date) => date.toISOString().split('T')[0];`;
      
      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods).toHaveLength(2);
      expect(methods[0].name).toBe('multiply');
      expect(methods[0].type).toBe('function');
      expect(methods[1].name).toBe('formatDate');
    });

    test('オブジェクトメソッドを検出できる', () => {
      const content = `const userUtils = {
  getFullName(user) {
    return \`\${user.firstName} \${user.lastName}\`;
  },

  validateEmail: function(email) {
    return email.includes('@');
  }
};`;
      
      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods).toHaveLength(2);
      expect(methods[0].name).toBe('getFullName');
      expect(methods[1].name).toBe('validateEmail');
    });

    test('関数呼び出しを検出できる', () => {
      const content = `function processUser(userData) {
  const fullName = getFullName(userData);
  const isValid = validateEmail(userData.email);
  
  if (isValid) {
    sendWelcomeEmail(fullName);
  }
  
  return formatUserData(userData);
}`;
      
      const file = createJsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      const processMethod = methods.find(m => m.name === 'processUser');
      expect(processMethod?.calls).toHaveLength(4);
      expect(processMethod?.calls.map(c => c.methodName)).toContain('getFullName');
      expect(processMethod?.calls.map(c => c.methodName)).toContain('validateEmail');
      expect(processMethod?.calls.map(c => c.methodName)).toContain('sendWelcomeEmail');
      expect(processMethod?.calls.map(c => c.methodName)).toContain('formatUserData');
    });
  });

  describe('エッジケースのテスト', () => {
    test('空のファイルでもエラーが発生しない', () => {
      const file: ParsedFile = {
        path: 'empty.rb',
        language: 'ruby',
        content: '',
        directory: '',
        fileName: 'empty.rb',
        methods: []
      };
      
      const methods = analyzeMethodsInFile(file);
      expect(methods).toHaveLength(0);
    });

    test('未対応言語は空の配列を返す', () => {
      const file: ParsedFile = {
        path: 'test.py',
        language: 'unknown',
        content: 'def hello():\n    print("hello")',
        directory: '',
        fileName: 'test.py',
        methods: []
      };
      
      const methods = analyzeMethodsInFile(file);
      expect(methods).toHaveLength(0);
    });

    test('tasks_ransack_from_milestoneメソッド呼び出しを検出できる', () => {
      const file: ParsedFile = {
        path: 'app/controllers/milestones_controller.rb',
        language: 'ruby',
        content: `class MilestonesController < ApplicationController
  def show
    @milestone_tasks = tasks_ransack_from_milestone(@milestone)
    @from_milestone_show = true
    @task = Task.new
  end
  
  def update
    if @milestone.update(milestone_params)
      redirect_to @milestone, notice: "星座を更新しました"
    else
      @milestone_tasks = tasks_ransack_from_milestone(@milestone)
      @task = Task.new
      @from_milestone_show = true
    end
  end
end`,
        directory: 'app/controllers',
        fileName: 'milestones_controller.rb',
        methods: []
      };
      
      const methods = analyzeMethodsInFile(file);
      expect(methods).toHaveLength(2);
      
      const showMethod = methods.find(m => m.name === 'show');
      const updateMethod = methods.find(m => m.name === 'update');
      
      expect(showMethod).toBeDefined();
      expect(updateMethod).toBeDefined();
      
      // showメソッドでtasks_ransack_from_milestoneが呼び出されているか
      const showCalls = showMethod!.calls.map(call => call.methodName);
      expect(showCalls).toContain('tasks_ransack_from_milestone');
      
      // updateメソッドでtasks_ransack_from_milestoneが呼び出されているか
      const updateCalls = updateMethod!.calls.map(call => call.methodName);
      expect(updateCalls).toContain('tasks_ransack_from_milestone');
    });
  });
});