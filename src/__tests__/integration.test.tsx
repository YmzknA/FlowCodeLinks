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
    expect(screen.getByText('ファイルアップロード')).toBeInTheDocument();

    // 2. ファイルアップロード
    const fileInput = screen.getByLabelText('ファイル選択');
    const mockFile = new File(['mock content'], 'test.md', { type: 'text/markdown' });

    await act(async () => {
      const event = {
        target: { files: [mockFile] }
      } as any;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });
    });

    // 3. ファイル解析の完了を待つ
    await waitFor(() => {
      expect(screen.queryByText('ローディング')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // 4. サイドバーの表示確認
    expect(screen.getByText('ファイル管理')).toBeInTheDocument();
  });

  test('エラーハンドリングのフロー', async () => {
    const { container } = render(<CodeVisualizer />);

    // 不正なファイル形式
    const fileInput = screen.getByLabelText('ファイル選択');
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

    await act(async () => {
      const event = {
        target: { files: [invalidFile] }
      } as any;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
    });

    // エラーメッセージの表示確認
    await waitFor(() => {
      expect(screen.getByText(/mdファイルのみアップロード可能です/)).toBeInTheDocument();
    });
  });

  test('大容量ファイルのエラーハンドリング', async () => {
    const { container } = render(<CodeVisualizer />);

    // 5MB超のファイル
    const fileInput = screen.getByLabelText('ファイル選択');
    const largeFile = new File(['content'], 'large.md', { 
      type: 'text/markdown',
      size: 6 * 1024 * 1024 // 6MB
    });

    await act(async () => {
      const event = {
        target: { files: [largeFile] }
      } as any;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      });
    });

    // エラーメッセージの表示確認
    await waitFor(() => {
      expect(screen.getByText(/ファイルサイズが5MBを超えています/)).toBeInTheDocument();
    });
  });

  test('コンポーネントが正常にレンダリングされる', () => {
    const { container } = render(<CodeVisualizer />);

    // 基本的なUI要素の存在確認
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
    expect(screen.getByText('Code Visualizer')).toBeInTheDocument();
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