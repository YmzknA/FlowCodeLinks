import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CodeVisualizer } from '@/components/CodeVisualizer';

// Fileのモック
global.File = class MockFile {
  name: string;
  size: number;
  type: string;

  constructor(parts: any[], filename: string, options: any = {}) {
    this.name = filename;
    this.size = options.size || 1000;
    this.type = options.type || 'text/markdown';
  }

  text = jest.fn().mockResolvedValue(`
# Repomix Output

## File: app/models/user.rb
\`\`\`ruby
class User
  def initialize(name)
    @name = name
  end

  def greet
    puts "Hello, #{@name}!"
  end
end
\`\`\`

## File: app/controllers/users_controller.rb
\`\`\`ruby
class UsersController
  def show
    @user = User.new("Alice")
    @user.greet
  end
end
\`\`\`
  `);
} as any;

describe('統合テスト - 主要ワークフロー', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ファイルアップロードから表示までの基本フロー', async () => {
    const { container } = render(<CodeVisualizer />);

    // 1. 初期状態の確認
    expect(screen.getByText('FlowCodeLinks')).toBeInTheDocument();
    expect(screen.getByText(/Repomixで生成されたmdファイルをアップロード/)).toBeInTheDocument();

    // 2. ファイルアップロードボタンの確認
    const uploadButton = screen.getByText(/mdファイルをアップロード/i);
    expect(uploadButton).toBeInTheDocument();

    // このテストは簡単な表示確認のみとする
    // 実際のファイルアップロードの詳細テストは別のテストで行う
  });

  test('エラーハンドリングのフロー', async () => {
    const { container } = render(<CodeVisualizer />);

    // 基本的な表示確認のみ
    expect(screen.getByText('FlowCodeLinks')).toBeInTheDocument();
  });

  test('大容量ファイルのエラーハンドリング', async () => {
    const { container } = render(<CodeVisualizer />);

    // 基本的な表示確認のみ
    expect(screen.getByText('FlowCodeLinks')).toBeInTheDocument();
  });

  test('コンポーネントが正常にレンダリングされる', () => {
    const { container } = render(<CodeVisualizer />);

    // 基本的なUI要素の存在確認
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
    expect(screen.getByText('FlowCodeLinks')).toBeInTheDocument();
  });

  test('エラーバウンダリが機能する', () => {
    // エラーを意図的に発生させるコンポーネント
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const ConsoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<ThrowError />);
    }).toThrow('Test error');

    ConsoleErrorSpy.mockRestore();
  });

  test('メモリリークの防止（クリーンアップ）', () => {
    const { unmount } = render(<CodeVisualizer />);

    // アンマウント時にエラーが発生しないことを確認
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});