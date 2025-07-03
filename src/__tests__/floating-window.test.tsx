import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FloatingWindow } from '@/components/FloatingWindow';
import { ParsedFile } from '@/types/codebase';

// モックデータ
const mockFile: ParsedFile = {
  path: 'test/example.rb',
  language: 'ruby',
  content: `class Example
  def hello
    puts "Hello World"
  end
end`,
  directory: 'test',
  fileName: 'example.rb',
  methods: [
    {
      name: 'hello',
      type: 'method',
      startLine: 2,
      endLine: 4,
      filePath: 'test/example.rb',
      code: '  def hello\n    puts "Hello World"\n  end',
      calls: [],
      isPrivate: false,
      parameters: []
    }
  ]
};

const mockWindowData = {
  id: 'window-1',
  file: mockFile,
  position: { x: 100, y: 100, width: 400, height: 600 },
  isVisible: true,
  isCollapsed: false,
  showMethodsOnly: false
};

describe('FloatingWindow コンポーネント', () => {
  test('ウィンドウが正しくレンダリングされる', async () => {
    await act(async () => {
      render(
        <FloatingWindow
          window={mockWindowData}
          onPositionChange={() => {}}
          onToggleCollapse={() => {}}
          onToggleMethodsOnly={() => {}}
          onClose={() => {}}
        />
      );
    });

    expect(screen.getByText('example.rb')).toBeInTheDocument();
    await waitFor(() => {
      // シンタックスハイライトにより、classとExampleが別々のspan要素に分かれるため
      expect(screen.getByText('class')).toBeInTheDocument();
      expect(screen.getByText('Example')).toBeInTheDocument();
    });
  });

  test('ファイルパスが正しく表示される', async () => {
    await act(async () => {
      render(
        <FloatingWindow
          window={mockWindowData}
          onPositionChange={() => {}}
          onToggleCollapse={() => {}}
          onToggleMethodsOnly={() => {}}
          onClose={() => {}}
        />
      );
    });

    // 実際の表示内容に合わせて修正（" ( lines)"が含まれることを考慮）
    await waitFor(() => {
      expect(screen.getByText(/test\/example\.rb/)).toBeInTheDocument();
    });
  });

  test('折りたたみボタンをクリックできる', async () => {
    const mockToggleCollapse = jest.fn();
    
    await act(async () => {
      render(
        <FloatingWindow
          window={mockWindowData}
          onPositionChange={() => {}}
          onToggleCollapse={mockToggleCollapse}
          onToggleMethodsOnly={() => {}}
          onClose={() => {}}
        />
      );
    });

    const collapseButton = screen.getByLabelText('折りたたみ');
    fireEvent.click(collapseButton);
    
    expect(mockToggleCollapse).toHaveBeenCalledWith('window-1');
  });

  test('メソッド表示切り替えボタンをクリックできる', async () => {
    const mockToggleMethodsOnly = jest.fn();
    
    await act(async () => {
      render(
        <FloatingWindow
          window={mockWindowData}
          onPositionChange={() => {}}
          onToggleCollapse={() => {}}
          onToggleMethodsOnly={mockToggleMethodsOnly}
          onClose={() => {}}
        />
      );
    });

    const methodsButton = screen.getByLabelText('メソッドのみ表示');
    fireEvent.click(methodsButton);
    
    expect(mockToggleMethodsOnly).toHaveBeenCalledWith('window-1');
  });

  test('閉じるボタンをクリックできる', async () => {
    const mockClose = jest.fn();
    
    await act(async () => {
      render(
        <FloatingWindow
          window={mockWindowData}
          onPositionChange={() => {}}
          onToggleCollapse={() => {}}
          onToggleMethodsOnly={() => {}}
          onClose={mockClose}
        />
      );
    });

    const closeButton = screen.getByLabelText('閉じる');
    fireEvent.click(closeButton);
    
    expect(mockClose).toHaveBeenCalledWith('window-1');
  });

  test('折りたたみ状態では内容が表示されない', async () => {
    const collapsedWindow = {
      ...mockWindowData,
      isCollapsed: true
    };

    await act(async () => {
      render(
        <FloatingWindow
          window={collapsedWindow}
          onPositionChange={() => {}}
          onToggleCollapse={() => {}}
          onToggleMethodsOnly={() => {}}
          onClose={() => {}}
        />
      );
    });

    expect(screen.getByText('example.rb')).toBeInTheDocument();
    // 折りたたみ状態では内容が表示されないため、classもExampleも表示されない
    expect(screen.queryByText('class')).not.toBeInTheDocument();
    expect(screen.queryByText('Example')).not.toBeInTheDocument();
  });

  test('メソッドのみ表示モードではメソッドのみ表示される', async () => {
    const methodsOnlyWindow = {
      ...mockWindowData,
      showMethodsOnly: true
    };

    await act(async () => {
      render(
        <FloatingWindow
          window={methodsOnlyWindow}
          onPositionChange={() => {}}
          onToggleCollapse={() => {}}
          onToggleMethodsOnly={() => {}}
          onClose={() => {}}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('hello')).toBeInTheDocument();
    });
    // メソッドのみ表示モードでは、class定義は表示されない
    expect(screen.queryByText('class')).not.toBeInTheDocument();
    expect(screen.queryByText('Example')).not.toBeInTheDocument();
  });

  test('非表示状態では何も表示されない', async () => {
    const hiddenWindow = {
      ...mockWindowData,
      isVisible: false
    };

    let container: any;
    await act(async () => {
      const result = render(
        <FloatingWindow
          window={hiddenWindow}
          onPositionChange={() => {}}
          onToggleCollapse={() => {}}
          onToggleMethodsOnly={() => {}}
          onClose={() => {}}
        />
      );
      container = result.container;
    });

    expect(container.firstChild).toBeNull();
  });
});