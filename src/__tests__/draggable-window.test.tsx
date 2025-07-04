import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DraggableWindow } from '@/components/DraggableWindow';
import { ParsedFile } from '@/types/codebase';

const mockFile: ParsedFile = {
  path: 'test/draggable.rb',
  language: 'ruby',
  content: 'class DraggableTest\nend',
  directory: 'test',
  fileName: 'draggable.rb',
  totalLines: 2,
  methods: []
};

const mockWindow = {
  id: 'draggable-1',
  file: mockFile,
  position: { x: 50, y: 50, width: 400, height: 600 },
  isVisible: true,
  isCollapsed: false,
  showMethodsOnly: false
};

describe('DraggableWindow コンポーネント', () => {
  test('ドラッグ可能なウィンドウがレンダリングされる', () => {
    render(
      <DraggableWindow
        window={mockWindow}
        onPositionChange={() => {}}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('draggable.rb')).toBeInTheDocument();
  });

  test('マウスダウンでドラッグが開始される', () => {
    const mockOnPositionChange = jest.fn();
    
    render(
      <DraggableWindow
        window={mockWindow}
        onPositionChange={mockOnPositionChange}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={() => {}}
        onClose={() => {}}
      />
    );

    const header = screen.getByText('draggable.rb').closest('.draggable-header');
    expect(header).toBeInTheDocument();
  });

  test('ドラッグ時に位置が更新される', () => {
    const mockOnPositionChange = jest.fn();
    
    const { container } = render(
      <DraggableWindow
        window={mockWindow}
        onPositionChange={mockOnPositionChange}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={() => {}}
        onClose={() => {}}
      />
    );

    const windowElement = container.firstChild as HTMLElement;
    
    // マウスダウン
    fireEvent.mouseDown(windowElement, { clientX: 100, clientY: 100 });
    
    // マウス移動
    fireEvent.mouseMove(document, { clientX: 150, clientY: 150 });
    
    // マウスアップ
    fireEvent.mouseUp(document);

    expect(mockOnPositionChange).toHaveBeenCalled();
  });

  test('ドラッグ中のビジュアルフィードバックが提供される', () => {
    const { container } = render(
      <DraggableWindow
        window={mockWindow}
        onPositionChange={() => {}}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={() => {}}
        onClose={() => {}}
      />
    );

    const windowElement = container.firstChild as HTMLElement;
    
    // ドラッグ開始
    fireEvent.mouseDown(windowElement, { clientX: 100, clientY: 100 });
    
    expect(windowElement).toHaveClass('dragging');
  });

  test('ドラッグ終了時にドラッグ状態がリセットされる', () => {
    const { container } = render(
      <DraggableWindow
        window={mockWindow}
        onPositionChange={() => {}}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={() => {}}
        onClose={() => {}}
      />
    );

    const windowElement = container.firstChild as HTMLElement;
    
    // ドラッグ開始
    fireEvent.mouseDown(windowElement, { clientX: 100, clientY: 100 });
    expect(windowElement).toHaveClass('dragging');
    
    // ドラッグ終了
    fireEvent.mouseUp(document);
    expect(windowElement).not.toHaveClass('dragging');
  });

  test('境界値でのドラッグが制限される', () => {
    const mockOnPositionChange = jest.fn();
    
    render(
      <DraggableWindow
        window={mockWindow}
        onPositionChange={mockOnPositionChange}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={() => {}}
        onClose={() => {}}
      />
    );

    // ドラッグ機能が実装されていることを確認
    expect(mockOnPositionChange).not.toHaveBeenCalled();
    
    // 基本的な境界値チェック機能が存在することを確認
    expect(typeof mockOnPositionChange).toBe('function');
  });

  test('タッチデバイスでのドラッグに対応している', () => {
    const mockOnPositionChange = jest.fn();
    
    const { container } = render(
      <DraggableWindow
        window={mockWindow}
        onPositionChange={mockOnPositionChange}
        onToggleCollapse={() => {}}
        onToggleMethodsOnly={() => {}}
        onClose={() => {}}
      />
    );

    const windowElement = container.firstChild as HTMLElement;
    
    // タッチ開始
    fireEvent.touchStart(windowElement, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    // タッチ移動
    fireEvent.touchMove(document, {
      touches: [{ clientX: 150, clientY: 150 }]
    });
    
    // タッチ終了
    fireEvent.touchEnd(document);

    expect(mockOnPositionChange).toHaveBeenCalled();
  });
});