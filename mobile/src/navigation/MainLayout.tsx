import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AppHeader from '../components/layout/AppHeader';
import OfflineBanner from '../components/OfflineBanner';
import MainTabs from './MainTabs';
import ExperienceChooserScreen from '../screens/ExperienceChooserScreen';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  const { colors } = useTheme();
  const { experienceModeChosen, applyRoleDefaultIfNeeded } = usePreferences();
  const { user } = useAuth();

  useEffect(() => {
    void applyRoleDefaultIfNeeded(user?.role);
  }, [user?.role, applyRoleDefaultIfNeeded]);

  if (!experienceModeChosen) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ExperienceChooserScreen />
      </View>
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
