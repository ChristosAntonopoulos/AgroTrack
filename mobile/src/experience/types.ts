export type FontScale = 'default' | 'large' | 'xl';

export const FONT_SCALE_VALUES: Record<FontScale, number> = {
  default: 1,
  large: 1.15,
  xl: 1.3,
};

export const TAP_MIN_PX = {
  default: 44,
  large: 48,
} as const;
