import React from 'react';
import './BrandLogo.css';

type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  size?: BrandLogoSize;
  className?: string;
  alt?: string;
  rounded?: boolean;
};

const SIZE_PX: Record<BrandLogoSize, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 64,
  xl: 88,
};

const BrandLogo: React.FC<Props> = ({
  size = 'md',
  className = '',
  alt = 'AgroTrack',
  rounded = true,
}) => {
  const px = SIZE_PX[size];
  const src = size === 'xs' || size === 'sm' ? '/branding/logo-sm.png' : '/branding/logo.png';

  return (
    <img
      src={src}
      alt={alt}
      width={px}
      height={px}
      className={['brand-logo', rounded && 'brand-logo--rounded', className].filter(Boolean).join(' ')}
      style={{ width: px, height: px }}
      decoding="async"
    />
  );
};

export default BrandLogo;
