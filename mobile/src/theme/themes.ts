import { colors as lightColors } from './colors';

export type AppColors = typeof lightColors;

/** Olive grove at night — warm charcoal, never pure black. */
export const darkColors: AppColors = {
  ...lightColors,

  olive: '#A8BE87',
  sage: '#9AAA85',
  leaf: '#A8BE87',
  deepGrove: '#11140F',
  warmStone: '#30372C',
  limestone: '#11140F',
  accentGold: '#C4925A',
  charcoal: '#F1F2EB',

  primary: '#A8BE87',
  primaryDark: '#B8CCA0',
  primaryActive: '#8FAA70',
  primaryLight: '#293321',
  oliveBorder: '#465040',
  onOlive: '#11140F',

  secondary: '#AEB5A8',
  secondaryDark: '#C5CBBF',
  secondaryLight: '#828A7D',

  success: '#72AD85',
  successLight: 'rgba(114, 173, 133, 0.22)',
  successDark: '#8BC49A',

  warning: '#D2A064',
  warningLight: 'rgba(210, 160, 100, 0.22)',
  warningDark: '#E0B57A',

  error: '#D77A68',
  errorLight: 'rgba(215, 122, 104, 0.22)',
  errorDark: '#E09080',

  info: '#7A96A0',
  infoLight: 'rgba(122, 150, 160, 0.22)',
  infoDark: '#8EABB4',

  neutral: '#AEB5A8',
  neutralLight: 'rgba(174, 181, 168, 0.22)',

  white: '#191D16',
  black: '#000000',

  gray50: '#191D16',
  gray100: '#20251C',
  gray200: '#24291F',
  gray300: '#30372C',
  gray400: '#828A7D',
  gray500: '#AEB5A8',
  gray600: '#C5CBBF',
  gray700: '#D9D5C8',
  gray800: '#EBEFE6',
  gray900: '#F1F2EB',

  background: '#11140F',
  backgroundLight: '#161A13',
  backgroundDark: '#0A0C08',
  backgroundSidebar: '#161A13',
  surface: '#191D16',
  surfaceElevated: '#20251C',
  surfaceMuted: '#20251C',
  surface3: '#24291F',
  surfaceHover: '#2A3026',
  surfaceSelected: '#293321',

  textPrimary: '#F1F2EB',
  textSecondary: '#AEB5A8',
  textTertiary: '#828A7D',
  textDisabled: '#5C6456',
  textInverse: '#11140F',

  headerBackground: '#11140F',
  headerForeground: '#F1F2EB',
  headerForegroundMuted: '#AEB5A8',
  headerAccent: '#A8BE87',
  headerBorder: '#30372C',
  tabBarBackground: '#20251C',
  tabBarForeground: '#A8BE87',
  tabBarForegroundInactive: '#AEB5A8',
  tabBarBorder: '#30372C',
  tabBarActivePill: '#293321',

  border: '#30372C',
  borderLight: '#2A3026',
  borderDark: '#3A4336',

  link: '#A8BE87',
  linkHover: '#C5D5B3',
  focusRing: '#B7CD98',
  backdrop: 'rgba(7, 10, 7, 0.72)',

  shadow: 'rgba(0, 0, 0, 0.35)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',

  timeline: '#465040',

  lifecycleLow: '#8DA776',
  lifecycleHigh: '#C4925A',
  taskPending: '#C4925A',
  taskInProgress: '#7A96A0',
  taskCompleted: '#8DA776',

  eventWork: '#8DA776',
  eventWorkSoft: 'rgba(141, 167, 118, 0.18)',
  eventObservation: '#A18BB8',
  eventObservationSoft: 'rgba(161, 139, 184, 0.18)',
  eventExpense: '#C4925A',
  eventExpenseSoft: 'rgba(196, 146, 90, 0.18)',
  eventIncome: '#7A9A8C',
  eventIncomeSoft: 'rgba(122, 154, 140, 0.18)',
  eventHarvest: '#B47870',
  eventHarvestSoft: 'rgba(180, 120, 112, 0.18)',
  eventWeather: '#70A9BA',
  eventWeatherSoft: 'rgba(112, 169, 186, 0.2)',
  eventWarning: '#D77A68',
  eventWarningSoft: 'rgba(215, 122, 104, 0.18)',
  eventFieldChange: '#7A9A8C',
  eventFieldChangeSoft: 'rgba(122, 154, 140, 0.18)',
  eventLifecycle: '#B0AA6E',
  eventLifecycleSoft: 'rgba(176, 170, 110, 0.18)',

  weatherBlue: '#70A9BA',
  rain: '#6A8FA0',
  temperature: '#C4925A',
  humidity: '#7A96A0',
  wind: '#8A9A8C',
  frost: '#8CA9BF',

  mapBoundary: '#A8BE87',
  mapSelectedFill: 'rgba(168, 190, 135, 0.22)',
  mapHoverFill: 'rgba(168, 190, 135, 0.12)',
  mapWarningOutline: '#D77A68',
  mapOtherOutline: '#AEB5A8',

  domainTask: '#8DA776',

  experienceEveryday: '#5BA3D0',
  experienceFull: '#E6B84A',

  bannerErrorBg: 'rgba(215, 122, 104, 0.18)',
  bannerErrorBorder: '#D77A68',
  bannerWarningBg: 'rgba(210, 160, 100, 0.18)',
  bannerWarningBorder: '#D2A064',
};

export { lightColors };

export type ThemeMode = 'system' | 'light' | 'dark';
