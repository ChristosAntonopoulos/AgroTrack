import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getHeaderTitle } from '@react-navigation/elements';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import HeaderIconButton from '../components/layout/HeaderIconButton';
import { appFonts, spacing, touch } from '../theme';

/**
 * Pushed-screen chrome. Title sits on the same row as the back control.
 */
const StackScreenHeader = ({ back, options, route, navigation }: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  const { colors, fontScaleMultiplier } = useTheme();
  const { t } = useTranslation('common');
  const title = getHeaderTitle(options, route.name).trim();
  const canGoBack = Boolean(back);
  const titleSize = 22 * fontScaleMultiplier;

  const leading = options.headerLeft
    ? options.headerLeft({
        tintColor: undefined,
        canGoBack,
        label: back?.title,
      })
    : canGoBack
      ? (
          <HeaderIconButton
            icon="chevron-back"
            accessibilityLabel={t('back')}
            onPress={() => navigation.goBack()}
          />
        )
      : null;

  const trailing = options.headerRight
    ? options.headerRight({ tintColor: undefined, canGoBack })
    : null;

  if (!title && !leading && !trailing) return null;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        {leading}
        {title ? (
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                fontSize: titleSize,
                lineHeight: titleSize * 1.2,
              },
            ]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
        ) : (
          <View style={styles.flex} />
        )}
        {trailing}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  row: {
    minHeight: touch.icon,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: appFonts.bold,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  flex: {
    flex: 1,
  },
});

export default StackScreenHeader;
