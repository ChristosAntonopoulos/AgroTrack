import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

type Step = 'pending' | 'in_progress' | 'completed';

interface TaskStatusStepperProps {
  status: string;
}

const STEPS: Step[] = ['pending', 'in_progress', 'completed'];

const TaskStatusStepper: React.FC<TaskStatusStepperProps> = ({ status }) => {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const currentIdx = STEPS.indexOf(status as Step);

  const labels: Record<Step, string> = {
    pending: t('taskStatus.pending'),
    in_progress: t('taskStatus.in_progress'),
    completed: t('taskStatus.completed'),
  };

  return (
    <View style={styles.row}>
      {STEPS.map((step, idx) => {
        const done = currentIdx > idx;
        const active = currentIdx === idx;
        const dotColor = done || active ? colors.primaryDark : colors.border;
        const textColor = active ? colors.textPrimary : colors.textSecondary;

        return (
          <React.Fragment key={step}>
            <View style={styles.step}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: done ? colors.primaryDark : colors.surfaceElevated,
                    borderColor: dotColor,
                  },
                  active && { borderWidth: 2, borderColor: colors.primaryDark },
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={12} color={colors.textInverse} />
                ) : active ? (
                  <View style={[styles.activeInner, { backgroundColor: colors.primaryDark }]} />
                ) : null}
              </View>
              <Text style={[styles.label, { color: textColor, fontWeight: active ? '700' : '500' }]}>
                {labels[step]}
              </Text>
            </View>
            {idx < STEPS.length - 1 ? (
              <View
                style={[
                  styles.line,
                  { backgroundColor: currentIdx > idx ? colors.primaryDark : colors.border },
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  step: { flex: 1, alignItems: 'center', gap: 6 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    ...typography.styles.caption,
    fontSize: 10,
    textAlign: 'center',
  },
  line: {
    height: 2,
    flex: 0.5,
    marginTop: 11,
    borderRadius: 1,
  },
});

export default TaskStatusStepper;
