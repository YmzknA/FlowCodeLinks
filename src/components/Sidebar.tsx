import React, { useState, useMemo } from 'react';
import { ParsedFile, Method } from '@/types/codebase';
import { DirectoryTree } from './DirectoryTree';

interface SidebarProps {
  files: ParsedFile[];
  visibleFiles: string[];
  highlightedMethod: { methodName: string; filePath: string; lineNumber?: number } | null;
  onFileToggle: (filePath: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onMethodHighlight: (method: { methodName: string; filePath: string; lineNumber?: number }) => void;
  onClearHighlight: () => void;
  onDirectoryToggle: (directoryPath: string) => void;
  sidebarWidth: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  visibleFiles,
  highlightedMethod,
  onFileToggle,
  onShowAll,
  onHideAll,
  onMethodHighlight,
  onClearHighlight,
  onDirectoryToggle,
  sidebarWidth
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showMethods, setShowMethods] = useState(false);
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');

  const allMethods = useMemo(() => {
    return files.flatMap(file => 
      file.methods.map(method => ({
        ...method,
        fileName: file.fileName
      }))
    );
  }, [files]);

  const filteredItems = useMemo(() => {
    let filtered: (ParsedFile | Method & { fileName: string })[] = showMethods ? allMethods : files;
    
    // 言語フィルター
    if (languageFilter !== 'all') {
      filtered = filtered.filter(item => 
        showMethods 
          ? files.find(f => f.path === (item as Method & { fileName: string }).filePath)?.language === languageFilter
          : (item as ParsedFile).language === languageFilter
      );
    }
    
    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(item => {
        if (showMethods) {
          const method = item as Method & { fileName: string };
          return method.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 method.fileName.toLowerCase().includes(searchTerm.toLowerCase());
        } else {
          const file = item as ParsedFile;
          return file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 file.path.toLowerCase().includes(searchTerm.toLowerCase());
        }
      });
    }
    
    return filtered;
  }, [files, allMethods, showMethods, languageFilter, searchTerm]);

  const groupedFiles = useMemo(() => {
    if (showMethods) return {};
    
    const groups: { [directory: string]: ParsedFile[] } = {};
    (filteredItems as ParsedFile[]).forEach(file => {
      const directory = file.directory || 'root';
      if (!groups[directory]) {
        groups[directory] = [];
      }
      groups[directory].push(file);
    });
    return groups;
  }, [filteredItems, showMethods]);

  const visibleCount = visibleFiles.length;
  const totalCount = files.length;
  const totalMethods = allMethods.length;

  const languages = useMemo(() => {
    const uniqueLanguages = Array.from(new Set(files.map(f => f.language)));
    return uniqueLanguages.sort();
  }, [files]);

  const handleMethodClick = (method: Method & { fileName: string }) => {
    const file = files.find(f => f.path === method.filePath);
    if (file) {
      onMethodHighlight({
        methodName: method.name,
        filePath: method.filePath
      });
    }
  };

  const isMethodHighlighted = (method: Method & { fileName: string }) => {
    return highlightedMethod && 
           highlightedMethod.methodName === method.name && 
           highlightedMethod.filePath === method.filePath;
  };

  return (
    <div 
      className="bg-white border-r border-gray-300 h-full flex flex-col flex-shrink-0"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">ファイル管理</h2>
        
        {/* 検索 */}
        <input
          type="text"
          placeholder="ファイル・メソッド検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3"
        />
        
        {/* 言語フィルター */}
        <select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3"
        >
          <option value="all">全ての言語</option>
          {languages.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
        
        {/* 統計情報 */}
        <div className="text-sm text-gray-600 space-y-1">
          <div>表示中: {visibleCount} / {totalCount}</div>
          <div>総メソッド数: {totalMethods}</div>
        </div>
      </div>

      {/* 操作ボタン */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex space-x-2 mb-3">
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
        
        <div className="flex space-x-2 mb-2">
          <button
            onClick={() => setShowMethods(!showMethods)}
            className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
          >
            {showMethods ? 'ファイル表示' : 'メソッド表示'}
          </button>
          
          {highlightedMethod && (
            <button
              onClick={onClearHighlight}
              className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              ハイライト解除
            </button>
          )}
        </div>
        
        {!showMethods && (
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex-1 px-3 py-2 text-sm rounded ${
                viewMode === 'tree' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ツリー表示
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 px-3 py-2 text-sm rounded ${
                viewMode === 'list' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              リスト表示
            </button>
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            検索結果がありません
          </div>
        ) : showMethods ? (
          <div className="p-4">
            <h3 className="font-semibold text-gray-700 mb-3">メソッド一覧</h3>
            {(filteredItems as (Method & { fileName: string })[]).map((method, index) => (
              <div 
                key={`${method.filePath}-${index}`} 
                className={`mb-2 p-3 rounded cursor-pointer transition-colors ${
                  isMethodHighlighted(method) 
                    ? 'bg-yellow-100 border-yellow-300 border highlighted' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => handleMethodClick(method)}
              >
                <div className="font-medium text-blue-600 truncate" title={method.name}>
                  {method.name}
                </div>
                <div className="text-xs text-gray-500 truncate" title={method.fileName}>
                  {method.fileName}
                </div>
                <div className="text-xs text-gray-400 truncate" title={method.type}>
                  {method.type}
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'tree' ? (
          <div className="px-4">
            <DirectoryTree
              files={filteredItems as ParsedFile[]}
              visibleFiles={visibleFiles}
              onFileToggle={onFileToggle}
              onDirectoryToggle={onDirectoryToggle}
              sidebarWidth={sidebarWidth}
            />
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
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate" title={file.fileName}>
                          {file.fileName}
                        </div>
                        <div className="text-xs text-gray-500 truncate" title={file.language}>
                          {file.language}
                        </div>
                        <div className="text-xs text-gray-400">{file.methods.length} メソッド</div>
                      </div>
                      <button
                        onClick={() => onFileToggle(file.path)}
                        aria-label={`${file.path} の表示切り替え`}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          isVisible 
                            ? 'bg-blue-500 border-blue-500 text-white' 
                            : 'bg-white border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {isVisible && (
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
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