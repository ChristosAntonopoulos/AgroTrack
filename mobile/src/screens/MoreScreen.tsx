import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import MoreMenuPanel from '../components/layout/MoreMenuPanel';

/** Fallback route for deep links — primary entry is the left More overlay. */
const MoreScreen = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MoreMenuPanel />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
});

export default MoreScreen;
