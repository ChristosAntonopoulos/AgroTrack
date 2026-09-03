import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../context/PreferencesContext';
import { useTheme } from '../context/ThemeContext';
import type { ExperienceMode } from '../experience/types';
import { typography, spacing } from '../theme';
import BrandLogo from '../components/ui/BrandLogo';

/** Wong Nature Methods: blue + orange. Distinct luminance + icon + label. */
const MODE_PALETTE = {
  light: {
    everyday: {
      accent: '#0072B2',
      soft: '#B7DDF0',
      ink: '#0B1F2A',
      muted: '#2C4A5C',
      onAccent: '#FFFFFF',
    },
    full: {
      accent: '#E69F00',
      soft: '#F6DC8A',
      ink: '#1A1400',
      muted: '#5A4308',
      onAccent: '#1A1400',
    },
  },
  dark: {
    everyday: {
      accent: '#56B4E9',
      soft: '#154A66',
      ink: '#F3FAFF',
      muted: '#C5E6F6',
      onAccent: '#0B1F2A',
    },
    full: {
      accent: '#E69F00',
      soft: '#5C4300',
      ink: '#FFF6DC',
      muted: '#F0D48A',
      onAccent: '#1A1400',
    },
  },
} as const;

interface ExperienceChooserScreenProps {
  onChosen?: () => void;
}

const ExperienceChooserScreen: React.FC<ExperienceChooserScreenProps> = ({ onChosen }) => {
  const { t } = useTranslation('settings');
  const { colors, isDark } = useTheme();
  const { chooseExperienceMode, fontScaleMultiplier, tapMin } = usePreferences();
  const palette = isDark ? MODE_PALETTE.dark : MODE_PALETTE.light;

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
  }) => {
    const tone = palette[mode];
    return (
      <TouchableOpacity
        style={[
          styles.option,
          {
            backgroundColor: tone.soft,
            borderColor: tone.accent,
            minHeight: tapMin * 3.5,
          },
        ]}
        onPress={() => finish(mode)}
        accessibilityRole="button"
        accessibilityLabel={t(titleKey)}
      >
        <View style={[styles.band, { backgroundColor: tone.accent }]}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Ionicons name={icon} size={22} color={tone.onAccent} />
          </View>
          <Text style={[styles.optionTitle, { color: tone.onAccent, fontSize: 18 * fontScaleMultiplier }]}>
            {t(titleKey)}
          </Text>
        </View>
        <View style={styles.body}>
          <Text style={[styles.optionDesc, { color: tone.muted, fontSize: 15 * fontScaleMultiplier }]}>
            {t(descKey)}
          </Text>
          <View style={[styles.hintChip, { backgroundColor: tone.accent }]}>
            <Text style={[styles.hintText, { color: tone.onAccent, fontSize: 13 * fontScaleMultiplier }]}>
              {t(hintKey)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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

      <Text style={[styles.footer, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}>
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
    fontWeight: '800',
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
    overflow: 'hidden',
  },
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  optionTitle: {
    fontWeight: '800',
    flex: 1,
  },
  optionDesc: {
    lineHeight: 22,
  },
  hintChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  hintText: {
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 20,
  },
});

export default ExperienceChooserScreen;
