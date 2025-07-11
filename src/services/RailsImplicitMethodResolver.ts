/**
 * Rails暗黙的メソッド解決サービス
 * 
 * Rails特有の暗黙的メソッド解決を包括的に処理：
 * - 明示的include文の検出
 * - 継承チェーンの解決
 * - concernsの自動読み込み
 * - Rails標準メソッドの提供
 */

import { RepomixContentService } from './RepomixContentService';

export interface RailsResolutionResult {
  explicitIncludes: Set<string>;      // 明示的include
  inheritanceChain: Set<string>;      // 継承チェーン
  autoloadedConcerns: Set<string>;    // 自動読み込みconcerns
  standardMethods: Set<string>;       // Rails標準メソッド
  resolvedMethods: Set<string>;       // 解決された全メソッド
}

export class RailsImplicitMethodResolver {
  private static instance: RailsImplicitMethodResolver | null = null;
  private repomixService: RepomixContentService;

  // Rails標準メソッド定義
  private readonly RAILS_CONTROLLER_METHODS = new Set([
    // ActionController::Base
    'render', 'redirect_to', 'redirect_back', 'head', 'send_data', 'send_file',
    'before_action', 'after_action', 'around_action', 'skip_before_action',
    'authenticate_user!', 'current_user', 'user_signed_in?',
    'params', 'request', 'response', 'session', 'cookies', 'flash',
    'url_for', 'link_to', 'form_with', 'form_for',
    // RESTful actions (除外対象外)
    'show', 'edit', 'create', 'update', 'destroy'
  ]);

  private readonly RAILS_MODEL_METHODS = new Set([
    // ActiveRecord::Base
    'find', 'find_by', 'where', 'all', 'first', 'last', 'count', 'exists?',
    'create', 'create!', 'new', 'build', 'save', 'save!', 'update', 'update!',
    'destroy', 'delete', 'reload', 'valid?', 'invalid?', 'errors',
    'includes', 'joins', 'left_joins', 'order', 'group', 'having', 'limit', 'offset',
    'select', 'distinct', 'pluck', 'sum', 'maximum', 'minimum', 'average',
    'ransack', 'ransackable_attributes', 'ransackable_associations'
  ]);

  private readonly RAILS_HELPER_METHODS = new Set([
    // ApplicationHelper相当
    'link_to', 'image_tag', 'content_for', 'yield', 'capture',
    'safe_join', 'raw', 'html_safe', 'strip_tags', 'truncate',
    'number_to_currency', 'time_ago_in_words', 'distance_of_time_in_words'
  ]);

  private constructor() {
    this.repomixService = RepomixContentService.getInstance();
  }

  static getInstance(): RailsImplicitMethodResolver {
    if (!this.instance) {
      this.instance = new RailsImplicitMethodResolver();
    }
    return this.instance;
  }

  /**
   * 包括的メソッド解決のメインエントリポイント
   */
  resolveAllAvailableMethods(
    fileContent: string, 
    filePath: string, 
    localMethods: Set<string>
  ): RailsResolutionResult {
    
    const result: RailsResolutionResult = {
      explicitIncludes: new Set(),
      inheritanceChain: new Set(),
      autoloadedConcerns: new Set(),
      standardMethods: new Set(),
      resolvedMethods: new Set()
    };

    // Phase 1: 明示的include文の検出
    result.explicitIncludes = this.detectExplicitIncludes(fileContent);
    
    // Phase 2: 継承チェーンの解決
    result.inheritanceChain = this.resolveInheritanceChain(fileContent, filePath);
    
    // Phase 3: concerns自動読み込みの解決
    result.autoloadedConcerns = this.resolveAutoloadedConcerns(filePath);
    
    // Phase 4: Rails標準メソッドの提供
    result.standardMethods = this.provideStandardMethods(filePath);

    // 全てのメソッドを統合
    result.resolvedMethods = this.integrateAllMethods(
      localMethods,
      result.explicitIncludes,
      result.inheritanceChain, 
      result.autoloadedConcerns,
      result.standardMethods
    );

    return result;
  }

