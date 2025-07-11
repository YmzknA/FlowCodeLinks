/**
 * Repomix全体コンテンツアクセスサービス
 * 
 * 複数ファイル間のメソッド解決に必要な全体コンテンツへのアクセスを提供します。
 * 単一ファイル解析時にインクルードされたモジュールの検索を可能にします。
 */

export class RepomixContentService {
  private static instance: RepomixContentService | null = null;
  private fullContent: string = '';
  private allDefinedMethods: Set<string> = new Set();
  
  private constructor() {}
  
  /**
   * シングルトンインスタンスの取得
   */
  static getInstance(): RepomixContentService {
    if (!this.instance) {
      this.instance = new RepomixContentService();
    }
    return this.instance;
  }
  
  /**
   * 全体コンテンツの設定
   * @param content repomix全体のコンテンツ
   */
  setFullContent(content: string): void {
    this.fullContent = content;
  }
  
  /**
   * 全体コンテンツの取得
   * @returns repomix全体のコンテンツ
   */
  getFullContent(): string {
    return this.fullContent;
  }
  
  /**
   * 全体コンテンツが利用可能かチェック
   * @returns 全体コンテンツが設定されている場合はtrue
   */
  hasFullContent(): boolean {
    return this.fullContent.length > 0;
  }
  
  /**
   * コンテンツのクリア（テスト用）
   */
  clear(): void {
    this.fullContent = '';
    this.allDefinedMethods.clear();
  }
  
  /**
   * 全定義メソッドの設定
   * @param methods 全ファイルから抽出されたメソッド定義名のSet
   */
  setAllDefinedMethods(methods: Set<string>): void {
    this.allDefinedMethods = new Set(methods);
  }
  
  /**
   * 全定義メソッドの取得
   * @returns 全定義メソッドのSet
   */
  getAllDefinedMethods(): Set<string> {
    return new Set(this.allDefinedMethods);
  }
  
  /**
   * 全定義メソッドが利用可能かチェック
   * @returns 全定義メソッドが設定されている場合はtrue
   */
  hasAllDefinedMethods(): boolean {
    return this.allDefinedMethods.size > 0;
  }
  
  /**
   * 指定されたモジュール名のメソッドを検索
   * @param moduleName 検索対象のモジュール名
   * @returns モジュール内で定義されたメソッド名のSet
   */
  findMethodsInModule(moduleName: string): Set<string> {
    const methods = new Set<string>();
    
    if (!this.hasFullContent()) {
      //       console.log(`❌ RepomixContentService: No full content available for module ${moduleName}`);
      return methods;
    }
    
    // デバッグログ無効化
    // console.log(`🔍 RepomixContentService: Searching for module ${moduleName} in ${this.fullContent.length} chars`);
    
    // repomix形式でモジュール定義を検索（行番号プレフィックス含む）
    const modulePattern = new RegExp(`^\\s*\\d+:\\s*module\\s+${moduleName}\\b`, 'm');
    const moduleMatch = this.fullContent.match(modulePattern);
    
    if (!moduleMatch) {
      // デバッグログ無効化
      // console.log(`❌ RepomixContentService: Module ${moduleName} not found with pattern`);
      return methods;
    }
    
    // デバッグログ無効化
    // console.log(`✅ RepomixContentService: Found module ${moduleName} at match: "${moduleMatch[0]}"`);
    
    // デバッグログ無効化
    // if (moduleName === 'SearchConcern') {
    //   console.log(`🔍 SearchConcern debug: Full content preview:`);
    //   console.log(this.fullContent.substring(this.fullContent.indexOf(moduleMatch[0]), this.fullContent.indexOf(moduleMatch[0]) + 2000));
    // }
    
    // モジュールの開始位置を特定
    const moduleStartIndex = this.fullContent.indexOf(moduleMatch[0]);
    const lines = this.fullContent.split('\n');
    let moduleStartLine = -1;
    let currentIndex = 0;
    
    // 開始行を特定
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (currentIndex >= moduleStartIndex) {
        moduleStartLine = i;
        break;
      }
      currentIndex += lineLength;
    }
    
    if (moduleStartLine === -1) {
      return methods;
    }
    
    // モジュールの終了を検索（repomix形式対応、Rubyのブロック構造を正確に解析）
    let moduleEndLine = lines.length - 1;
    let moduleDepth = 0;
    let defDepth = 0;
    let controlDepth = 0;
    let foundFirstModuleStart = false;
    
