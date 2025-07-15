import React from 'react';
import { SAMPLE_DATA_INFO } from '@/utils/loadSampleData';
import { Icons } from '@/components/icons';
import { getUserFriendlyErrorMessage } from '@/utils/error';

interface DemoSectionProps {
  onLoadSample: () => Promise<void>;
  isLoading?: boolean;
  error?: Error | null;
}

export const DemoSection: React.FC<DemoSectionProps> = ({ 
  onLoadSample, 
  isLoading = false, 
  error
}) => {
  return (
    <div className="text-center mb-8">
      <h2 className="text-2xl md:text-4xl font-bold text-center mb-6 raleway">
        FlowCodeLinksを体験する
      </h2>
      
      <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-500 max-w-2xl mx-auto">
        <div className="card-body">
          {/* アイコン */}
          <div className="text-primary mb-4">
            <Icons.Lightning ariaHidden={true} />
          </div>
          
          <h3 className="card-title justify-center mb-3 text-xl">
            {SAMPLE_DATA_INFO.title}
          </h3>
          
          <p id="demo-description" className="text-base-content/70 mb-6">
            {SAMPLE_DATA_INFO.description}
          </p>
          
          {/* 特徴一覧 */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {SAMPLE_DATA_INFO.features.map((feature, index) => (
              <div key={index} className="flex items-center justify-center">
                <div className="badge badge-primary badge-outline gap-2 h-14 flex items-center justify-center w-full">
                  <Icons.Check ariaLabel="完了" />
                  <span className="text-xs">{feature}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* エラー表示 */}
          {error && (
            <div className="alert alert-error mb-4" role="alert">
              <Icons.Error ariaLabel="エラー" />
              <span>{getUserFriendlyErrorMessage(error)}</span>
            </div>
          )}
          
          {/* ローディング表示 */}
          {isLoading && (
            <div className="bg-base-100 rounded-lg p-4 mb-4" role="status">
              <div className="flex items-center justify-center mb-2">
                <Icons.LoadingSpinner ariaLabel="読み込み中" />
                <span className="ml-2">サンプルコードを読み込んでいます...</span>
              </div>
              <progress 
                className="progress progress-primary w-full" 
                max="100" 
                aria-label="読み込み進行状況"
              ></progress>
              <div className="text-xs text-base-content/50 mt-2 text-center">
                初回読み込み時は数秒かかる場合があります
              </div>
            </div>
          )}
          
          {/* サンプルボタン */}
          <div className="card-actions justify-center">
            <button
              onClick={onLoadSample}
              disabled={isLoading}
              aria-label="サンプルコードを読み込んでFlowCodeLinksを体験する"
              aria-describedby="demo-description"
              className={`btn btn-primary btn-lg gap-3 shadow-lg transition-all duration-300 ${
                isLoading 
                  ? 'loading cursor-not-allowed' 
                  : 'hover:shadow-xl hover:scale-105 active:scale-95'
              }`}
            >
              {isLoading ? (
                <>
                  <Icons.LoadingSpinner ariaLabel="読み込み中" />
                  読み込み中...
                </>
              ) : (
                <>
                  <Icons.Play ariaLabel="再生" />
                  体験する
                </>
              )}
            </button>
          </div>
          
          <div className="text-xs text-base-content/50 mt-4">
            ファイルアップロード不要
          </div>
        </div>
      </div>
    </div>
  );
};