  /**
   * Phase 1: 明示的include文の検出
   */
  private detectExplicitIncludes(fileContent: string): Set<string> {
    const methods = new Set<string>();
    const lines = fileContent.split('\n');
    const includedModules: string[] = [];

    // include文を検出
    for (const line of lines) {
      const cleanLine = line.replace(/^\s*\d+:\s*/, ''); // repomix行番号除去
      const trimmedLine = cleanLine.trim();
      
      // MilestonesControllerの場合のみデバッグログ
      // デバッグログ無効化
      // if (fileContent.includes('MilestonesController')) {
      //   if (trimmedLine.includes('include')) {
      //     console.log(`🔍 Include line found: "${trimmedLine}"`);
      //   }
      // }
      
      const includeMatch = trimmedLine.match(/^include\s+([A-Z][A-Za-z0-9_]*)/);
      if (includeMatch) {
        const moduleName = includeMatch[1];
        includedModules.push(moduleName);
        
        // デバッグログ無効化
        // if (fileContent.includes('MilestonesController')) {
        //   console.log(`✅ Include detected: ${moduleName}`);
        // }
      }
    }

    // 各モジュールのメソッドを解決
    for (const moduleName of includedModules) {
      const moduleMethodsFound = this.findMethodsInModule(moduleName);
      
      // デバッグログ無効化
      // if (fileContent.includes('MilestonesController')) {
      //   console.log(`🔍 Module ${moduleName}: found ${moduleMethodsFound.size} methods`);
      //   if (moduleMethodsFound.has('ransack_by_title_and_description')) {
      //     console.log(`🎯 ransack_by_title_and_description found in ${moduleName}!`);
      //   }
      // }
      
      moduleMethodsFound.forEach(method => methods.add(method));
    }

    // デバッグログ無効化
    // if (fileContent.includes('MilestonesController')) {
    //   console.log(`🔍 detectExplicitIncludes final result: ${methods.size} methods`);
    //   console.log(`🔍 Methods: ${Array.from(methods).slice(0, 5).join(', ')}${methods.size > 5 ? '...' : ''}`);
    // }
    
    return methods;
  }

  /**
   * Phase 2: 継承チェーンの解決
   */
  private resolveInheritanceChain(fileContent: string, filePath: string): Set<string> {
    const methods = new Set<string>();
    const lines = fileContent.split('\n');

    // 継承関係を検出
    for (const line of lines) {
      const cleanLine = line.replace(/^\s*\d+:\s*/, '');
      const trimmedLine = cleanLine.trim();
      
      // class ClassName < SuperClass 形式
      const inheritanceMatch = trimmedLine.match(/^class\s+(\w+)\s*<\s*(\w+)/);
      if (inheritanceMatch) {
        const [, className, superClassName] = inheritanceMatch;
        
        // ApplicationController -> ActionController::Base
        if (superClassName === 'ApplicationController') {
          const appControllerMethods = this.findMethodsInModule('ApplicationController');
          appControllerMethods.forEach(method => methods.add(method));
        }
        
        // ActionController::Base相当の標準メソッド
        if (superClassName.includes('Controller') || superClassName === 'ActionController::Base') {
          this.RAILS_CONTROLLER_METHODS.forEach(method => methods.add(method));
        }
        
        // ActiveRecord::Base相当の標準メソッド
        if (superClassName.includes('Record') || superClassName === 'ActiveRecord::Base') {
          this.RAILS_MODEL_METHODS.forEach(method => methods.add(method));
        }
      }
    }

    return methods;
  }

  /**
   * Phase 3: concerns自動読み込みの解決
   */
  private resolveAutoloadedConcerns(filePath: string): Set<string> {
    const methods = new Set<string>();

    // ファイルパスからconcernsディレクトリのメソッドを自動検出
    if (filePath.includes('controllers/')) {
      const controllerConcerns = this.findAllConcernsInDirectory('app/controllers/concerns');
      controllerConcerns.forEach(method => methods.add(method));
    }
    
    if (filePath.includes('models/')) {
      const modelConcerns = this.findAllConcernsInDirectory('app/models/concerns');
      modelConcerns.forEach(method => methods.add(method));
    }

    return methods;
  }

