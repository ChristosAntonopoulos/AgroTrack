import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { LIFECYCLE_STAGES, normalizeStage } from '../../utils/lifecycleUtils';

export interface LifecycleStageStepperProps {
  currentStage?: string | null;
}

const LifecycleStageStepper: React.FC<LifecycleStageStepperProps> = ({ currentStage }) => {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const activeIndex = LIFECYCLE_STAGES.indexOf(normalizeStage(currentStage));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {LIFECYCLE_STAGES.map((stage, index) => {
        const isPast = index < activeIndex;
        const isActive = index === activeIndex;

        return (
          <View
            key={stage}
            style={[
              styles.chip,
              {
                backgroundColor: isActive
                  ? colors.primaryDark
                  : isPast
                    ? colors.successLight
                    : colors.surfaceMuted,
                borderColor: isActive ? colors.primaryDark : colors.borderLight,
              },
            ]}
          >
            {isPast ? (
              <Ionicons name="checkmark-circle" size={12} color={colors.successDark} />
            ) : isActive ? (
              <View style={[styles.activeDot, { backgroundColor: colors.textInverse }]} />
            ) : null}
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? colors.textInverse : isPast ? colors.successDark : colors.textSecondary,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {t(`lifecycleStage.${stage}`)}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { gap: spacing.xs, paddingVertical: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  label: { ...typography.styles.caption, fontSize: 10 },
});

export default LifecycleStageStepper;
