/**
 * ウィンドウ中央配置のための統一ユーティリティ
 */

import { FloatingWindow } from '@/types/codebase';

export interface CenteringConfig {
  currentZoom: number;
  currentPan: { x: number; y: number };
  sidebarCollapsed: boolean;
  sidebarWidth: number;
}

export interface ViewportDimensions {
  width: number;
  height: number;
}

/**
 * ウィンドウを画面中央に配置するための新しいパン位置を計算
 * 
 * @param targetWindow 対象のフローティングウィンドウ
 * @param config ズーム、パン、サイドバー設定
 * @param viewportDimensions ビューポートサイズ（テスト用にオプション）
 * @returns 新しいパン位置
 */
export function calculateCenteringPan(
  targetWindow: FloatingWindow,
  config: CenteringConfig,
  viewportDimensions?: ViewportDimensions
): { x: number; y: number } {
  const { currentZoom, currentPan, sidebarCollapsed, sidebarWidth } = config;
  
  // キャンバスオフセット(2000px, 1000px)を考慮
  const canvasOffset = { x: 2000, y: 1000 };
  
  // ウィンドウの基本位置
  const windowX = targetWindow.position.x;
  const windowY = targetWindow.position.y;
  const windowWidth = targetWindow.position.width;
  const windowHeight = targetWindow.position.height;
  
  // 現在のメインエリア中心位置を計算
  const viewportWidth = viewportDimensions?.width ?? 
    (window.innerWidth - (sidebarCollapsed ? 48 : sidebarWidth));
  const viewportHeight = viewportDimensions?.height ?? window.innerHeight;
  
  const mainAreaCenter = {
    x: viewportWidth / 2,
    y: viewportHeight / 2
  };
  
  // 対象ウィンドウの現在位置（スクリーン座標系での中心）
  const targetWindowCenter = {
    x: (windowX + windowWidth / 2 + canvasOffset.x) * currentZoom + currentPan.x,
    y: (windowY + windowHeight / 2 + canvasOffset.y) * currentZoom + currentPan.y
  };
  
  // メインエリア中心と対象ウィンドウ中心の差分を計算
  const panDelta = {
    x: mainAreaCenter.x - targetWindowCenter.x,
    y: mainAreaCenter.y - targetWindowCenter.y
  };
  
  // 現在のパン位置に差分を加算して新しいパン位置を計算
  return {
    x: currentPan.x + panDelta.x,
    y: currentPan.y + panDelta.y
  };
}