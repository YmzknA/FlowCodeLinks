import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
  test('ウィンドウが正しくレンダリングされる', () => {
    render(
      <FloatingWindow
        window={mockWindowData}
        onPositionChange={() => {}}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('example.rb')).toBeInTheDocument();
    expect(screen.getByText(/class Example/)).toBeInTheDocument();
  });

  test('ファイルパスが正しく表示される', () => {
    render(
      <FloatingWindow
        window={mockWindowData}
        onPositionChange={() => {}}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('test/example.rb')).toBeInTheDocument();
  });

  test('折りたたみボタンをクリックできる', () => {
    const mockToggleCollapse = jest.fn();
    
    render(
      <FloatingWindow
        window={mockWindowData}
        onPositionChange={() => {}}
        onToggleCollapse={mockToggleCollapse}
        onToggleMethodsOnly={() => {}}
        onClose={() => {}}
      />
    );

    const collapseButton = screen.getByLabelText('折りたたみ');
    fireEvent.click(collapseButton);
    
    expect(mockToggleCollapse).toHaveBeenCalledWith('window-1');
  });

  test('メソッド表示切り替えボタンをクリックできる', () => {
    const mockToggleMethodsOnly = jest.fn();
    
    render(
      <FloatingWindow
        window={mockWindowData}
        onPositionChange={() => {}}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={mockToggleMethodsOnly}
        onClose={() => {}}
      />
    );

    const methodsButton = screen.getByLabelText('メソッドのみ表示');
    fireEvent.click(methodsButton);
    
    expect(mockToggleMethodsOnly).toHaveBeenCalledWith('window-1');
  });

  test('閉じるボタンをクリックできる', () => {
    const mockClose = jest.fn();
    
    render(
      <FloatingWindow
        window={mockWindowData}
        onPositionChange={() => {}}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={() => {}}
        onClose={mockClose}
      />
    );

    const closeButton = screen.getByLabelText('閉じる');
    fireEvent.click(closeButton);
    
    expect(mockClose).toHaveBeenCalledWith('window-1');
  });

  test('折りたたみ状態では内容が表示されない', () => {
    const collapsedWindow = {
      ...mockWindowData,
      isCollapsed: true
    };

    render(
      <FloatingWindow
        window={collapsedWindow}
        onPositionChange={() => {}}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('example.rb')).toBeInTheDocument();
    expect(screen.queryByText(/class Example/)).not.toBeInTheDocument();
  });

  test('メソッドのみ表示モードではメソッドのみ表示される', () => {
    const methodsOnlyWindow = {
      ...mockWindowData,
      showMethodsOnly: true
    };

    render(
      <FloatingWindow
        window={methodsOnlyWindow}
        onPositionChange={() => {}}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.queryByText(/class Example/)).not.toBeInTheDocument();
  });

  test('非表示状態では何も表示されない', () => {
    const hiddenWindow = {
      ...mockWindowData,
      isVisible: false
    };

    const { container } = render(
      <FloatingWindow
        window={hiddenWindow}
        onPositionChange={() => {}}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={() => {}}
        onClose={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});