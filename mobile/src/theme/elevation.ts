import { AppColors } from './themes';

export type ShadowLevel = 'flat' | 'sm' | 'raised' | 'md' | 'floating' | 'lg' | 'xl';

/** Quiet matte elevation — cards stay almost flat; dock/sheets float. */
export const createElevation = (colors: AppColors, level: ShadowLevel) => {
  const shadowColor = colors.shadow;
  const configs = {
    flat: { offset: { width: 0, height: 0 }, opacity: 0, radius: 0, elevation: 0 },
    sm: { offset: { width: 0, height: 2 }, opacity: 0.05, radius: 8, elevation: 1 },
    raised: { offset: { width: 0, height: 2 }, opacity: 0.06, radius: 8, elevation: 2 },
    md: { offset: { width: 0, height: 4 }, opacity: 0.08, radius: 12, elevation: 3 },
    floating: { offset: { width: 0, height: 8 }, opacity: 0.12, radius: 20, elevation: 8 },
    lg: { offset: { width: 0, height: 10 }, opacity: 0.14, radius: 24, elevation: 10 },
    xl: { offset: { width: -4, height: 0 }, opacity: 0.28, radius: 20, elevation: 12 },
  };
  const c = configs[level] ?? configs.sm;
  return {
    shadowColor,
    shadowOffset: c.offset,
    shadowOpacity: c.opacity,
    shadowRadius: c.radius,
    elevation: c.elevation,
  };
};
