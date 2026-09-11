import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  settingsService,
  resolveTheme,
  type Theme,
  type ResolvedTheme,
} from '../services/settingsService';

interface ThemeContextType {
  /** Stored preference (may be system). */
  theme: Theme;
  /** Applied light/dark look. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_TRANSITION_MS = 200;

const applyResolved = (resolved: ResolvedTheme, withTransition = false) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;

  if (!withTransition || typeof document === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.body.classList.add('theme-transition');
  window.setTimeout(() => {
    document.body.classList.remove('theme-transition');
  }, THEME_TRANSITION_MS);
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const prefs = settingsService.getPreferences();
    return prefs.theme;
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(settingsService.getPreferences().theme)
  );

  const syncResolved = useCallback((pref: Theme, withTransition = false) => {
    const resolved = resolveTheme(pref);
    setResolvedTheme(resolved);
    applyResolved(resolved, withTransition);
  }, []);

  useEffect(() => {
    const prefs = settingsService.getPreferences();
    setThemeState(prefs.theme);
    syncResolved(prefs.theme);
  }, [syncResolved]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => syncResolved('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, syncResolved]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    syncResolved(newTheme, true);
    settingsService.savePreferences({ theme: newTheme });
  };

  const toggleTheme = () => {
    const next: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export type { Theme, ResolvedTheme };
