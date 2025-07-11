/**
 * MethodExclusionService リデザインテスト
 * 
 * 粒度細分化によるRails標準アクション問題の根本解決
 * 
 * テスト駆動で以下3機能を分離：
 * 1. isDefinitionClickable() - 定義のクリック可否
 * 2. isDefinitionJumpTarget() - 定義のジャンプ対象可否  
 * 3. isCallDetectionEnabled() - 内部での呼び出し検知可否
 */

import { MethodExclusionService } from '@/services/MethodExclusionService';

describe('MethodExclusionService リデザイン', () => {
  
  describe('Rails標準アクション: showアクション', () => {
    const showMethodName = 'show';
    const controllerPath = 'app/controllers/milestones_controller.rb';
    const nonControllerPath = 'app/models/milestone.rb';
    
    test('showアクション定義はクリック不可', () => {
      const isClickable = MethodExclusionService.isDefinitionClickable(showMethodName, controllerPath);
      expect(isClickable).toBe(false);
      
      // 非コントローラーファイルでは影響しない
      const nonControllerClickable = MethodExclusionService.isDefinitionClickable(showMethodName, nonControllerPath);
      expect(nonControllerClickable).toBe(true);
    });
    
    test('showアクション定義はジャンプ対象外', () => {
      const isJumpTarget = MethodExclusionService.isDefinitionJumpTarget(showMethodName, controllerPath);
      expect(isJumpTarget).toBe(false);
      
      // 非コントローラーファイルでは影響しない
      const nonControllerJumpTarget = MethodExclusionService.isDefinitionJumpTarget(showMethodName, nonControllerPath);
      expect(nonControllerJumpTarget).toBe(true);
    });
    
    test('🎯 showアクション内での呼び出し検知は有効（問題解決）', () => {
      const isCallDetectionEnabled = MethodExclusionService.isCallDetectionEnabled(showMethodName, controllerPath);
      expect(isCallDetectionEnabled).toBe(true); // 重要: 呼び出し検知は有効にする
      
      // 非コントローラーファイルでも影響しない
      const nonControllerCallDetection = MethodExclusionService.isCallDetectionEnabled(showMethodName, nonControllerPath);
      expect(nonControllerCallDetection).toBe(true);
    });
  });
  
  describe('Rails標準アクション: 全アクション検証', () => {
    const standardActions = ['index', 'show', 'new', 'edit', 'create', 'update', 'destroy'];
    const controllerPath = 'app/controllers/users_controller.rb';
    
    test.each(standardActions)('%sアクション定義はクリック不可', (actionName) => {
      const isClickable = MethodExclusionService.isDefinitionClickable(actionName, controllerPath);
      expect(isClickable).toBe(false);
    });
    
    test.each(standardActions)('%sアクション定義はジャンプ対象外', (actionName) => {
      const isJumpTarget = MethodExclusionService.isDefinitionJumpTarget(actionName, controllerPath);
      expect(isJumpTarget).toBe(false);
    });
    
    test.each(standardActions)('🎯 %sアクション内での呼び出し検知は有効', (actionName) => {
      const isCallDetectionEnabled = MethodExclusionService.isCallDetectionEnabled(actionName, controllerPath);
      expect(isCallDetectionEnabled).toBe(true); // 重要: 全標準アクション内での呼び出し検知は有効
    });
  });
  
  describe('非Rails標準アクション: カスタムメソッド', () => {
    const customMethodName = 'prepare_meta_tags';
    const controllerPath = 'app/controllers/milestones_controller.rb';
    const modelPath = 'app/models/milestone.rb';
    
    test('カスタムメソッド定義はクリック可能', () => {
      const isClickable = MethodExclusionService.isDefinitionClickable(customMethodName, controllerPath);
      expect(isClickable).toBe(true);
      
      const modelClickable = MethodExclusionService.isDefinitionClickable(customMethodName, modelPath);
      expect(modelClickable).toBe(true);
    });
    
    test('カスタムメソッド定義はジャンプ対象', () => {
      const isJumpTarget = MethodExclusionService.isDefinitionJumpTarget(customMethodName, controllerPath);
      expect(isJumpTarget).toBe(true);
      
      const modelJumpTarget = MethodExclusionService.isDefinitionJumpTarget(customMethodName, modelPath);
      expect(modelJumpTarget).toBe(true);
    });
    
    test('カスタムメソッド内での呼び出し検知は有効', () => {
      const isCallDetectionEnabled = MethodExclusionService.isCallDetectionEnabled(customMethodName, controllerPath);
      expect(isCallDetectionEnabled).toBe(true);
      
      const modelCallDetection = MethodExclusionService.isCallDetectionEnabled(customMethodName, modelPath);
      expect(modelCallDetection).toBe(true);
    });
  });
  
  describe('後方互換性確保', () => {
    test('既存のisExcludedMethodは非推奨として動作', () => {
      const showMethodName = 'show';
      const controllerPath = 'app/controllers/milestones_controller.rb';
      
      // 既存APIは引き続き動作する（定義ベースの除外）
      const isExcluded = MethodExclusionService.isExcludedMethod(showMethodName, controllerPath);
      expect(isExcluded).toBe(true);
      
      // 但し、新しいAPIを推奨することを示すために警告が出る（将来実装）
      // expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
    });
    
    test('既存のisClickableMethodは新APIにリダイレクト', () => {
      const showMethodName = 'show';
      const controllerPath = 'app/controllers/milestones_controller.rb';
      
      const legacyIsClickable = MethodExclusionService.isClickableMethod(showMethodName, controllerPath);
      const newIsClickable = MethodExclusionService.isDefinitionClickable(showMethodName, controllerPath);
      
      expect(legacyIsClickable).toBe(newIsClickable);
    });
    
    test('既存のisJumpTargetMethodは新APIにリダイレクト', () => {
      const showMethodName = 'show';
      const controllerPath = 'app/controllers/milestones_controller.rb';
      
      const legacyIsJumpTarget = MethodExclusionService.isJumpTargetMethod(showMethodName, controllerPath);
      const newIsJumpTarget = MethodExclusionService.isDefinitionJumpTarget(showMethodName, controllerPath);
      
      expect(legacyIsJumpTarget).toBe(newIsJumpTarget);
    });
  });
  
  describe('milestones_controller.rb実例シナリオ', () => {
    test('🎯 問題解決シナリオ: showアクション内でprepare_meta_tagsが呼び出し検知される', () => {
      // Given: showアクション定義
      const showMethod = 'show';
      const controllerPath = 'app/controllers/milestones_controller.rb';
      
      // When: showアクション内でprepare_meta_tagsを呼び出す
      const prepareMetaTagsMethod = 'prepare_meta_tags';
      
      // Then: showアクション定義はクリック/ジャンプ不可だが、内部呼び出し検知は有効
      expect(MethodExclusionService.isDefinitionClickable(showMethod, controllerPath)).toBe(false);
      expect(MethodExclusionService.isDefinitionJumpTarget(showMethod, controllerPath)).toBe(false);
      expect(MethodExclusionService.isCallDetectionEnabled(showMethod, controllerPath)).toBe(true); // 🎯 重要
      
      // And: prepare_meta_tags定義は正常にクリック/ジャンプ可能
      expect(MethodExclusionService.isDefinitionClickable(prepareMetaTagsMethod, controllerPath)).toBe(true);
      expect(MethodExclusionService.isDefinitionJumpTarget(prepareMetaTagsMethod, controllerPath)).toBe(true);
      expect(MethodExclusionService.isCallDetectionEnabled(prepareMetaTagsMethod, controllerPath)).toBe(true);
    });
  });
  
  describe('パフォーマンス最適化', () => {
    test('除外判定はO(1)で実行される', () => {
      const methodName = 'show';
      const controllerPath = 'app/controllers/milestones_controller.rb';
      
      const startTime = performance.now();
      
      // 複数回実行してパフォーマンス測定
      for (let i = 0; i < 1000; i++) {
        MethodExclusionService.isDefinitionClickable(methodName, controllerPath);
        MethodExclusionService.isDefinitionJumpTarget(methodName, controllerPath);
        MethodExclusionService.isCallDetectionEnabled(methodName, controllerPath);
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // 1000回実行が100ms以内であること（十分高速）
      expect(executionTime).toBeLessThan(100);
    });
  });
});