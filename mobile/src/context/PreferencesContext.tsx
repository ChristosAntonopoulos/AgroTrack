import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../theme/themes';

export type AppLanguage = 'en' | 'el';

interface PreferencesContextType {
  language: AppLanguage;
  themeMode: ThemeMode;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isReady: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const LANG_KEY = '@agrotrack_language';
const THEME_KEY = '@agrotrack_theme';

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedLang, storedTheme] = await Promise.all([
          AsyncStorage.getItem(LANG_KEY),
          AsyncStorage.getItem(THEME_KEY),
        ]);
        if (storedLang === 'en' || storedLang === 'el') {
          setLanguageState(storedLang);
        }
        if (storedTheme === 'system' || storedTheme === 'light' || storedTheme === 'dark') {
          setThemeModeState(storedTheme);
        }
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setLanguage = async (lang: AppLanguage) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
  };

  return (
    <PreferencesContext.Provider
      value={{ language, themeMode, setLanguage, setThemeMode, isReady }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
};
