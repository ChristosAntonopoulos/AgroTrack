import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../theme/themes';
import type { ExperienceMode, FontScale, ExperienceWidget } from '../experience/types';
import { FONT_SCALE_VALUES, TAP_MIN_PX } from '../experience/types';
import { isWidgetVisible } from '../experience/catalog';
import { defaultExperienceModeForRole } from '../experience/defaults';
import { useAuth } from './AuthContext';
import { isMockMode } from '../services/serviceFactory';
import { userPreferencesService } from '../services/userPreferencesService';

export type AppLanguage = 'en' | 'el';
export type DefaultStartView = 'today' | 'dashboard' | 'fields' | 'chronologio';
export type DateFormatPref = 'dd/MM/yyyy' | 'yyyy-MM-dd' | 'medium';

interface PreferencesContextType {
  language: AppLanguage;
  themeMode: ThemeMode;
  experienceMode: ExperienceMode;
  fontScale: FontScale;
  largeControls: boolean;
  experienceModeChosen: boolean;
  everydayTutorialSeen: boolean;
  fullTutorialSeen: boolean;
  defaultView: DefaultStartView;
  dateFormat: DateFormatPref;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setExperienceMode: (mode: ExperienceMode) => Promise<void>;
  chooseExperienceMode: (mode: ExperienceMode) => Promise<void>;
  setFontScale: (scale: FontScale) => Promise<void>;
  setLargeControls: (enabled: boolean) => Promise<void>;
  setDefaultView: (view: DefaultStartView) => Promise<void>;
  setDateFormat: (format: DateFormatPref) => Promise<void>;
  markEverydayTutorialSeen: () => Promise<void>;
  markFullTutorialSeen: () => Promise<void>;
  applyRoleDefaultIfNeeded: (role: string | undefined | null) => Promise<void>;
  isEveryday: boolean;
  isFullPicture: boolean;
  showWidget: (widget: ExperienceWidget) => boolean;
  fontScaleMultiplier: number;
  tapMin: number;
  recordIntelligenceOpen: () => Promise<void>;
  shouldShowFullPictureOnramp: boolean;
  dismissFullPictureOnramp: () => Promise<void>;
  isReady: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const LANG_KEY = '@Oleachron_language';
const THEME_KEY = '@Oleachron_theme';
const EXPERIENCE_KEY = '@Oleachron_experience_mode';
const EXPERIENCE_CHOSEN_KEY = '@Oleachron_experience_chosen';
const FONT_SCALE_KEY = '@Oleachron_font_scale';
const LARGE_CONTROLS_KEY = '@Oleachron_large_controls';
const INTELLIGENCE_OPENS_KEY = '@Oleachron_everyday_intelligence_opens';
const ONRAMP_DISMISSED_KEY = '@Oleachron_full_picture_onramp_dismissed';
const EVERYDAY_TUTORIAL_SEEN_KEY = '@Oleachron_everyday_tutorial_seen';
const FULL_TUTORIAL_SEEN_KEY = '@Oleachron_full_tutorial_seen';
const DEFAULT_VIEW_KEY = '@Oleachron_default_view';
const DATE_FORMAT_KEY = '@Oleachron_date_format';

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [experienceMode, setExperienceModeState] = useState<ExperienceMode>('everyday');
  const [fontScale, setFontScaleState] = useState<FontScale>('default');
  const [largeControls, setLargeControlsState] = useState(false);
  const [experienceModeChosen, setExperienceModeChosen] = useState(false);
  const [everydayTutorialSeen, setEverydayTutorialSeen] = useState(false);
  const [fullTutorialSeen, setFullTutorialSeen] = useState(false);
  const [everydayIntelligenceOpens, setEverydayIntelligenceOpens] = useState(0);
  const [fullPictureOnrampDismissed, setFullPictureOnrampDismissed] = useState(false);
  const [defaultView, setDefaultViewState] = useState<DefaultStartView>('chronologio');
  const [dateFormat, setDateFormatState] = useState<DateFormatPref>('dd/MM/yyyy');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [
          storedLang,
          storedTheme,
          storedExperience,
          storedChosen,
          storedFont,
          storedLarge,
          storedEverydayTut,
          storedFullTut,
          storedOpens,
          storedOnramp,
          storedDefaultView,
          storedDateFormat,
        ] = await Promise.all([
          AsyncStorage.getItem(LANG_KEY),
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(EXPERIENCE_KEY),
          AsyncStorage.getItem(EXPERIENCE_CHOSEN_KEY),
          AsyncStorage.getItem(FONT_SCALE_KEY),
          AsyncStorage.getItem(LARGE_CONTROLS_KEY),
          AsyncStorage.getItem(EVERYDAY_TUTORIAL_SEEN_KEY),
          AsyncStorage.getItem(FULL_TUTORIAL_SEEN_KEY),
          AsyncStorage.getItem(INTELLIGENCE_OPENS_KEY),
          AsyncStorage.getItem(ONRAMP_DISMISSED_KEY),
          AsyncStorage.getItem(DEFAULT_VIEW_KEY),
          AsyncStorage.getItem(DATE_FORMAT_KEY),
        ]);
        if (storedLang === 'en' || storedLang === 'el') setLanguageState(storedLang);
        if (storedTheme === 'system' || storedTheme === 'light' || storedTheme === 'dark') {
          setThemeModeState(storedTheme);
        }
        if (storedExperience === 'everyday' || storedExperience === 'full') {
          setExperienceModeState(storedExperience);
        }
        const alreadyChosen = storedChosen === 'true';
        if (alreadyChosen) setExperienceModeChosen(true);
        if (storedFont === 'default' || storedFont === 'large' || storedFont === 'xl') {
          setFontScaleState(storedFont);
        }
        if (storedLarge === 'true') setLargeControlsState(true);
        if (storedDefaultView === 'dashboard' || storedDefaultView === 'today') {
          setDefaultViewState('chronologio');
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

        // Existing users who already chose a mode should not see new first-run tutorials.
        const everydaySeen = storedEverydayTut === 'true' || alreadyChosen;
        const fullSeen = storedFullTut === 'true' || alreadyChosen;
        setEverydayTutorialSeen(everydaySeen);
        setFullTutorialSeen(fullSeen);
        if (alreadyChosen && storedEverydayTut !== 'true') {
          void AsyncStorage.setItem(EVERYDAY_TUTORIAL_SEEN_KEY, 'true');
        }
        if (alreadyChosen && storedFullTut !== 'true') {
          void AsyncStorage.setItem(FULL_TUTORIAL_SEEN_KEY, 'true');
        }

        if (storedOpens) setEverydayIntelligenceOpens(Number(storedOpens) || 0);
        if (storedOnramp === 'true') setFullPictureOnrampDismissed(true);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (experienceModeChosen || !user?.role) return;
    const next = defaultExperienceModeForRole(user.role);
    setExperienceModeState(next);
  }, [user?.role, experienceModeChosen]);

  useEffect(() => {
    if (!isReady || !user || isMockMode()) return;
    let cancelled = false;
    (async () => {
      try {
        const server = await userPreferencesService.get();
        if (cancelled) return;
        if (!server.experienceModeChosen) return;
        if (server.language === 'en' || server.language === 'el') {
          setLanguageState(server.language);
          await AsyncStorage.setItem(LANG_KEY, server.language);
        }
        setExperienceModeState(server.experienceMode);
        setExperienceModeChosen(true);
        setFontScaleState(server.fontScale);
        setLargeControlsState(server.largeControls);
        await AsyncStorage.multiSet([
          [EXPERIENCE_KEY, server.experienceMode],
          [EXPERIENCE_CHOSEN_KEY, 'true'],
          [FONT_SCALE_KEY, server.fontScale],
          [LARGE_CONTROLS_KEY, server.largeControls ? 'true' : 'false'],
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
      experienceMode?: ExperienceMode;
      experienceModeChosen?: boolean;
      fontScale?: FontScale;
      largeControls?: boolean;
      language?: AppLanguage;
    }) => {
      if (!user || isMockMode()) return;
      try {
        await userPreferencesService.update({
          experienceMode,
          experienceModeChosen,
          fontScale,
          largeControls,
          language,
          ...patch,
        });
      } catch {
        // Device prefs remain authoritative when offline.
      }
    },
    [user, experienceMode, experienceModeChosen, fontScale, largeControls, language]
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

  const setExperienceMode = async (mode: ExperienceMode) => {
    setExperienceModeState(mode);
    setExperienceModeChosen(true);
    await AsyncStorage.multiSet([
      [EXPERIENCE_KEY, mode],
      [EXPERIENCE_CHOSEN_KEY, 'true'],
    ]);
    await pushServerPrefs({ experienceMode: mode, experienceModeChosen: true });
  };

  const chooseExperienceMode = async (mode: ExperienceMode) => {
    await setExperienceMode(mode);
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

  const recordIntelligenceOpen = useCallback(async () => {
    setEverydayIntelligenceOpens((prev) => {
      const next = prev + 1;
      void AsyncStorage.setItem(INTELLIGENCE_OPENS_KEY, String(next));
      return next;
    });
  }, []);

  const dismissFullPictureOnramp = useCallback(async () => {
    setFullPictureOnrampDismissed(true);
    await AsyncStorage.setItem(ONRAMP_DISMISSED_KEY, 'true');
  }, []);

  const markEverydayTutorialSeen = useCallback(async () => {
    setEverydayTutorialSeen(true);
    await AsyncStorage.setItem(EVERYDAY_TUTORIAL_SEEN_KEY, 'true');
  }, []);

  const markFullTutorialSeen = useCallback(async () => {
    setFullTutorialSeen(true);
    await AsyncStorage.setItem(FULL_TUTORIAL_SEEN_KEY, 'true');
  }, []);

  const applyRoleDefaultIfNeeded = useCallback(
    async (role: string | undefined | null) => {
      if (experienceModeChosen || !role) return;
      await setExperienceMode(defaultExperienceModeForRole(role));
    },
    [experienceModeChosen]
  );

  const shouldShowFullPictureOnramp =
    experienceMode === 'everyday' &&
    !fullPictureOnrampDismissed &&
    everydayIntelligenceOpens >= 2;

  const showWidget = useCallback(
    (widget: ExperienceWidget) => isWidgetVisible(widget, experienceMode),
    [experienceMode]
  );

  const value = useMemo(
    () => ({
      language,
      themeMode,
      setLanguage,
      setThemeMode,
      isReady,
      experienceMode,
      fontScale,
      largeControls,
      experienceModeChosen,
      everydayTutorialSeen,
      fullTutorialSeen,
      setExperienceMode,
      chooseExperienceMode,
      setFontScale,
      setLargeControls,
      setDefaultView,
      setDateFormat,
      markEverydayTutorialSeen,
      markFullTutorialSeen,
      applyRoleDefaultIfNeeded,
      isEveryday: experienceMode === 'everyday',
      isFullPicture: experienceMode === 'full',
      showWidget,
      recordIntelligenceOpen,
      shouldShowFullPictureOnramp,
      dismissFullPictureOnramp,
      tapMin: largeControls ? TAP_MIN_PX.large : TAP_MIN_PX.default,
      fontScaleMultiplier: FONT_SCALE_VALUES[fontScale] ?? 1,
      defaultView,
      dateFormat,
    }),
    [
      language,
      themeMode,
      isReady,
      experienceMode,
      fontScale,
      largeControls,
      experienceModeChosen,
      everydayTutorialSeen,
      fullTutorialSeen,
      defaultView,
      dateFormat,
      showWidget,
      recordIntelligenceOpen,
      shouldShowFullPictureOnramp,
      dismissFullPictureOnramp,
      markEverydayTutorialSeen,
      markFullTutorialSeen,
      applyRoleDefaultIfNeeded,
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
