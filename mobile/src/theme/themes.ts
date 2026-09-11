import { colors as lightColors } from './colors';

export type AppColors = typeof lightColors;

/** Dark theme — warm green-charcoal from frontend theme.css `[data-theme='dark']` */
export const darkColors: AppColors = {
  ...lightColors,

  olive: '#71845B',
  sage: '#9AAA85',
  leaf: '#71845B',
  deepGrove: '#141714',
  warmStone: '#D9D5C8',
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
  secondaryDark: '#9DA699',
  secondaryLight: '#C5CBBF',

  success: '#62916D',
  successLight: 'rgba(98, 145, 109, 0.22)',
  successDark: '#72AD85',

  warning: '#C8924E',
  warningLight: 'rgba(200, 146, 78, 0.22)',
  warningDark: '#D2A064',

  error: '#C96656',
  errorLight: 'rgba(201, 102, 86, 0.22)',
  errorDark: '#D77A68',

  info: '#5F95A8',
  infoLight: 'rgba(95, 149, 168, 0.22)',
  infoDark: '#70A9BA',

  neutral: '#879086',
  neutralLight: 'rgba(135, 144, 134, 0.22)',

  white: '#202520',
  black: '#000000',

  gray50: '#202520',
  gray100: '#272D27',
  gray200: '#2E352E',
  gray300: '#343C34',
  gray400: '#717A70',
  gray500: '#9DA699',
  gray600: '#C5CBBF',
  gray700: '#D9D5C8',
  gray800: '#EBEFE6',
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
  textInverse: '#FFFFFF',

  headerBackground: '#202320',
  headerForeground: '#F3F4EF',
  headerForegroundMuted: '#C5CBBF',
  headerAccent: '#71845B',
  headerBorder: 'rgba(235, 239, 230, 0.14)',
  tabBarBackground: '#202320',
  tabBarForeground: '#A9BE91',
  tabBarForegroundInactive: '#9DA699',
  tabBarBorder: 'rgba(235, 239, 230, 0.14)',
  tabBarActivePill: 'rgba(113, 132, 91, 0.22)',

  border: 'rgba(235, 239, 230, 0.14)',
  borderLight: 'rgba(235, 239, 230, 0.09)',
  borderDark: 'rgba(235, 239, 230, 0.22)',

  link: '#A9BE91',
  linkHover: '#C5D5B3',
  focusRing: '#B7CD98',
  backdrop: 'rgba(7, 10, 7, 0.68)',

  shadow: 'rgba(10, 15, 9, 0.28)',
  shadowDark: 'rgba(5, 8, 5, 0.40)',

  lifecycleLow: '#9AAA85',
  lifecycleHigh: '#B09A63',
  taskPending: '#C8924E',
  taskInProgress: '#70A9BA',
  taskCompleted: '#72AD85',

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

  experienceEveryday: '#56B4E9',
  experienceFull: '#E69F00',

  bannerErrorBg: 'rgba(201, 102, 86, 0.22)',
  bannerErrorBorder: '#D77A68',
  bannerWarningBg: 'rgba(200, 146, 78, 0.22)',
  bannerWarningBorder: '#D2A064',
};

export { lightColors };

export type ThemeMode = 'system' | 'light' | 'dark';
