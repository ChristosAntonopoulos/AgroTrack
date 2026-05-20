import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import i18n from '../i18n';
import { settingsService } from '../services/settingsService';
import { SupportedLocale, normalizeLocale, isSupportedLocale } from '../i18n/config';

interface LocaleContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  dir: 'ltr' | 'rtl';
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() =>
    normalizeLocale(settingsService.getPreferences().language)
  );

  const applyLocale = useCallback((next: SupportedLocale) => {
    setLocaleState(next);
    void i18n.changeLanguage(next);
    document.documentElement.lang = next;
    document.documentElement.dir = 'ltr';
    settingsService.savePreferences({ language: next });
  }, []);

  useEffect(() => {
    const saved = normalizeLocale(settingsService.getPreferences().language);
    applyLocale(saved);
  }, [applyLocale]);

  const setLocale = (next: SupportedLocale) => {
    if (!isSupportedLocale(next)) return;
    applyLocale(next);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, dir: 'ltr' }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
