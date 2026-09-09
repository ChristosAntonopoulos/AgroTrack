import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
}

const WizardStepIndicator: React.FC<Props> = ({ steps, current, currentIndex }) => {
  const { colors } = useTheme();
  const { t } = useTranslation('fields');

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
                  backgroundColor: done || active ? colors.primaryDark : colors.surface,
                  borderColor: done || active ? colors.primaryDark : colors.borderLight,
                },
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={12} color={colors.textInverse} />
              ) : (
                <Ionicons
                  name={STEP_ICONS[step]}
                  size={12}
                  color={active ? colors.textInverse : colors.textTertiary}
                />
              )}
            </View>
            {idx < steps.length - 1 ? (
              <View
                style={[
                  styles.line,
                  { backgroundColor: done ? colors.primaryDark : colors.borderLight },
                ]}
              />
            ) : null}
          </View>
        );
      })}
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
        {t(`addField.steps.${current === 'basics' ? 'basics' : current}`)}
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

export default WizardStepIndicator;
