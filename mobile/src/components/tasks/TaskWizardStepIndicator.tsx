import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

export type TaskWizardStep = 'field' | 'template' | 'details' | 'review';

const STEP_ICONS: Record<TaskWizardStep, React.ComponentProps<typeof Ionicons>['name']> = {
  field: 'leaf-outline',
  template: 'clipboard-outline',
  details: 'create-outline',
  review: 'checkmark-circle-outline',
};

type Props = {
  steps: TaskWizardStep[];
  current: TaskWizardStep;
  currentIndex: number;
};

const TaskWizardStepIndicator: React.FC<Props> = ({ steps, current, currentIndex }) => {
  const { colors } = useTheme();
  const { t } = useTranslation('tasks');

  return (
    <View style={styles.row}>
      {steps.map((step, idx) => {
        const done = idx < currentIndex;
        const active = step === current;
        return (
          <View key={step} style={styles.item}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: done || active ? colors.primaryLight : colors.surface,
                  borderColor: done || active ? colors.oliveBorder : colors.borderLight,
                },
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={12} color={colors.primary} />
              ) : (
                <Ionicons
                  name={STEP_ICONS[step]}
                  size={12}
                  color={active ? colors.primary : colors.textTertiary}
                />
              )}
            </View>
            {idx < steps.length - 1 ? (
              <View
                style={[
                  styles.line,
                  { backgroundColor: done ? colors.primary : colors.borderLight },
                ]}
              />
            ) : null}
          </View>
        );
      })}
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
        {t(`createWizard.steps.${current}`)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  item: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { width: 14, height: 2, marginHorizontal: 2 },
  label: {
    ...typography.styles.caption,
    fontWeight: '600',
    marginLeft: spacing.xs,
    flex: 1,
  },
});

export default TaskWizardStepIndicator;
