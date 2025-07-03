import React, { useEffect, useRef, useState } from 'react';
import { FloatingWindow as FloatingWindowType } from '@/types/codebase';

interface FloatingWindowProps {
  window: FloatingWindowType;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  onToggleCollapse: (id: string) => void;
  onToggleMethodsOnly: (id: string) => void;
  onClose: (id: string) => void;
}

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  window,
  onPositionChange,
  onToggleCollapse,
  onToggleMethodsOnly,
  onClose
}) => {
  console.log('FloatingWindow render:', { 
    id: window.id, 
    isVisible: window.isVisible,
    fileName: window.file.fileName,
    language: window.file.language
  });

  if (!window.isVisible) {
    console.log('FloatingWindow not visible, skipping render');
    return null;
  }

  const { id, file, position, isCollapsed, showMethodsOnly } = window;

  const handleToggleCollapse = () => {
    onToggleCollapse(id);
  };

  const handleToggleMethodsOnly = () => {
    onToggleMethodsOnly(id);
  };

  const handleClose = () => {
    onClose(id);
  };

  const [highlightedCode, setHighlightedCode] = useState<string>('');

  // 言語に応じたPrismの言語識別子を取得
  const getPrismLanguage = (language: string): string => {
    switch (language) {
      case 'ruby':
        return 'ruby';
      case 'javascript':
        return 'javascript';
      case 'typescript':
        return 'typescript';
      default:
        return 'text';
    }
  };

  // シンタックスハイライトを適用
  useEffect(() => {
    const highlightCode = async () => {
      // クライアントサイドでのみ実行
      if (typeof window === 'undefined') {
        setHighlightedCode(file.content || '');
        return;
      }

      if (file.content && !isCollapsed && !showMethodsOnly) {
        console.log('Starting highlight process for:', file.language);
        
        try {
          // 動的にPrism.jsをロード
          let Prism = (window as any).Prism;
          
          if (!Prism) {
            console.log('Loading Prism.js dynamically...');
            // Prism.jsをロード
            Prism = (await import('prismjs')).default;
            
            // 必要な言語をロード
            const language = getPrismLanguage(file.language);
            if (language === 'ruby') {
              await import('prismjs/components/prism-ruby' as any);
            } else if (language === 'javascript') {
              await import('prismjs/components/prism-javascript' as any);
            } else if (language === 'typescript') {
              await import('prismjs/components/prism-typescript' as any);
            }
            
            (window as any).Prism = Prism;
          }

          const language = getPrismLanguage(file.language);
          console.log('Available languages:', Object.keys(Prism.languages || {}));
          console.log('Requested language:', language);
          
          const grammar = Prism.languages && Prism.languages[language];
          
          if (grammar) {
            try {
              // Prism.highlightでHTMLを生成
              const highlighted = Prism.highlight(file.content, grammar, language);
              setHighlightedCode(highlighted);
              console.log('Code highlighted successfully');
            } catch (error) {
              console.error('Prism highlight error:', error);
              setHighlightedCode(file.content);
            }
          } else {
            console.warn(`Prism language not found: ${language}. Available:`, Object.keys(Prism.languages || {}));
            setHighlightedCode(file.content);
          }
        } catch (error) {
          console.error('Failed to load Prism.js:', error);
          setHighlightedCode(file.content);
        }
      } else {
        // コンテンツがない場合は空文字列をセット
        setHighlightedCode('');
      }
    };

    highlightCode();
  }, [file.content, isCollapsed, showMethodsOnly, file.language]);

  const renderContent = () => {
    if (isCollapsed) {
      return null;
    }

    if (showMethodsOnly) {
      return (
        <div className="p-4 overflow-auto max-h-96">
          {file.methods.map((method, index) => (
            <div key={index} className="mb-2 p-2 bg-gray-100 rounded">
              <div className="font-semibold text-blue-600">{method.name}</div>
              <div className="text-sm text-gray-600">{method.type}</div>
            </div>
          ))}
        </div>
      );
    }

    const prismLanguage = getPrismLanguage(file.language);

    return (
      <div className="p-4 overflow-auto max-h-96">
        <pre 
          className={`language-${prismLanguage} text-sm p-3 rounded overflow-auto`}
          style={{ 
            whiteSpace: 'pre', 
            tabSize: 2,
            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
            backgroundColor: '#2d2d2d',
            color: '#ccc'
          }}
        >
          <code 
            className={`language-${prismLanguage}`}
            style={{ 
              whiteSpace: 'pre',
              display: 'block'
            }}
            dangerouslySetInnerHTML={{ 
              __html: highlightedCode || file.content
            }}
          />
        </pre>
      </div>
    );
  };

  return (
    <div
      className="absolute bg-white border border-gray-300 rounded-lg shadow-lg"
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        height: isCollapsed ? 'auto' : position.height,
        zIndex: 10
      }}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
        <div>
          <div className="font-semibold text-gray-800">{file.fileName}</div>
          <div className="text-xs text-gray-500">{file.path} ({file.totalLines} lines)</div>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={handleToggleMethodsOnly}
            aria-label="メソッドのみ表示"
            className="p-1 text-gray-600 hover:text-blue-600 text-sm"
          >
            M
          </button>
          <button
            onClick={handleToggleCollapse}
            aria-label="折りたたみ"
            className="p-1 text-gray-600 hover:text-blue-600 text-sm"
          >
            {isCollapsed ? '□' : '_'}
          </button>
          <button
            onClick={handleClose}
            aria-label="閉じる"
            className="p-1 text-gray-600 hover:text-red-600 text-sm"
          >
            ×
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      {renderContent()}
    </div>
  );
};