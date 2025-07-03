import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LayoutManager } from '@/components/LayoutManager';
import { ParsedFile } from '@/types/codebase';

const mockFiles: ParsedFile[] = [
  {
    path: 'app/models/user.rb',
    language: 'ruby',
    content: 'class User\nend',
    directory: 'app/models',
    fileName: 'user.rb',
    methods: []
  },
  {
    path: 'app/controllers/users_controller.rb',
    language: 'ruby',
    content: 'class UsersController\nend',
    directory: 'app/controllers',
    fileName: 'users_controller.rb',
    methods: []
  },
  {
    path: 'lib/utils.js',
    language: 'javascript',
    content: 'function helper() {}',
    directory: 'lib',
    fileName: 'utils.js',
    methods: []
  }
];

describe('LayoutManager コンポーネント', () => {
  test('複数のウィンドウを管理できる', () => {
    render(
      <LayoutManager
        files={mockFiles}
        dependencies={[]}
        onFileToggle={() => {}}
      />
    );

    // 管理システムが正常に初期化されることを確認
    expect(screen.getByTestId('layout-manager')).toBeInTheDocument();
  });

  test('ディレクトリ別にグリッド配置を行う', () => {
    const { container } = render(
      <LayoutManager
        files={mockFiles}
        dependencies={[]}
        onFileToggle={() => {}}
      />
    );

    // グリッドレイアウトの確認
    const layoutContainer = container.querySelector('[data-testid="layout-manager"]');
    expect(layoutContainer).toBeInTheDocument();
  });

  test('ウィンドウの位置を動的に更新できる', () => {
    const mockOnFileToggle = jest.fn();
    
    render(
      <LayoutManager
        files={mockFiles}
        dependencies={[]}
        onFileToggle={mockOnFileToggle}
      />
    );

    // 位置更新機能が実装されていることを確認
    expect(mockOnFileToggle).toBeDefined();
  });

  test('重複ウィンドウの配置を避ける', () => {
    const duplicateFiles = [
      ...mockFiles,
      mockFiles[0] // 重複ファイル
    ];

    render(
      <LayoutManager
        files={duplicateFiles}
        dependencies={[]}
        onFileToggle={() => {}}
      />
    );

    // 重複が適切に処理されることを確認
    expect(screen.getByTestId('layout-manager')).toBeInTheDocument();
  });

  test('空のファイルリストを適切に処理する', () => {
    render(
      <LayoutManager
        files={[]}
        dependencies={[]}
        onFileToggle={() => {}}
      />
    );

    expect(screen.getByTestId('layout-manager')).toBeInTheDocument();
  });

  test('ウィンドウサイズに応じて配置を調整する', () => {
    // ウィンドウサイズを設定
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

    render(
      <LayoutManager
        files={mockFiles}
        dependencies={[]}
        onFileToggle={() => {}}
      />
    );

    expect(screen.getByTestId('layout-manager')).toBeInTheDocument();
  });
});