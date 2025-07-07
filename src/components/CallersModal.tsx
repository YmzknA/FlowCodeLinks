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
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-base-content">
            呼び出し元一覧: <span className="text-primary">{methodName}</span>
          </h2>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            ×
          </button>
        </div>

        {/* フィルター設定 */}
        <div className="form-control bg-base-200 rounded-lg p-4 mb-4">
          <label className="label cursor-pointer">
            <span className="label-text">
              開いているウィンドウのみ表示 ({openWindows.length}個のウィンドウが開いています)
            </span>
            <input
              type="checkbox"
              checked={showOpenWindowsOnly}
              onChange={onToggleShowOpenWindowsOnly}
              className="checkbox checkbox-primary"
            />
          </label>
        </div>

        {/* 呼び出し元一覧 */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCallers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-base-content/50 text-lg mb-2">🔍</div>
              <div className="text-base-content/60">
                {showOpenWindowsOnly 
                  ? "開いているウィンドウに呼び出し元が見つかりません"
                  : "呼び出し元が見つかりません"
                }
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCallers.map((caller, index) => (
                <div
                  key={`${caller.filePath}-${caller.methodName}-${index}`}
                  className="card card-compact bg-base-100 hover:bg-base-200 cursor-pointer transition-colors"
                  onClick={() => onCallerClick(caller)}
                >
                  <div className="card-body">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-primary">
                          {caller.methodName}
                        </div>
                        <div className="text-sm text-base-content/60 mt-1">
                          {caller.filePath}
                        </div>
                        {caller.lineNumber && (
                          <div className="text-xs text-base-content/40 mt-1">
                          行 {caller.lineNumber}
                        </div>
                      )}
                    </div>
                    <div className="ml-2">
                      {openWindows.includes(caller.filePath) ? (
                        <span className="badge badge-success badge-sm">
                          開いています
                        </span>
                      ) : (
                        <span className="badge badge-neutral badge-sm">
                          閉じています
                        </span>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="modal-action">
          <div className="text-sm text-base-content/60">
            全体: {callers.length}個の呼び出し元
            {showOpenWindowsOnly && ` / 表示中: ${filteredCallers.length}個`}
          </div>
        </div>
      </div>
    </div>
  );
};