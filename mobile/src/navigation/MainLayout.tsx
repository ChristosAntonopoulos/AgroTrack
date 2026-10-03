import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OfflineBanner from '../components/OfflineBanner';
import MainTabs from './MainTabs';
import AppCanvas from '../components/layout/AppCanvas';
import NavCoach from '../components/onboarding/NavCoach';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';

const MainLayout = () => {
  const { colors } = useTheme();
  const { isReady } = usePreferences();
  const insets = useSafeAreaInsets();

  if (!isReady) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  return (
    <View style={styles.container}>
      <AppCanvas />
      <View style={[styles.foreground, { paddingTop: insets.top }]}>
        <OfflineBanner />
        <View style={styles.tabs}>
          <MainTabs />
        </View>
      </View>
      {/*
        Outside the safe-area padding on purpose: the spotlight dims the full
        screen and derives its own window origin, so it must not inherit the
        content frame's offset.
      */}
      <NavCoach />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  foreground: { flex: 1, backgroundColor: 'transparent' },
  tabs: { flex: 1 },
});

export default MainLayout;
