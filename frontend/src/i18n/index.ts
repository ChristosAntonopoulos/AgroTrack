import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { FALLBACK_LOCALE, NAMESPACES } from './config';
import { resources } from './resources';
import { settingsService } from '../services/settingsService';
import { normalizeLocale } from './config';

const savedLanguage = settingsService.getPreferences().language;

void i18n.use(initReactI18next).init({
  resources,
  lng: normalizeLocale(savedLanguage),
  fallbackLng: FALLBACK_LOCALE,
  defaultNS: 'common',
  ns: [...NAMESPACES],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
