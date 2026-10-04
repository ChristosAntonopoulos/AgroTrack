import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, typography } from '../../theme';

export type OnboardingChoice = {
  id: string;
  title: string;
  description?: string;
};

type Props = {
  choices: OnboardingChoice[];
  selectedId?: string | null;
  selectedIds?: string[];
  multi?: boolean;
  onSelect: (id: string) => void;
};

const OnboardingChoiceList: React.FC<Props> = ({
  choices,
  selectedId,
  selectedIds,
  multi,
  onSelect,
}) => {
  const { colors } = useTheme();
  const visible = choices.slice(0, 6);

  return (
    <View style={styles.list}>
      {visible.map((choice) => {
        const selected = multi
          ? Boolean(selectedIds?.includes(choice.id))
          : selectedId === choice.id;
        return (
          <Pressable
            key={choice.id}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: selected }}
            onPress={() => onSelect(choice.id)}
            style={[
              styles.choice,
              {
                borderColor: selected ? colors.oliveBorder : colors.border,
                backgroundColor: selected ? colors.primaryLight : colors.surface,
              },
            ]}
          >
            {multi ? (
              <View
                style={[
                  styles.check,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary : 'transparent',
                  },
                ]}
              >
                {selected ? <Ionicons name="checkmark" size={14} color={colors.onOlive} /> : null}
              </View>
            ) : null}
            <View style={styles.body}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{choice.title}</Text>
              {choice.description ? (
                <Text style={[styles.desc, { color: colors.textSecondary }]}>
                  {choice.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  choice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderRadius: radii.lg,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  body: { flex: 1 },
  title: { ...typography.styles.body, fontWeight: '600' },
  desc: { ...typography.styles.bodySmall, marginTop: 4 },
});

export default OnboardingChoiceList;
