import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../theme/themes';
import type { FontScale } from '../experience/types';
import { FONT_SCALE_VALUES, TAP_MIN_PX } from '../experience/types';
import { useAuth } from './AuthContext';
import { isMockMode } from '../services/serviceFactory';
import {
  DEFAULT_NOTIFICATION_PREFS,
  normalizeNotificationPrefs,
  userPreferencesService,
  type NotificationDevicePreferences,
} from '../services/userPreferencesService';

export type AppLanguage = 'en' | 'el' | 'it';
export type DefaultStartView = 'fields' | 'chronologio';
export type DateFormatPref = 'dd/MM/yyyy' | 'yyyy-MM-dd' | 'medium';

interface PreferencesContextType {
  language: AppLanguage;
  themeMode: ThemeMode;
  /** Prefer white field palette when ambient light is strong (device-local). */
  brightFieldAuto: boolean;
  fontScale: FontScale;
  largeControls: boolean;
  fullTutorialSeen: boolean;
  defaultView: DefaultStartView;
  dateFormat: DateFormatPref;
  notificationPrefs: NotificationDevicePreferences;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setBrightFieldAuto: (enabled: boolean) => Promise<void>;
  setFontScale: (scale: FontScale) => Promise<void>;
  setLargeControls: (enabled: boolean) => Promise<void>;
  setDefaultView: (view: DefaultStartView) => Promise<void>;
  setDateFormat: (format: DateFormatPref) => Promise<void>;
  setNotificationPref: (key: keyof NotificationDevicePreferences, enabled: boolean) => Promise<void>;
  markFullTutorialSeen: () => Promise<void>;
  fontScaleMultiplier: number;
  tapMin: number;
  isReady: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const LANG_KEY = '@Oleachron_language';
const THEME_KEY = '@Oleachron_theme';
const BRIGHT_FIELD_KEY = '@Oleachron_bright_field_auto';
const FONT_SCALE_KEY = '@Oleachron_font_scale';
const LARGE_CONTROLS_KEY = '@Oleachron_large_controls';
const FULL_TUTORIAL_SEEN_KEY = '@Oleachron_full_tutorial_seen';
const DEFAULT_VIEW_KEY = '@Oleachron_default_view';
const DATE_FORMAT_KEY = '@Oleachron_date_format';
const NOTIFICATION_PREFS_KEY = '@Oleachron_notification_prefs';

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<AppLanguage>('el');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [brightFieldAuto, setBrightFieldAutoState] = useState(true);
  const [fontScale, setFontScaleState] = useState<FontScale>('default');
  const [largeControls, setLargeControlsState] = useState(false);
  const [fullTutorialSeen, setFullTutorialSeen] = useState(false);
  const [defaultView, setDefaultViewState] = useState<DefaultStartView>('chronologio');
  const [dateFormat, setDateFormatState] = useState<DateFormatPref>('dd/MM/yyyy');
  const [notificationPrefs, setNotificationPrefsState] = useState<NotificationDevicePreferences>(
    DEFAULT_NOTIFICATION_PREFS
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [
          storedLang,
          storedTheme,
          storedBrightField,
          storedFont,
          storedLarge,
          storedFullTut,
          storedDefaultView,
          storedDateFormat,
          storedNotificationPrefs,
        ] = await Promise.all([
          AsyncStorage.getItem(LANG_KEY),
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(BRIGHT_FIELD_KEY),
          AsyncStorage.getItem(FONT_SCALE_KEY),
          AsyncStorage.getItem(LARGE_CONTROLS_KEY),
          AsyncStorage.getItem(FULL_TUTORIAL_SEEN_KEY),
          AsyncStorage.getItem(DEFAULT_VIEW_KEY),
          AsyncStorage.getItem(DATE_FORMAT_KEY),
          AsyncStorage.getItem(NOTIFICATION_PREFS_KEY),
        ]);
        if (storedLang === 'en' || storedLang === 'el' || storedLang === 'it') {
          setLanguageState(storedLang);
        } else {
          setLanguageState('el');
          await AsyncStorage.setItem(LANG_KEY, 'el');
        }
        if (
          storedTheme === 'system' ||
          storedTheme === 'light' ||
          storedTheme === 'dark' ||
          storedTheme === 'sun'
        ) {
          setThemeModeState(storedTheme);
        }
        // Default on when nothing is stored.
        if (storedBrightField === 'false') {
          setBrightFieldAutoState(false);
        } else {
          setBrightFieldAutoState(true);
        }
        if (storedFont === 'default' || storedFont === 'large' || storedFont === 'xl') {
          setFontScaleState(storedFont);
        }
        if (storedLarge === 'true') setLargeControlsState(true);
        if (storedDefaultView === 'dashboard' || storedDefaultView === 'today') {
          setDefaultViewState('chronologio');
          await AsyncStorage.setItem(DEFAULT_VIEW_KEY, 'chronologio');
        } else if (storedDefaultView === 'fields' || storedDefaultView === 'chronologio') {
          setDefaultViewState(storedDefaultView);
        }
        if (
          storedDateFormat === 'dd/MM/yyyy' ||
          storedDateFormat === 'yyyy-MM-dd' ||
          storedDateFormat === 'medium'
        ) {
          setDateFormatState(storedDateFormat);
        }
        setFullTutorialSeen(storedFullTut === 'true');
        if (storedNotificationPrefs) {
          try {
            setNotificationPrefsState(
              normalizeNotificationPrefs(JSON.parse(storedNotificationPrefs) as NotificationDevicePreferences)
            );
          } catch {
            setNotificationPrefsState(DEFAULT_NOTIFICATION_PREFS);
          }
        }
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isReady || !user || isMockMode()) return;
    let cancelled = false;
    (async () => {
      try {
        const server = await userPreferencesService.get();
        if (cancelled) return;
        if (server.language === 'en' || server.language === 'el' || server.language === 'it') {
          setLanguageState(server.language);
          await AsyncStorage.setItem(LANG_KEY, server.language);
        }
        setFontScaleState(server.fontScale);
        setLargeControlsState(server.largeControls);
        setNotificationPrefsState(server.notifications);
        await AsyncStorage.multiSet([
          [FONT_SCALE_KEY, server.fontScale],
          [LARGE_CONTROLS_KEY, server.largeControls ? 'true' : 'false'],
          [NOTIFICATION_PREFS_KEY, JSON.stringify(server.notifications)],
        ]);
      } catch {
        // Local prefs stay authoritative when offline.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, user?.id]);

  const pushServerPrefs = useCallback(
    async (patch: {
      fontScale?: FontScale;
      largeControls?: boolean;
      language?: AppLanguage;
    }) => {
      if (!user || isMockMode()) return;
      try {
        await userPreferencesService.update({
          fontScale,
          largeControls,
          language,
          ...patch,
        });
      } catch {
        // Device prefs remain authoritative when offline.
      }
    },
    [user, fontScale, largeControls, language]
  );

  const setLanguage = async (lang: AppLanguage) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
    await pushServerPrefs({ language: lang });
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
  };

  const setBrightFieldAuto = async (enabled: boolean) => {
    setBrightFieldAutoState(enabled);
    await AsyncStorage.setItem(BRIGHT_FIELD_KEY, enabled ? 'true' : 'false');
  };

  const setFontScale = async (scale: FontScale) => {
    setFontScaleState(scale);
    await AsyncStorage.setItem(FONT_SCALE_KEY, scale);
    await pushServerPrefs({ fontScale: scale });
  };

  const setLargeControls = async (enabled: boolean) => {
    setLargeControlsState(enabled);
    await AsyncStorage.setItem(LARGE_CONTROLS_KEY, enabled ? 'true' : 'false');
    await pushServerPrefs({ largeControls: enabled });
  };

  const setDefaultView = async (view: DefaultStartView) => {
    setDefaultViewState(view);
    await AsyncStorage.setItem(DEFAULT_VIEW_KEY, view);
  };

  const setDateFormat = async (format: DateFormatPref) => {
    setDateFormatState(format);
    await AsyncStorage.setItem(DATE_FORMAT_KEY, format);
  };

  const setNotificationPref = useCallback(
    async (key: keyof NotificationDevicePreferences, enabled: boolean) => {
      const previous = notificationPrefs;
      const next = { ...previous, [key]: enabled };
      setNotificationPrefsState(next);
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
      if (!user || isMockMode()) return;
      try {
        const saved = await userPreferencesService.update({ notifications: next });
        setNotificationPrefsState(saved.notifications);
        await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(saved.notifications));
      } catch {
        setNotificationPrefsState(previous);
        await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(previous));
        throw new Error('notification-pref-save-failed');
      }
    },
    [notificationPrefs, user]
  );

  const markFullTutorialSeen = useCallback(async () => {
    setFullTutorialSeen(true);
    await AsyncStorage.setItem(FULL_TUTORIAL_SEEN_KEY, 'true');
  }, []);

  const value = useMemo(
    () => ({
      language,
      themeMode,
      brightFieldAuto,
      setLanguage,
      setThemeMode,
      setBrightFieldAuto,
      isReady,
      fontScale,
      largeControls,
      fullTutorialSeen,
      setFontScale,
      setLargeControls,
      setDefaultView,
      setDateFormat,
      setNotificationPref,
      markFullTutorialSeen,
      tapMin: largeControls ? TAP_MIN_PX.large : TAP_MIN_PX.default,
      fontScaleMultiplier: FONT_SCALE_VALUES[fontScale] ?? 1,
      defaultView,
      dateFormat,
      notificationPrefs,
    }),
    [
      language,
      themeMode,
      brightFieldAuto,
      isReady,
      fontScale,
      largeControls,
      fullTutorialSeen,
      defaultView,
      dateFormat,
      notificationPrefs,
      setNotificationPref,
      markFullTutorialSeen,
    ]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
