/**
 * プラグイン集約エクスポート
 * 
 * 全ての言語解析プラグインを一箇所から利用可能にする
 */

import { RubyAnalysisPlugin } from './RubyAnalysisPlugin';
import { JavaScriptAnalysisPlugin } from './JavaScriptAnalysisPlugin';
import { TypeScriptAnalysisPlugin } from './TypeScriptAnalysisPlugin';
import { ErbAnalysisPlugin } from './ErbAnalysisPlugin';

export { BaseAnalysisPlugin } from './BaseAnalysisPlugin';
export { RubyAnalysisPlugin } from './RubyAnalysisPlugin';
export { JavaScriptAnalysisPlugin } from './JavaScriptAnalysisPlugin';
export { TypeScriptAnalysisPlugin } from './TypeScriptAnalysisPlugin';
export { ErbAnalysisPlugin } from './ErbAnalysisPlugin';

// プラグインファクトリ関数
export function createAllPlugins() {
  return [
    new RubyAnalysisPlugin(),
    new JavaScriptAnalysisPlugin(),
    new TypeScriptAnalysisPlugin(),
    new ErbAnalysisPlugin()
  ];
}

// 特定の言語プラグインを作成
export function createPluginForLanguage(language: string) {
  switch (language) {
    case 'ruby':
      return new RubyAnalysisPlugin();
    case 'javascript':
      return new JavaScriptAnalysisPlugin();
    case 'typescript':
    case 'tsx':
      return new TypeScriptAnalysisPlugin();
    case 'erb':
      return new ErbAnalysisPlugin();
    default:
      return null;
  }
}