import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BrandLogo from '../ui/BrandLogo';
import { typography, spacing, createElevation } from '../../theme';

const AppHeader = () => {
  const { user } = useAuth();
  const { colors, isDark, fontScaleMultiplier } = useTheme();
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.container,
        {
          backgroundColor: colors.headerBackground,
          borderBottomColor: colors.headerBorder,
          ...createElevation(colors, isDark ? 'lg' : 'md'),
        },
      ]}
    >
      {isDark ? (
        <View
          style={[styles.accentLine, { backgroundColor: colors.headerAccent }]}
          pointerEvents="none"
        />
      ) : null}

      <View style={styles.inner}>
        <BrandLogo variant="horizontal" tone="on-dark" size={22} />
        {displayName ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark
                  ? colors.headerAccent + '22'
                  : colors.headerForeground + '18',
                borderColor: isDark ? colors.headerAccent + '55' : colors.headerForeground + '40',
              },
            ]}
          >
            <Ionicons name="person-circle-outline" size={14} color={colors.headerAccent} />
            <Text
              style={[styles.badgeText, { color: colors.headerForeground, fontSize: 10 * fontScaleMultiplier }]}
            >
              {displayName}
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  accentLine: {
    position: 'absolute',
    bottom: 0,
    left: spacing.base,
    right: spacing.base,
    height: 2,
    borderRadius: 1,
    opacity: 0.85,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    minHeight: 52,
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: '42%',
  },
  badgeText: {
    ...typography.styles.caption,
    fontWeight: '600',
    fontSize: 10,
    letterSpacing: 0.2,
  },
});

export default AppHeader;
