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
      totalLines: content.split('\n').length,
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
      expect(greetingMethod?.calls).toHaveLength(2);
      
      const callNames = greetingMethod?.calls.map(c => c.methodName) || [];
      expect(callNames).toContain('full_name');
      expect(callNames).toContain('send_email');
    });
  });

  describe('JavaScript メソッド解析', () => {
    const createJsFile = (content: string): ParsedFile => ({
      path: 'test.js',
      language: 'javascript' as Language,
      content,
      directory: '',
      fileName: 'test.js',
      totalLines: content.split('\n').length,
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
        totalLines: 0,
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
        totalLines: 2,
        methods: []
      };
      
      const methods = analyzeMethodsInFile(file);
      expect(methods).toHaveLength(0);
    });

    test('tasks_ransack_from_milestoneメソッド呼び出しを検出できる', () => {
      const file: ParsedFile = {
        path: 'app/controllers/milestones_controller.rb',
        language: 'ruby',
        totalLines: 10,
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

    it('should detect methods with question marks', () => {
      const file: ParsedFile = {
        path: 'test.rb',
        content: `
class User
  def admin?
    role == 'admin'
  end

  def valid?
    name.present? && email.present?
  end

  def check_status
    return unless valid?
    return if admin?
    
    # Method calls with question marks
    if user.active? && profile.complete?
      notify_user
    end
  end
end
`,
        language: 'ruby'
      };

      const methods = analyzeMethodsInFile(file);
      
      // Check method definitions with ? are detected
      const adminMethod = methods.find(m => m.name === 'admin?');
      const validMethod = methods.find(m => m.name === 'valid?');
      
      expect(adminMethod).toBeDefined();
      expect(validMethod).toBeDefined();
      
      // Check method calls with ? are detected
      const checkStatusMethod = methods.find(m => m.name === 'check_status');
      const methodCalls = checkStatusMethod!.calls.map(call => call.methodName);
      
      expect(methodCalls).toContain('valid?');
      expect(methodCalls).toContain('admin?');
      expect(methodCalls).toContain('active?');
      expect(methodCalls).toContain('complete?');
    });

    it('should correctly distinguish method calls without parentheses from method definitions', () => {
      const file: ParsedFile = {
        path: 'test.rb',
        content: `
class TaskController
  def update
    # This is a method call, not a definition
    update_task_milestone_and_load_tasks
    
    # Multiple method calls without parentheses
    validate_user_permissions
    send_notification_email
    log_activity
  end

  def update_task_milestone_and_load_tasks
    # This is the actual method definition
    @task.update(milestone: params[:milestone])
    load_tasks
  end
  
  private
  
  def validate_user_permissions
    # method body
  end
end
`,
        language: 'ruby'
      };

      const methods = analyzeMethodsInFile(file);
      
      // Check that method definitions are detected
      const updateMethod = methods.find(m => m.name === 'update');
      const updateTaskMethod = methods.find(m => m.name === 'update_task_milestone_and_load_tasks');
      const validateMethod = methods.find(m => m.name === 'validate_user_permissions');
      
      expect(updateMethod).toBeDefined();
      expect(updateTaskMethod).toBeDefined();
      expect(validateMethod).toBeDefined();
      
      // Check that method calls are detected correctly
      const updateCalls = updateMethod!.calls.map(call => call.methodName);
      
      expect(updateCalls).toContain('update_task_milestone_and_load_tasks');
      expect(updateCalls).toContain('validate_user_permissions');
      expect(updateCalls).toContain('send_notification_email');
      expect(updateCalls).toContain('log_activity');
      
      // Ensure method calls are not mistaken for definitions
      expect(methods.filter(m => m.name === 'update_task_milestone_and_load_tasks').length).toBe(1);
    });

    it('should handle Ruby methods with special characters (!)', () => {
      const file: ParsedFile = {
        path: 'test.rb',
        content: `
class Article
  def save!
    # Force save
    @persisted = true
  end

  def destroy!
    # Force destroy
    @destroyed = true
  end

  def publish_article
    validate!
    save!
    notify_subscribers!
  end
  
  private
  
  def validate!
    raise unless valid?
  end
end
`,
        language: 'ruby'
      };

      const methods = analyzeMethodsInFile(file);
      
      // Check method definitions with ! are detected
      const saveMethod = methods.find(m => m.name === 'save!');
      const destroyMethod = methods.find(m => m.name === 'destroy!');
      const validateMethod = methods.find(m => m.name === 'validate!');
      
      expect(saveMethod).toBeDefined();
      expect(destroyMethod).toBeDefined();
      expect(validateMethod).toBeDefined();
      
      // Check method calls with ! are detected
      const publishMethod = methods.find(m => m.name === 'publish_article');
      const methodCalls = publishMethod!.calls.map(call => call.methodName);
      
      expect(methodCalls).toContain('validate!');
      expect(methodCalls).toContain('save!');
      expect(methodCalls).toContain('notify_subscribers!');
    });

    it('should handle complex Ruby method call patterns', () => {
      const file: ParsedFile = {
        path: 'test.rb',
        content: `
class ComplexExample
  def process
    # Method calls with different formats
    simple_method
    method_with_args(1, 2, 3)
    method_with_hash(key: value)
    
    # Chained method calls
    object.method1.method2.method3
    
    # Methods on variables
    user = find_user
    user.admin?
    user.update_attributes(name: "Test")
    
    # Methods in conditions
    if user.active? && !user.suspended?
      user.notify!
    end
    
    # Block methods
    users.each do |user|
      user.process!
    end
  end
end
`,
        language: 'ruby'
      };

      const methods = analyzeMethodsInFile(file);
      const processMethod = methods.find(m => m.name === 'process');
      const methodCalls = processMethod!.calls.map(call => call.methodName);
      
      // Basic method calls
      expect(methodCalls).toContain('simple_method');
      expect(methodCalls).toContain('method_with_args');
      expect(methodCalls).toContain('method_with_hash');
      
      // Chained methods
      expect(methodCalls).toContain('method1');
      expect(methodCalls).toContain('method2');
      expect(methodCalls).toContain('method3');
      
      // Methods on objects
      expect(methodCalls).toContain('find_user');
      expect(methodCalls).toContain('admin?');
      expect(methodCalls).toContain('update_attributes');
      
      // Methods in conditions
      expect(methodCalls).toContain('active?');
      expect(methodCalls).toContain('suspended?');
      expect(methodCalls).toContain('notify!');
      
      // Methods in blocks
      expect(methodCalls).toContain('process!');
    });
  });

  describe('ERB メソッド解析', () => {
    const createErbFile = (content: string): ParsedFile => ({
      path: 'test.html.erb',
      language: 'erb' as Language,
      content,
      directory: '',
      fileName: 'test.html.erb',
      totalLines: content.split('\n').length,
      methods: []
    });

    test('ERBタグ内のメソッド呼び出しを検出できる', () => {
      const content = `<h1><%= user.name %></h1>
<p><%= current_user.email %></p>
<% if user_signed_in? %>
  <p>Welcome back!</p>
<% end %>
<%= link_to "Home", root_path %>`;
      
      const file = createErbFile(content);
      const methods = analyzeMethodsInFile(file);
      
      // ERBファイルからメソッド呼び出しが個別に検出される
      expect(methods.length).toBeGreaterThan(0);
      
      // メソッド名を抽出
      const methodNames = methods
        .filter(m => m.type === 'erb_call' && !m.name.startsWith('[ERB File:'))
        .map(m => m.name);
      
      expect(methodNames).toContain('name');
      expect(methodNames).toContain('email');
      expect(methodNames).toContain('user_signed_in?');
      expect(methodNames).toContain('link_to');
      expect(methodNames).toContain('root_path');
    });

    test('複雑なERBタグ内のメソッド呼び出しを検出できる', () => {
      const content = `<div class="user-info">
  <%= form_with model: @user do |form| %>
    <% if @user.errors.any? %>
      <div class="error">
        <%= pluralize(@user.errors.count, "error") %>
      </div>
    <% end %>
    
    <%= form.label :name %>
    <%= form.text_field :name, class: "form-control" %>
    
    <%= form.submit "Save", class: button_class %>
  <% end %>
</div>`;
      
      const file = createErbFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods.length).toBeGreaterThan(0);
      
      const methodNames = methods
        .filter(m => m.type === 'erb_call' && !m.name.startsWith('[ERB File:'))
        .map(m => m.name);
      
      expect(methodNames).toContain('form_with');
      expect(methodNames).toContain('any?');
      expect(methodNames).toContain('pluralize');
      expect(methodNames).toContain('count');
      expect(methodNames).toContain('label');
      expect(methodNames).toContain('text_field');
      expect(methodNames).toContain('submit');
      expect(methodNames).toContain('button_class');
    });

    test('ERBタグ内のチェーンメソッド呼び出しを検出できる', () => {
      const content = `<%= @tasks.where(completed: false).order(:created_at).limit(5).map(&:title) %>
<%= current_user.profile.display_name.upcase %>`;
      
      const file = createErbFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods.length).toBeGreaterThan(0);
      
      const methodNames = methods
        .filter(m => m.type === 'erb_call' && !m.name.startsWith('[ERB File:'))
        .map(m => m.name);
      
      expect(methodNames).toContain('where');
      expect(methodNames).toContain('order');
      expect(methodNames).toContain('limit');
      expect(methodNames).toContain('map');
      expect(methodNames).toContain('display_name');
      expect(methodNames).toContain('upcase');
    });

    test('ERBタグ内の条件文でメソッド呼び出しを検出できる', () => {
      const content = `<% if current_user.admin? && project.active? %>
  <div class="admin-panel">
    <%= render 'admin_controls' %>
  </div>
<% elsif current_user.member? %>
  <div class="member-panel">
    <%= render 'member_controls' %>
  </div>
<% end %>`;
      
      const file = createErbFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods.length).toBeGreaterThan(0);
      
      const methodNames = methods
        .filter(m => m.type === 'erb_call' && !m.name.startsWith('[ERB File:'))
        .map(m => m.name);
      
      expect(methodNames).toContain('admin?');
      expect(methodNames).toContain('active?');
      expect(methodNames).toContain('member?');
      expect(methodNames).toContain('render');
    });

    test('ERBタグが含まれない行は無視される', () => {
      const content = `<div class="container">
  <h1>Plain HTML</h1>
  <p>No ERB tags here</p>
</div>`;
      
      const file = createErbFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods).toHaveLength(0);
    });

    test('空のERBタグは無視される', () => {
      const content = `<div>
  <% %>
  <%= %>
  <% # comment only %>
</div>`;
      
      const file = createErbFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods).toHaveLength(0);
    });

  });
});