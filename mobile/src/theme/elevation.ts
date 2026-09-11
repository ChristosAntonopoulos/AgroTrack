import { AppColors } from './themes';

export type ShadowLevel = 'sm' | 'md' | 'lg' | 'xl';

/** Aligns with web --shadow-sm / card / floating / overlay */
export const createElevation = (colors: AppColors, level: ShadowLevel) => {
  const shadowColor = colors.shadow;
  const configs = {
    sm: { offset: { width: 0, height: 1 }, opacity: 0.06, radius: 2, elevation: 1 },
    md: { offset: { width: 0, height: 2 }, opacity: 0.10, radius: 6, elevation: 3 },
    lg: { offset: { width: 0, height: 8 }, opacity: 0.16, radius: 14, elevation: 8 },
    xl: { offset: { width: -4, height: 0 }, opacity: 0.28, radius: 20, elevation: 12 },
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
