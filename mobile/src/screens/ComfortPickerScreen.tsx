import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { ThemeMode } from '../theme/themes';
import type { FontScale } from '../experience/types';
import { typography, spacing } from '../theme';
import Button from '../components/ui/Button';

interface ComfortPickerScreenProps {
  onComplete: () => void;
}

const ComfortPickerScreen: React.FC<ComfortPickerScreenProps> = ({ onComplete }) => {
  const { t } = useTranslation('settings');
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier, setThemeMode, setFontScale, setLargeControls } = usePreferences();
  
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>('system');
  const [selectedFontScale, setSelectedFontScale] = useState<FontScale>('default');
  const [selectedLargeControls, setSelectedLargeControls] = useState(false);

  const handleComplete = async () => {
    await setThemeMode(selectedTheme);
    await setFontScale(selectedFontScale);
    await setLargeControls(selectedLargeControls);
    onComplete();
  };

  const themes: { id: ThemeMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { id: 'system', label: t('themes.system'), icon: 'phone-portrait-outline' },
    { id: 'light', label: t('themes.light'), icon: 'sunny-outline' },
    { id: 'dark', label: t('themes.dark'), icon: 'moon-outline' },
  ];

  const fontScales: { id: FontScale; label: string }[] = [
    { id: 'default', label: t('experience.fontScales.default') },
    { id: 'large', label: t('experience.fontScales.large') },
    { id: 'xl', label: t('experience.fontScales.xl') },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: 28 * fontScaleMultiplier }]}>
            {t('onboarding.comfortTitle', { defaultValue: 'Make it comfortable' })}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 16 * fontScaleMultiplier }]}>
            {t('onboarding.comfortSubtitle', { defaultValue: 'Choose how the app looks and feels' })}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 18 * fontScaleMultiplier }]}>
            {t('theme')}
          </Text>
          <View style={styles.optionsRow}>
            {themes.map((theme) => (
              <Pressable
                key={theme.id}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: selectedTheme === theme.id ? colors.primary + '15' : colors.surface,
                    borderColor: selectedTheme === theme.id ? colors.primary : colors.borderLight,
                    minHeight: Math.max(tapMin, 72),
                  },
                ]}
                onPress={() => setSelectedTheme(theme.id)}
              >
                <Ionicons
                  name={theme.icon}
                  size={28}
                  color={selectedTheme === theme.id ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.themeLabel,
                    {
                      color: selectedTheme === theme.id ? colors.primary : colors.textPrimary,
                      fontSize: 15 * fontScaleMultiplier,
                    },
                  ]}
                >
                  {theme.label}
                </Text>
                {selectedTheme === theme.id ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={styles.checkmark} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 18 * fontScaleMultiplier }]}>
            {t('experience.fontScale')}
          </Text>
          <View style={styles.optionsColumn}>
            {fontScales.map((scale) => (
              <Pressable
                key={scale.id}
                style={[
                  styles.fontOption,
                  {
                    backgroundColor: selectedFontScale === scale.id ? colors.primary + '15' : colors.surface,
                    borderColor: selectedFontScale === scale.id ? colors.primary : colors.borderLight,
                    minHeight: tapMin,
                  },
                ]}
                onPress={() => setSelectedFontScale(scale.id)}
              >
                <Text
                  style={[
                    styles.fontLabel,
                    {
                      color: selectedFontScale === scale.id ? colors.primary : colors.textPrimary,
                      fontSize: 16 * fontScaleMultiplier,
                    },
                  ]}
                >
                  {scale.label}
                </Text>
                {selectedFontScale === scale.id ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            style={[
              styles.toggleOption,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                minHeight: tapMin,
              },
            ]}
            onPress={() => setSelectedLargeControls(!selectedLargeControls)}
          >
            <View style={styles.toggleLeft}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
                {t('experience.largeControls')}
              </Text>
              <Text style={[styles.toggleHint, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}>
                {t('onboarding.largeControlsHint', { defaultValue: '48px buttons and links' })}
              </Text>
            </View>
            <View
              style={[
                styles.toggleSwitch,
                {
                  backgroundColor: selectedLargeControls ? colors.primary : colors.gray300,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: colors.surface,
                    transform: [{ translateX: selectedLargeControls ? 22 : 2 }],
                  },
                ]}
              />
            </View>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Button
            title={t('onboarding.next', { defaultValue: 'Next' })}
            onPress={handleComplete}
            size="large"
            fullWidth
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.styles.h1,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.styles.body,
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.styles.h4,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
  },
  themeLabel: {
    ...typography.styles.caption,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  checkmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  optionsColumn: {
    gap: spacing.sm,
  },
  fontOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
  },
  fontLabel: {
    ...typography.styles.body,
    fontWeight: '600',
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleLeft: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.styles.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  toggleHint: {
    ...typography.styles.caption,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  actions: {
    marginTop: spacing.xl,
  },
});

export default ComfortPickerScreen;
