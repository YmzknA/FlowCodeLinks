import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WindowControls } from '@/components/WindowControls';
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
        name: 'initialize',
        type: 'method',
        startLine: 2,
        endLine: 4,
        filePath: 'app/models/user.rb',
        code: 'def initialize\nend',
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
    methods: []
  }
];

describe('WindowControls コンポーネント', () => {
  test('ファイル一覧が表示される', () => {
    render(
      <WindowControls
        files={mockFiles}
        visibleFiles={['app/models/user.rb']}
        onFileToggle={() => {}}
        onShowAll={() => {}}
        onHideAll={() => {}}
      />
    );

    expect(screen.getByText('user.rb')).toBeInTheDocument();
    expect(screen.getByText('users_controller.rb')).toBeInTheDocument();
  });

  test('ファイルの表示/非表示を切り替えできる', () => {
    const mockOnFileToggle = jest.fn();
    
    render(
      <WindowControls
        files={mockFiles}
        visibleFiles={['app/models/user.rb']}
        onFileToggle={mockOnFileToggle}
        onShowAll={() => {}}
        onHideAll={() => {}}
      />
    );

    const userFileToggle = screen.getByLabelText('app/models/user.rb の表示切り替え');
    fireEvent.click(userFileToggle);
    
    expect(mockOnFileToggle).toHaveBeenCalledWith('app/models/user.rb');
  });

  test('「全て表示」ボタンが機能する', () => {
    const mockOnShowAll = jest.fn();
    
    render(
      <WindowControls
        files={mockFiles}
        visibleFiles={[]}
        onFileToggle={() => {}}
        onShowAll={mockOnShowAll}
        onHideAll={() => {}}
      />
    );

    const showAllButton = screen.getByText('全て表示');
    fireEvent.click(showAllButton);
    
    expect(mockOnShowAll).toHaveBeenCalled();
  });

  test('「全て非表示」ボタンが機能する', () => {
    const mockOnHideAll = jest.fn();
    
    render(
      <WindowControls
        files={mockFiles}
        visibleFiles={mockFiles.map(f => f.path)}
        onFileToggle={() => {}}
        onShowAll={() => {}}
        onHideAll={mockOnHideAll}
      />
    );

    const hideAllButton = screen.getByText('全て非表示');
    fireEvent.click(hideAllButton);
    
    expect(mockOnHideAll).toHaveBeenCalled();
  });

  test('ファイル検索機能が動作する', () => {
    render(
      <WindowControls
        files={mockFiles}
        visibleFiles={mockFiles.map(f => f.path)}
        onFileToggle={() => {}}
        onShowAll={() => {}}
        onHideAll={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText('ファイル検索...');
    fireEvent.change(searchInput, { target: { value: 'user' } });
    
    expect(screen.getByText('user.rb')).toBeInTheDocument();
    expect(screen.queryByText('users_controller.rb')).toBeInTheDocument(); // まだ表示される（部分一致）
  });

  test('ディレクトリごとのグループ表示', () => {
    render(
      <WindowControls
        files={mockFiles}
        visibleFiles={mockFiles.map(f => f.path)}
        onFileToggle={() => {}}
        onShowAll={() => {}}
        onHideAll={() => {}}
      />
    );

    expect(screen.getByText('app/models')).toBeInTheDocument();
    expect(screen.getByText('app/controllers')).toBeInTheDocument();
  });

  test('メソッド一覧表示機能', () => {
    render(
      <WindowControls
        files={mockFiles}
        visibleFiles={mockFiles.map(f => f.path)}
        onFileToggle={() => {}}
        onShowAll={() => {}}
        onHideAll={() => {}}
      />
    );

    // メソッド表示切り替えボタンをクリック
    const methodToggle = screen.getByText('メソッド表示');
    fireEvent.click(methodToggle);
    
    expect(screen.getByText('initialize')).toBeInTheDocument();
  });

  test('表示中ファイルのカウント表示', () => {
    render(
      <WindowControls
        files={mockFiles}
        visibleFiles={['app/models/user.rb']}
        onFileToggle={() => {}}
        onShowAll={() => {}}
        onHideAll={() => {}}
      />
    );

    expect(screen.getByText('表示中: 1 / 2')).toBeInTheDocument();
  });

  test('空のファイルリストを適切に処理', () => {
    render(
      <WindowControls
        files={[]}
        visibleFiles={[]}
        onFileToggle={() => {}}
        onShowAll={() => {}}
        onHideAll={() => {}}
      />
    );

    expect(screen.getByText('ファイルがありません')).toBeInTheDocument();
  });
});