/**
 * ウィンドウ中央配置のための統一ユーティリティ
 */

import { FloatingWindow } from '@/types/codebase';
import { CANVAS_CONFIG } from '@/config/canvas';

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
  
  // キャンバスオフセットを設定から取得
  const canvasOffset = CANVAS_CONFIG.OFFSET;
  
  // ウィンドウの基本位置
  const windowX = targetWindow.position.x;
  const windowY = targetWindow.position.y;
  const windowWidth = targetWindow.position.width;
  const windowHeight = targetWindow.position.height;
  
  // 現在のビューポートサイズを計算
  const viewportWidth = viewportDimensions?.width ?? 
    (window.innerWidth - (sidebarCollapsed ? 48 : sidebarWidth));
  const viewportHeight = viewportDimensions?.height ?? window.innerHeight;
  
  // 対象ウィンドウのキャンバス座標（canvasOffset込み）
  const targetCanvasX = windowX + windowWidth / 2 + canvasOffset.x;
  const targetCanvasY = windowY + windowHeight / 2 + canvasOffset.y;
  
  // 計算結果
  const result = {
    x: viewportWidth / 2 - targetCanvasX * currentZoom,
    y: viewportHeight / 2 - targetCanvasY * currentZoom
  };
  
  return result;
}