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
import type { FontScale } from '../experience/types';
import { FONT_SCALE_VALUES, TAP_MIN_PX } from '../experience/types';
import { useAuth } from './AuthContext';
import { isMockMode } from '../services/serviceFactory';
import api from '../services/api';

interface ExperienceModeContextType {
  fontScale: FontScale;
  largeControls: boolean;
  setFontScale: (scale: FontScale) => void;
  setLargeControls: (enabled: boolean) => void;
  applyComfortToDocument: () => void;
}

const ExperienceModeContext = createContext<ExperienceModeContextType | undefined>(undefined);

const applyDocumentComfort = (fontScale: FontScale, largeControls: boolean) => {
  const root = document.documentElement;
  root.setAttribute('data-font-scale', fontScale);
  root.setAttribute('data-large-controls', largeControls ? 'true' : 'false');
  root.removeAttribute('data-experience');
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
  const [fontScale, setFontScaleState] = useState<FontScale>(() => {
    const prefs = settingsService.getPreferences();
    return prefs.fontScale;
  });
  const [largeControls, setLargeControlsState] = useState(() => {
    const prefs = settingsService.getPreferences();
    return prefs.largeControls;
  });

  // Restore server-persisted comfort prefs after login.
  useEffect(() => {
    const server = user?.preferences;
    if (!server) return;
    const scale = (server.fontScale === 'large' || server.fontScale === 'xl' ? server.fontScale : 'default') as FontScale;
    setFontScaleState(scale);
    setLargeControlsState(Boolean(server.largeControls));
    settingsService.savePreferences({
      fontScale: scale,
      largeControls: Boolean(server.largeControls),
    });
  }, [user?.userId]);

  useEffect(() => {
    applyDocumentComfort(fontScale, largeControls);
  }, [fontScale, largeControls]);

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

  const applyComfortToDocument = useCallback(() => {
    applyDocumentComfort(fontScale, largeControls);
  }, [fontScale, largeControls]);

  const value = useMemo(
    () => ({
      fontScale,
      largeControls,
      setFontScale,
      setLargeControls,
      applyComfortToDocument,
    }),
    [fontScale, largeControls, setFontScale, setLargeControls, applyComfortToDocument]
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
