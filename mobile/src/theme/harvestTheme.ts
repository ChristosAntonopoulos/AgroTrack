import type { AppColors } from './themes';

/** Pipeline accents — used sparingly (icons/hints), not whole pastel slabs. */
export const harvestPipelinePalette = {
  sacks: { bg: '#F4E7D6', icon: '#8F4F18' },
  fruit: { bg: '#E7ECD9', icon: '#34451D' },
  oil: { bg: '#F0E6C8', icon: '#8F6A14' },
} as const;

/** Form accents for harvest sheets — soft fill + strong action color. */
export const harvestFormAccent = {
  sacks: { soft: '#F4E7D6', strong: '#8F4F18', key: 'sacks' as const },
  mill: { soft: '#E7ECD9', strong: '#34451D', key: 'fruit' as const },
  oil: { soft: '#F0E6C8', strong: '#8F6A14', key: 'oil' as const },
  people: { soft: '#E7ECD9', strong: '#34451D', key: 'people' as const },
  default: { soft: '#E7ECD9', strong: '#34451D', key: 'default' as const },
} as const;

export type HarvestFormAccentKey = keyof typeof harvestFormAccent;

/**
 * Live harvest palette — crisp outdoor olive + terracotta harvest accent.
 * Base light theme already carries the field-instrument colors; this only
 * locks harvest-specific accents while campaign is live.
 * Callers skip this when the sun palette is active so parchment is not restored.
 */
export const applyHarvestLivePalette = (base: AppColors, isDark: boolean): AppColors => {
  if (isDark) {
    return {
      ...base,
      primary: '#8d8a53',
      primaryDark: '#a07a58',
      primaryActive: '#6f6d42',
      primaryLight: 'rgba(208, 165, 107, 0.22)',
      oliveBorder: 'rgba(208, 165, 107, 0.42)',
      onOlive: '#fffdf8',
      accentGold: '#d0a56b',
      olive: '#8d8a53',
      leaf: '#8d8a53',
      background: '#1a1612',
      backgroundLight: '#1a1612',
      surface: '#241f1a',
      surfaceElevated: '#2a241e',
      surfaceMuted: '#2a241e',
      surface3: '#322b24',
      surfaceHover: '#2e2821',
      surfaceSelected: '#353028',
      headerBackground: '#241f1a',
      headerAccent: '#d0a56b',
      headerBorder: 'rgba(208, 165, 107, 0.22)',
      tabBarBackground: '#241f1a',
      tabBarForeground: '#d0a56b',
      tabBarForegroundInactive: '#9a8f82',
      tabBarActivePill: 'rgba(208, 165, 107, 0.22)',
      tabBarBorder: 'rgba(208, 165, 107, 0.22)',
      border: 'rgba(208, 165, 107, 0.22)',
      borderLight: 'rgba(235, 229, 220, 0.10)',
      textPrimary: '#f2ebdd',
      textSecondary: '#b8aea0',
      textTertiary: '#9a8f82',
      link: '#d0a56b',
      focusRing: '#8d8a53',
      eventHarvest: '#c18667',
      eventHarvestSoft: 'rgba(193, 134, 103, 0.22)',
    };
  }

  return {
    ...base,
    primary: '#34451D',
    primaryDark: '#2A3818',
    primaryActive: '#2A3818',
    primaryLight: '#E7ECD9',
    oliveBorder: '#D5D8C8',
    onOlive: '#FFFFFF',
    accentGold: '#8F6A14',
    olive: '#34451D',
    leaf: '#34451D',
    background: '#FAFAF6',
    backgroundLight: '#FAFAF6',
    backgroundSidebar: '#E7ECD9',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#E7ECD9',
    surface3: '#E7ECD9',
    surfaceHover: '#F3F4EE',
    surfaceSelected: '#E7ECD9',
    headerBackground: '#FAFAF6',
    headerAccent: '#34451D',
    headerBorder: '#D5D8C8',
    tabBarBackground: '#FFFFFF',
    tabBarForeground: '#34451D',
    tabBarForegroundInactive: '#60635A',
    tabBarActivePill: '#E7ECD9',
    tabBarBorder: '#D5D8C8',
    border: '#D5D8C8',
    borderLight: '#E3E5DB',
    textPrimary: '#181A15',
    textSecondary: '#60635A',
    textTertiary: '#8A8D84',
    link: '#2A3818',
    focusRing: '#34451D',
    success: '#2F6B43',
    successLight: '#E1EFE4',
    successDark: '#245536',
    eventHarvest: '#A85A2E',
    eventHarvestSoft: '#F3E0D4',
    shadow: 'rgba(24, 26, 21, 0.1)',
  };
};
