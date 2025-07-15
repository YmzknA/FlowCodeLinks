/**
 * SVGアイコンコンポーネント集
 * DRY原則に従い、共通のアイコンを一箇所で管理
 */

import React from 'react';

export interface IconProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  ariaLabel?: string;
  ariaHidden?: boolean;
}

/**
 * 稲妻アイコン (デモセクションのメインアイコン)
 */
export const LightningIcon: React.FC<IconProps> = ({ 
  className,
  size = 'xxl',
  ariaLabel,
  ariaHidden = false
}) => {
  const sizeClass = size ? ICON_SIZES[size] : undefined;
  const finalClassName = className || `${sizeClass} mx-auto`;
  
  return (
    <svg 
      className={finalClassName} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M13 10V3L4 14h7v7l9-11h-7z" 
      />
    </svg>
  );
};

/**
 * チェックアイコン (機能一覧のバッジ用)
 */
export const CheckIcon: React.FC<IconProps> = ({ 
  className,
  size = 'xs',
  ariaLabel,
  ariaHidden = false
}) => {
  const sizeClass = size ? ICON_SIZES[size] : undefined;
  const finalClassName = className || sizeClass;
  
  return (
    <svg 
      className={finalClassName} 
      fill="none" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    >
      <path d="M5 13l4 4L19 7"></path>
    </svg>
  );
};

/**
 * エラーアイコン (エラー表示用)
 */
export const ErrorIcon: React.FC<IconProps> = ({ 
  className,
  size = 'lg',
  ariaLabel,
  ariaHidden = false
}) => {
  const sizeClass = size ? ICON_SIZES[size] : undefined;
  const finalClassName = className || `${sizeClass} shrink-0 stroke-current`;
  
  return (
    <svg 
      className={finalClassName} 
      fill="none" 
      viewBox="0 0 24 24"
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  );
};

/**
 * 再生アイコン (体験ボタン用)
 */
export const PlayIcon: React.FC<IconProps> = ({ 
  className,
  size = 'md',
  ariaLabel,
  ariaHidden = false
}) => {
  const sizeClass = size ? ICON_SIZES[size] : undefined;
  const finalClassName = className || sizeClass;
  
  return (
    <svg 
      className={finalClassName} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M5 3l14 9-14 9V3z" 
      />
    </svg>
  );
};

/**
 * ローディングスピナー (ローディング状態用)
 */
export const LoadingSpinner: React.FC<IconProps> = ({ 
  className,
  size = 'sm',
  ariaLabel,
  ariaHidden = false
}) => {
  const sizeClass = size ? `loading-${size}` : 'loading-sm';
  const finalClassName = className || `loading loading-spinner ${sizeClass}`;
  
  return (
    <span 
      className={finalClassName}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    ></span>
  );
};

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