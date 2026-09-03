import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AppHeader from '../components/layout/AppHeader';
import OfflineBanner from '../components/OfflineBanner';
import MainTabs from './MainTabs';
import ExperienceChooserScreen from '../screens/ExperienceChooserScreen';
import ComfortPickerScreen from '../screens/ComfortPickerScreen';
import PersonalizingScreen from '../screens/PersonalizingScreen';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';

const MainLayout = () => {
  const { colors } = useTheme();
  const { experienceModeChosen, comfortSetupDone, isReady, markComfortSetupDone } = usePreferences();
  const [showPersonalizing, setShowPersonalizing] = useState(false);

  if (!isReady) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  if (!experienceModeChosen) {
    return <ExperienceChooserScreen />;
  }

  if (!comfortSetupDone) {
    if (showPersonalizing) {
      return (
        <PersonalizingScreen
          onComplete={async () => {
            await markComfortSetupDone();
          }}
        />
      );
    }
    return (
      <ComfortPickerScreen
        onComplete={() => setShowPersonalizing(true)}
      />
    );
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
