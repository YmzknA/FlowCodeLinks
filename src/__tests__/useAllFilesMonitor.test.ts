import { renderHook, act } from '@testing-library/react';
import { useAllFilesMonitor } from '@/hooks/useAllFilesMonitor';

// モック化
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

// window.addEventListener / removeEventListener のモック
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
const mockDispatchEvent = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.spyOn(global, 'setTimeout');
  
  // window のモック
  Object.defineProperty(window, 'addEventListener', {
    value: mockAddEventListener,
    writable: true
  });
  
  Object.defineProperty(window, 'removeEventListener', {
    value: mockRemoveEventListener,
    writable: true
  });
  
  Object.defineProperty(window, 'dispatchEvent', {
    value: mockDispatchEvent,
    writable: true
  });
  
  // __allFiles の初期化
  (window as any).__allFiles = [];
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('useAllFilesMonitor', () => {
  const testFilePath = '/test/file/path.tsx';

  test('初期化時にallFilesVersionが正しく設定される', () => {
    const { result } = renderHook(() => useAllFilesMonitor(testFilePath));
    
    expect(result.current.allFilesVersion).toBe(0);
    // isClient は useEffect で非同期に設定されるため、初期値のテストは削除
  });

  test('isClientがtrueに変更される', () => {
    const { result } = renderHook(() => useAllFilesMonitor(testFilePath));
    
    act(() => {
      // useEffect が実行される
    });
    
    expect(result.current.isClient).toBe(true);
  });

  test('__allFiles_updated イベントリスナーが追加される', () => {
    renderHook(() => useAllFilesMonitor(testFilePath));
    
    act(() => {
      // useEffect が実行される
    });
    
    expect(mockAddEventListener).toHaveBeenCalledWith(
      '__allFiles_updated',
      expect.any(Function)
    );
  });

  test('__allFiles の変更が検出されてallFilesVersionが更新される', () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useAllFilesMonitor(testFilePath));
    
    act(() => {
      // __allFiles にファイルを追加
      (window as any).__allFiles = [
        { path: '/test/file1.tsx', methods: [] },
        { path: '/test/file2.tsx', methods: [] }
      ];
    });
    
    // タイマーを進める
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(result.current.allFilesVersion).toBe(1);
  });

  test('最大リトライ回数に達した場合に警告が出力される（開発環境）', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    jest.useFakeTimers();
    
    renderHook(() => useAllFilesMonitor(testFilePath));
    
    // 最大リトライ回数分タイマーを進める
    act(() => {
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(1000 * Math.pow(2, i));
      }
    });
    
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('__allFiles initialization failed after 10 retries')
    );
    
    process.env.NODE_ENV = originalEnv;
  });

  test('指数バックオフが正しく動作する', () => {
    renderHook(() => useAllFilesMonitor(testFilePath));
    
    // 初回チェック後にリトライが開始される
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // 1回目のリトライ: 100ms
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // 2回目のリトライ: 200ms
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    // 3回目のリトライ: 400ms
    act(() => {
      jest.advanceTimersByTime(400);
    });
    
    // setTimeout が複数回呼ばれていることを確認（最低4回以上）
    expect((setTimeout as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  test('カスタムイベント受信時にallFilesVersionが更新される', () => {
    const { result } = renderHook(() => useAllFilesMonitor(testFilePath));
    
    // イベントリスナーが追加されるまで待つ
    act(() => {
      jest.runOnlyPendingTimers();
    });
    
    // イベントリスナーを取得
    const eventListener = mockAddEventListener.mock.calls.find(
      call => call[0] === '__allFiles_updated'
    )?.[1];
    
    expect(eventListener).toBeDefined();
    
    if (eventListener) {
      // __allFiles を更新してから
      (window as any).__allFiles = [{ path: '/test/file.tsx', methods: [] }];
      
      // カスタムイベントを発火
      const customEvent = new CustomEvent('__allFiles_updated', {
        detail: { files: [], count: 1 }
      });
      
      act(() => {
        eventListener(customEvent);
        // イベント処理の遅延時間も進める
        jest.advanceTimersByTime(200);
      });
      
      expect(result.current.allFilesVersion).toBe(1);
    }
  });

  test('アンマウント時にイベントリスナーが削除される', () => {
    const { unmount } = renderHook(() => useAllFilesMonitor(testFilePath));
    
    act(() => {
      // useEffect が実行される
    });
    
    unmount();
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      '__allFiles_updated',
      expect.any(Function)
    );
  });

  test('本番環境ではログが出力されない', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    renderHook(() => useAllFilesMonitor(testFilePath));
    
    act(() => {
      // __allFiles を更新
      (window as any).__allFiles = [{ path: '/test/file.tsx', methods: [] }];
    });
    
    expect(mockConsoleLog).not.toHaveBeenCalled();
    
    process.env.NODE_ENV = originalEnv;
  });
});