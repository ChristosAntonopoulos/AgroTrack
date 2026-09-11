import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OfflineBanner from '../components/OfflineBanner';
import MainTabs from './MainTabs';
import ExperienceChooserScreen from '../screens/ExperienceChooserScreen';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';

const MainLayout = () => {
  const { colors } = useTheme();
  const { experienceModeChosen, isReady } = usePreferences();
  const insets = useSafeAreaInsets();

  if (!isReady) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  if (!experienceModeChosen) {
    return <ExperienceChooserScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <OfflineBanner />
      <MainTabs />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default MainLayout;