  /**
   * Phase 4: Rails標準メソッドの提供
   */
  private provideStandardMethods(filePath: string): Set<string> {
    const methods = new Set<string>();

    // ファイルタイプに基づいてRails標準メソッドを提供
    if (filePath.includes('controllers/')) {
      this.RAILS_CONTROLLER_METHODS.forEach(method => methods.add(method));
      this.RAILS_HELPER_METHODS.forEach(method => methods.add(method));
    }
    
    if (filePath.includes('models/')) {
      this.RAILS_MODEL_METHODS.forEach(method => methods.add(method));
    }

    return methods;
  }

  /**
   * 指定されたモジュール内のメソッドを検索
   */
  private findMethodsInModule(moduleName: string): Set<string> {
    // RepomixContentServiceを使用して全体から検索
    if (this.repomixService.hasFullContent()) {
      return this.repomixService.findMethodsInModule(moduleName);
    }
    return new Set();
  }

  /**
   * concernsディレクトリ内の全メソッドを検索
   */
  private findAllConcernsInDirectory(directoryPath: string): Set<string> {
    const methods = new Set<string>();
    
    if (!this.repomixService.hasFullContent()) {
      return methods;
    }

    const fullContent = this.repomixService.getFullContent();
    const lines = fullContent.split('\n');
    let inConcernsFile = false;
    let currentDepth = 0;

    for (const line of lines) {
      // repomixファイルセクション検出
      const fileHeaderMatch = line.match(/^## File: (.+)$/);
      if (fileHeaderMatch) {
        const filePath = fileHeaderMatch[1];
        inConcernsFile = filePath.includes(directoryPath);
        currentDepth = 0;
        continue;
      }

      if (!inConcernsFile) continue;

      // 行番号プレフィックスを除去
      const cleanLine = line.replace(/^\s*\d+:\s*/, '');
      const trimmedLine = cleanLine.trim();

      // メソッド定義の検出
      const methodMatch = trimmedLine.match(/^\s*def\s+(self\.)?(\w+)/);
      if (methodMatch) {
        const [, , methodName] = methodMatch;
        methods.add(methodName);
      }
    }

    return methods;
  }

  /**
   * 全メソッドの統合
   */
  private integrateAllMethods(
    localMethods: Set<string>,
    explicitIncludes: Set<string>,
    inheritanceChain: Set<string>,
    autoloadedConcerns: Set<string>,
    standardMethods: Set<string>
  ): Set<string> {
    const allMethods = new Set<string>();

    // 全てのソースからメソッドを統合
    [localMethods, explicitIncludes, inheritanceChain, autoloadedConcerns, standardMethods]
      .forEach(methodSet => {
        methodSet.forEach(method => allMethods.add(method));
      });

    return allMethods;
  }

  /**
   * デバッグ用: 解決結果の詳細ログ
   */
  logResolutionDetails(result: RailsResolutionResult, filePath: string): void {
    // デバッグログを無効化（大量のログ出力を防ぐため）
    // 必要に応じてコメントアウトを解除してください
    /*
    console.log(`\n🔍 Rails Method Resolution for: ${filePath}`);
    console.log(`📝 Explicit includes: ${result.explicitIncludes.size} methods`);
    console.log(`🔗 Inheritance chain: ${result.inheritanceChain.size} methods`);
    console.log(`📁 Autoloaded concerns: ${result.autoloadedConcerns.size} methods`);
    console.log(`⚙️  Standard methods: ${result.standardMethods.size} methods`);
    console.log(`✅ Total resolved: ${result.resolvedMethods.size} methods`);

    // 特定メソッドの検出状況
    const targetMethod = 'ransack_by_title_and_description';
    if (result.resolvedMethods.has(targetMethod)) {
      console.log(`🎯 Target method '${targetMethod}' resolved!`);
      if (result.explicitIncludes.has(targetMethod)) console.log(`  ↳ Found in explicit includes`);
      if (result.inheritanceChain.has(targetMethod)) console.log(`  ↳ Found in inheritance chain`);
      if (result.autoloadedConcerns.has(targetMethod)) console.log(`  ↳ Found in autoloaded concerns`);
      if (result.standardMethods.has(targetMethod)) console.log(`  ↳ Found in standard methods`);
    } else {
      console.log(`❌ Target method '${targetMethod}' not resolved`);
    }
    */
  }

  /**
   * テスト用: インスタンスのリセット
   */
  static reset(): void {
    this.instance = null;
  }
}