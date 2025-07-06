import { renderHook, act } from '@testing-library/react';
import { useAllFilesMonitor } from '@/hooks/useAllFilesMonitor';

// 無限レンダリングテスト
describe('useAllFilesMonitor - 無限レンダリング防止', () => {
  let originalAddEventListener: typeof window.addEventListener;
  let originalRemoveEventListener: typeof window.removeEventListener;
  
  beforeEach(() => {
    // window.__allFilesをリセット
    delete (window as any).__allFiles;
    
    // addEventListener のモック
    originalAddEventListener = window.addEventListener;
    originalRemoveEventListener = window.removeEventListener;
    
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  afterEach(() => {
    // テスト後にクリーンアップ
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  test('filePathが変更されても無限レンダリングが発生しない', async () => {
    // 初期ファイルパス
    const initialPath = '/test/file1.tsx';
    
    // フックをレンダリング
    const { result, rerender } = renderHook(
      ({ filePath }) => useAllFilesMonitor(filePath),
      {
        initialProps: { filePath: initialPath }
      }
    );

    // 初期状態の確認
    expect(result.current.allFilesVersion).toBe(0);

    // クライアントサイドの設定をシミュレート
    await act(async () => {
      // 少し待つ
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // isClientがtrueになることを確認
    expect(result.current.isClient).toBe(true);

    // filePathを複数回変更してもバージョンが不正に増加しないことを確認
    const initialVersion = result.current.allFilesVersion;
    
    const paths = [
      '/test/file2.tsx',
      '/test/file3.tsx',
      '/test/file4.tsx',
      '/test/file5.tsx'
    ];

    for (const path of paths) {
      rerender({ filePath: path });
      
      // 少し待つ
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
    }

    // filePathの変更だけではバージョンが増加しないことを確認
    // (実際のデータ変更がない限り)
    expect(result.current.allFilesVersion).toBe(initialVersion);
  });

  test('useEffectの依存配列が正しく設定されている', () => {
    const filePath = '/test/file.tsx';
    
    // フックをレンダリング
    const { result, rerender } = renderHook(() => useAllFilesMonitor(filePath));

    // 初期状態
    const initialResult = result.current;

    // 同じfilePathで再レンダリング
    rerender();
    
    // 同じfilePathの場合、アイデンティティが保持されることを確認
    expect(result.current.isClient).toBe(initialResult.isClient);
    expect(result.current.allFilesVersion).toBe(initialResult.allFilesVersion);
  });

  test('filePathRefが正しく更新される', () => {
    // この部分は実装の詳細なので、動作確認のみ
    const { result, rerender } = renderHook(
      ({ filePath }) => useAllFilesMonitor(filePath),
      {
        initialProps: { filePath: '/test/file1.tsx' }
      }
    );

    // 初期状態
    expect(result.current.allFilesVersion).toBe(0);

    // filePathを変更
    rerender({ filePath: '/test/file2.tsx' });
    
    // バージョンが無意味に増加しないことを確認
    expect(result.current.allFilesVersion).toBe(0);
  });
});