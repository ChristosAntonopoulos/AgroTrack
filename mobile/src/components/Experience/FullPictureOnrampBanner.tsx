import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../context/PreferencesContext';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';

const FullPictureOnrampBanner: React.FC = () => {
  const { t } = useTranslation('settings');
  const { colors } = useTheme();
  const {
    shouldShowFullPictureOnramp,
    setExperienceMode,
    dismissFullPictureOnramp,
    fontScaleMultiplier,
    tapMin,
  } = usePreferences();

  if (!shouldShowFullPictureOnramp) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.success + '22', borderColor: colors.primary }]}>
      <Text style={[styles.title, { color: colors.primaryDark, fontSize: 16 * fontScaleMultiplier }]}>
        {t('experience.onrampTitle')}
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }]}>
        {t('experience.onrampBody')}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primary, { backgroundColor: colors.primaryDark, minHeight: tapMin }]}
          onPress={async () => {
            await setExperienceMode('full');
            await dismissFullPictureOnramp();
          }}
        >
          <Text style={[styles.primaryText, { fontSize: 14 * fontScaleMultiplier }]}>
            {t('experience.onrampSwitch')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondary, { borderColor: colors.border, minHeight: tapMin }]}
          onPress={() => dismissFullPictureOnramp()}
        >
          <Text style={[styles.secondaryText, { color: colors.textPrimary, fontSize: 14 * fontScaleMultiplier }]}>
            {t('experience.onrampDismiss')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: { fontWeight: '700' },
  body: { ...typography.styles.bodySmall, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  primary: {
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  secondaryText: { fontWeight: '600' },
});

export default FullPictureOnrampBanner;
