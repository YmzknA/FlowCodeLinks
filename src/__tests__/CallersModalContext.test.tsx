import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { 
  CallersModalProvider, 
  useCallersModal 
} from '@/contexts/CallersModalContext';

// テスト用のコンポーネント
const TestComponent: React.FC = () => {
  const { state, openModal, closeModal, toggleShowOpenWindowsOnly } = useCallersModal();

  const mockCallers = [
    { methodName: 'caller1', filePath: 'test/file1.rb', lineNumber: 10 },
    { methodName: 'caller2', filePath: 'test/file2.rb', lineNumber: 20 }
  ];

  return (
    <div>
      <div data-testid="modal-open">{state.isOpen ? 'open' : 'closed'}</div>
      <div data-testid="show-open-only">{state.showOpenWindowsOnly ? 'true' : 'false'}</div>
      <div data-testid="method-name">{state.methodName || 'none'}</div>
      <div data-testid="callers-count">{state.callers.length}</div>
      <button onClick={() => openModal('testMethod', mockCallers)}>
        Open Modal
      </button>
      <button onClick={closeModal}>
        Close Modal
      </button>
      <button onClick={toggleShowOpenWindowsOnly}>
        Toggle Filter
      </button>
    </div>
  );
};

const TestComponentWithoutProvider: React.FC = () => {
  const { state } = useCallersModal();
  return <div>{state.isOpen ? 'open' : 'closed'}</div>;
};

