import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../theme/themes';
import type { ExperienceMode, FontScale } from '../experience/types';
import { FONT_SCALE_VALUES, TAP_MIN } from '../experience/types';
import { isWidgetVisible } from '../experience/catalog';
import type { ExperienceWidget } from '../experience/types';
import { defaultExperienceModeForRole } from '../experience/defaults';

export type AppLanguage = 'en' | 'el';

interface PreferencesContextType {
  language: AppLanguage;
  themeMode: ThemeMode;
  experienceMode: ExperienceMode;
  fontScale: FontScale;
  largeControls: boolean;
  experienceModeChosen: boolean;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setExperienceMode: (mode: ExperienceMode) => Promise<void>;
  chooseExperienceMode: (mode: ExperienceMode) => Promise<void>;
  setFontScale: (scale: FontScale) => Promise<void>;
  setLargeControls: (enabled: boolean) => Promise<void>;
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

const LANG_KEY = '@agrotrack_language';
const THEME_KEY = '@agrotrack_theme';
const EXPERIENCE_KEY = '@agrotrack_experience_mode';
const FONT_SCALE_KEY = '@agrotrack_font_scale';
const LARGE_CONTROLS_KEY = '@agrotrack_large_controls';
const EXPERIENCE_CHOSEN_KEY = '@agrotrack_experience_chosen';
const INTELLIGENCE_OPENS_KEY = '@agrotrack_everyday_intelligence_opens';
const ONRAMP_DISMISSED_KEY = '@agrotrack_full_picture_onramp_dismissed';

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [experienceMode, setExperienceModeState] = useState<ExperienceMode>('everyday');
  const [fontScale, setFontScaleState] = useState<FontScale>('default');
  const [largeControls, setLargeControlsState] = useState(false);
  const [experienceModeChosen, setExperienceModeChosen] = useState(false);
  const [everydayIntelligenceOpens, setEverydayIntelligenceOpens] = useState(0);
  const [fullPictureOnrampDismissed, setFullPictureOnrampDismissed] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [
          storedLang,
          storedTheme,
          storedExperience,
          storedFontScale,
          storedLargeControls,
          storedChosen,
          storedOpens,
          storedOnramp,
        ] = await Promise.all([
          AsyncStorage.getItem(LANG_KEY),
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(EXPERIENCE_KEY),
          AsyncStorage.getItem(FONT_SCALE_KEY),
          AsyncStorage.getItem(LARGE_CONTROLS_KEY),
          AsyncStorage.getItem(EXPERIENCE_CHOSEN_KEY),
          AsyncStorage.getItem(INTELLIGENCE_OPENS_KEY),
          AsyncStorage.getItem(ONRAMP_DISMISSED_KEY),
        ]);
        if (storedLang === 'en' || storedLang === 'el') {
          setLanguageState(storedLang);
        }
        if (storedTheme === 'system' || storedTheme === 'light' || storedTheme === 'dark') {
          setThemeModeState(storedTheme);
        }
        if (storedExperience === 'everyday' || storedExperience === 'full') {
          setExperienceModeState(storedExperience);
        }
        if (storedFontScale === 'default' || storedFontScale === 'large' || storedFontScale === 'xl') {
          setFontScaleState(storedFontScale);
        }
        if (storedLargeControls === 'true') {
          setLargeControlsState(true);
        }
        if (storedChosen === 'true') {
          setExperienceModeChosen(true);
        }
        if (storedOpens) {
          setEverydayIntelligenceOpens(Number(storedOpens) || 0);
        }
        if (storedOnramp === 'true') {
          setFullPictureOnrampDismissed(true);
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

  const setExperienceMode = async (mode: ExperienceMode) => {
    setExperienceModeState(mode);
    setExperienceModeChosen(true);
    await AsyncStorage.multiSet([
      [EXPERIENCE_KEY, mode],
      [EXPERIENCE_CHOSEN_KEY, 'true'],
    ]);
  };

  const chooseExperienceMode = async (mode: ExperienceMode) => {
    await setExperienceMode(mode);
  };

  const setFontScale = async (scale: FontScale) => {
    setFontScaleState(scale);
    await AsyncStorage.setItem(FONT_SCALE_KEY, scale);
  };

  const setLargeControls = async (enabled: boolean) => {
    setLargeControlsState(enabled);
    await AsyncStorage.setItem(LARGE_CONTROLS_KEY, enabled ? 'true' : 'false');
  };

  const applyRoleDefaultIfNeeded = useCallback(
    async (role: string | undefined | null) => {
      if (experienceModeChosen || !role) return;
      const next = defaultExperienceModeForRole(role);
      setExperienceModeState(next);
      await AsyncStorage.setItem(EXPERIENCE_KEY, next);
    },
    [experienceModeChosen]
  );

  const showWidget = useCallback(
    (widget: ExperienceWidget) => isWidgetVisible(widget, experienceMode),
    [experienceMode]
  );

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

  const shouldShowFullPictureOnramp =
    experienceMode === 'everyday' &&
    !fullPictureOnrampDismissed &&
    everydayIntelligenceOpens >= 2;

  const value = useMemo(
    () => ({
      language,
      themeMode,
      experienceMode,
      fontScale,
      largeControls,
      experienceModeChosen,
      setLanguage,
      setThemeMode,
      setExperienceMode,
      chooseExperienceMode,
      setFontScale,
      setLargeControls,
      applyRoleDefaultIfNeeded,
      isEveryday: experienceMode === 'everyday',
      isFullPicture: experienceMode === 'full',
      showWidget,
      fontScaleMultiplier: FONT_SCALE_VALUES[fontScale],
      tapMin: largeControls ? TAP_MIN.large : TAP_MIN.default,
      recordIntelligenceOpen,
      shouldShowFullPictureOnramp,
      dismissFullPictureOnramp,
      isReady,
    }),
    [
      language,
      themeMode,
      experienceMode,
      fontScale,
      largeControls,
      experienceModeChosen,
      applyRoleDefaultIfNeeded,
      showWidget,
      recordIntelligenceOpen,
      shouldShowFullPictureOnramp,
      dismissFullPictureOnramp,
      isReady,
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
