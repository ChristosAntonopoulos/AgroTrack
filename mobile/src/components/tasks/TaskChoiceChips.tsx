import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, radii } from '../../theme';
import type { FieldWorkCategory } from '../../data/fieldWorkCatalogueLabels';
import { templateMeta } from '../../data/fieldWorkCatalogueLabels';
import type { ProposalChipKind } from '../../utils/proposalPresentation';

export type ChoiceOption<T extends string = string> = {
  id: T;
  label: string;
};

export function TaskChoiceChips<T extends string>({
  options,
  value,
  onChange,
  wrap = true,
}: {
  options: ChoiceOption<T>[];
  value: T | '';
  onChange: (id: T) => void;
  wrap?: boolean;
}) {
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  return (
    <View style={[styles.chipRow, wrap && styles.chipWrap]}>
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[
              styles.choice,
              {
                minHeight: Math.max(40, tapMin * 0.85),
                borderColor: selected ? colors.oliveBorder : colors.borderLight,
                backgroundColor: selected ? colors.primaryLight : colors.surface,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text
              style={[
                styles.choiceLabel,
                {
                  color: selected ? colors.primary : colors.textSecondary,
                  fontSize: 13 * fontScaleMultiplier,
                  fontWeight: selected ? '700' : '600',
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const chipTone = (
  kind: ProposalChipKind,
  colors: ReturnType<typeof useTheme>['colors']
) => {
  switch (kind) {
    case 'good':
      return { bg: colors.successLight, fg: colors.success };
    case 'caution':
    case 'expiring':
      return { bg: colors.warningLight, fg: colors.warning };
    case 'unsuitable':
    case 'official':
      return { bg: colors.errorLight, fg: colors.error };
    case 'unknown':
      return { bg: colors.surfaceMuted, fg: colors.textSecondary };
    default:
      return { bg: colors.primaryLight, fg: colors.primary };
  }
};

export const TaskWeatherChip = ({
  kind,
  label,
}: {
  kind: ProposalChipKind;
  label: string;
}) => {
  const { colors, fontScaleMultiplier } = useTheme();
  const tone = chipTone(kind, colors);
  return (
    <View style={[styles.weatherChip, { backgroundColor: tone.bg }]}>
      <Text style={[styles.weatherChipLabel, { color: tone.fg, fontSize: 11 * fontScaleMultiplier }]}>
        {label}
      </Text>
    </View>
  );
};

const CATEGORY_ICON: Record<FieldWorkCategory, React.ComponentProps<typeof Ionicons>['name']> = {
  monitoring: 'bug-outline',
  pruning: 'cut-outline',
  fertilisation: 'leaf-outline',
  irrigation: 'water-outline',
  harvest: 'nutrition-outline',
  inspection: 'eye-outline',
  analysis: 'flask-outline',
  ground: 'earth-outline',
  other: 'clipboard-outline',
};

export const TaskCategoryIcon = ({
  templateCode,
}: {
  templateCode?: string;
}) => {
  const { colors } = useTheme();
  const category = templateMeta(templateCode)?.category ?? 'other';
  return (
    <View style={[styles.categoryIcon, { backgroundColor: colors.primaryLight }]}>
      <Ionicons name={CATEGORY_ICON[category]} size={22} color={colors.primary} />
    </View>
  );
};

export const TaskSectionLabel = ({ children }: { children: string }) => {
  const { colors, fontScaleMultiplier } = useTheme();
  return (
    <Text
      style={[
        styles.sectionLabel,
        { color: colors.textPrimary, fontSize: 15 * fontScaleMultiplier },
      ]}
    >
      {children}
    </Text>
  );
};

export const TaskHelpText = ({ children }: { children: string }) => {
  const { colors, fontScaleMultiplier } = useTheme();
  return (
    <Text style={[styles.help, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chipWrap: {
    flexWrap: 'wrap',
  },
  choice: {
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  choiceLabel: {
    ...typography.styles.caption,
  },
  weatherChip: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  weatherChipLabel: {
    ...typography.styles.caption,
    fontWeight: '700',
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    ...typography.styles.body,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  help: {
    ...typography.styles.bodySmall,
    lineHeight: 18,
  },
});
