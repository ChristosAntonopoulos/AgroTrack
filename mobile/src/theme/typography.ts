export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
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

  /** Display titles — tighter tracking for large journal chrome */
  letterSpacing: {
    display: -0.8,
    title: -0.5,
    label: 0.2,
    caps: 0.45,
  },

  styles: {
    display: {
      fontSize: 34,
      fontWeight: '700' as const,
      lineHeight: 40,
      letterSpacing: -0.9,
    },
    h1: {
      fontSize: 34,
      fontWeight: '700' as const,
      lineHeight: 40,
      letterSpacing: -0.8,
    },
    h2: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 34,
      letterSpacing: -0.6,
    },
    h3: {
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
      letterSpacing: -0.35,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
      letterSpacing: -0.2,
    },
    h5: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    h6: {
      fontSize: 15,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
    },
    overline: {
      fontSize: 11,
      fontWeight: '700' as const,
      lineHeight: 14,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    label: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
  },
};