describe('CallersModalContext', () => {
  test('プロバイダーが初期状態を正しく提供する', () => {
    render(
      <CallersModalProvider>
        <TestComponent />
      </CallersModalProvider>
    );

    expect(screen.getByTestId('modal-open')).toHaveTextContent('closed');
    expect(screen.getByTestId('show-open-only')).toHaveTextContent('true'); // 初期値はtrue
    expect(screen.getByTestId('method-name')).toHaveTextContent('none');
    expect(screen.getByTestId('callers-count')).toHaveTextContent('0');
  });

  test('openModalが正しく動作する', () => {
    render(
      <CallersModalProvider>
        <TestComponent />
      </CallersModalProvider>
    );

    const openButton = screen.getByText('Open Modal');
    
    act(() => {
      openButton.click();
    });

    expect(screen.getByTestId('modal-open')).toHaveTextContent('open');
    expect(screen.getByTestId('method-name')).toHaveTextContent('testMethod');
    expect(screen.getByTestId('callers-count')).toHaveTextContent('2');
  });

  test('closeModalが正しく動作する', () => {
    render(
      <CallersModalProvider>
        <TestComponent />
      </CallersModalProvider>
    );

    const openButton = screen.getByText('Open Modal');
    const closeButton = screen.getByText('Close Modal');
    
    // まずモーダルを開く
    act(() => {
      openButton.click();
    });

    expect(screen.getByTestId('modal-open')).toHaveTextContent('open');

    // モーダルを閉じる
    act(() => {
      closeButton.click();
    });

    expect(screen.getByTestId('modal-open')).toHaveTextContent('closed');
    expect(screen.getByTestId('method-name')).toHaveTextContent('none');
    expect(screen.getByTestId('callers-count')).toHaveTextContent('0');
  });

  test('toggleShowOpenWindowsOnlyが正しく動作する', () => {
    render(
      <CallersModalProvider>
        <TestComponent />
      </CallersModalProvider>
    );

    const toggleButton = screen.getByText('Toggle Filter');
    
    // 初期値はtrue
    expect(screen.getByTestId('show-open-only')).toHaveTextContent('true');

    act(() => {
      toggleButton.click();
    });

    expect(screen.getByTestId('show-open-only')).toHaveTextContent('false');

    act(() => {
      toggleButton.click();
    });

    expect(screen.getByTestId('show-open-only')).toHaveTextContent('true');
  });

  test('複数の操作を組み合わせて動作する', () => {
    render(
      <CallersModalProvider>
        <TestComponent />
      </CallersModalProvider>
    );

    const openButton = screen.getByText('Open Modal');
    const toggleButton = screen.getByText('Toggle Filter');
    
    // フィルターを無効にしてからモーダルを開く
    act(() => {
      toggleButton.click(); // true -> false
    });
    
    act(() => {
      openButton.click(); // openModalでshowOpenWindowsOnlyがtrueに上書きされる
    });

    expect(screen.getByTestId('modal-open')).toHaveTextContent('open');
    expect(screen.getByTestId('show-open-only')).toHaveTextContent('true'); // openModalでtrueに設定される
    expect(screen.getByTestId('method-name')).toHaveTextContent('testMethod');
  });

  test('異なるメソッドで複数回モーダルを開く', () => {
    const MultipleTestComponent: React.FC = () => {
      const { state, openModal } = useCallersModal();

      const callers1 = [{ methodName: 'caller1', filePath: 'file1.rb' }];
      const callers2 = [{ methodName: 'caller2', filePath: 'file2.rb' }];

      return (
        <div>
          <div data-testid="method-name">{state.methodName || 'none'}</div>
          <div data-testid="callers-count">{state.callers.length}</div>
          <button onClick={() => openModal('method1', callers1)}>
            Open Method1
          </button>
          <button onClick={() => openModal('method2', callers2)}>
            Open Method2
          </button>
        </div>
      );
    };

    render(
      <CallersModalProvider>
        <MultipleTestComponent />
      </CallersModalProvider>
    );

    // 最初のメソッド
    act(() => {
      screen.getByText('Open Method1').click();
    });
    expect(screen.getByTestId('method-name')).toHaveTextContent('method1');
    expect(screen.getByTestId('callers-count')).toHaveTextContent('1');

    // 2番目のメソッド
    act(() => {
      screen.getByText('Open Method2').click();
    });
    expect(screen.getByTestId('method-name')).toHaveTextContent('method2');
    expect(screen.getByTestId('callers-count')).toHaveTextContent('1');
  });

  test('プロバイダーなしでuseCallersModalを使用するとエラーになる', () => {
    // エラーをキャッチするためにconsole.errorをモック
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponentWithoutProvider />);
    }).toThrow('useCallersModal must be used within a CallersModalProvider');

    consoleSpy.mockRestore();
  });

  test('カスタムフックが正しい型を返す', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CallersModalProvider>{children}</CallersModalProvider>
    );

    const { result } = renderHook(() => useCallersModal(), { wrapper });

    expect(typeof result.current.state).toBe('object');
    expect(typeof result.current.openModal).toBe('function');
    expect(typeof result.current.closeModal).toBe('function');
    expect(typeof result.current.toggleShowOpenWindowsOnly).toBe('function');

    // state の型を確認
    expect(typeof result.current.state.isOpen).toBe('boolean');
    expect(typeof result.current.state.showOpenWindowsOnly).toBe('boolean');
    expect(result.current.state.methodName === null || typeof result.current.state.methodName === 'string').toBe(true);
    expect(Array.isArray(result.current.state.callers)).toBe(true);
  });

  test('openModalに空の値を渡した場合の動作', () => {
    const TestComponentEmpty: React.FC = () => {
      const { state, openModal } = useCallersModal();
      return (
        <div>
          <div data-testid="modal-open">{state.isOpen ? 'open' : 'closed'}</div>
          <div data-testid="method-name">{state.methodName || 'none'}</div>
          <div data-testid="callers-count">{state.callers.length}</div>
          <button onClick={() => openModal('', [])}>
            Open Empty
          </button>
        </div>
      );
    };

    render(
      <CallersModalProvider>
        <TestComponentEmpty />
      </CallersModalProvider>
    );

    act(() => {
      screen.getByText('Open Empty').click();
    });

    expect(screen.getByTestId('modal-open')).toHaveTextContent('open');
    expect(screen.getByTestId('method-name')).toHaveTextContent('none'); // 空文字は'none'として表示される
    expect(screen.getByTestId('callers-count')).toHaveTextContent('0');
  });
});