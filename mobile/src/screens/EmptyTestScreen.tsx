import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

const EmptyTestScreen: React.FC = () => {
  if (__DEV__) {
    console.log('[EmptyTestScreen] Rendering empty test screen');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Successful!</Text>
      <Text style={styles.subtitle}>Empty test screen - no errors here</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.styles.h2,
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default EmptyTestScreen;
