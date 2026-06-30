import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { mapsNeedGoogleKeyOnAndroid } from './AppMapView';

const MapSetupBanner: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation('fields');

  if (!mapsNeedGoogleKeyOnAndroid()) {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.warningLight, borderColor: colors.warning },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.text, { color: colors.textPrimary }]}>
        {t('mapKeyMissing')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.sm,
    zIndex: 2,
  },
  text: {
    ...typography.styles.caption,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default MapSetupBanner;
