import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AppHeader from '../components/layout/AppHeader';
import OfflineBanner from '../components/OfflineBanner';
import MainTabs from './MainTabs';
import ExperienceChooserScreen from '../screens/ExperienceChooserScreen';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';

const MainLayout = () => {
  const { colors } = useTheme();
  const { experienceModeChosen, isReady } = usePreferences();

  if (!isReady) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  if (!experienceModeChosen) {
    return <ExperienceChooserScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader />
      <OfflineBanner />
      <MainTabs />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default MainLayout;
