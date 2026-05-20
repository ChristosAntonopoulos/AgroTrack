import { useMemo } from 'react';
import { useLocale } from '../context/LocaleProvider';
import { settingsService } from '../services/settingsService';
import * as formatters from '../utils/localeFormatters';

export const useLocaleFormatters = () => {
  const { locale } = useLocale();
  const dateFormat = settingsService.getPreferences().dateFormat;

  return useMemo(
    () => ({
      locale,
      dateFormat,
      formatDate: (date: Date | string | number) =>
        formatters.formatDate(date, { locale, dateFormat }),
      formatDateTime: (date: Date | string | number) =>
        formatters.formatDateTime(date, { locale, dateFormat }),
      formatTime: (date: Date | string | number) =>
        formatters.formatTime(date, { locale, dateFormat }),
      formatNumber: (value: number, maximumFractionDigits?: number) =>
        formatters.formatNumber(value, { locale, maximumFractionDigits }),
      formatRelativeTime: (date: Date | string | number) =>
        formatters.formatRelativeTime(date, { locale }),
    }),
    [locale, dateFormat]
  );
};
