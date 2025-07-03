import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Sidebar } from '@/components/Sidebar';
import { ParsedFile, Method } from '@/types/codebase';

const mockFiles: ParsedFile[] = [
  {
    path: 'app/models/user.rb',
    language: 'ruby',
    content: 'class User\nend',
    directory: 'app/models',
    fileName: 'user.rb',
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
      },
      {
        name: 'initialize',
        type: 'method',
        startLine: 6,
        endLine: 8,
        filePath: 'app/models/user.rb',
        code: 'def initialize\nend',
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

describe('Sidebar コンポーネント', () => {
  const defaultProps = {
    files: mockFiles,
    visibleFiles: ['app/models/user.rb'],
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

  test('サイドバーが正しくレンダリングされる', () => {
    render(<Sidebar {...defaultProps} />);
    
    expect(screen.getByText('ファイル管理')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ファイル・メソッド検索...')).toBeInTheDocument();
  });

  test('ファイル検索機能が動作する', () => {
    render(<Sidebar {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('ファイル・メソッド検索...');
    fireEvent.change(searchInput, { target: { value: 'user' } });
    
    expect(screen.getByText('user.rb')).toBeInTheDocument();
    expect(screen.queryByText('utils.js')).not.toBeInTheDocument();
  });

  test('メソッド検索機能が動作する', () => {
    render(<Sidebar {...defaultProps} />);
    
    // メソッド表示モードに切り替え
    const methodModeButton = screen.getByText('メソッド表示');
    fireEvent.click(methodModeButton);
    
    const searchInput = screen.getByPlaceholderText('ファイル・メソッド検索...');
    fireEvent.change(searchInput, { target: { value: 'helper' } });
    
    expect(screen.getByText('helper')).toBeInTheDocument();
  });

  test('ファイル表示/非表示の切り替えができる', () => {
    const mockOnFileToggle = jest.fn();
    render(<Sidebar {...defaultProps} onFileToggle={mockOnFileToggle} />);
    
    // ツリー表示の場合、ファイル名でaria-labelが設定される
    const fileToggle = screen.getByLabelText('user.rb の表示切り替え');
    fireEvent.click(fileToggle);
    
    expect(mockOnFileToggle).toHaveBeenCalledWith('app/models/user.rb');
  });

  test('全て表示ボタンが機能する', () => {
    const mockOnShowAll = jest.fn();
    render(<Sidebar {...defaultProps} onShowAll={mockOnShowAll} />);
    
    const showAllButton = screen.getByText('全て表示');
    fireEvent.click(showAllButton);
    
    expect(mockOnShowAll).toHaveBeenCalled();
  });

  test('全て非表示ボタンが機能する', () => {
    const mockOnHideAll = jest.fn();
    render(<Sidebar {...defaultProps} onHideAll={mockOnHideAll} />);
    
    const hideAllButton = screen.getByText('全て非表示');
    fireEvent.click(hideAllButton);
    
    expect(mockOnHideAll).toHaveBeenCalled();
  });

  test('メソッドハイライト機能が動作する', () => {
    const mockOnMethodHighlight = jest.fn();
    render(<Sidebar {...defaultProps} onMethodHighlight={mockOnMethodHighlight} />);
    
    // メソッド表示モードに切り替え
    const methodModeButton = screen.getByText('メソッド表示');
    fireEvent.click(methodModeButton);
    
    // メソッドをクリック
    const methodItem = screen.getByText('full_name');
    fireEvent.click(methodItem);
    
    expect(mockOnMethodHighlight).toHaveBeenCalledWith({
      methodName: 'full_name',
      filePath: 'app/models/user.rb'
    });
  });

  test('統計情報が正しく表示される', () => {
    render(<Sidebar {...defaultProps} />);
    
    expect(screen.getByText('表示中: 1 / 2')).toBeInTheDocument();
    expect(screen.getByText('総メソッド数: 3')).toBeInTheDocument();
  });

  test('言語別フィルタリング機能', () => {
    render(<Sidebar {...defaultProps} />);
    
    const languageFilter = screen.getByRole('combobox');
    fireEvent.change(languageFilter, { target: { value: 'ruby' } });
    
    expect(screen.getByText('user.rb')).toBeInTheDocument();
    expect(screen.queryByText('utils.js')).not.toBeInTheDocument();
  });

  test('ハイライト中のメソッドが視覚的に区別される', () => {
    const propsWithHighlight = {
      ...defaultProps,
      highlightedMethod: { methodName: 'full_name', filePath: 'app/models/user.rb' }
    };
    
    render(<Sidebar {...propsWithHighlight} />);
    
    // メソッド表示モードに切り替え
    const methodModeButton = screen.getByText('メソッド表示');
    fireEvent.click(methodModeButton);
    
    const highlightedMethod = screen.getByText('full_name');
    expect(highlightedMethod.closest('.highlighted')).toBeInTheDocument();
  });

  test('空の検索結果を適切に処理', () => {
    render(<Sidebar {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('ファイル・メソッド検索...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('検索結果がありません')).toBeInTheDocument();
  });

  test('ツリー表示とリスト表示の切り替えができる', () => {
    render(<Sidebar {...defaultProps} />);
    
    // 初期状態はツリー表示
    expect(screen.getByText('ツリー表示')).toHaveClass('bg-purple-500');
    
    // リスト表示に切り替え
    const listViewButton = screen.getByText('リスト表示');
    fireEvent.click(listViewButton);
    
    expect(listViewButton).toHaveClass('bg-purple-500');
    expect(screen.getByText('ツリー表示')).toHaveClass('bg-gray-200');
  });

  test('メソッド表示モードでは表示切り替えボタンが非表示になる', () => {
    render(<Sidebar {...defaultProps} />);
    
    // メソッド表示モードに切り替え
    const methodModeButton = screen.getByText('メソッド表示');
    fireEvent.click(methodModeButton);
    
    // 表示切り替えボタンが非表示になる
    expect(screen.queryByText('ツリー表示')).not.toBeInTheDocument();
    expect(screen.queryByText('リスト表示')).not.toBeInTheDocument();
  });
});