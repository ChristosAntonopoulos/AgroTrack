import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { Text, TextInput, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
} from '@expo-google-fonts/noto-sans';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { OfflineProvider } from './src/context/OfflineContext';
import { HarvestCampaignProvider } from './src/context/HarvestCampaignContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import SubscriptionHost from './src/components/subscription/SubscriptionHost';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import i18n, { changeAppLanguage } from './src/i18n';
import { usePreferences } from './src/context/PreferencesContext';
import LoadingSpinner from './src/components/LoadingSpinner';
import { appFonts } from './src/theme/typography';

type ComponentWithDefaults = {
  defaultProps?: { style?: object | object[] };
};

/** Ensure every Text/TextInput gets a Greek-capable face on Android. */
const applyDefaultTextFont = () => {
  if (Platform.OS !== 'android') return;
  const base = { fontFamily: appFonts.regular };
  const textComponent = Text as unknown as ComponentWithDefaults;
  const inputComponent = TextInput as unknown as ComponentWithDefaults;
  textComponent.defaultProps = {
    ...textComponent.defaultProps,
    style: [textComponent.defaultProps?.style, base].filter(Boolean) as object[],
  };
  inputComponent.defaultProps = {
    ...inputComponent.defaultProps,
    style: [inputComponent.defaultProps?.style, base].filter(Boolean) as object[],
  };
};

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
  const [fontsLoaded] = useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_600SemiBold,
    NotoSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) applyDefaultTextFont();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <AuthProvider>
            <PreferencesProvider>
              <HarvestCampaignProvider>
                <ThemeProvider>
                  <I18nSync>
                    <OfflineProvider>
                      <SubscriptionProvider>
                        <AppInner />
                        <SubscriptionHost />
                      </SubscriptionProvider>
                    </OfflineProvider>
                  </I18nSync>
                </ThemeProvider>
              </HarvestCampaignProvider>
            </PreferencesProvider>
          </AuthProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
