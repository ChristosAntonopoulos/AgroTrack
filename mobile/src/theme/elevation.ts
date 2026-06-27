import { AppColors } from './themes';

type ShadowLevel = 'sm' | 'md' | 'lg' | 'xl';

export const createElevation = (colors: AppColors, level: ShadowLevel) => {
  const shadowColor = colors.shadow;
  const configs = {
    sm: { offset: { width: 0, height: 1 }, opacity: 0.08, radius: 3, elevation: 2 },
    md: { offset: { width: 0, height: 2 }, opacity: 0.12, radius: 6, elevation: 4 },
    lg: { offset: { width: 0, height: 4 }, opacity: 0.14, radius: 10, elevation: 6 },
    xl: { offset: { width: 0, height: 8 }, opacity: 0.16, radius: 16, elevation: 10 },
  };
  const c = configs[level];
  return {
    shadowColor,
    shadowOffset: c.offset,
    shadowOpacity: c.opacity,
    shadowRadius: c.radius,
    elevation: c.elevation,
  };
};
