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

/** Horizontal lockup height (mark + wordmark side-by-side). */
const HORIZONTAL_H: Record<BrandLogoSize, number> = {
  xs: 40,
  sm: 48,
  md: 56,
  lg: 68,
  xl: 84,
};

/** Compact mark / app-icon tile. Mark is slightly wider than tall (leaf). */
const MARK_PX: Record<BrandLogoSize, number> = {
  xs: 40,
  sm: 52,
  md: 68,
  lg: 88,
  xl: 112,
};

/** Full stacked lockup (mark above wordmark) — height of the whole asset. */
const STACKED_H: Record<BrandLogoSize, number> = {
  xs: 112,
  sm: 140,
  md: 172,
  lg: 208,
  xl: 248,
};

const SRC = {
  horizontal: {
    'on-light': '/branding/logo-horizontal-ink.png?v=2',
    'on-dark': '/branding/logo-horizontal-ivory.png?v=2',
  },
  stacked: {
    'on-light': '/branding/logo-stacked-ink.png?v=2',
    'on-dark': '/branding/logo-stacked-ivory.png?v=2',
  },
  mark: {
    'on-light': '/branding/mark-ink.png?v=2',
    'on-dark': '/branding/mark-ivory.png?v=2',
  },
  favicon: '/branding/mark-ink.png?v=2',
  appIcon: '/branding/app-icon.png?v=2',
} as const;

const BrandLogo: React.FC<Props> = ({
  size = 'md',
  variant = 'horizontal',
  tone = 'on-light',
  className = '',
  alt = 'The Olive Lot',
}) => {
  if (variant === 'stacked') {
    const height = STACKED_H[size];
    return (
      <img
        src={SRC.stacked[tone]}
        alt={alt}
        height={height}
        className={['brand-logo', 'brand-logo--stacked', className].filter(Boolean).join(' ')}
        style={{ height, width: 'auto' }}
        decoding="async"
      />
    );
  }

  const isTile = variant === 'app-icon' || variant === 'favicon';
  const isMark = variant === 'mark';
  const height = isTile || isMark ? MARK_PX[size] : HORIZONTAL_H[size];
  const src =
    variant === 'favicon'
      ? SRC.favicon
      : variant === 'app-icon'
        ? SRC.appIcon
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
