import { SupportedLocale } from '../i18n/config';

export interface FormatOptions {
  locale: SupportedLocale;
  dateFormat?: string;
}

export const localeTagFor = (locale: SupportedLocale | string): string => {
  const map: Record<string, string> = {
    en: 'en-US',
    el: 'el-GR',
    it: 'it-IT',
  };
  if (locale.startsWith('el')) return 'el-GR';
  if (locale.startsWith('it')) return 'it-IT';
  if (locale.startsWith('en')) return 'en-US';
  return map[locale] ?? locale;
};

const localeTag = (locale: SupportedLocale): string => localeTagFor(locale);

const dateFormatToOptions = (
  dateFormat: string | undefined
): Intl.DateTimeFormatOptions => {
  switch (dateFormat) {
    case 'dd/MM/yyyy':
      return { day: '2-digit', month: '2-digit', year: 'numeric' };
    case 'yyyy-MM-dd':
      return { year: 'numeric', month: '2-digit', day: '2-digit' };
    case 'medium':
      return { day: 'numeric', month: 'short', year: 'numeric' };
    case 'MM/dd/yyyy':
    default:
      return { month: '2-digit', day: '2-digit', year: 'numeric' };
  }
};

const pad2 = (n: number) => String(n).padStart(2, '0');

export const formatDate = (
  date: Date | string | number,
  options: FormatOptions
): string => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  if (options.dateFormat === 'yyyy-MM-dd') {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  if (options.dateFormat === 'dd/MM/yyyy') {
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
  if (options.dateFormat === 'MM/dd/yyyy') {
    return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
  }
  return d.toLocaleDateString(localeTag(options.locale), dateFormatToOptions(options.dateFormat));
};

export const formatDateTime = (
  date: Date | string | number,
  options: FormatOptions
): string => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(localeTag(options.locale), {
    ...dateFormatToOptions(options.dateFormat),
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (
  date: Date | string | number,
  options: FormatOptions
): string => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(localeTag(options.locale), {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatNumber = (
  value: number,
  options: FormatOptions & { maximumFractionDigits?: number; minimumFractionDigits?: number }
): string => {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(localeTag(options.locale), {
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    minimumFractionDigits: options.minimumFractionDigits,
  });
};

export const formatCurrency = (
  amount: number,
  options: FormatOptions & { currency?: string }
): string => {
  if (!Number.isFinite(amount)) return '—';
  return amount.toLocaleString(localeTag(options.locale), {
    style: 'currency',
    currency: options.currency || 'EUR',
    maximumFractionDigits: 2,
  });
};

export const formatPercent = (
  value: number | null | undefined,
  options: FormatOptions & { maximumFractionDigits?: number }
): string => {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${formatNumber(value, {
    locale: options.locale,
    maximumFractionDigits: options.maximumFractionDigits ?? 1,
  })}%`;
};

export const formatKg = (
  value: number | null | undefined,
  options: FormatOptions & { maximumFractionDigits?: number }
): string => {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${formatNumber(value, {
    locale: options.locale,
    maximumFractionDigits: options.maximumFractionDigits ?? 1,
  })} kg`;
};

export const formatRelativeTime = (
  date: Date | string | number,
  options: FormatOptions
): string => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = d.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(localeTag(options.locale), { numeric: 'auto' });

  const absSec = Math.abs(diffSec);
  if (absSec < 60) return rtf.format(diffSec, 'second');
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(diffDay, 'day');
};
