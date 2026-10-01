import type { AppColors } from './themes';

/** Pipeline step fills — distinct process colors for outdoor readability. */
export const harvestPipelinePalette = {
  sacks: { bg: '#FFF1D8', icon: '#B86A21' },
  fruit: { bg: '#E9EDDC', icon: '#53622E' },
  oil: { bg: '#F5E7B7', icon: '#9B741C' },
} as const;

/** Form accents for harvest sheets — soft fill + strong action color. */
export const harvestFormAccent = {
  sacks: { soft: '#FFF1D8', strong: '#B86A21', key: 'sacks' as const },
  mill: { soft: '#E9EDDC', strong: '#53622E', key: 'fruit' as const },
  oil: { soft: '#F5E7B7', strong: '#9B741C', key: 'oil' as const },
  people: { soft: '#E8ECD9', strong: '#4F5C2F', key: 'people' as const },
  default: { soft: '#E8ECD9', strong: '#4F5C2F', key: 'default' as const },
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
    primary: '#4F5C2F',
    primaryDark: '#35421F',
    primaryActive: '#35421F',
    primaryLight: '#E8ECD9',
    oliveBorder: '#DDD8CA',
    onOlive: '#FFFFFF',
    accentGold: '#A67B1F',
    olive: '#4F5C2F',
    leaf: '#4F5C2F',
    background: '#F6F2E8',
    backgroundLight: '#F6F2E8',
    backgroundSidebar: '#E8ECD9',
    surface: '#FFFDF8',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#E8ECD9',
    surface3: '#E8ECD9',
    surfaceHover: '#F3F0E6',
    surfaceSelected: '#E8ECD9',
    headerBackground: '#FFFDF8',
    headerAccent: '#4F5C2F',
    headerBorder: '#DDD8CA',
    tabBarBackground: '#FFFDF8',
    tabBarForeground: '#4F5C2F',
    tabBarForegroundInactive: '#65675D',
    tabBarActivePill: '#E8ECD9',
    tabBarBorder: '#DDD8CA',
    border: '#DDD8CA',
    borderLight: '#E5E1D4',
    textPrimary: '#24251F',
    textSecondary: '#65675D',
    textTertiary: '#8C8E83',
    link: '#35421F',
    focusRing: '#4F5C2F',
    success: '#2F6B43',
    successLight: '#E1EFE4',
    successDark: '#245536',
    eventHarvest: '#C7653F',
    eventHarvestSoft: '#F4E1D7',
    shadow: 'rgba(44, 42, 32, 0.08)',
  };
};
