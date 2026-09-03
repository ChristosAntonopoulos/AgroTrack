import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import type { ExperienceMode, FontScale } from '../experience/types';
import { defaultExperienceModeForRole } from '../experience/defaults';
import { typography, spacing } from '../theme';

const MODE_PALETTE = {
  everyday: { accent: '#0072B2', soft: '#E6F3FA', ink: '#003A5D' },
  full: { accent: '#E69F00', soft: '#FFF4D9', ink: '#5A4200' },
};

const ExperienceChooserScreen = () => {
  const { t } = useTranslation('settings');
  const { colors } = useTheme();
  const { user } = useAuth();
  const { chooseExperienceMode, setFontScale, tapMin, fontScaleMultiplier } = usePreferences();
  const recommended = defaultExperienceModeForRole(user?.role);
  const [step, setStep] = useState<'mode' | 'comfort'>('mode');
  const [pendingMode, setPendingMode] = useState<ExperienceMode | null>(null);

  const pickMode = (mode: ExperienceMode) => {
    setPendingMode(mode);
    setStep('comfort');
  };

  const finish = async (scale: FontScale = 'default') => {
    await setFontScale(scale);
    await chooseExperienceMode(pendingMode || recommended);
  };

  if (step === 'comfort') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 24 * fontScaleMultiplier }]}>
          {t('experience.comfortTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('experience.comfortSubtitle')}
        </Text>
        {(['default', 'large', 'xl'] as FontScale[]).map((scale) => (
          <Pressable
            key={scale}
            onPress={() => finish(scale)}
            style={[styles.comfortBtn, { borderColor: colors.border, minHeight: tapMin }]}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
              {t(`preferences.fontScales.${scale}`)}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={() => finish()} style={{ marginTop: spacing.md, minHeight: tapMin, justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{t('experience.comfortSkip')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: 24 * fontScaleMultiplier }]}>
        {t('experience.chooserTitle')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('experience.chooserSubtitle')}
      </Text>
      {(['everyday', 'full'] as ExperienceMode[]).map((mode) => {
        const palette = MODE_PALETTE[mode];
        const recommendedMark = recommended === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => pickMode(mode)}
            style={[
              styles.option,
              {
                backgroundColor: palette.soft,
                borderColor: palette.accent,
                minHeight: tapMin * 3,
                borderWidth: recommendedMark ? 3 : 2,
              },
            ]}
          >
            <View style={styles.optionBand}>
              <Ionicons
                name={mode === 'everyday' ? 'list-outline' : 'layers-outline'}
                size={22}
                color={palette.ink}
              />
              <Text style={[styles.optionTitle, { color: palette.ink }]}>
                {t(`experience.${mode}`)}
              </Text>
            </View>
            <Text style={{ color: palette.ink, marginTop: spacing.sm }}>
              {t(`experience.${mode}Desc`)}
            </Text>
          </Pressable>
        );
      })}
      <Text style={[styles.footer, { color: colors.textSecondary }]}>{t('experience.chooserFooter')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.md },
  title: { ...typography.h2, fontWeight: '800' },
  subtitle: { ...typography.body, marginBottom: spacing.sm },
  option: { borderRadius: 16, padding: spacing.md },
  optionBand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  optionTitle: { fontSize: 18, fontWeight: '800' },
  comfortBtn: {
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  footer: { textAlign: 'center', marginTop: spacing.sm },
});

export default ExperienceChooserScreen;
