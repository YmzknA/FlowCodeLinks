import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DirectoryTree } from '@/components/DirectoryTree';
import { ParsedFile } from '@/types/codebase';

const mockFiles: ParsedFile[] = [
  {
    path: 'app/models/user.rb',
    language: 'ruby',
    content: 'class User\nend',
    directory: 'app/models',
    fileName: 'user.rb',
    totalLines: 2,
    methods: [
      {
        name: 'full_name',
        type: 'method',
        startLine: 2,
        endLine: 4,
        filePath: 'app/models/user.rb',
        code: 'def full_name\nend',
        calls: [],
        isPrivate: false,
        parameters: []
      }
    ]
  },
  {
    path: 'app/controllers/users_controller.rb',
    language: 'ruby',
    content: 'class UsersController\nend',
    directory: 'app/controllers',
    fileName: 'users_controller.rb',
    totalLines: 2,
    methods: [
      {
        name: 'index',
        type: 'method',
        startLine: 2,
        endLine: 4,
        filePath: 'app/controllers/users_controller.rb',
        code: 'def index\nend',
        calls: [],
        isPrivate: false,
        parameters: []
      }
    ]
  },
  {
    path: 'lib/utils.js',
    language: 'javascript',
    content: 'function helper() {}',
    directory: 'lib',
    fileName: 'utils.js',
    totalLines: 1,
    methods: [
      {
        name: 'helper',
        type: 'function',
        startLine: 1,
        endLine: 1,
        filePath: 'lib/utils.js',
        code: 'function helper() {}',
        calls: [],
        isPrivate: false,
        parameters: []
      }
    ]
  }
];

describe('DirectoryTree コンポーネント', () => {
  const defaultProps = {
    files: mockFiles,
    visibleFiles: ['app/models/user.rb'],
    onFileToggle: jest.fn(),
    onDirectoryToggle: jest.fn(),
    sidebarWidth: 320
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ディレクトリツリーが正しくレンダリングされる', () => {
    render(<DirectoryTree {...defaultProps} />);
    
    // ディレクトリが表示される
    expect(screen.getByText('📁 app')).toBeInTheDocument();
    expect(screen.getByText('📁 lib')).toBeInTheDocument();
    
    // ファイルが表示される
    expect(screen.getByText('user.rb')).toBeInTheDocument();
    expect(screen.getByText('utils.js')).toBeInTheDocument();
  });

  test('ディレクトリの折りたたみ機能が動作する', () => {
    render(<DirectoryTree {...defaultProps} />);
    
    // 最初はディレクトリが展開されている
    expect(screen.getByText('user.rb')).toBeInTheDocument();
    
    // ディレクトリの折りたたみボタンをクリック
    const collapseButton = screen.getAllByText('▼')[0]; // app ディレクトリの折りたたみボタン
    fireEvent.click(collapseButton);
    
    // ファイルが非表示になる
    expect(screen.queryByText('user.rb')).not.toBeInTheDocument();
    
    // ボタンが変わる
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  test('ディレクトリ展開機能が動作する', () => {
    render(<DirectoryTree {...defaultProps} />);
    
    // ディレクトリを折りたたむ
    const collapseButton = screen.getAllByText('▼')[0];
    fireEvent.click(collapseButton);
    
    // 展開ボタンをクリック
    const expandButton = screen.getByText('▶');
    fireEvent.click(expandButton);
    
    // ファイルが再び表示される
    expect(screen.getByText('user.rb')).toBeInTheDocument();
  });

  test('ファイルの表示切り替えボタンが機能する', () => {
    const mockOnFileToggle = jest.fn();
    render(<DirectoryTree {...defaultProps} onFileToggle={mockOnFileToggle} />);
    
    // ファイルのチェックボックスをクリック
    const fileToggle = screen.getByLabelText('user.rb の表示切り替え');
    fireEvent.click(fileToggle);
    
    expect(mockOnFileToggle).toHaveBeenCalledWith('app/models/user.rb');
  });

  test('ディレクトリ一括表示ボタンが機能する', () => {
    const mockOnFileToggle = jest.fn();
    render(<DirectoryTree {...defaultProps} onFileToggle={mockOnFileToggle} />);
    
    // appディレクトリのチェックボックスをクリック
    const directoryToggle = screen.getByTitle('appディレクトリの表示切り替え');
    fireEvent.click(directoryToggle);
    
    // ディレクトリ内のファイルのonFileToggleが呼ばれることを確認
    expect(mockOnFileToggle).toHaveBeenCalled();
  });

  test('ディレクトリの表示状態が正しく反映される', () => {
    const propsWithMultipleVisible = {
      ...defaultProps,
      visibleFiles: ['app/models/user.rb', 'app/controllers/users_controller.rb']
    };
    
    render(<DirectoryTree {...propsWithMultipleVisible} />);
    
    // app ディレクトリは一部のファイルが表示中なのでチェックボックスが選択状態
    const appCheckbox = screen.getByTitle('appディレクトリの表示切り替え');
    expect(appCheckbox).toHaveClass('bg-blue-500');
  });

  test('非表示ディレクトリの状態が正しく反映される', () => {
    const propsWithNoneVisible = {
      ...defaultProps,
      visibleFiles: []
    };
    
    render(<DirectoryTree {...propsWithNoneVisible} />);
    
    // 全てのディレクトリが非表示状態なのでチェックボックスが未選択状態
    const appCheckbox = screen.getByTitle('appディレクトリの表示切り替え');
    expect(appCheckbox).toHaveClass('bg-white');
  });

  test('ファイル情報が正しく表示される', () => {
    render(<DirectoryTree {...defaultProps} />);
    
    // ファイルの詳細情報が表示される
    const rubyElements = screen.getAllByText('ruby');
    expect(rubyElements.length).toBeGreaterThan(0); // user.rb の言語
    
    const methodCounts = screen.getAllByText('1 メソッド');
    expect(methodCounts.length).toBeGreaterThan(0); // メソッド数
    
    expect(screen.getByText('javascript')).toBeInTheDocument(); // utils.js の言語
  });

  test('ネストしたディレクトリ構造が正しく表示される', () => {
    render(<DirectoryTree {...defaultProps} />);
    
    // ディレクトリ階層が正しく表示される
    expect(screen.getByText('📁 models')).toBeInTheDocument();
    expect(screen.getByText('📁 controllers')).toBeInTheDocument();
  });
});