import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { settingsService } from '../services/settingsService';
import type { ExperienceMode, FontScale } from '../experience/types';
import { FONT_SCALE_VALUES, TAP_MIN_PX } from '../experience/types';
import { isWidgetVisible } from '../experience/catalog';
import type { ExperienceWidget } from '../experience/types';
import { defaultExperienceModeForRole } from '../experience/defaults';
import { useAuth } from './AuthContext';
import { isMockMode } from '../services/serviceFactory';
import api from '../services/api';

interface ExperienceModeContextType {
  experienceMode: ExperienceMode;
  fontScale: FontScale;
  largeControls: boolean;
  experienceModeChosen: boolean;
  setExperienceMode: (mode: ExperienceMode) => void;
  setFontScale: (scale: FontScale) => void;
  setLargeControls: (enabled: boolean) => void;
  chooseExperienceMode: (mode: ExperienceMode) => void;
  isEveryday: boolean;
  isFullPicture: boolean;
  showWidget: (widget: ExperienceWidget) => boolean;
  recordIntelligenceOpen: () => void;
  shouldShowFullPictureOnramp: boolean;
  dismissFullPictureOnramp: () => void;
  applyComfortToDocument: () => void;
  /** Plan Phase 1: home path after mode switch / login. */
  rehomePathForMode: (mode: ExperienceMode, role?: string) => string;
}

const ExperienceModeContext = createContext<ExperienceModeContextType | undefined>(undefined);

const applyDocumentComfort = (
  fontScale: FontScale,
  largeControls: boolean,
  experienceMode: ExperienceMode
) => {
  const root = document.documentElement;
  root.setAttribute('data-font-scale', fontScale);
  root.setAttribute('data-large-controls', largeControls ? 'true' : 'false');
  root.setAttribute('data-experience', experienceMode);
  root.style.setProperty('--font-scale', String(FONT_SCALE_VALUES[fontScale]));
  root.style.setProperty(
    '--tap-min',
    `${largeControls ? TAP_MIN_PX.large : TAP_MIN_PX.default}px`
  );
  root.style.setProperty('--ui-density', largeControls ? '1.15' : '1');
};

const syncPrefsToServer = async (patch: Record<string, unknown>) => {
  if (isMockMode()) return;
  try {
    await api.put('/api/v1/users/me/preferences', patch);
  } catch {
    // Device prefs remain authoritative when offline.
  }
};

