import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../../context/PreferencesContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme';

const FullPictureOnrampBanner = () => {
  const { t } = useTranslation('settings');
  const { colors } = useTheme();
  const {
    shouldShowFullPictureOnramp,
    setExperienceMode,
    dismissFullPictureOnramp,
    tapMin,
  } = usePreferences();

  if (!shouldShowFullPictureOnramp) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: '#FFF4D9', borderColor: '#E69F00' }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('experience.onrampTitle')}</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>{t('experience.onrampBody')}</Text>
      <View style={styles.actions}>
        <Pressable
          style={[styles.primary, { minHeight: tapMin }]}
          onPress={() => {
            void setExperienceMode('full');
            void dismissFullPictureOnramp();
          }}
        >
          <Text style={styles.primaryText}>{t('experience.onrampSwitch')}</Text>
        </Pressable>
        <Pressable style={{ minHeight: tapMin, justifyContent: 'center' }} onPress={() => void dismissFullPictureOnramp()}>
          <Text style={{ color: colors.textSecondary }}>{t('experience.onrampDismiss')}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: { fontWeight: '800', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', flexWrap: 'wrap' },
  primary: {
    backgroundColor: '#E69F00',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  primaryText: { fontWeight: '800', color: '#1A1200' },
});

export default FullPictureOnrampBanner;
