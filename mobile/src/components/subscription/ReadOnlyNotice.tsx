import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useSubscriptionOptional } from '../../context/SubscriptionContext';
import { trackBillingEvent } from '../../billing/billingAnalytics';
import { spacing, radii } from '../../theme';

/**
 * Shown on a grove the backend marks `isSubscriptionReadOnly`. Explains view-only calmly,
 * offers Pro, and (free plan over limit) a way to pick which grove stays editable.
 */
const ReadOnlyNotice: React.FC = () => {
  const { t } = useTranslation('subscription');
  const { colors, fontScaleMultiplier } = useTheme();
  const subscription = useSubscriptionOptional();
  const snapshot = subscription?.snapshot ?? null;
  const limit = snapshot?.limits.ownedFields;
  const canChoose = snapshot?.plan === 'free' && snapshot.usage.ownedFields > snapshot.limits.ownedFields;

  useEffect(() => {
    trackBillingEvent('read_only_notice_viewed');
  }, []);

  if (!subscription) return null;

  return (
    <View
      accessibilityRole="summary"
      style={[styles.card, { backgroundColor: colors.infoLight, borderColor: colors.borderLight }]}
    >
      <Ionicons name="eye-outline" size={22} color={colors.info} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 15 * fontScaleMultiplier }]}>
          {t('readOnly.title')}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14 * fontScaleMultiplier,
            lineHeight: 20 * fontScaleMultiplier,
          }}
        >
          {limit != null ? t('readOnly.body', { count: limit }) : t('readOnly.bodyShort')}
        </Text>
        <View style={styles.actions}>
          <Button
            title={t('readOnly.upgrade')}
            variant="outline"
            size="small"
            onPress={() => {
              trackBillingEvent('readonly_field_upgrade_clicked');
              subscription.showUpgradePaywall({ source: 'read_only_notice', intent: 'upgrade' });
            }}
          />
          {canChoose ? (
            <Button
              title={t('readOnly.choose')}
              variant="ghost"
              size="small"
              onPress={subscription.openWritableSelection}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  copy: { flex: 1, gap: 4 },
  title: { fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
});

export default ReadOnlyNotice;
