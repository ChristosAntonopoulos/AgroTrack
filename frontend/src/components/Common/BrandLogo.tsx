import React from 'react';
import './BrandLogo.css';

export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type BrandLogoVariant = 'horizontal' | 'stacked' | 'mark' | 'favicon' | 'app-icon';
export type BrandLogoTone = 'on-light' | 'on-dark';

type Props = {
  size?: BrandLogoSize;
  variant?: BrandLogoVariant;
  tone?: BrandLogoTone;
  className?: string;
  alt?: string;
};

const HORIZONTAL_H: Record<BrandLogoSize, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 56,
  xl: 72,
};

const MARK_PX: Record<BrandLogoSize, number> = {
  xs: 28,
  sm: 40,
  md: 56,
  lg: 72,
  xl: 96,
};

const STACKED_MARK: Record<BrandLogoSize, number> = {
  xs: 40,
  sm: 52,
  md: 64,
  lg: 80,
  xl: 96,
};

const SRC = {
  horizontal: {
    'on-light': '/branding/oleachron-logo-horizontal-light.png',
    'on-dark': '/branding/oleachron-logo-horizontal-dark.png',
  },
  mark: {
    'on-light': '/branding/oleachron-mark-light.png',
    'on-dark': '/branding/oleachron-mark-dark.png',
  },
  wordmark: {
    'on-light': '/branding/oleachron-wordmark-light.png',
    'on-dark': '/branding/oleachron-wordmark-dark.png',
  },
  favicon: '/branding/oleachron-favicon-mark.png',
  appIcon: {
    'on-light': '/branding/oleachron-app-icon-light.png',
    'on-dark': '/branding/oleachron-app-icon-dark.png',
  },
} as const;

const BrandLogo: React.FC<Props> = ({
  size = 'md',
  variant = 'horizontal',
  tone = 'on-light',
  className = '',
  alt = 'Oleachron',
}) => {
  if (variant === 'stacked') {
    const markH = STACKED_MARK[size];
    return (
      <div className={['brand-logo', 'brand-logo--stacked', className].filter(Boolean).join(' ')}>
        <img
          src={SRC.mark[tone]}
          alt=""
          height={markH}
          className="brand-logo-stacked-mark"
          style={{ height: markH, width: 'auto' }}
          decoding="async"
        />
        <img
          src={SRC.wordmark[tone]}
          alt={alt}
          className="brand-logo-stacked-wordmark"
          decoding="async"
        />
      </div>
    );
  }

  const isTile = variant === 'app-icon' || variant === 'favicon' || variant === 'mark';
  const height = isTile ? MARK_PX[size] : HORIZONTAL_H[size];
  const src =
    variant === 'favicon'
      ? SRC.favicon
      : variant === 'app-icon'
        ? SRC.appIcon[tone]
        : variant === 'mark'
          ? SRC.mark[tone]
          : SRC.horizontal[tone];

  return (
    <img
      src={src}
      alt={alt}
      height={height}
      className={['brand-logo', `brand-logo--${variant}`, className].filter(Boolean).join(' ')}
      style={{ height, width: isTile ? height : 'auto' }}
      decoding="async"
    />
  );
};

export default BrandLogo;