export const ExperienceModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [experienceMode, setExperienceModeState] = useState<ExperienceMode>(() => {
    const prefs = settingsService.getPreferences();
    return prefs.experienceMode;
  });
  const [fontScale, setFontScaleState] = useState<FontScale>(() => {
    const prefs = settingsService.getPreferences();
    return prefs.fontScale;
  });
  const [largeControls, setLargeControlsState] = useState(() => {
    const prefs = settingsService.getPreferences();
    return prefs.largeControls;
  });
  const [experienceModeChosen, setExperienceModeChosen] = useState(() => {
    const prefs = settingsService.getPreferences();
    return prefs.experienceModeChosen;
  });
  const [everydayIntelligenceOpens, setEverydayIntelligenceOpens] = useState(() => {
    const prefs = settingsService.getPreferences();
    return prefs.everydayIntelligenceOpens;
  });
  const [fullPictureOnrampDismissed, setFullPictureOnrampDismissed] = useState(() => {
    const prefs = settingsService.getPreferences();
    return prefs.fullPictureOnrampDismissed;
  });

  // Apply role default once until the user explicitly chooses (audited behavior).
  useEffect(() => {
    if (experienceModeChosen || !user?.role) return;
    const roleDefault = defaultExperienceModeForRole(user.role);
    if (roleDefault !== experienceMode) {
      setExperienceModeState(roleDefault);
      settingsService.savePreferences({ experienceMode: roleDefault });
    }
  }, [user?.role, experienceModeChosen, experienceMode]);

  // Phase 3: restore server-persisted prefs after login without overriding an explicit local choice mid-session.
  useEffect(() => {
    const server = user?.preferences;
    if (!server?.experienceModeChosen) return;
    const mode: ExperienceMode = server.experienceMode === 'full' ? 'full' : 'everyday';
    const scale = (server.fontScale === 'large' || server.fontScale === 'xl' ? server.fontScale : 'default') as FontScale;
    setExperienceModeState(mode);
    setExperienceModeChosen(true);
    setFontScaleState(scale);
    setLargeControlsState(Boolean(server.largeControls));
    settingsService.savePreferences({
      experienceMode: mode,
      experienceModeChosen: true,
      fontScale: scale,
      largeControls: Boolean(server.largeControls),
    });
  }, [user?.userId]);

  useEffect(() => {
    applyDocumentComfort(fontScale, largeControls, experienceMode);
  }, [fontScale, largeControls, experienceMode]);

  const rehomePathForMode = useCallback((_mode: ExperienceMode, _role?: string) => '/today', []);

  const setExperienceMode = useCallback((mode: ExperienceMode) => {
    setExperienceModeState(mode);
    settingsService.savePreferences({ experienceMode: mode, experienceModeChosen: true });
    setExperienceModeChosen(true);
    void syncPrefsToServer({ experienceMode: mode, experienceModeChosen: true });
  }, []);

  const chooseExperienceMode = useCallback((mode: ExperienceMode) => {
    setExperienceModeState(mode);
    setExperienceModeChosen(true);
    settingsService.savePreferences({ experienceMode: mode, experienceModeChosen: true });
    void syncPrefsToServer({ experienceMode: mode, experienceModeChosen: true });
  }, []);

  const setFontScale = useCallback((scale: FontScale) => {
    setFontScaleState(scale);
    settingsService.savePreferences({ fontScale: scale });
    void syncPrefsToServer({ fontScale: scale });
  }, []);

  const setLargeControls = useCallback((enabled: boolean) => {
    setLargeControlsState(enabled);
    settingsService.savePreferences({ largeControls: enabled });
    void syncPrefsToServer({ largeControls: enabled });
  }, []);

  const showWidget = useCallback(
    (widget: ExperienceWidget) => isWidgetVisible(widget, experienceMode),
    [experienceMode]
  );

  const recordIntelligenceOpen = useCallback(() => {
    setEverydayIntelligenceOpens((prev) => {
      const next = prev + 1;
      settingsService.savePreferences({ everydayIntelligenceOpens: next });
      return next;
    });
  }, []);

  const dismissFullPictureOnramp = useCallback(() => {
    setFullPictureOnrampDismissed(true);
    settingsService.savePreferences({ fullPictureOnrampDismissed: true });
  }, []);

  const shouldShowFullPictureOnramp =
    experienceMode === 'everyday' &&
    !fullPictureOnrampDismissed &&
    everydayIntelligenceOpens >= 2;

  const applyComfortToDocument = useCallback(() => {
    applyDocumentComfort(fontScale, largeControls, experienceMode);
  }, [fontScale, largeControls, experienceMode]);

  const value = useMemo(
    () => ({
      experienceMode,
      fontScale,
      largeControls,
      experienceModeChosen,
      setExperienceMode,
      setFontScale,
      setLargeControls,
      chooseExperienceMode,
      isEveryday: experienceMode === 'everyday',
      isFullPicture: experienceMode === 'full',
      showWidget,
      recordIntelligenceOpen,
      shouldShowFullPictureOnramp,
      dismissFullPictureOnramp,
      applyComfortToDocument,
      rehomePathForMode,
    }),
    [
      experienceMode,
      fontScale,
      largeControls,
      experienceModeChosen,
      setExperienceMode,
      setFontScale,
      setLargeControls,
      chooseExperienceMode,
      showWidget,
      recordIntelligenceOpen,
      shouldShowFullPictureOnramp,
      dismissFullPictureOnramp,
      applyComfortToDocument,
      rehomePathForMode,
    ]
  );

  return (
    <ExperienceModeContext.Provider value={value}>{children}</ExperienceModeContext.Provider>
  );
};

export const useExperienceMode = () => {
  const context = useContext(ExperienceModeContext);
  if (context === undefined) {
    throw new Error('useExperienceMode must be used within an ExperienceModeProvider');
  }
  return context;
};
