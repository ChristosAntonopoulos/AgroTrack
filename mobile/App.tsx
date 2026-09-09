import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { OfflineProvider } from './src/context/OfflineContext';
import { CaptureProvider } from './src/context/CaptureContext';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import i18n, { changeAppLanguage } from './src/i18n';
import { usePreferences } from './src/context/PreferencesContext';
import LoadingSpinner from './src/components/LoadingSpinner';

const AppInner = () => {
  const { isDark } = useTheme();
  return (
    <>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
};

const I18nSync = ({ children }: { children: React.ReactNode }) => {
  const { language, isReady } = usePreferences();

  useEffect(() => {
    if (isReady) {
      changeAppLanguage(language);
    }
  }, [language, isReady]);

  if (!isReady) return <LoadingSpinner fullScreen />;
  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <AuthProvider>
            <PreferencesProvider>
              <ThemeProvider>
                <I18nSync>
                  <OfflineProvider>
                    <CaptureProvider>
                      <AppInner />
                    </CaptureProvider>
                  </OfflineProvider>
                </I18nSync>
              </ThemeProvider>
            </PreferencesProvider>
          </AuthProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
