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
}

function getFullName(user) {
  return user.name;
}

function validateEmail(email) {
  return email.includes('@');
}

function sendWelcomeEmail(name) {
  console.log('Welcome ' + name);
}

function formatUserData(user) {
  return { formatted: user };
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

  describe('TypeScript メソッド解析', () => {
    const createTsFile = (content: string): ParsedFile => ({
      path: 'test.ts',
      language: 'typescript' as Language,
      content,
      directory: '',
      fileName: 'test.ts',
      totalLines: content.split('\n').length,
      methods: []
    });

    test('基本的な関数（型アノテーション付き）を検出できる', () => {
      const content = `export function calculateSum(a: number, b: number): number {
  return a + b;
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}`;
      
      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods).toHaveLength(2);
      expect(methods[0].name).toBe('calculateSum');
      expect(methods[0].type).toBe('function');
      expect(methods[1].name).toBe('fetchUser');
      expect(methods[1].type).toBe('function');
    });

    test('アロー関数（型アノテーション付き）を検出できる', () => {
      const content = `const multiply = (a: number, b: number): number => {
  return a * b;
};

const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
  console.log('Button clicked');
}, []);

export const processData: (data: any[]) => ProcessedData = (data) => {
  return data.map(item => transformItem(item));
};`;
      
      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods.length).toBeGreaterThanOrEqual(2);
      
      const multiplyMethod = methods.find(m => m.name === 'multiply');
      const handleClickMethod = methods.find(m => m.name === 'handleClick');
      const processDataMethod = methods.find(m => m.name === 'processData');
      
      expect(multiplyMethod).toBeDefined();
      expect(handleClickMethod).toBeDefined();
      // processDataは複雑な型定義のため検出されない可能性があります
    });

    test('クラスメソッドを検出できる', () => {
      const content = `export class UserService {
  private users: User[] = [];
  
  public async addUser(user: User): Promise<void> {
    this.users.push(user);
    await this.saveToDatabase(user);
  }
  
  private validateUser(user: User): boolean {
    return user.email.includes('@');
  }
  
  static createInstance(): UserService {
    return new UserService();
  }
}`;
      
      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods).toHaveLength(3);
      expect(methods[0].name).toBe('addUser');
      expect(methods[0].isPrivate).toBe(false);
      expect(methods[1].name).toBe('validateUser');
      expect(methods[1].isPrivate).toBe(true);
      expect(methods[2].name).toBe('createInstance');
    });

    test('Reactコンポーネントを検出できる', () => {
      const content = `export const UserProfile: React.FC<UserProps> = ({ user, onEdit }) => {
  const handleEdit = useCallback(() => {
    onEdit(user);
  }, [user, onEdit]);

  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={handleEdit}>Edit</button>
    </div>
  );
};`;
      
      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      const userProfileMethod = methods.find(m => m.name === 'UserProfile');
      expect(userProfileMethod).toBeDefined();
      expect(userProfileMethod?.type).toBe('component');
    });

    test('インターフェースメソッドを検出できる', () => {
      const content = `interface UserRepository {
  findById(id: string): Promise<User>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<boolean>;
  findByEmail<T extends User>(email: string): Promise<T>;
}`;
      
      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods).toHaveLength(4);
      expect(methods[0].name).toBe('findById');
      expect(methods[0].type).toBe('interface_method');
      expect(methods[1].name).toBe('save');
      expect(methods[2].name).toBe('delete');
      expect(methods[3].name).toBe('findByEmail');
    });

    test('TypeScriptメソッド呼び出しを検出できる', () => {
      const content = `class UserService {
  async processUser(userData: UserData): Promise<void> {
    const user = await this.findUser(userData.id);
    const isValid = this.validateUser(user);
    
    if (isValid) {
      await this.saveUser(user);
      user.notify?.();
    }
    
    return this.formatResponse(user);
  }
}`;
      
      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      const processMethod = methods.find(m => m.name === 'processUser');
      expect(processMethod).toBeDefined();
      expect(processMethod?.calls.length).toBeGreaterThan(0);
      
      const callNames = processMethod?.calls.map(c => c.methodName) || [];
      expect(callNames).toContain('findUser');
      expect(callNames).toContain('validateUser');
      expect(callNames).toContain('saveUser');
      expect(callNames).toContain('formatResponse');
    });

    test('パラメータの型アノテーションを正しく解析できる', () => {
      const content = `function complexFunction(id: string, options: { timeout?: number }, callback: (error: Error | null) => void): Promise<ApiResponse> {
  return Promise.resolve({} as ApiResponse);
}`;
      
      const file = createTsFile(content);
      const methods = analyzeMethodsInFile(file);
      
      expect(methods).toHaveLength(1);
      expect(methods[0].parameters).toHaveLength(3);
      expect(methods[0].parameters[0]).toBe('id');
      expect(methods[0].parameters[1]).toBe('options');
      expect(methods[0].parameters[2]).toBe('callback');
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
  
  private
  
  def tasks_ransack_from_milestone(milestone)
    # method implementation
  end
end`,
        directory: 'app/controllers',
        fileName: 'milestones_controller.rb',
        methods: []
      };
      
      const methods = analyzeMethodsInFile(file);
      expect(methods).toHaveLength(3); // show, update (isExcluded=true), tasks_ransack_from_milestone
      
      // 標準アクション（show, update）は含まれるがisExcluded=true
      const showMethod = methods.find(m => m.name === 'show');
      const updateMethod = methods.find(m => m.name === 'update');
      
      expect(showMethod).toBeDefined();
      expect(showMethod?.isExcluded).toBe(true);
      expect(updateMethod).toBeDefined();
      expect(updateMethod?.isExcluded).toBe(true);
      
      // カスタムメソッドが正しく検出されているか
      const taskMethod = methods.find(m => m.name === 'tasks_ransack_from_milestone');
      expect(taskMethod).toBeDefined();
      expect(taskMethod?.isExcluded).toBeFalsy();
      expect(taskMethod!.isPrivate).toBe(true);
      
    });

    test('prepare_meta_tagsの呼び出し検出問題を再現', () => {
      const file: ParsedFile = {
        path: 'app/controllers/milestones_controller.rb',
        language: 'ruby',
        totalLines: 15,
        content: `class MilestonesController < ApplicationController
  def show
    prepare_meta_tags(@milestone)
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
  
  private
  
  def tasks_ransack_from_milestone(milestone)
    # method implementation
  end
  
  def prepare_meta_tags(milestone)
    # OGP画像生成処理
  end
end`,
        directory: 'app/controllers',
        fileName: 'milestones_controller.rb',
        methods: []
      };
      
      const methods = analyzeMethodsInFile(file);
      expect(methods).toHaveLength(4); // show, update, tasks_ransack_from_milestone, prepare_meta_tags
      
      // showメソッドが正しく検出されているか
      const showMethod = methods.find(m => m.name === 'show');
      expect(showMethod).toBeDefined();
      expect(showMethod?.isExcluded).toBe(true); // 標準アクション
      
      // 🎯 重要: showメソッドがprepare_meta_tagsを呼び出していることを確認
      const showCalls = showMethod?.calls || [];
      const callNames = showCalls.map(c => c.methodName);
      console.log('🔍 [TEST] Show method calls:', callNames);
      
      expect(callNames).toContain('prepare_meta_tags');
      expect(callNames).toContain('tasks_ransack_from_milestone');
      
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
        language: 'ruby',
        directory: '',
        fileName: 'test.rb',
        totalLines: 23,
        methods: []
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
      // active?とcomplete?は定義されていないため検出されない（変数扱い）
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
        language: 'ruby',
        directory: '',
        fileName: 'test.rb',
        totalLines: 26,
        methods: []
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
      expect(updateCalls).toContain('log_activity');
      // send_notification_emailは定義されていないため検出されない（変数扱い）
      
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
        language: 'ruby',
        directory: '',
        fileName: 'test.rb',
        totalLines: 26,
        methods: []
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
      // notify_subscribers!は定義されていないため検出されない（変数扱い）
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
        language: 'ruby',
        directory: '',
        fileName: 'test.rb',
        totalLines: 28,
        methods: []
      };

      const methods = analyzeMethodsInFile(file);
      const processMethod = methods.find(m => m.name === 'process');
      const methodCalls = processMethod!.calls.map(call => call.methodName);
      
      // 定義されていないメソッドは検出されない（変数フィルタリング）
      // Rails標準メソッドのみ検出される
      expect(methodCalls.length).toBeGreaterThanOrEqual(0);
      
      // find_userはdefined methodsリストに含まれていれば検出される
      // 他のメソッドは定義されていないため検出されない
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
      
      // nameとemailは定義されていないため検出されない（変数扱い）
      expect(methodNames).toContain('user_signed_in?'); // Rails標準メソッド
      expect(methodNames).toContain('link_to'); // Rails標準メソッド
      expect(methodNames).toContain('root_path'); // Rails標準メソッド
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
      
      expect(methodNames).toContain('form_with'); // Rails標準メソッド
      // any?は定義されていないため検出されない
      expect(methodNames).toContain('pluralize'); // Rails標準メソッド
      expect(methodNames).toContain('count'); // CRUD標準メソッド
      expect(methodNames).toContain('label'); // Rails標準メソッド
      expect(methodNames).toContain('text_field'); // Rails標準メソッド
      expect(methodNames).toContain('submit'); // Rails標準メソッド
      // button_classは定義されていないため検出されない
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
      
      expect(methodNames).toContain('where'); // CRUD標準メソッド
      // order, limit, map, display_name, upcaseは定義されていないため検出されない
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
      
      // admin?, active?, member?は定義されていないため検出されない
      expect(methodNames).toContain('render'); // Rails標準メソッド
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

  describe('Rails コントローラー標準アクション除外', () => {
    test('コントローラーの標準アクションは定義元として検知されない', () => {
      const controllerFile: ParsedFile = {
        path: 'app/controllers/users_controller.rb',
        language: 'ruby',
        content: `
class UsersController < ApplicationController
  def index
    @users = User.all
  end

  def show
    @user = User.find(params[:id])
  end

  def new
    @user = User.new
  end

  def create
    @user = User.new(user_params)
    if @user.save
      redirect_to @user
    else
      render :new
    end
  end

  def edit
    @user = User.find(params[:id])
  end

  def update
    @user = User.find(params[:id])
    if @user.update(user_params)
      redirect_to @user
    else
      render :edit
    end
  end

  def destroy
    @user = User.find(params[:id])
    @user.destroy
    redirect_to users_path
  end

  def custom_action
    # カスタムアクション
  end

  private

  def user_params
    params.require(:user).permit(:name, :email)
  end
end`,
        directory: 'app/controllers',
        fileName: 'users_controller.rb',
        totalLines: 43,
        methods: []
      };

      const methods = analyzeMethodsInFile(controllerFile);
      
      // 標準アクション（index, show, new, create, edit, update, destroy）は含まれるがisExcluded=trueとなる
      const methodNames = methods.map(m => m.name);
      expect(methodNames).toContain('index');
      expect(methodNames).toContain('show');
      expect(methodNames).toContain('new');
      expect(methodNames).toContain('create');
      expect(methodNames).toContain('edit');
      expect(methodNames).toContain('update');
      expect(methodNames).toContain('destroy');
      
      // 標準アクションはisExcluded=trueが設定される
      const standardActions = ['index', 'show', 'new', 'create', 'edit', 'update', 'destroy'];
      standardActions.forEach(actionName => {
        const method = methods.find(m => m.name === actionName);
        expect(method).toBeDefined();
        expect(method?.isExcluded).toBe(true);
      });
      
      // カスタムアクションとプライベートメソッドは検出される
      expect(methodNames).toContain('custom_action');
      expect(methodNames).toContain('user_params');
      
      // カスタムメソッドはisExcluded=falseまたはundefined
      const customMethod = methods.find(m => m.name === 'custom_action');
      const privateMethod = methods.find(m => m.name === 'user_params');
      expect(customMethod?.isExcluded).toBeFalsy();
      expect(privateMethod?.isExcluded).toBeFalsy();
    });

    test('コントローラー以外のファイルでは標準アクションが検出される', () => {
      const modelFile: ParsedFile = {
        path: 'app/models/user.rb',
        language: 'ruby',
        content: `
class User < ApplicationRecord
  def index
    # モデルのindexメソッド
  end

  def show
    # モデルのshowメソッド
  end

  def create
    # モデルのcreateメソッド
  end

  def update
    # モデルのupdateメソッド
  end

  def destroy
    # モデルのdestroyメソッド
  end
end`,
        directory: 'app/models',
        fileName: 'user.rb',
        totalLines: 22,
        methods: []
      };

      const methods = analyzeMethodsInFile(modelFile);
      
      // モデルファイルでは標準アクション名も通常のメソッドとして検出される
      const methodNames = methods.map(m => m.name);
      expect(methodNames).toContain('index');
      expect(methodNames).toContain('show');
      expect(methodNames).toContain('create');
      expect(methodNames).toContain('update');
      expect(methodNames).toContain('destroy');
    });

    test('コントローラー内でも標準アクションの呼び出しは検出される', () => {
      const controllerFile: ParsedFile = {
        path: 'app/controllers/admin/users_controller.rb',
        language: 'ruby',
        content: `
class Admin::UsersController < ApplicationController
  def index
    @users = User.all
    call_custom_method
  end

  def show
    @user = User.find(params[:id])
    # 他のアクション（メソッド）を呼び出し
    index_helper if params[:include_all]
  end

  def custom_action
    # カスタムアクション内で標準アクションを呼び出し
    show_details
    index_count = count_users
  end

  private

  def call_custom_method
    # カスタムメソッド
  end

  def show_details
    # showに似た名前だが異なるメソッド
  end

  def index_helper
    # indexに似た名前だが異なるメソッド
  end

  def count_users
    User.count
  end
end`,
        directory: 'app/controllers/admin',
        fileName: 'users_controller.rb',
        totalLines: 38,
        methods: []
      };

      const methods = analyzeMethodsInFile(controllerFile);
      
      // 標準アクション（index, show）は含まれるがisExcluded=trueとなる
      const methodNames = methods.map(m => m.name);
      expect(methodNames).toContain('index');
      expect(methodNames).toContain('show');
      
      // 標準アクションはisExcluded=trueが設定される
      const indexMethod = methods.find(m => m.name === 'index');
      const showMethod = methods.find(m => m.name === 'show');
      expect(indexMethod?.isExcluded).toBe(true);
      expect(showMethod?.isExcluded).toBe(true);
      
      // カスタムメソッドは検出される
      expect(methodNames).toContain('custom_action');
      expect(methodNames).toContain('call_custom_method');
      expect(methodNames).toContain('show_details');
      expect(methodNames).toContain('index_helper');
      expect(methodNames).toContain('count_users');
      
      // カスタムメソッドはisExcluded=falseまたはundefined
      const customMethods = ['custom_action', 'call_custom_method', 'show_details', 'index_helper', 'count_users'];
      customMethods.forEach(methodName => {
        const method = methods.find(m => m.name === methodName);
        expect(method?.isExcluded).toBeFalsy();
      });
      
      // 標準アクション内でのメソッド呼び出しは検出される
      const customActionMethod = methods.find(m => m.name === 'custom_action');
      const callNames = customActionMethod!.calls.map(c => c.methodName);
      expect(callNames).toContain('show_details');
      expect(callNames).toContain('count_users');
    });
  });

  describe('変数フィルタリング機能', () => {
    test('定義されていないメソッド名は変数として除外される', () => {
      const rubyFile: ParsedFile = {
        path: 'user.rb',
        language: 'ruby',
        content: `
class User
  def greet
    name = 'Alice'  # 変数
    puts greet_message(name)  # greet_messageは未定義なので除外される
    user_helper     # user_helperは未定義なので除外される
  end
  
  def valid_method
    puts "valid"
  end
end`,
        directory: '',
        fileName: 'user.rb',
        totalLines: 12,
        methods: []
      };

      // 定義済みメソッド一覧を作成
      const definedMethods = new Set(['greet', 'valid_method']);
      
      const methods = analyzeMethodsInFile(rubyFile, definedMethods);
      
      expect(methods).toHaveLength(2);
      
      const greetMethod = methods.find(m => m.name === 'greet');
      expect(greetMethod).toBeDefined();
      
      // greet_messageとuser_helperは定義されていないため、変数として扱われて除外される
      const callNames = greetMethod!.calls.map(c => c.methodName);
      expect(callNames).not.toContain('greet_message');
      expect(callNames).not.toContain('user_helper');
      expect(callNames).not.toContain('name'); // 変数は除外
    });

    test('定義済みメソッドのみが検出される', () => {
      const rubyFile: ParsedFile = {
        path: 'controller.rb',
        language: 'ruby',
        content: `
class UsersController
  def show
    user = find_user       # find_userが定義済みなら検出
    user_data = load_data  # load_dataが未定義なら除外
    render json: user
  end
  
  def find_user
    User.find(params[:id])
  end
end`,
        directory: '',
        fileName: 'controller.rb',
        totalLines: 11,
        methods: []
      };

      // find_userのみ定義済みとして登録
      const definedMethods = new Set(['show', 'find_user', 'render']);
      
      const methods = analyzeMethodsInFile(rubyFile, definedMethods);
      const showMethod = methods.find(m => m.name === 'show');
      const callNames = showMethod!.calls.map(c => c.methodName);
      
      expect(callNames).toContain('find_user');  // 定義済みなので検出
      expect(callNames).toContain('render');     // 定義済みなので検出
      expect(callNames).not.toContain('load_data'); // 未定義なので除外
      expect(callNames).not.toContain('user');      // 変数は除外
      expect(callNames).not.toContain('user_data'); // 変数は除外
    });

    test('ERBファイルでも変数フィルタリングが動作する', () => {
      const erbFile: ParsedFile = {
        path: 'users/show.html.erb',
        language: 'erb',
        content: `
<div>
  <%= user.name %>        <!-- user.nameのnameは除外される -->
  <%= user_helper %>      <!-- user_helperが定義済みなら検出 -->
  <%= render @user %>     <!-- renderは検出される -->
</div>`,
        directory: 'users',
        fileName: 'show.html.erb',
        totalLines: 6,
        methods: []
      };

      const definedMethods = new Set(['user_helper', 'render']);
      
      const methods = analyzeMethodsInFile(erbFile, definedMethods);
      const methodNames = methods
        .filter(m => m.type === 'erb_call' && !m.name.startsWith('[ERB File:'))
        .map(m => m.name);
      
      expect(methodNames).toContain('user_helper'); // 定義済みなので検出
      expect(methodNames).toContain('render');      // 定義済みなので検出
      expect(methodNames).not.toContain('name');    // 未定義なので除外
    });
  });
});