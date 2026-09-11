/**
 * Semantic light palette — mirrored from frontend/src/styles/theme.css
 * and brand/brand-tokens.json. Read the active set via `useTheme().colors`.
 */
export const colors = {
  // Brand constants
  olive: '#536B3F',
  sage: '#9AAA85',
  leaf: '#71845B',
  deepGrove: '#29382A',
  warmStone: '#D9D5C8',
  limestone: '#F4F3EC',
  accentGold: '#B09A63',
  charcoal: '#252A23',

  // Primary — Oleachron olive
  primary: '#536B3F',
  primaryDark: '#455B34',
  primaryActive: '#394C2B',
  primaryLight: '#E7EDDE',
  oliveBorder: '#A8B995',
  onOlive: '#FFFFFF',

  // Secondary — warm neutral / status-neutral family
  secondary: '#879086',
  secondaryDark: '#6B7469',
  secondaryLight: '#A2A99D',

  // Status — shared hard colors from theme.css
  success: '#62916D',
  successLight: 'rgba(98, 145, 109, 0.16)',
  successDark: '#4f7a58',

  warning: '#C8924E',
  warningLight: 'rgba(200, 146, 78, 0.16)',
  warningDark: '#a8783a',

  error: '#C96656',
  errorLight: 'rgba(201, 102, 86, 0.16)',
  errorDark: '#a85548',

  info: '#5F95A8',
  infoLight: 'rgba(95, 149, 168, 0.16)',
  infoDark: '#4a7a8a',

  neutral: '#879086',
  neutralLight: 'rgba(135, 144, 134, 0.16)',

  white: '#FFFFFF',
  black: '#000000',

  // Gray scale — warm olive undertones (derived from surfaces)
  gray50: '#F7F6EF',
  gray100: '#EEEFE6',
  gray200: '#E8EEDF',
  gray300: '#D9D5C8',
  gray400: '#A2A99D',
  gray500: '#737D6E',
  gray600: '#50594C',
  gray700: '#394C2B',
  gray800: '#29382A',
  gray900: '#252A23',

  // Surfaces — limestone paper + near-white cards
  background: '#F4F3EC',
  backgroundLight: '#F4F3EC',
  backgroundDark: '#29382A',
  backgroundSidebar: '#ECEBE2',
  surface: '#FFFEFA',
  surfaceElevated: '#FFFEFA',
  surfaceMuted: '#F7F6EF',
  surface3: '#EEEFE6',
  surfaceHover: '#F0F2E8',
  surfaceSelected: '#E8EEDF',

  // Text
  textPrimary: '#252A23',
  textSecondary: '#50594C',
  textTertiary: '#737D6E',
  textDisabled: '#A2A99D',
  textInverse: '#FFFFFF',

  // Chrome — light header & tab bar (Mediterranean paper, not deep olive)
  headerBackground: '#FAF9F4',
  headerForeground: '#252A23',
  headerForegroundMuted: '#50594C',
  headerAccent: '#536B3F',
  headerBorder: 'rgba(51, 62, 44, 0.14)',
  tabBarBackground: '#FAF9F4',
  tabBarForeground: '#486235',
  tabBarForegroundInactive: '#737D6E',
  tabBarBorder: 'rgba(51, 62, 44, 0.14)',
  tabBarActivePill: '#E7EDDE',

  // Borders — olive-tinted
  border: 'rgba(51, 62, 44, 0.14)',
  borderLight: 'rgba(51, 62, 44, 0.08)',
  borderDark: 'rgba(51, 62, 44, 0.24)',

  // Links / focus
  link: '#486235',
  linkHover: '#334A25',
  focusRing: '#5E7848',
  backdrop: 'rgba(24, 29, 21, 0.42)',

  // Shadows
  shadow: 'rgba(10, 15, 9, 0.10)',
  shadowDark: 'rgba(10, 15, 9, 0.16)',

  // Domain
  lifecycleLow: '#9AAA85',
  lifecycleHigh: '#B09A63',
  taskPending: '#C8924E',
  taskInProgress: '#5F95A8',
  taskCompleted: '#62916D',

  // Event / category accents (light)
  eventWork: '#5E7848',
  eventWorkSoft: 'rgba(94, 120, 72, 0.14)',
  eventObservation: '#755D8C',
  eventObservationSoft: 'rgba(117, 93, 140, 0.14)',
  eventExpense: '#99662D',
  eventExpenseSoft: 'rgba(153, 102, 45, 0.14)',
  eventIncome: '#36734D',
  eventIncomeSoft: 'rgba(54, 115, 77, 0.14)',
  eventHarvest: '#8B4F49',
  eventHarvestSoft: 'rgba(139, 79, 73, 0.14)',
  eventWeather: '#39798D',
  eventWeatherSoft: 'rgba(57, 121, 141, 0.14)',
  eventWarning: '#A74435',
  eventWarningSoft: 'rgba(167, 68, 53, 0.14)',
  eventFieldChange: '#59696B',
  eventFieldChangeSoft: 'rgba(89, 105, 107, 0.14)',

  // Weather
  weatherBlue: '#70A9BA',
  rain: '#588EA5',
  temperature: '#CB8B55',
  humidity: '#719CAC',
  wind: '#94A89A',
  frost: '#8CA9BF',

  // Map
  mapBoundary: '#4F7139',
  mapSelectedFill: 'rgba(83, 107, 63, 0.18)',
  mapHoverFill: 'rgba(83, 107, 63, 0.10)',
  mapWarningOutline: '#C96656',
  mapOtherOutline: '#879086',

  // Domain task accent
  domainTask: '#3A6EA5',

  // Experience modes (Wong CB-safe)
  experienceEveryday: '#0072B2',
  experienceFull: '#E69F00',

  // Alert banners
  bannerErrorBg: 'rgba(201, 102, 86, 0.16)',
  bannerErrorBorder: '#C96656',
  bannerWarningBg: 'rgba(200, 146, 78, 0.16)',
  bannerWarningBorder: '#C8924E',
};
