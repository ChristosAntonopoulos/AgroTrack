import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { ThemeMode } from '../theme/themes';
import type { ExperienceMode, FontScale } from '../experience/types';
import { defaultExperienceModeForRole } from '../experience/defaults';
import { typography, spacing } from '../theme';
import Button from '../components/ui/Button';

const MODE_PALETTE = {
  everyday: { accent: '#0072B2', soft: '#E6F3FA', ink: '#003A5D' },
  full: { accent: '#E69F00', soft: '#FFF4D9', ink: '#5A4200' },
};

const ExperienceChooserScreen = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    chooseExperienceMode,
    setFontScale,
    setThemeMode,
    setLargeControls,
    tapMin,
    fontScaleMultiplier,
    themeMode,
    fontScale,
    largeControls,
  } = usePreferences();
  const recommended = defaultExperienceModeForRole(user?.role);
  const [step, setStep] = useState<'mode' | 'comfort'>('mode');
  const [pendingMode, setPendingMode] = useState<ExperienceMode | null>(null);

  const pickMode = (mode: ExperienceMode) => {
    setPendingMode(mode);
    setStep('comfort');
  };

  const finish = async () => {
    await chooseExperienceMode(pendingMode || recommended);
  };

  if (step === 'comfort') {
    const themes: { id: ThemeMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
      { id: 'system', label: t('themes.system'), icon: 'phone-portrait-outline' },
      { id: 'light', label: t('themes.light'), icon: 'sunny-outline' },
      { id: 'dark', label: t('themes.dark'), icon: 'moon-outline' },
    ];

    const fontScales: FontScale[] = ['default', 'large', 'xl'];

    return (
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 24 * fontScaleMultiplier }]}>
          {t('experience.comfortTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 16 * fontScaleMultiplier }]}>
          {t('experience.comfortSubtitle')}
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
          {t('theme')}
        </Text>
        <View style={styles.optionsRow}>
          {themes.map((theme) => {
            const selected = themeMode === theme.id;
            return (
              <Pressable
                key={theme.id}
                onPress={() => void setThemeMode(theme.id)}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: selected ? colors.primary + '15' : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                    minHeight: Math.max(tapMin, 72),
                  },
                ]}
              >
                <Ionicons
                  name={theme.icon}
                  size={24}
                  color={selected ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={{
                    color: selected ? colors.primary : colors.textPrimary,
                    fontWeight: '600',
                    fontSize: 13 * fontScaleMultiplier,
                    marginTop: spacing.xs,
                  }}
                >
                  {theme.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
          {t('experience.fontScale')}
        </Text>
        <View style={styles.optionsColumn}>
          {fontScales.map((scale) => {
            const selected = fontScale === scale;
            return (
              <Pressable
                key={scale}
                onPress={() => void setFontScale(scale)}
                style={[
                  styles.comfortBtn,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary + '15' : colors.surface,
                    minHeight: tapMin,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected ? colors.primary : colors.textPrimary,
                    fontWeight: '700',
                    fontSize: 16 * fontScaleMultiplier,
                  }}
                >
                  {t(`experience.fontScales.${scale}`)}
                </Text>
                {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => void setLargeControls(!largeControls)}
          style={[
            styles.toggleRow,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              minHeight: tapMin,
            },
          ]}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16 * fontScaleMultiplier, flex: 1 }}>
            {t('experience.largeControls')}
          </Text>
          <View
            style={[
              styles.toggleSwitch,
              { backgroundColor: largeControls ? colors.primary : colors.gray300 },
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                {
                  backgroundColor: colors.surface,
                  transform: [{ translateX: largeControls ? 22 : 2 }],
                },
              ]}
            />
          </View>
        </Pressable>

        <Button title={t('common:next')} onPress={() => void finish()} size="large" fullWidth />
        <Pressable onPress={() => void finish()} style={{ marginTop: spacing.sm, minHeight: tapMin, justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 14 * fontScaleMultiplier }}>
            {t('settings:experience.comfortSkip')}
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: 24 * fontScaleMultiplier }]}>
        {t('experience.chooserTitle')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 16 * fontScaleMultiplier }]}>
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
              <Text style={[styles.optionTitle, { color: palette.ink, fontSize: 18 * fontScaleMultiplier }]}>
                {t(`experience.${mode}`)}
              </Text>
            </View>
            <Text style={{ color: palette.ink, marginTop: spacing.sm, fontSize: 14 * fontScaleMultiplier }}>
              {t(`experience.${mode}Desc`)}
            </Text>
          </Pressable>
        );
      })}
      <Text style={[styles.footer, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}>
        {t('experience.chooserFooter')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.md },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.md },
  title: { ...typography.styles.h2, fontWeight: '800' },
  subtitle: { ...typography.styles.body, marginBottom: spacing.sm },
  sectionLabel: { ...typography.styles.body, fontWeight: '700', marginTop: spacing.sm },
  option: { borderRadius: 16, padding: spacing.md },
  optionBand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  optionTitle: { fontWeight: '800' },
  optionsRow: { flexDirection: 'row', gap: spacing.sm },
  optionsColumn: { gap: spacing.sm },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
  },
  comfortBtn: {
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  footer: { textAlign: 'center', marginTop: spacing.sm },
});

export default ExperienceChooserScreen;
