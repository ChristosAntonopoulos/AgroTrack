export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// Common spacing patterns
export const spacingPatterns = {
  // Padding
  padding: {
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    base: spacing.base,
    lg: spacing.lg,
    xl: spacing.xl,
  },
  
  // Margin
  margin: {
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    base: spacing.base,
    lg: spacing.lg,
    xl: spacing.xl,
  },
  
  // Gaps
  gap: {
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    base: spacing.base,
    lg: spacing.lg,
    xl: spacing.xl,
  },
  
  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  // Shadows
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};