    for (let i = moduleStartLine; i < lines.length; i++) {
      const line = lines[i];
      // 行番号プレフィックスを除去
      const cleanLine = line.replace(/^\s*\d+:\s*/, '');
      const trimmedLine = cleanLine.trim();
      
      // 最初のmodule行を検出
      if (!foundFirstModuleStart && trimmedLine.startsWith('module ')) {
        foundFirstModuleStart = true;
        moduleDepth = 1; // moduleから始まるのでdepth=1
        if (moduleName === 'SearchConcern') {
          //           console.log(`🔍 SearchConcern: Module start at line ${i + 1} (moduleDepth=${moduleDepth})`);
        }
        continue;
      }
      
      if (!foundFirstModuleStart) continue;
      
      // Rubyブロック構造の分析
      if (trimmedLine.match(/^(module|class)\b/)) {
        moduleDepth++;
        if (moduleName === 'SearchConcern') {
          //           console.log(`🔍 SearchConcern: Module/Class start at line ${i + 1}: "${trimmedLine}" (moduleDepth=${moduleDepth})`);
        }
      } else if (trimmedLine.match(/^def\b/)) {
        defDepth++;
        if (moduleName === 'SearchConcern') {
          //           console.log(`🔍 SearchConcern: Method start at line ${i + 1}: "${trimmedLine}" (defDepth=${defDepth})`);
        }
      } else if (trimmedLine.match(/\b(if|unless|case|while|until|for|begin)\b/)) {
        controlDepth++;
        if (moduleName === 'SearchConcern') {
          //           console.log(`🔍 SearchConcern: Control start at line ${i + 1}: "${trimmedLine}" (controlDepth=${controlDepth})`);
        }
      } else if (trimmedLine === 'end') {
        // Rubyブロック構造の正確な解析：各endに対して適切なdepthを減らす
        if (controlDepth > 0) {
          controlDepth--;
          if (moduleName === 'SearchConcern') {
          //             console.log(`🔍 SearchConcern: Control end at line ${i + 1} (controlDepth=${controlDepth})`);
          }
        } else if (defDepth > 0) {
          defDepth--;
          if (moduleName === 'SearchConcern') {
          //             console.log(`🔍 SearchConcern: Method end at line ${i + 1} (defDepth=${defDepth})`);
          }
        } else if (moduleDepth > 0) {
          // メソッド外でのmodule/class終了
          moduleDepth--;
          if (moduleName === 'SearchConcern') {
          //             console.log(`🔍 SearchConcern: Module/Class end at line ${i + 1} (moduleDepth=${moduleDepth})`);
          }
          if (moduleDepth === 0) {
            moduleEndLine = i;
          //             console.log(`🔍 SearchConcern: Found module end at line ${i + 1}, moduleDepth=0`);
            break;
          }
        }
      }
      
      // repomix の次のファイルセクションに達した場合も終了
      if (i > moduleStartLine && line.match(/^## File:/)) {
        moduleEndLine = i - 1;
          //         console.log(`🔍 SearchConcern: Found file boundary at line ${i + 1}`);
        break;
      }
    }
    
          //     console.log(`🔍 SearchConcern: Module spans from line ${moduleStartLine + 1} to ${moduleEndLine + 1}`);
    
    // モジュール内のメソッドを抽出
    const methodDefinitionPattern = /^\s*def\s+(self\.)?(\w+)/;
    let methodCount = 0;
    
    for (let i = moduleStartLine + 1; i < moduleEndLine; i++) {
      const line = lines[i];
      // 行番号プレフィックスを除去
      const cleanLine = line.replace(/^\s*\d+:\s*/, '');
      const trimmedLine = cleanLine.trim();
      
      // SearchConcern内のメソッド検出をデバッグ
      if (moduleName === 'SearchConcern' && trimmedLine.includes('ransack_by_title_and_description')) {
          //         console.log(`🎯 SearchConcern line ${i + 1}: "${trimmedLine}"`);
      }
      
      const methodMatch = trimmedLine.match(methodDefinitionPattern);
      if (methodMatch) {
        const [, , methodName] = methodMatch;
        methods.add(methodName);
        methodCount++;
        
        // デバッグログ無効化
        // if (moduleName === 'SearchConcern') {
        //   console.log(`🔍 SearchConcern method ${methodCount}: ${methodName} (line ${i + 1})`);
        // }
        
        if (methodName === 'ransack_by_title_and_description') {
          //           console.log(`🎯 Found target method: ${methodName} in ${moduleName} at line ${i + 1}`);
        }
      }
    }
    
    // デバッグログ無効化
    // console.log(`🔍 ${moduleName}: Extracted ${methodCount} methods total`);
    return methods;
  }
  
  /**
   * テスト用: インスタンスのリセット
   */
  static reset(): void {
    this.instance = null;
  }
}