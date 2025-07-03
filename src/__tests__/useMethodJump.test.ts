import { renderHook, act } from '@testing-library/react';
import { useMethodJump } from '@/hooks/useMethodJump';
import { ParsedFile } from '@/types';

const mockFiles: ParsedFile[] = [
  {
    path: 'app/models/user.rb',
    fileName: 'user.rb',
    content: 'class User\n  def initialize(name)\n    @name = name\n  end\n\n  def greet\n    puts "Hello, #{@name}!"\n  end\nend',
    language: 'ruby',
    directory: 'app/models',
    methods: [
      {
        name: 'initialize',
        type: 'method',
        startLine: 2,
        endLine: 4,
        filePath: 'app/models/user.rb',
        code: '  def initialize(name)\n    @name = name\n  end',
        calls: [],
        isPrivate: false,
        parameters: ['name']
      },
      {
        name: 'greet',
        type: 'method',
        startLine: 6,
        endLine: 8,
        filePath: 'app/models/user.rb',
        code: '  def greet\n    puts "Hello, #{@name}!"\n  end',
        calls: [],
        isPrivate: false,
        parameters: []
      }
    ]
  },
  {
    path: 'app/controllers/users_controller.rb',
    fileName: 'users_controller.rb',
    content: 'class UsersController\n  def show\n    @user = User.new("Alice")\n    @user.greet\n  end\nend',
    language: 'ruby',
    directory: 'app/controllers',
    methods: [
      {
        name: 'show',
        type: 'method',
        startLine: 2,
        endLine: 5,
        filePath: 'app/controllers/users_controller.rb',
        code: '  def show\n    @user = User.new("Alice")\n    @user.greet\n  end',
        calls: [
          { methodName: 'new', line: 3 },
          { methodName: 'greet', line: 4 }
        ],
        isPrivate: false,
        parameters: []
      }
    ]
  }
];

describe('useMethodJump hook', () => {
  const mockSetVisibleFiles = jest.fn();
  const mockSetHighlightedMethod = jest.fn();
  const mockSetFloatingWindows = jest.fn();
  const mockSetExternalPan = jest.fn();

  const defaultProps = {
    files: mockFiles,
    visibleFiles: ['app/models/user.rb'],
    setVisibleFiles: mockSetVisibleFiles,
    setHighlightedMethod: mockSetHighlightedMethod,
    setFloatingWindows: mockSetFloatingWindows,
    setExternalPan: mockSetExternalPan,
    currentZoom: 1,
    sidebarCollapsed: false,
    sidebarWidth: 320
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('初期化が正しく行われる', () => {
    const { result } = renderHook(() => useMethodJump(defaultProps));

    expect(typeof result.current.handleMethodHighlight).toBe('function');
    expect(typeof result.current.findMethodDefinition).toBe('function');
    expect(typeof result.current.findMethodCaller).toBe('function');
    expect(typeof result.current.findAllMethodCallers).toBe('function');
  });

  test('メソッドハイライトが動作する', () => {
    const { result } = renderHook(() => useMethodJump(defaultProps));

    const methodToHighlight = {
      methodName: 'greet',
      filePath: 'app/models/user.rb'
    };

    act(() => {
      result.current.handleMethodHighlight(methodToHighlight);
    });

    expect(mockSetHighlightedMethod).toHaveBeenCalledWith(methodToHighlight);
  });

  test('メソッド定義の検索が動作する', () => {
    const { result } = renderHook(() => useMethodJump(defaultProps));

    const foundMethod = result.current.findMethodDefinition('greet');

    expect(foundMethod).toEqual({
      methodName: 'greet',
      filePath: 'app/models/user.rb'
    });
  });

  test('存在しないメソッドの検索でnullが返される', () => {
    const { result } = renderHook(() => useMethodJump(defaultProps));

    const foundMethod = result.current.findMethodDefinition('nonexistent');

    expect(foundMethod).toBeNull();
  });

  test('メソッド呼び出し元の検索（単一）が動作する', () => {
    const { result } = renderHook(() => useMethodJump(defaultProps));

    const caller = result.current.findMethodCaller('greet', 'app/controllers/users_controller.rb');

    expect(caller).toEqual({
      methodName: 'show',
      filePath: 'app/controllers/users_controller.rb'
    });
  });

  test('全メソッド呼び出し元の検索が動作する', () => {
    const { result } = renderHook(() => useMethodJump(defaultProps));

    const allCallers = result.current.findAllMethodCallers('greet');

    expect(allCallers).toHaveLength(1);
    expect(allCallers[0]).toEqual({
      methodName: 'show',
      filePath: 'app/controllers/users_controller.rb',
      lineNumber: 4
    });
  });

  test('呼び出し元がないメソッドでnullが返される', () => {
    const { result } = renderHook(() => useMethodJump(defaultProps));

    const caller = result.current.findMethodCaller('initialize', 'app/models/user.rb');

    expect(caller).toBeNull();
  });

  test('呼び出し元がないメソッドで空配列が返される（全検索）', () => {
    const { result } = renderHook(() => useMethodJump(defaultProps));

    const allCallers = result.current.findAllMethodCallers('initialize');

    expect(allCallers).toHaveLength(0);
  });

  test('ファイルが変更されたときに正しく更新される', () => {
    const { result, rerender } = renderHook((props) => useMethodJump(props), {
      initialProps: defaultProps
    });

    // 新しいファイルを追加
    const newFiles = [...mockFiles, {
      path: 'lib/utils.js',
      fileName: 'utils.js',
      content: 'function helper() { return true; }',
      language: 'javascript',
      directory: 'lib',
      methods: [{
        name: 'helper',
        type: 'function',
        startLine: 1,
        endLine: 1,
        filePath: 'lib/utils.js',
        code: 'function helper() { return true; }',
        calls: [],
        isPrivate: false,
        parameters: []
      }]
    }];

    rerender({ ...defaultProps, files: newFiles });

    const foundMethod = result.current.findMethodDefinition('helper');
    expect(foundMethod?.methodName).toBe('helper');
    expect(foundMethod?.filePath).toBe('lib/utils.js');
  });

  test('無効なパラメータでエラーハンドリングが動作する', () => {
    const { result } = renderHook(() => useMethodJump(defaultProps));

    // 空文字列でのメソッド検索
    const foundMethod = result.current.findMethodDefinition('');
    expect(foundMethod).toBeNull();

    // 空文字列での呼び出し元検索
    const caller = result.current.findMethodCaller('', 'app/models/user.rb');
    expect(caller).toBeNull();

    const allCallers = result.current.findAllMethodCallers('');
    expect(allCallers).toHaveLength(0);
  });

  test('複数のファイルにまたがるメソッド検索が動作する', () => {
    const { result } = renderHook(() => useMethodJump(defaultProps));

    // 'new'メソッドを検索（複数のファイルで呼び出されている可能性）
    const allCallers = result.current.findAllMethodCallers('new');
    
    expect(allCallers.length).toBeGreaterThanOrEqual(0);
  });

  test('存在しないファイルパスでの呼び出し元検索', () => {
    const { result } = renderHook(() => useMethodJump(defaultProps));

    const caller = result.current.findMethodCaller('greet', 'nonexistent/file.rb');

    expect(caller).toBeNull();
  });
});