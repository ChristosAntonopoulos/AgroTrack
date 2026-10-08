import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radii, spacing, typography } from '../../theme';
import { getPasswordChecks, getPasswordStrengthScore } from '../../utils/passwordValidation';

type Props = {
  password: string;
};

const RULES: Array<{ key: keyof ReturnType<typeof getPasswordChecks>; labelKey: string }> = [
  { key: 'minLength', labelKey: 'auth:register.passwordRuleLength' },
  { key: 'hasUpper', labelKey: 'auth:register.passwordRuleUpper' },
  { key: 'hasLower', labelKey: 'auth:register.passwordRuleLower' },
  { key: 'hasDigit', labelKey: 'auth:register.passwordRuleDigit' },
];

const PasswordStrength: React.FC<Props> = ({ password }) => {
  const { t } = useTranslation(['auth']);
  const checks = getPasswordChecks(password);
  const score = getPasswordStrengthScore(password);
  const barColor =
    score <= 0
      ? colors.border
      : score <= 1
        ? '#b45309'
        : score <= 2
          ? '#ca8a04'
          : score <= 3
            ? '#4d7c0f'
            : colors.primary;
  const label =
    score <= 0
      ? ''
      : score <= 1
        ? t('auth:register.passwordStrengthWeak')
        : score <= 2
          ? t('auth:register.passwordStrengthFair')
          : score <= 3
            ? t('auth:register.passwordStrengthGood')
            : t('auth:register.passwordStrengthStrong');

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(score / 4) * 100}%`, backgroundColor: barColor }]} />
      </View>
      {label ? <Text style={[styles.label, { color: barColor }]}>{label}</Text> : null}
      <View style={styles.rules}>
        {RULES.map(({ key, labelKey }) => {
          const ok = checks[key];
          return (
            <View key={key} style={styles.rule}>
              <Ionicons
                name={ok ? 'checkmark-circle' : 'close-circle-outline'}
                size={16}
                color={ok ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.ruleText, ok && styles.ruleMet]}>{t(labelKey)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  track: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
  label: {
    ...typography.caption,
    fontWeight: '650',
  },
  rules: {
    gap: 4,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  ruleMet: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default PasswordStrength;
