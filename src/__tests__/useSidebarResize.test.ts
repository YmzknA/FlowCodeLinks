import { renderHook, act } from '@testing-library/react';
import { useSidebarResize } from '@/hooks/useSidebarResize';

// マウスイベントのモック
const createMouseEvent = (type: string, clientX: number) => {
  return new MouseEvent(type, {
    clientX,
    bubbles: true,
    cancelable: true
  });
};

describe('useSidebarResize hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useSidebarResize(320));

    expect(result.current.sidebarWidth).toBe(320);
    expect(typeof result.current.handleMouseDown).toBe('function');
  });

  test('カスタム初期幅が設定される', () => {
    const { result } = renderHook(() => useSidebarResize(250));

    expect(result.current.sidebarWidth).toBe(250);
  });

  test('マウスダウンでリサイズが開始される', () => {
    const { result } = renderHook(() => useSidebarResize(320));

    act(() => {
      result.current.handleMouseDown();
    });

    // リサイズ状態になることを確認（内部状態なので直接確認はできないが、後続のテストで確認）
    expect(typeof result.current.handleMouseDown).toBe('function');
  });

  test('マウス移動でサイドバー幅が変更される', () => {
    const { result } = renderHook(() => useSidebarResize(320));

    // リサイズ開始
    act(() => {
      result.current.handleMouseDown();
    });

    // マウス移動イベントをシミュレート
    act(() => {
      const mouseMoveEvent = createMouseEvent('mousemove', 400);
      document.dispatchEvent(mouseMoveEvent);
    });

    expect(result.current.sidebarWidth).toBe(400);
  });

  test('最小幅制限が機能する', () => {
    const { result } = renderHook(() => useSidebarResize(320));

    // リサイズ開始
    act(() => {
      result.current.handleMouseDown();
    });

    // 最小幅(200px)以下に移動
    act(() => {
      const mouseMoveEvent = createMouseEvent('mousemove', 150);
      document.dispatchEvent(mouseMoveEvent);
    });

    expect(result.current.sidebarWidth).toBe(200);
  });

  test('最大幅制限が機能する', () => {
    const { result } = renderHook(() => useSidebarResize(320));

    // リサイズ開始
    act(() => {
      result.current.handleMouseDown();
    });

    // 最大幅(600px)以上に移動
    act(() => {
      const mouseMoveEvent = createMouseEvent('mousemove', 700);
      document.dispatchEvent(mouseMoveEvent);
    });

    expect(result.current.sidebarWidth).toBe(600);
  });

  test('マウスアップでリサイズが終了する', () => {
    const { result } = renderHook(() => useSidebarResize(320));

    // リサイズ開始
    act(() => {
      result.current.handleMouseDown();
    });

    // マウス移動
    act(() => {
      const mouseMoveEvent = createMouseEvent('mousemove', 400);
      document.dispatchEvent(mouseMoveEvent);
    });

    // マウスアップでリサイズ終了
    act(() => {
      const mouseUpEvent = createMouseEvent('mouseup', 400);
      document.dispatchEvent(mouseUpEvent);
    });

    // リサイズ終了後もマウス移動では幅が変更されない
    act(() => {
      const mouseMoveEvent = createMouseEvent('mousemove', 500);
      document.dispatchEvent(mouseMoveEvent);
    });

    expect(result.current.sidebarWidth).toBe(400); // 500ではなく400のまま
  });

  test('複数回のリサイズ操作が正しく動作する', () => {
    const { result } = renderHook(() => useSidebarResize(320));

    // 1回目のリサイズ
    act(() => {
      result.current.handleMouseDown();
    });

    act(() => {
      const mouseMoveEvent = createMouseEvent('mousemove', 350);
      document.dispatchEvent(mouseMoveEvent);
    });

    act(() => {
      const mouseUpEvent = createMouseEvent('mouseup', 350);
      document.dispatchEvent(mouseUpEvent);
    });

    expect(result.current.sidebarWidth).toBe(350);

    // 2回目のリサイズ
    act(() => {
      result.current.handleMouseDown();
    });

    act(() => {
      const mouseMoveEvent = createMouseEvent('mousemove', 280);
      document.dispatchEvent(mouseMoveEvent);
    });

    act(() => {
      const mouseUpEvent = createMouseEvent('mouseup', 280);
      document.dispatchEvent(mouseUpEvent);
    });

    expect(result.current.sidebarWidth).toBe(280);
  });

  test('コンポーネントアンマウント時にイベントリスナーがクリーンアップされる', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    
    const { result, unmount } = renderHook(() => useSidebarResize(320));

    // リサイズ開始してイベントリスナーを追加
    act(() => {
      result.current.handleMouseDown();
    });

    // アンマウント
    unmount();

    // removeEventListenerが呼ばれることを確認
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  test('異常な値でも正常に動作する', () => {
    // 負の値
    const { result: result1 } = renderHook(() => useSidebarResize(-100));
    expect(result1.current.sidebarWidth).toBe(-100); // 初期値はそのまま設定される

    // 極端に大きい値
    const { result: result2 } = renderHook(() => useSidebarResize(10000));
    expect(result2.current.sidebarWidth).toBe(10000);

    // リサイズ時の制限は適用される
    act(() => {
      result2.current.handleMouseDown();
    });

    act(() => {
      const mouseMoveEvent = createMouseEvent('mousemove', 100);
      document.dispatchEvent(mouseMoveEvent);
    });

    expect(result2.current.sidebarWidth).toBe(200); // 最小値に制限される
  });
});