import React from 'react';

interface Caller {
  methodName: string;
  filePath: string;
  lineNumber?: number;
}

interface CallersModalProps {
  methodName: string;
  callers: Caller[];
  isOpen: boolean;
  onClose: () => void;
  onCallerClick: (caller: { methodName: string; filePath: string; lineNumber?: number }) => void;
  showOpenWindowsOnly: boolean;
  onToggleShowOpenWindowsOnly: () => void;
  openWindows: string[]; // 開いているウィンドウのファイルパス一覧
}

export const CallersModal: React.FC<CallersModalProps> = ({
  methodName,
  callers,
  isOpen,
  onClose,
  onCallerClick,
  showOpenWindowsOnly,
  onToggleShowOpenWindowsOnly,
  openWindows
}) => {
  if (!isOpen) return null;

  // フィルタリング: 開いているウィンドウのみ表示するかどうか
  const filteredCallers = showOpenWindowsOnly 
    ? callers.filter(caller => openWindows.includes(caller.filePath))
    : callers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* モーダル */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            呼び出し元一覧: <span className="text-blue-600">{methodName}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* フィルター設定 */}
        <div className="p-4 border-b bg-gray-50">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showOpenWindowsOnly}
              onChange={onToggleShowOpenWindowsOnly}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              開いているウィンドウのみ表示 ({openWindows.length}個のウィンドウが開いています)
            </span>
          </label>
        </div>

        {/* 呼び出し元一覧 */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredCallers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {showOpenWindowsOnly 
                ? "開いているウィンドウに呼び出し元が見つかりません"
                : "呼び出し元が見つかりません"
              }
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCallers.map((caller, index) => (
                <div
                  key={`${caller.filePath}-${caller.methodName}-${index}`}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onCallerClick(caller)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {caller.methodName}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {caller.filePath}
                      </div>
                      {caller.lineNumber && (
                        <div className="text-xs text-gray-500 mt-1">
                          行 {caller.lineNumber}
                        </div>
                      )}
                    </div>
                    <div className="ml-2">
                      {openWindows.includes(caller.filePath) ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          開いています
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          閉じています
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            全体: {callers.length}個の呼び出し元
            {showOpenWindowsOnly && ` / 表示中: ${filteredCallers.length}個`}
          </div>
        </div>
      </div>
    </div>
  );
};