/**
 * MethodExclusionService Arrow Target Tests
 * 
 * 🎯 Rails標準アクション矢印ターゲット除外機能のテスト
 * 
 * 問題: def newなどのRails標準アクションが矢印の終点として表示される
 * 解決: isValidArrowTarget() APIで矢印ターゲット可否を制御
 */

import { MethodExclusionService } from '@/services/MethodExclusionService';

describe('MethodExclusionService - Arrow Target Control', () => {
  describe('isValidArrowTarget()', () => {
    describe('Rails Controller Standard Actions', () => {
      const standardActions = ['index', 'show', 'new', 'edit', 'create', 'update', 'destroy'];
      const controllerPath = 'app/controllers/milestones_controller.rb';

      test.each(standardActions)('should return false for %s action', (action) => {
        expect(MethodExclusionService.isValidArrowTarget(action, controllerPath)).toBe(false);
      });

      test('should not affect custom methods in controller', () => {
        const customMethods = ['prepare_meta_tags', 'custom_method', 'build_milestone'];
        
        customMethods.forEach(method => {
          expect(MethodExclusionService.isValidArrowTarget(method, controllerPath)).toBe(true);
        });
      });
    });

    describe('Non-Controller Files', () => {
      const standardActions = ['index', 'show', 'new', 'edit', 'create', 'update', 'destroy'];
      const nonControllerPaths = [
        'app/models/milestone.rb',
        'lib/utils/helper.rb',
        'app/services/milestone_service.rb'
      ];

      test.each(nonControllerPaths)('should allow all methods in %s', (filePath) => {
        standardActions.forEach(action => {
          expect(MethodExclusionService.isValidArrowTarget(action, filePath)).toBe(true);
        });
      });
    });

    describe('Edge Cases', () => {
      test('should handle empty method name', () => {
        expect(MethodExclusionService.isValidArrowTarget('', 'app/controllers/test_controller.rb')).toBe(true);
      });

      test('should handle non-standard controller naming', () => {
        expect(MethodExclusionService.isValidArrowTarget('new', 'app/controllers/api_v1_controller.rb')).toBe(false);
      });

      test('should handle method name with spaces', () => {
        expect(MethodExclusionService.isValidArrowTarget('new method', 'app/controllers/test_controller.rb')).toBe(true);
      });
    });
  });

  describe('Integration with existing APIs', () => {
    const controllerPath = 'app/controllers/milestones_controller.rb';

    test('Rails standard action should have correct exclusion settings', () => {
      const settings = MethodExclusionService.getDetailedExclusionSettings('new', controllerPath);
      
      expect(settings.definitionClickable).toBe(false);    // クリック不可
      expect(settings.definitionJumpTarget).toBe(false);   // ジャンプ対象外
      expect(settings.callDetectionEnabled).toBe(true);    // 呼び出し検知有効
      // 🎯 新機能: 矢印ターゲット不可
      expect(MethodExclusionService.isValidArrowTarget('new', controllerPath)).toBe(false);
    });

    test('Custom method should have correct exclusion settings', () => {
      const settings = MethodExclusionService.getDetailedExclusionSettings('prepare_meta_tags', controllerPath);
      
      expect(settings.definitionClickable).toBe(true);     // クリック可能
      expect(settings.definitionJumpTarget).toBe(true);    // ジャンプ対象
      expect(settings.callDetectionEnabled).toBe(true);    // 呼び出し検知有効
      // 🎯 新機能: 矢印ターゲット可能
      expect(MethodExclusionService.isValidArrowTarget('prepare_meta_tags', controllerPath)).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should execute isValidArrowTarget efficiently', () => {
      const controllerPath = 'app/controllers/test_controller.rb';
      const startTime = performance.now();
      
      // 1000回実行
      for (let i = 0; i < 1000; i++) {
        MethodExclusionService.isValidArrowTarget('new', controllerPath);
        MethodExclusionService.isValidArrowTarget('custom_method', controllerPath);
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // 100ms以内で完了することを期待
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('Dependency Extractor Integration Test', () => {
    test('should prevent arrows to Rails standard actions', () => {
      const scenarios = [
        { method: 'new', path: 'app/controllers/milestones_controller.rb', shouldBeTarget: false },
        { method: 'show', path: 'app/controllers/users_controller.rb', shouldBeTarget: false },
        { method: 'prepare_meta_tags', path: 'app/controllers/milestones_controller.rb', shouldBeTarget: true },
        { method: 'custom_method', path: 'app/controllers/base_controller.rb', shouldBeTarget: true }
      ];

      scenarios.forEach(({ method, path, shouldBeTarget }) => {
        expect(MethodExclusionService.isValidArrowTarget(method, path)).toBe(shouldBeTarget);
      });
    });
  });
});