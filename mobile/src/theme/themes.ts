import { colors as lightColors } from './colors';

export type AppColors = typeof lightColors;

/** Olive grove at night — warm green-charcoal, never pure black. Source: theme.css dark. */
export const darkColors: AppColors = {
  ...lightColors,

  olive: '#71845B',
  sage: '#9AAA85',
  leaf: '#71845B',
  deepGrove: '#29382A',
  warmStone: 'rgba(235, 239, 230, 0.22)',
  limestone: '#141714',
  accentGold: '#B09A63',
  charcoal: '#F3F4EF',

  primary: '#71845B',
  primaryDark: '#82966A',
  primaryActive: '#60734C',
  primaryLight: 'rgba(113, 132, 91, 0.18)',
  oliveBorder: 'rgba(139, 160, 112, 0.42)',
  onOlive: '#FFFFFF',

  secondary: '#879086',
  secondaryDark: '#A2A99D',
  secondaryLight: '#6B7469',

  success: '#62916D',
  successLight: 'rgba(98, 145, 109, 0.22)',
  successDark: '#4f7a58',

  warning: '#C8924E',
  warningLight: 'rgba(200, 146, 78, 0.22)',
  warningDark: '#a8783a',

  error: '#C96656',
  errorLight: 'rgba(201, 102, 86, 0.22)',
  errorDark: '#a85548',

  info: '#5F95A8',
  infoLight: 'rgba(95, 149, 168, 0.22)',
  infoDark: '#4a7a8a',

  neutral: '#879086',
  neutralLight: 'rgba(135, 144, 134, 0.22)',

  white: '#202520',
  black: '#000000',

  gray50: '#1A1E1A',
  gray100: '#202520',
  gray200: '#272D27',
  gray300: '#2E352E',
  gray400: '#9DA699',
  gray500: '#C5CBBF',
  gray600: '#D9D5C8',
  gray700: '#EBEFE6',
  gray800: '#F3F4EF',
  gray900: '#F3F4EF',

  background: '#141714',
  backgroundLight: '#1A1E1A',
  backgroundDark: '#0A0C08',
  backgroundSidebar: '#1A1E1A',
  surface: '#202520',
  surfaceElevated: '#272D27',
  surfaceMuted: '#272D27',
  surface3: '#2E352E',
  surfaceHover: '#343C34',
  surfaceSelected: '#29372B',

  textPrimary: '#F3F4EF',
  textSecondary: '#C5CBBF',
  textTertiary: '#9DA699',
  textDisabled: '#717A70',
  textInverse: '#141714',

  headerBackground: '#202320',
  headerForeground: '#F3F4EF',
  headerForegroundMuted: '#C5CBBF',
  headerAccent: '#71845B',
  headerBorder: 'rgba(235, 239, 230, 0.14)',
  tabBarBackground: '#202320',
  tabBarForeground: '#71845B',
  tabBarForegroundInactive: '#C5CBBF',
  tabBarBorder: 'rgba(235, 239, 230, 0.14)',
  tabBarActivePill: 'rgba(113, 132, 91, 0.18)',

  border: 'rgba(235, 239, 230, 0.14)',
  borderLight: 'rgba(235, 239, 230, 0.09)',
  borderDark: 'rgba(235, 239, 230, 0.22)',

  link: '#A9BE91',
  linkHover: '#C5D5B3',
  focusRing: '#B7CD98',
  backdrop: 'rgba(7, 10, 7, 0.68)',

  shadow: 'rgba(10, 15, 9, 0.28)',
  shadowDark: 'rgba(5, 8, 5, 0.50)',

  timeline: 'rgba(139, 160, 112, 0.42)',

  lifecycleLow: '#8DA776',
  lifecycleHigh: '#B09A63',
  taskPending: '#B09A63',
  taskInProgress: '#70A9BA',
  taskCompleted: '#8DA776',

  eventWork: '#8DA776',
  eventWorkSoft: 'rgba(141, 167, 118, 0.18)',
  eventObservation: '#A18BB8',
  eventObservationSoft: 'rgba(161, 139, 184, 0.20)',
  eventExpense: '#D2A064',
  eventExpenseSoft: 'rgba(210, 160, 100, 0.19)',
  eventIncome: '#72AD85',
  eventIncomeSoft: 'rgba(114, 173, 133, 0.19)',
  eventHarvest: '#B47870',
  eventHarvestSoft: 'rgba(180, 120, 112, 0.20)',
  eventWeather: '#70A9BA',
  eventWeatherSoft: 'rgba(112, 169, 186, 0.20)',
  eventWarning: '#D77A68',
  eventWarningSoft: 'rgba(215, 122, 104, 0.20)',
  eventFieldChange: '#929E9F',
  eventFieldChangeSoft: 'rgba(146, 158, 159, 0.19)',
  eventLifecycle: '#B0AA6E',
  eventLifecycleSoft: 'rgba(176, 170, 110, 0.18)',

  weatherBlue: '#70A9BA',
  rain: '#588EA5',
  temperature: '#CB8B55',
  humidity: '#719CAC',
  wind: '#94A89A',
  frost: '#8CA9BF',

  mapBoundary: '#91B56F',
  mapSelectedFill: 'rgba(113, 132, 91, 0.18)',
  mapHoverFill: 'rgba(113, 132, 91, 0.10)',
  mapWarningOutline: '#D77A68',
  mapOtherOutline: '#879086',

  domainTask: '#3A6EA5',

  bannerErrorBg: 'rgba(201, 102, 86, 0.22)',
  bannerErrorBorder: '#C96656',
  bannerWarningBg: 'rgba(200, 146, 78, 0.22)',
  bannerWarningBorder: '#C8924E',
};

export { lightColors };

export type ThemeMode = 'system' | 'light' | 'dark';

