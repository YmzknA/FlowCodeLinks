import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { CodeVisualizer } from '../CodeVisualizer';
import { ParsedFile } from '@/types/codebase';

// メソッドジャンプ機能のテストケース
describe('Method Jump Functionality', () => {
  const mockFiles: ParsedFile[] = [
    {
      path: 'src/user.rb',
      fileName: 'user.rb',
      content: 'class User\n  def initialize(name)\n    @name = name\n  end\n\n  def greet\n    puts "Hello, #{@name}!"\n  end\nend',
      language: 'ruby',
      directory: 'src',
      totalLines: 9,
      methods: [
        {
          name: 'initialize',
          type: 'method',
          filePath: 'src/user.rb',
          startLine: 2,
          endLine: 4,
          code: '  def initialize(name)\n    @name = name\n  end',
          parameters: ['name'],
          isPrivate: false,
          calls: []
        },
        {
          name: 'greet',
          type: 'method',
          filePath: 'src/user.rb',
          startLine: 6,
          endLine: 8,
          code: '  def greet\n    puts "Hello, #{@name}!"\n  end',
          parameters: [],
          isPrivate: false,
          calls: []
        }
      ]
    },
    {
      path: 'src/application.rb',
      fileName: 'application.rb',
      content: 'class Application\n  def run\n    user = User.new("Alice")\n    user.greet\n  end\nend',
      language: 'ruby',
      directory: 'src',
      totalLines: 6,
      methods: [
        {
          name: 'run',
          type: 'method',
          filePath: 'src/application.rb',
          startLine: 2,
          endLine: 5,
          code: '  def run\n    user = User.new("Alice")\n    user.greet\n  end',
          parameters: [],
          isPrivate: false,
          calls: [
            { methodName: 'new', line: 3, context: 'user = User.new("Alice")' },
            { methodName: 'greet', line: 4, context: 'user.greet' }
          ]
        }
      ]
    }
  ];

  const defaultProps = {
    files: mockFiles,
    visibleFiles: ['src/user.rb', 'src/application.rb'],
    highlightedMethod: null,
    onFileToggle: jest.fn(),
    onShowAll: jest.fn(),
    onHideAll: jest.fn(),
    onMethodHighlight: jest.fn(),
    onClearHighlight: jest.fn(),
    onDirectoryToggle: jest.fn(),
    sidebarWidth: 320
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should display method list when switching to method view', () => {
    render(<Sidebar {...defaultProps} />);
    
    // メソッド表示ボタンをクリック
    const methodToggleButton = screen.getByText('メソッド表示');
    fireEvent.click(methodToggleButton);
    
    // メソッド一覧が表示されることを確認
    expect(screen.getByText('メソッド一覧')).toBeInTheDocument();
    expect(screen.getByText('initialize')).toBeInTheDocument();
    expect(screen.getByText('greet')).toBeInTheDocument();
    expect(screen.getByText('run')).toBeInTheDocument();
  });

  test('should highlight method when clicked from method list', () => {
    render(<Sidebar {...defaultProps} />);
    
    // メソッド表示に切り替え
    const methodToggleButton = screen.getByText('メソッド表示');
    fireEvent.click(methodToggleButton);
    
    // greetメソッドをクリック
    const greetMethod = screen.getByText('greet');
    fireEvent.click(greetMethod);
    
    // onMethodHighlightが呼ばれることを確認
    expect(defaultProps.onMethodHighlight).toHaveBeenCalledWith({
      methodName: 'greet',
      filePath: 'src/user.rb'
    });
  });

  test('should show highlighted method with correct styling', () => {
    const propsWithHighlight = {
      ...defaultProps,
      highlightedMethod: {
        methodName: 'greet',
        filePath: 'src/user.rb'
      }
    };
    
    const { container } = render(<Sidebar {...propsWithHighlight} />);
    
    // メソッド表示に切り替え
    const methodToggleButton = screen.getByText('メソッド表示');
    fireEvent.click(methodToggleButton);
    
    // ハイライトされたメソッドが存在することを確認
    // 'highlighted'クラスを持つ要素が存在することを確認
    const highlightedElement = container.querySelector('.highlighted');
    expect(highlightedElement).toBeInTheDocument();
    expect(highlightedElement).toHaveClass('bg-yellow-100');
    expect(highlightedElement).toHaveClass('border-yellow-300');
  });

  test('should filter methods by search term', () => {
    render(<Sidebar {...defaultProps} />);
    
    // メソッド表示に切り替え
    const methodToggleButton = screen.getByText('メソッド表示');
    fireEvent.click(methodToggleButton);
    
    // 検索フィールドに入力
    const searchInput = screen.getByPlaceholderText('ファイル・メソッド検索...');
    fireEvent.change(searchInput, { target: { value: 'greet' } });
    
    // greetメソッドのみ表示されることを確認
    expect(screen.getByText('greet')).toBeInTheDocument();
    expect(screen.queryByText('initialize')).not.toBeInTheDocument();
    expect(screen.queryByText('run')).not.toBeInTheDocument();
  });

  test('should filter methods by language', () => {
    render(<Sidebar {...defaultProps} />);
    
    // メソッド表示に切り替え
    const methodToggleButton = screen.getByText('メソッド表示');
    fireEvent.click(methodToggleButton);
    
    // 言語フィルターでrubyを選択
    const languageFilter = screen.getByDisplayValue('全ての言語');
    fireEvent.change(languageFilter, { target: { value: 'ruby' } });
    
    // 全てのメソッドが表示されることを確認（全てrubyファイル）
    expect(screen.getByText('initialize')).toBeInTheDocument();
    expect(screen.getByText('greet')).toBeInTheDocument();
    expect(screen.getByText('run')).toBeInTheDocument();
  });

  test('should display method statistics correctly', () => {
    render(<Sidebar {...defaultProps} />);
    
    // 統計情報の確認
    expect(screen.getByText('表示中: 2 / 2')).toBeInTheDocument();
    expect(screen.getByText('総メソッド数: 3')).toBeInTheDocument();
  });

  test('should clear highlight when clear button is clicked', () => {
    const propsWithHighlight = {
      ...defaultProps,
      highlightedMethod: {
        methodName: 'greet',
        filePath: 'src/user.rb'
      }
    };
    
    render(<Sidebar {...propsWithHighlight} />);
    
    // ハイライト解除ボタンをクリック
    const clearButton = screen.getByText('ハイライト解除');
    fireEvent.click(clearButton);
    
    // onClearHighlightが呼ばれることを確認
    expect(defaultProps.onClearHighlight).toHaveBeenCalled();
  });

  test('should show method information correctly', () => {
    render(<Sidebar {...defaultProps} />);
    
    // メソッド表示に切り替え
    const methodToggleButton = screen.getByText('メソッド表示');
    fireEvent.click(methodToggleButton);
    
    // メソッド情報の確認 - 複数の同じテキストがある場合を考慮
    expect(screen.getByText('greet')).toBeInTheDocument();
    expect(screen.getAllByText('user.rb').length).toBeGreaterThan(0);
    expect(screen.getAllByText('method').length).toBeGreaterThan(0);
  });
});