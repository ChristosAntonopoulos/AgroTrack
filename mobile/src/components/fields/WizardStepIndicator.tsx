import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

export type WizardStepKey = 'method' | 'cadastre' | 'basics' | 'boundary' | 'crop' | 'review';

const STEP_ICONS: Record<WizardStepKey, React.ComponentProps<typeof Ionicons>['name']> = {
  method: 'layers-outline',
  cadastre: 'document-text-outline',
  basics: 'leaf-outline',
  boundary: 'map-outline',
  crop: 'nutrition-outline',
  review: 'checkmark-circle-outline',
};

interface Props {
  steps: WizardStepKey[];
  current: WizardStepKey;
  currentIndex: number;
  onStepPress?: (step: WizardStepKey, index: number) => void;
}

const WizardStepIndicator: React.FC<Props> = ({ steps, current, currentIndex, onStepPress }) => {
  const { colors, tapMin } = useTheme();
  const { t } = useTranslation('fields');

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {steps.map((step, idx) => {
          const done = idx < currentIndex;
          const active = step === current;
          const reachable = idx <= currentIndex;
          return (
            <Pressable
              key={step}
              disabled={!reachable}
              onPress={() => reachable && onStepPress?.(step, idx)}
              style={[styles.item, { minHeight: tapMin * 0.7 }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: !reachable }}
            >
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
              <Text
                style={[
                  styles.stepLabel,
                  { color: active ? colors.textPrimary : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {t(`addField.steps.${step}`)}
              </Text>
              {idx < steps.length - 1 ? (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: done ? colors.primary : colors.borderLight },
                  ]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={[styles.progress, { color: colors.textSecondary }]}>
        {t('form.stepProgress', {
          current: Math.max(currentIndex + 1, 1),
          total: steps.length,
          name: t(`addField.steps.${current}`),
        })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md, gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    ...typography.styles.caption,
    fontWeight: '600',
    marginLeft: 6,
    maxWidth: 88,
  },
  line: { width: 14, height: 2, marginHorizontal: 6 },
  progress: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
});

export default WizardStepIndicator;
