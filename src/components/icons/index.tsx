/**
 * SVGアイコンコンポーネント集
 * DRY原則に従い、共通のアイコンを一箇所で管理
 */

import React from 'react';

export interface IconProps {
  className?: string;
  size?: number;
}

/**
 * 稲妻アイコン (デモセクションのメインアイコン)
 */
export const LightningIcon: React.FC<IconProps> = ({ className = "w-16 h-16 mx-auto" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

/**
 * チェックアイコン (機能一覧のバッジ用)
 */
export const CheckIcon: React.FC<IconProps> = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
    <path d="M5 13l4 4L19 7"></path>
  </svg>
);

/**
 * エラーアイコン (エラー表示用)
 */
export const ErrorIcon: React.FC<IconProps> = ({ className = "w-6 h-6 shrink-0 stroke-current" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

/**
 * 再生アイコン (体験ボタン用)
 */
export const PlayIcon: React.FC<IconProps> = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
  </svg>
);

/**
 * ローディングスピナー (ローディング状態用)
 */
export const LoadingSpinner: React.FC<IconProps> = ({ className = "loading loading-spinner loading-sm" }) => (
  <span className={className}></span>
);

/**
 * アイコンのプリセットサイズ
 */
export const ICON_SIZES = {
  xs: "w-3 h-3",
  sm: "w-4 h-4", 
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
  xxl: "w-16 h-16"
} as const;

/**
 * 統一されたアイコンセット
 */
export const Icons = {
  Lightning: LightningIcon,
  Check: CheckIcon,
  Error: ErrorIcon,
  Play: PlayIcon,
  LoadingSpinner: LoadingSpinner
} as const;