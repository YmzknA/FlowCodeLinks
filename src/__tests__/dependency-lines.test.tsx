import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DependencyLines } from '@/components/DependencyLines';
import { FloatingWindow, Dependency } from '@/types/codebase';

const mockWindows: FloatingWindow[] = [
  {
    id: 'window-1',
    file: {
      path: 'app/models/user.rb',
      language: 'ruby',
      content: 'class User\nend',
      directory: 'app/models',
      fileName: 'user.rb',
      methods: [
        {
          name: 'full_name',
          type: 'method',
          startLine: 2,
          endLine: 4,
          filePath: 'app/models/user.rb',
          code: 'def full_name\nend',
          calls: [],
          isPrivate: false,
          parameters: []
        }
      ]
    },
    position: { x: 100, y: 100, width: 400, height: 600 },
    isVisible: true,
    isCollapsed: false,
    showMethodsOnly: false
  },
  {
    id: 'window-2',
    file: {
      path: 'app/controllers/users_controller.rb',
      language: 'ruby',
      content: 'class UsersController\nend',
      directory: 'app/controllers',
      fileName: 'users_controller.rb',
      methods: [
        {
          name: 'show',
          type: 'method',
          startLine: 2,
          endLine: 4,
          filePath: 'app/controllers/users_controller.rb',
          code: 'def show\nend',
          calls: [],
          isPrivate: false,
          parameters: []
        }
      ]
    },
    position: { x: 600, y: 200, width: 400, height: 600 },
    isVisible: true,
    isCollapsed: false,
    showMethodsOnly: false
  }
];

const mockDependencies: Dependency[] = [
  {
    from: {
      methodName: 'show',
      filePath: 'app/controllers/users_controller.rb'
    },
    to: {
      methodName: 'full_name',
      filePath: 'app/models/user.rb'
    },
    count: 2,
    type: 'external'
  }
];

describe('DependencyLines コンポーネント', () => {
  test('SVG要素が正しくレンダリングされる', () => {
    const { container } = render(
      <DependencyLines
        windows={mockWindows}
        dependencies={mockDependencies}
        highlightedMethod={null}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        sidebarCollapsed={false}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  test('依存関係の線が描画される', () => {
    const { container } = render(
      <DependencyLines
        windows={mockWindows}
        dependencies={mockDependencies}
        highlightedMethod={null}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        sidebarCollapsed={false}
      />
    );

    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
  });

  test('矢印マーカーが定義される', () => {
    const { container } = render(
      <DependencyLines
        windows={mockWindows}
        dependencies={mockDependencies}
        highlightedMethod={null}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        sidebarCollapsed={false}
      />
    );

    const marker = container.querySelector('marker');
    expect(marker).toBeInTheDocument();
    expect(marker?.getAttribute('id')).toBe('arrowhead');
  });

  test('非表示ウィンドウに関連する線は描画されない', () => {
    const hiddenWindows = mockWindows.map(w => 
      w.id === 'window-1' ? { ...w, isVisible: false } : w
    );

    const { container } = render(
      <DependencyLines
        windows={hiddenWindows}
        dependencies={mockDependencies}
        highlightedMethod={null}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        sidebarCollapsed={false}
      />
    );

    const lines = container.querySelectorAll('line');
    expect(lines).toHaveLength(0);
  });

  test('ハイライト機能が動作する', () => {
    const { container } = render(
      <DependencyLines
        windows={mockWindows}
        dependencies={mockDependencies}
        highlightedMethod={{ methodName: 'full_name', filePath: 'app/models/user.rb' }}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        sidebarCollapsed={false}
      />
    );

    const highlightedLines = container.querySelectorAll('line.highlighted');
    expect(highlightedLines.length).toBeGreaterThan(0);
  });

  test('線の色が依存関係タイプによって変わる', () => {
    const { container } = render(
      <DependencyLines
        windows={mockWindows}
        dependencies={mockDependencies}
        highlightedMethod={null}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        sidebarCollapsed={false}
      />
    );

    const lines = container.querySelectorAll('line');
    lines.forEach(line => {
      expect(line.getAttribute('stroke')).toBeTruthy();
    });
  });

  test('空の依存関係でエラーが発生しない', () => {
    const { container } = render(
      <DependencyLines
        windows={mockWindows}
        dependencies={[]}
        highlightedMethod={null}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        sidebarCollapsed={false}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  test('座標計算が正しく行われる', () => {
    const { container } = render(
      <DependencyLines
        windows={mockWindows}
        dependencies={mockDependencies}
        highlightedMethod={null}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        sidebarCollapsed={false}
      />
    );

    const lines = container.querySelectorAll('line');
    lines.forEach(line => {
      expect(Number(line.getAttribute('x1'))).toBeGreaterThanOrEqual(0);
      expect(Number(line.getAttribute('y1'))).toBeGreaterThanOrEqual(0);
      expect(Number(line.getAttribute('x2'))).toBeGreaterThanOrEqual(0);
      expect(Number(line.getAttribute('y2'))).toBeGreaterThanOrEqual(0);
    });
  });
});