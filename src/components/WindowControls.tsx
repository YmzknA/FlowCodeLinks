import React, { useState, useMemo } from 'react';
import { ParsedFile } from '@/types/codebase';

interface WindowControlsProps {
  files: ParsedFile[];
  visibleFiles: string[];
  onFileToggle: (filePath: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

export const WindowControls: React.FC<WindowControlsProps> = ({
  files,
  visibleFiles,
  onFileToggle,
  onShowAll,
  onHideAll
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showMethods, setShowMethods] = useState(false);

  const filteredFiles = useMemo(() => {
    return files.filter(file => 
      file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.path.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  const groupedFiles = useMemo(() => {
    const groups: { [directory: string]: ParsedFile[] } = {};
    
    filteredFiles.forEach(file => {
      const directory = file.directory || 'root';
      if (!groups[directory]) {
        groups[directory] = [];
      }
      groups[directory].push(file);
    });
    
    return groups;
  }, [filteredFiles]);

  const visibleCount = visibleFiles.length;
  const totalCount = files.length;

  if (files.length === 0) {
    return (
      <div className="bg-base-100 border-r border-base-300 w-80 p-4">
        <div className="text-base-content/60 text-center">ファイルがありません</div>
      </div>
    );
  }

  return (
    <div className="bg-base-100 border-r border-base-300 w-80 h-full flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-base-300">
        <h2 className="text-lg font-semibold text-base-content mb-2">ファイル管理</h2>
        
        {/* 検索 */}
        <input
          type="text"
          placeholder="ファイル検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input input-bordered input-sm w-full"
        />
        
        {/* ステータス */}
        <div className="mt-2 text-sm text-base-content/60">
          表示中: {visibleCount} / {totalCount}
        </div>
      </div>

      {/* 操作ボタン */}
      <div className="p-4 border-b border-base-300">
        <div className="flex space-x-2 mb-2">
          <button
            onClick={onShowAll}
            className="btn btn-primary btn-sm flex-1"
          >
            全て表示
          </button>
          <button
            onClick={onHideAll}
            className="btn btn-secondary btn-sm flex-1"
          >
            全て非表示
          </button>
        </div>
        
        <button
          onClick={() => setShowMethods(!showMethods)}
          className="btn btn-accent btn-sm w-full"
        >
          {showMethods ? 'ファイル表示' : 'メソッド表示'}
        </button>
      </div>

      {/* ファイル一覧 */}
      <div className="flex-1 overflow-y-auto">
        {showMethods ? (
          <div className="p-4">
            <h3 className="font-semibold text-base-content mb-2">メソッド一覧</h3>
            {files.flatMap(file => 
              file.methods.map((method, index) => (
                <div key={`${file.path}-${index}`} className="mb-2 p-2 bg-base-200 rounded">
                  <div className="font-medium text-primary">{method.name}</div>
                  <div className="text-xs text-base-content/60">{file.fileName}</div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-4">
            {Object.entries(groupedFiles).map(([directory, dirFiles]) => (
              <div key={directory} className="mb-4">
                <h3 className="font-semibold text-base-content mb-2 text-sm">{directory}</h3>
                {dirFiles.map(file => {
                  const isVisible = visibleFiles.includes(file.path);
                  return (
                    <div key={file.path} className="flex items-center justify-between mb-1 p-2 hover:bg-base-200 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-base-content">{file.fileName}</div>
                        <div className="text-xs text-base-content/60">{file.language}</div>
                      </div>
                      <button
                        onClick={() => onFileToggle(file.path)}
                        aria-label={`${file.path} の表示切り替え`}
                        className={`btn btn-xs btn-circle ${
                          isVisible 
                            ? 'btn-primary' 
                            : 'btn-ghost'
                        }`}
                      >
                        {isVisible && '✓'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};