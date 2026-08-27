import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppHeader from '../components/layout/AppHeader';
import OfflineBanner from '../components/OfflineBanner';
import MainTabs from './MainTabs';
import { useTheme } from '../context/ThemeContext';

const MainLayout = () => {
  const { colors } = useTheme();
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
