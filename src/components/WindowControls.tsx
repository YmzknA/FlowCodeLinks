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
      <div className="bg-white border-r border-gray-300 w-80 p-4">
        <div className="text-gray-500 text-center">ファイルがありません</div>
      </div>
    );
  }

  return (
    <div className="bg-white border-r border-gray-300 w-80 h-full flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">ファイル管理</h2>
        
        {/* 検索 */}
        <input
          type="text"
          placeholder="ファイル検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        
        {/* ステータス */}
        <div className="mt-2 text-sm text-gray-600">
          表示中: {visibleCount} / {totalCount}
        </div>
      </div>

      {/* 操作ボタン */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex space-x-2 mb-2">
          <button
            onClick={onShowAll}
            className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            全て表示
          </button>
          <button
            onClick={onHideAll}
            className="flex-1 px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
          >
            全て非表示
          </button>
        </div>
        
        <button
          onClick={() => setShowMethods(!showMethods)}
          className="w-full px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
        >
          {showMethods ? 'ファイル表示' : 'メソッド表示'}
        </button>
      </div>

      {/* ファイル一覧 */}
      <div className="flex-1 overflow-y-auto">
        {showMethods ? (
          <div className="p-4">
            <h3 className="font-semibold text-gray-700 mb-2">メソッド一覧</h3>
            {files.flatMap(file => 
              file.methods.map((method, index) => (
                <div key={`${file.path}-${index}`} className="mb-2 p-2 bg-gray-50 rounded">
                  <div className="font-medium text-blue-600">{method.name}</div>
                  <div className="text-xs text-gray-500">{file.fileName}</div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-4">
            {Object.entries(groupedFiles).map(([directory, dirFiles]) => (
              <div key={directory} className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2 text-sm">{directory}</h3>
                {dirFiles.map(file => {
                  const isVisible = visibleFiles.includes(file.path);
                  return (
                    <div key={file.path} className="flex items-center justify-between mb-1 p-2 hover:bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{file.fileName}</div>
                        <div className="text-xs text-gray-500">{file.language}</div>
                      </div>
                      <button
                        onClick={() => onFileToggle(file.path)}
                        aria-label={`${file.path} の表示切り替え`}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          isVisible 
                            ? 'bg-blue-500 border-blue-500 text-white' 
                            : 'bg-white border-gray-300'
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