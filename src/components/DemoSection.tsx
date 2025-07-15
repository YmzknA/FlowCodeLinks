import React from 'react';
import { SAMPLE_DATA_INFO, useLoadSampleDataQuality } from '@/utils/loadSampleData';
import { Icons } from '@/components/icons';
import { getUserFriendlyErrorMessage, getErrorRecoveryActions, StructuredError } from '@/utils/error';
import { useQualityAssurance, QualityAssured } from '@/utils/quality-assurance';

// 品質保証済みコンポーネントプロパティ
interface DemoSectionProps {
  onLoadSample: () => Promise<void>;
  isLoading?: boolean;
  error?: StructuredError | null;
  // アクセシビリティ
  ariaLabel?: string;
  ariaDescribedBy?: string;
  // 品質保証
  enableQualityMonitoring?: boolean;
  qualityThreshold?: number;
  // パフォーマンス
  lazy?: boolean;
  priority?: 'high' | 'medium' | 'low';
  // セキュリティ
  sanitizeContent?: boolean;
  // 国際化対応
  locale?: string;
}

// 品質保証済みコンポーネント型
type QualityAssuredDemoSection = QualityAssured<DemoSectionProps>;

export const DemoSection: React.FC<DemoSectionProps> = ({ 
  onLoadSample, 
  isLoading = false, 
  error,
  ariaLabel = 'FlowCodeLinksデモセクション',
  ariaDescribedBy = 'demo-description',
  enableQualityMonitoring = true,
  qualityThreshold = 85,
  lazy = false,
  priority = 'high',
  sanitizeContent = true,
  locale = 'ja'
}) => {
  // 品質監視フック
  const { qualityScore, isChecking, runCheck } = useQualityAssurance('DemoSection');
  
  // 統計情報フック
  const { stats } = useLoadSampleDataQuality();
  
  // 内部状態
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [userInteracted, setUserInteracted] = React.useState(false);
  
  // エラー回復アクション
  const recoveryActions = React.useMemo(() => 
    error ? getErrorRecoveryActions(error) : [],
    [error]
  );
  
  // 品質チェック実行
  React.useEffect(() => {
    if (enableQualityMonitoring && !isInitialized) {
      runCheck();
      setIsInitialized(true);
    }
  }, [enableQualityMonitoring, isInitialized, runCheck]);
  
  // 品質アラート
  React.useEffect(() => {
    if (qualityScore && qualityScore.overall < qualityThreshold) {
      console.warn(`⚠️ DemoSection品質スコアが閾値を下回りました: ${qualityScore.overall}/${qualityThreshold}`);
    }
  }, [qualityScore, qualityThreshold]);
  
  // イベントハンドラー（品質監視付き）
  const handleLoadSample = React.useCallback(async () => {
    try {
      setUserInteracted(true);
      await onLoadSample();
      
      // 成功時の品質チェック
      if (enableQualityMonitoring) {
        await runCheck();
      }
    } catch (err) {
      // エラーは親コンポーネントで処理
      throw err;
    }
  }, [onLoadSample, enableQualityMonitoring, runCheck]);
  
  // レンダリング最適化
  const shouldRenderLazy = lazy && !userInteracted;
  
  if (shouldRenderLazy) {
    return (
      <div className="text-center mb-8">
        <div className="card bg-base-200 shadow-xl max-w-2xl mx-auto">
          <div className="card-body">
            <div className="text-primary mb-4">
              <Icons.Lightning usage="decoration" ariaHidden={true} />
            </div>
            <h3 className="card-title justify-center mb-3 text-xl">
              デモを読み込んでいます...
            </h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="text-center mb-8"
      data-component="DemoSection"
      aria-label={ariaLabel}
      role="region"
    >
      <h2 className="text-2xl md:text-4xl font-bold text-center mb-6 raleway">
        FlowCodeLinksを体験する
      </h2>
      
      <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-500 max-w-2xl mx-auto">
        <div className="card-body">
          {/* 品質スコア表示（開発環境のみ） */}
          {process.env.NODE_ENV === 'development' && qualityScore && (
            <div className="mb-4 p-2 bg-base-300 rounded text-xs">
              <div className="flex justify-between items-center">
                <span>品質スコア: {qualityScore.overall.toFixed(1)}/100</span>
                <span className={`badge ${qualityScore.gate === 'PASS' ? 'badge-success' : 'badge-error'}`}>
                  {qualityScore.gate}
                </span>
              </div>
            </div>
          )}
          
          {/* アイコン */}
          <div className="text-primary mb-4">
            <Icons.Lightning 
              usage="decoration" 
              size="xxl" 
              ariaHidden={true}
            />
          </div>
          
          <h3 className="card-title justify-center mb-3 text-xl">
            {SAMPLE_DATA_INFO.title}
          </h3>
          
          <p id={ariaDescribedBy} className="text-base-content/70 mb-6">
            {SAMPLE_DATA_INFO.description}
          </p>
          
          {/* 特徴一覧 */}
          <div className="grid md:grid-cols-3 gap-4 mb-6" role="list">
            {SAMPLE_DATA_INFO.features.map((feature, index) => (
              <div key={index} className="flex items-center justify-center" role="listitem">
                <div className="badge badge-primary badge-outline gap-2 h-14 flex items-center justify-center w-full">
                  <Icons.Check 
                    usage="status" 
                    size="xs" 
                    ariaLabel="完了" 
                  />
                  <span className="text-xs">{feature}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* パフォーマンス統計（開発環境のみ） */}
          {process.env.NODE_ENV === 'development' && stats && (
            <div className="mb-4 p-2 bg-base-300 rounded text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>成功率: {stats.successRate.toFixed(1)}%</div>
                <div>平均読み込み時間: {stats.averageLoadTime.toFixed(0)}ms</div>
                <div>キャッシュ率: {stats.cacheHitRate.toFixed(1)}%</div>
                <div>総リクエスト数: {stats.totalRequests}</div>
              </div>
            </div>
          )}
          
          {/* エラー表示（改善版） */}
          {error && (
            <div className="alert alert-error mb-4" role="alert">
              <Icons.Error 
                usage="status" 
                size="lg" 
                ariaLabel="エラー" 
              />
              <div className="flex-1">
                <div className="font-semibold mb-2">
                  {getUserFriendlyErrorMessage(error)}
                </div>
                
                {/* 回復アクション */}
                {recoveryActions.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {recoveryActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={action.action}
                        className={`btn btn-sm ${
                          action.primary ? 'btn-primary' : 'btn-outline'
                        }`}
                        aria-label={action.label}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* ローディング詳細表示 */}
          {isLoading && (
            <div className="bg-base-100 rounded-lg p-4 mb-4" role="status">
              <div className="flex items-center justify-center mb-2">
                <Icons.LoadingSpinner 
                  usage="feedback" 
                  size="sm" 
                  ariaLabel="読み込み中" 
                />
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
              onClick={handleLoadSample}
              disabled={isLoading || isChecking}
              aria-label="サンプルコードを読み込んでFlowCodeLinksを体験する"
              aria-describedby={ariaDescribedBy}
              className={`btn btn-primary btn-lg gap-3 shadow-lg transition-all duration-300 ${
                isLoading || isChecking
                  ? 'loading cursor-not-allowed opacity-50' 
                  : 'hover:shadow-xl hover:scale-105 active:scale-95'
              }`}
            >
              {isLoading ? (
                <>
                  <Icons.LoadingSpinner 
                    usage="feedback" 
                    size="sm" 
                    ariaLabel="読み込み中" 
                  />
                  読み込み中...
                </>
              ) : (
                <>
                  <Icons.Play 
                    usage="button" 
                    size="md" 
                    ariaLabel="再生" 
                  />
                  体験する
                </>
              )}
            </button>
          </div>
          
          {/* 技術情報 */}
          <div className="text-xs text-base-content/50 mt-4 space-y-1">
            <div>ファイルアップロード不要</div>
            <div>予想読み込み時間: {SAMPLE_DATA_INFO.technical.loadTimeExpected}</div>
            <div>ファイルサイズ: {SAMPLE_DATA_INFO.technical.averageSize}</div>
            {SAMPLE_DATA_INFO.quality.accessibilityCompliant && (
              <div className="flex items-center justify-center gap-1">
                <Icons.Check 
                  usage="status" 
                  size="xs" 
                  ariaLabel="対応" 
                />
                <span>アクセシビリティ対応済み</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 品質保証済みコンポーネントのエクスポート
export const QualityAssuredDemoSection = DemoSection as React.FC<QualityAssuredDemoSection>;