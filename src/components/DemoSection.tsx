import React from 'react';
import { SAMPLE_DATA_INFO } from '@/utils/loadSampleData';

interface DemoSectionProps {
  onLoadSample: () => Promise<void>;
  isLoading?: boolean;
  error?: Error | null;
}

export const DemoSection: React.FC<DemoSectionProps> = ({ onLoadSample, isLoading = false, error }) => {
  return (
    <div className="text-center mb-8">
      <h2 className="text-2xl md:text-4xl font-bold text-center mb-6 raleway">
        FlowCodeLinksを体験する
      </h2>
      
      <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-500 max-w-2xl mx-auto">
        <div className="card-body">
          {/* アイコン */}
          <div className="text-primary mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          
          <h3 className="card-title justify-center mb-3 text-xl">
            {SAMPLE_DATA_INFO.title}
          </h3>
          
          <p className="text-base-content/70 mb-6">
            {SAMPLE_DATA_INFO.description}
          </p>
          
          {/* 特徴一覧 */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {SAMPLE_DATA_INFO.features.map((feature, index) => (
              <div key={index} className="flex items-center justify-center">
                <div className="badge badge-primary badge-outline gap-2 h-14 flex items-center justify-center w-full">
                  <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-xs">{feature}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* エラー表示 */}
          {error && (
            <div className="alert alert-error mb-4">
              <svg className="w-6 h-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error.message}</span>
            </div>
          )}
          
          {/* サンプルボタン */}
          <div className="card-actions justify-center">
            <button
              onClick={onLoadSample}
              disabled={isLoading}
              className={`btn btn-primary btn-lg gap-3 shadow-lg transition-all duration-300 ${
                isLoading 
                  ? 'loading cursor-not-allowed' 
                  : 'hover:shadow-xl hover:scale-105 active:scale-95'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  読み込み中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                  </svg>
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
