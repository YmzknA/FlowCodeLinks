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
  const [showFileDetails, setShowFileDetails] = useState(false);

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
      className="bg-base-200 border-r border-base-300 h-full flex flex-col flex-shrink-0"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* ヘッダー */}
      <div className="p-4 border-b border-base-300">
        <h2 className="text-lg font-semibold text-base-content mb-3 flex items-center gap-2">
          <span className="text-primary">📁</span>
          ファイル管理
        </h2>
        
        {/* 検索 */}
        <div className="form-control mb-3">
          <input
            type="text"
            placeholder="ファイル・メソッド検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input input-bordered input-sm w-full"
          />
        </div>
        
        {/* 言語フィルター */}
        <div className="form-control mb-3">
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="select select-bordered select-sm w-full"
          >
            <option value="all">全ての言語</option>
            {languages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
        
        {/* 統計情報 */}
        <div className="stats shadow-sm bg-base-100">
          <div className="stat py-2">
            <div className="stat-title text-xs">表示ファイル</div>
            <div className="stat-value text-sm text-primary">{visibleCount} / {totalCount}</div>
          </div>
          <div className="stat py-2">
            <div className="stat-title text-xs">総メソッド数</div>
            <div className="stat-value text-sm text-secondary">{totalMethods}</div>
          </div>
        </div>
      </div>

      {/* 操作ボタン */}
      <div className="p-4 border-b border-base-300">
        <div className="flex gap-2 mb-3">
          <button
            onClick={onShowAll}
            className="btn btn-primary btn-sm flex-1"
          >
            全て表示
          </button>
          <button
            onClick={onHideAll}
            className="btn btn-neutral btn-sm flex-1"
          >
            全て非表示
          </button>
        </div>
        
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setShowMethods(!showMethods)}
            className="btn btn-accent btn-sm flex-1"
          >
            {showMethods ? 'ファイル表示' : 'メソッド表示'}
          </button>
          
          {highlightedMethod && (
            <button
              onClick={onClearHighlight}
              className="btn btn-error btn-sm"
            >
              ハイライト解除
            </button>
          )}
        </div>
        
        {!showMethods && (
          <div className="space-y-2">
            <div className="join w-full">
              <button
                onClick={() => setViewMode('tree')}
                className={`btn btn-sm join-item flex-1 ${
                  viewMode === 'tree' ? 'btn-active' : 'btn-outline'
                }`}
              >
                ツリー表示
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`btn btn-sm join-item flex-1 ${
                  viewMode === 'list' ? 'btn-active' : 'btn-outline'
                }`}
              >
                リスト表示
              </button>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text text-sm">詳細表示</span>
                <input
                  type="checkbox"
                  checked={showFileDetails}
                  onChange={(e) => setShowFileDetails(e.target.checked)}
                  className="checkbox checkbox-sm"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center">
            <div className="text-base-content/50 text-lg mb-2">🔍</div>
            <div className="text-base-content/60">検索結果がありません</div>
          </div>
        ) : showMethods ? (
          <div className="p-4">
            <h3 className="font-semibold text-base-content mb-3 flex items-center gap-2">
              <span className="text-accent">⚡</span>
              メソッド一覧
            </h3>
            {(filteredItems as (Method & { fileName: string })[]).map((method, index) => (
              <div 
                key={`${method.filePath}-${index}`} 
                className={`card card-compact mb-2 cursor-pointer transition-all hover:shadow-md ${
                  isMethodHighlighted(method) 
                    ? 'bg-warning/20 border border-warning shadow-lg' 
                    : 'bg-base-100 hover:bg-base-300/50'
                }`}
                onClick={() => handleMethodClick(method)}
              >
                <div className="card-body">
                  <div className="font-medium text-primary truncate" title={method.name}>
                    {method.name}
                    {method.type === 'erb_call' && (
                      <span className="badge badge-secondary badge-xs ml-2">ERB</span>
                    )}
                  </div>
                  <div className="text-xs text-base-content/60 truncate" title={method.fileName}>
                    {method.fileName}
                  </div>
                  <div className="text-xs text-base-content/40 truncate" title={method.type}>
                    {method.type === 'erb_call' ? 'erb call' : method.type}
                  </div>
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
              showFileDetails={showFileDetails}
            />
          </div>
        ) : (
          <div className="p-4">
            {Object.entries(groupedFiles).map(([directory, dirFiles]) => (
              <div key={directory} className="mb-4">
                <h3 className="font-semibold text-base-content mb-2 text-sm flex items-center gap-2">
                  <span className="text-info">📂</span>
                  {directory}
                </h3>
                {dirFiles.map(file => {
                  const isVisible = visibleFiles.includes(file.path);
                  return (
                    <div key={file.path} className="card card-compact mb-2 bg-base-100 hover:bg-base-300/50 transition-colors">
                      <div className="card-body">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 justify-between">
                              <div className="font-medium text-sm text-base-content truncate" title={file.fileName}>
                                {file.fileName}
                              </div>
                              {showFileDetails && (
                                <span className="text-xs text-base-content/60 flex-shrink-0">{file.methods.length} メソッド</span>
                              )}
                            </div>
                            {showFileDetails && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="badge badge-outline badge-xs">{file.language}</span>
                              </div>
                            )}
                          </div>
                          <label className="cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={() => onFileToggle(file.path)}
                              className="checkbox checkbox-primary checkbox-sm"
                              aria-label={`${file.path} の表示切り替え`}
                            />
                          </label>
                        </div>
                      </div>
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