/**
 * SVGアイコンコンポーネント集
 * DRY原則に従い、共通のアイコンを一箇所で管理
 */

import React from 'react';

// 型システムの完全化 - アイコンの完全な型定義
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type IconColor = 'primary' | 'secondary' | 'accent' | 'neutral' | 'current';
export type IconVariant = 'filled' | 'outlined' | 'ghost';
export type IconUsage = 'button' | 'decoration' | 'status' | 'navigation' | 'feedback';

// 品質保証済みアイコンプロパティ
export interface IconProps {
  className?: string;
  size?: IconSize;
  color?: IconColor;
  variant?: IconVariant;
  usage: IconUsage; // 使用目的を明確化
  // アクセシビリティ
  ariaLabel?: string;
  ariaHidden?: boolean;
  // パフォーマンス
  lazy?: boolean;
}

/**
 * 稲妻アイコン (デモセクションのメインアイコン)
 */
export const LightningIcon: React.FC<IconProps> = ({ 
  className,
  size = 'xxl',
  color = 'current',
  variant = 'filled',
  usage,
  ariaLabel,
  ariaHidden = false,
  lazy = false
}) => {
  // サイズマッピング
  const sizeClass = size ? ICON_SIZES[size] : undefined;
  const finalClassName = className || `${sizeClass} mx-auto`;
  
  // 色設定
  const colorClass = color !== 'current' ? `text-${color}` : '';
  const finalClasses = [finalClassName, colorClass].filter(Boolean).join(' ');
  
  // アクセシビリティ属性
  const accessibilityProps = {
    'aria-label': ariaLabel || (usage === 'decoration' ? undefined : 'Lightning icon'),
    'aria-hidden': ariaHidden || usage === 'decoration',
    role: usage === 'decoration' ? 'presentation' : 'img'
  };
  
  return (
    <svg 
      className={finalClasses} 
      fill={variant === 'filled' ? 'currentColor' : 'none'} 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      {...accessibilityProps}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={variant === 'outlined' ? 1 : 2} 
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
  color = 'current',
  variant = 'filled',
  usage,
  ariaLabel,
  ariaHidden = false,
  lazy = false
}) => {
  const sizeClass = size ? ICON_SIZES[size] : undefined;
  const finalClassName = className || sizeClass;
  const colorClass = color !== 'current' ? `text-${color}` : '';
  const finalClasses = [finalClassName, colorClass].filter(Boolean).join(' ');
  
  const accessibilityProps = {
    'aria-label': ariaLabel || (usage === 'decoration' ? undefined : 'Check icon'),
    'aria-hidden': ariaHidden || usage === 'decoration',
    role: usage === 'decoration' ? 'presentation' : 'img'
  };
  
  return (
    <svg 
      className={finalClasses} 
      fill={variant === 'filled' ? 'currentColor' : 'none'} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={variant === 'outlined' ? 1 : 2} 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      {...accessibilityProps}
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
  color = 'current',
  variant = 'filled',
  usage,
  ariaLabel,
  ariaHidden = false,
  lazy = false
}) => {
  const sizeClass = size ? ICON_SIZES[size] : undefined;
  const finalClassName = className || `${sizeClass} shrink-0 stroke-current`;
  const colorClass = color !== 'current' ? `text-${color}` : '';
  const finalClasses = [finalClassName, colorClass].filter(Boolean).join(' ');
  
  const accessibilityProps = {
    'aria-label': ariaLabel || (usage === 'decoration' ? undefined : 'Error icon'),
    'aria-hidden': ariaHidden || usage === 'decoration',
    role: usage === 'decoration' ? 'presentation' : 'img'
  };
  
  return (
    <svg 
      className={finalClasses} 
      fill={variant === 'filled' ? 'currentColor' : 'none'} 
      viewBox="0 0 24 24"
      {...accessibilityProps}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={variant === 'outlined' ? 1 : 2} 
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
  color = 'current',
  variant = 'filled',
  usage,
  ariaLabel,
  ariaHidden = false,
  lazy = false
}) => {
  const sizeClass = size ? ICON_SIZES[size] : undefined;
  const finalClassName = className || sizeClass;
  const colorClass = color !== 'current' ? `text-${color}` : '';
  const finalClasses = [finalClassName, colorClass].filter(Boolean).join(' ');
  
  const accessibilityProps = {
    'aria-label': ariaLabel || (usage === 'decoration' ? undefined : 'Play icon'),
    'aria-hidden': ariaHidden || usage === 'decoration',
    role: usage === 'decoration' ? 'presentation' : 'img'
  };
  
  return (
    <svg 
      className={finalClasses} 
      fill={variant === 'filled' ? 'currentColor' : 'none'} 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      {...accessibilityProps}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={variant === 'outlined' ? 1 : 2} 
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
  color = 'current',
  variant = 'filled',
  usage,
  ariaLabel,
  ariaHidden = false,
  lazy = false
}) => {
  const sizeMap = {
    'xs': 'loading-xs',
    'sm': 'loading-sm',
    'md': 'loading-md',
    'lg': 'loading-lg',
    'xl': 'loading-lg',
    'xxl': 'loading-lg'
  };
  
  const sizeClass = size ? sizeMap[size] : 'loading-sm';
  const finalClassName = className || `loading loading-spinner ${sizeClass}`;
  const colorClass = color !== 'current' ? `text-${color}` : '';
  const finalClasses = [finalClassName, colorClass].filter(Boolean).join(' ');
  
  const accessibilityProps = {
    'aria-label': ariaLabel || (usage === 'decoration' ? undefined : 'Loading'),
    'aria-hidden': ariaHidden || usage === 'decoration',
    role: usage === 'decoration' ? 'presentation' : 'status'
  };
  
  return (
    <span 
      className={finalClasses}
      {...accessibilityProps}
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