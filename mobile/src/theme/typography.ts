import { Platform } from 'react-native';

/**
 * Noto Sans has full Greek coverage on Android.
 * iOS keeps the system UI font (excellent Greek) unless a custom face is loaded.
 */
export const appFonts = {
  regular: Platform.select({ ios: 'System', android: 'NotoSans_400Regular', default: 'System' })!,
  medium: Platform.select({ ios: 'System', android: 'NotoSans_500Medium', default: 'System' })!,
  semibold: Platform.select({ ios: 'System', android: 'NotoSans_600SemiBold', default: 'System' })!,
  bold: Platform.select({ ios: 'System', android: 'NotoSans_700Bold', default: 'System' })!,
};

export const typography = {
  fontFamily: {
    regular: appFonts.regular,
    medium: appFonts.medium,
    bold: appFonts.bold,
    light: appFonts.regular,
  },

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  /** Mild tracking — strong negative spacing breaks Greek glyph spacing on Android. */
  letterSpacing: {
    display: -0.2,
    title: -0.15,
    label: 0.15,
    caps: 0.35,
  },

  styles: {
    display: {
      fontFamily: appFonts.bold,
      fontSize: 34,
      fontWeight: '700' as const,
      lineHeight: 40,
      letterSpacing: -0.2,
    },
    h1: {
      fontFamily: appFonts.bold,
      fontSize: 34,
      fontWeight: '700' as const,
      lineHeight: 40,
      letterSpacing: -0.2,
    },
    h2: {
      fontFamily: appFonts.bold,
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 34,
      letterSpacing: -0.15,
    },
    h3: {
      fontFamily: appFonts.semibold,
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
      letterSpacing: -0.1,
    },
    h4: {
      fontFamily: appFonts.semibold,
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
      letterSpacing: 0,
    },
    h5: {
      fontFamily: appFonts.semibold,
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    h6: {
      fontFamily: appFonts.semibold,
      fontSize: 15,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    body: {
      fontFamily: appFonts.regular,
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodySmall: {
      fontFamily: appFonts.regular,
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontFamily: appFonts.medium,
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
    },
    overline: {
      fontFamily: appFonts.bold,
      fontSize: 11,
      fontWeight: '700' as const,
      lineHeight: 14,
      letterSpacing: 0.35,
      textTransform: 'uppercase' as const,
    },
    button: {
      fontFamily: appFonts.semibold,
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    label: {
      fontFamily: appFonts.medium,
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
  },
};
