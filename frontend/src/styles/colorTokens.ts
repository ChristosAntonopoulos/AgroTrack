/**
 * Live CSS colour tokens for JS consumers (charts, maps, calendar).
 * Prefer reading from the document so light/dark theme stays in sync.
 */

const FALLBACKS: Record<string, string> = {
  '--olive-primary': '#536B3F',
  '--olive-hover': '#455B34',
  '--olive-soft': '#E7EDDE',
  '--oleachron-sage': '#9AAA85',
  '--oleachron-gold': '#B09A63',
  '--oleachron-warm-stone': '#D9D5C8',
  '--text-primary': '#252A23',
  '--text-secondary': '#50594C',
  '--text-muted': '#737D6E',
  '--surface-1': '#FFFEFA',
  '--border-default': 'rgba(51, 62, 44, 0.14)',
  '--status-success': '#62916D',
  '--status-warning': '#C8924E',
  '--status-danger': '#C96656',
  '--status-info': '#5F95A8',
  '--status-neutral': '#879086',
  '--event-work': '#5E7848',
  '--event-observation': '#755D8C',
  '--event-expense': '#99662D',
  '--event-income': '#36734D',
  '--event-harvest': '#8B4F49',
  '--event-weather': '#39798D',
  '--event-warning': '#A74435',
  '--event-field-change': '#59696B',
  '--weather-blue': '#70A9BA',
  '--rain': '#588EA5',
  '--temperature': '#CB8B55',
  '--humidity': '#719CAC',
  '--wind': '#94A89A',
  '--frost': '#8CA9BF',
  '--chart-olive': '#536B3F',
  '--chart-sage': '#9AAA85',
  '--chart-gold': '#B09A63',
  '--chart-harvest': '#8B4F49',
  '--chart-weather': '#70A9BA',
  '--chart-unavailable': '#879086',
  '--map-boundary': '#4F7139',
  '--map-selected-fill': 'rgba(83, 107, 63, 0.18)',
  '--map-hover-fill': 'rgba(83, 107, 63, 0.10)',
  '--map-warning-outline': '#C96656',
  '--map-other-outline': '#879086',
  '--link': '#486235',
  '--focus-ring': '#5E7848',
  '--color-primary': '#536B3F',
  '--color-success': '#62916D',
  '--color-warning': '#C8924E',
  '--color-error': '#C96656',
  '--color-info': '#5F95A8',
  '--color-secondary': '#879086',
};

function readVar(name: string): string {
  if (typeof document === 'undefined') {
    return FALLBACKS[name] ?? '';
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || FALLBACKS[name] || '';
}

export function getCssToken(name: string): string {
  return readVar(name.startsWith('--') ? name : `--${name}`);
}

export type ChartPalette = {
  olive: string;
  sage: string;
  gold: string;
  harvest: string;
  weather: string;
  unavailable: string;
};

export function getChartPalette(): ChartPalette {
  return {
    olive: readVar('--chart-olive') || readVar('--olive-primary'),
    sage: readVar('--chart-sage') || readVar('--oleachron-sage'),
    gold: readVar('--chart-gold') || readVar('--oleachron-gold'),
    harvest: readVar('--chart-harvest') || readVar('--event-harvest'),
    weather: readVar('--chart-weather') || readVar('--weather-blue'),
    unavailable: readVar('--chart-unavailable') || readVar('--status-neutral'),
  };
}

/** Default pie/bar series order for multi-category charts. */
export function getChartSeriesColors(): string[] {
  const p = getChartPalette();
  return [p.olive, p.sage, p.gold, p.harvest, p.weather, p.unavailable, readVar('--event-observation')];
}

export type MapPalette = {
  boundary: string;
  selectedFill: string;
  hoverFill: string;
  warningOutline: string;
  otherOutline: string;
};

export function getMapPalette(): MapPalette {
  return {
    boundary: readVar('--map-boundary'),
    selectedFill: readVar('--map-selected-fill'),
    hoverFill: readVar('--map-hover-fill'),
    warningOutline: readVar('--map-warning-outline'),
    otherOutline: readVar('--map-other-outline'),
  };
}

export type StatusPalette = {
  success: string;
  warning: string;
  danger: string;
  info: string;
  neutral: string;
  olive: string;
};

export function getStatusPalette(): StatusPalette {
  return {
    success: readVar('--status-success'),
    warning: readVar('--status-warning'),
    danger: readVar('--status-danger'),
    info: readVar('--status-info'),
    neutral: readVar('--status-neutral'),
    olive: readVar('--olive-primary'),
  };
}

export type EventCategoryKey =
  | 'work'
  | 'observation'
  | 'expense'
  | 'income'
  | 'harvest'
  | 'weather'
  | 'warning'
  | 'field_change';

export function getEventCategoryColor(key: EventCategoryKey): string {
  return readVar(`--event-${key.replace('_', '-')}`) || readVar('--status-neutral');
}

export function getEventCategorySoft(key: EventCategoryKey): string {
  const token = `--event-${key.replace('_', '-')}-soft`;
  return readVar(token) || 'transparent';
}

export const COLOR_FALLBACKS = FALLBACKS;
