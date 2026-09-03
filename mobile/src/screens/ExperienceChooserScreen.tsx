import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../context/PreferencesContext';
import { useTheme } from '../context/ThemeContext';
import type { ExperienceMode } from '../experience/types';
import { typography, spacing } from '../theme';
import BrandLogo from '../components/ui/BrandLogo';

interface ExperienceChooserScreenProps {
  onChosen?: () => void;
}

const ExperienceChooserScreen: React.FC<ExperienceChooserScreenProps> = ({ onChosen }) => {
  const { t } = useTranslation('settings');
  const { colors } = useTheme();
  const { chooseExperienceMode, fontScaleMultiplier, tapMin } = usePreferences();

  const finish = async (mode: ExperienceMode) => {
    await chooseExperienceMode(mode);
    onChosen?.();
  };

  const Option = ({
    mode,
    icon,
    titleKey,
    descKey,
    hintKey,
  }: {
    mode: ExperienceMode;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    titleKey: string;
    descKey: string;
    hintKey: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.option,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
          minHeight: tapMin * 3.5,
        },
      ]}
      onPress={() => finish(mode)}
      accessibilityRole="button"
      accessibilityLabel={t(titleKey)}
    >
      <Ionicons name={icon} size={28} color={colors.primaryDark} />
      <Text style={[styles.optionTitle, { color: colors.primaryDark, fontSize: 20 * fontScaleMultiplier }]}>
        {t(titleKey)}
      </Text>
      <Text style={[styles.optionDesc, { color: colors.textSecondary, fontSize: 15 * fontScaleMultiplier }]}>
        {t(descKey)}
      </Text>
      <Text style={[styles.optionHint, { color: colors.primary, fontSize: 13 * fontScaleMultiplier }]}>
        {t(hintKey)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <BrandLogo size={48} />
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: 26 * fontScaleMultiplier }]}>
        {t('experience.chooserTitle')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 15 * fontScaleMultiplier }]}>
        {t('experience.chooserSubtitle')}
      </Text>

      <View style={styles.options}>
        <Option
          mode="everyday"
          icon="list-outline"
          titleKey="experience.everyday"
          descKey="experience.everydayDesc"
          hintKey="experience.everydayHint"
        />
        <Option
          mode="full"
          icon="layers-outline"
          titleKey="experience.full"
          descKey="experience.fullDesc"
          hintKey="experience.fullHint"
        />
      </View>

      <Text style={[styles.footer, { color: colors.textTertiary, fontSize: 13 * fontScaleMultiplier }]}>
        {t('experience.chooserFooter')}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing['2xl'],
    gap: spacing.md,
  },
  title: {
    ...typography.styles.h3,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.styles.body,
    lineHeight: 22,
  },
  options: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  option: {
    borderWidth: 2,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  optionTitle: {
    fontWeight: '700',
  },
  optionDesc: {
    lineHeight: 22,
  },
  optionHint: {
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default ExperienceChooserScreen;
