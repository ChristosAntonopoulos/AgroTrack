import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useManageSubscription } from '../../hooks/useManageSubscription';
import { SubscriptionNotice, resolveSubscriptionNotice } from '../../billing/subscriptionModel';
import { spacing, radii } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<Exclude<SubscriptionNotice, null>, IconName> = {
  billing_issue: 'alert-circle-outline',
  needs_writable_selection: 'location-outline',
  cancel_at_period_end: 'calendar-outline',
  expired_over_limit: 'information-circle-outline',
};

interface Props {
  /** Restrict to specific notices (e.g. only show billing issues on a different screen). */
  only?: SubscriptionNotice[];
}

/** One calm card for the highest-priority subscription notice. Billing issue is amber, never red. */
const SubscriptionNoticeCard: React.FC<Props> = ({ only }) => {
  const { t } = useTranslation('subscription');
  const { colors, fontScaleMultiplier } = useTheme();
  const { snapshot, openWritableSelection } = useSubscription();
  const manage = useManageSubscription();
  const notice = resolveSubscriptionNotice(snapshot);

  if (!snapshot || !notice || (only && !only.includes(notice))) return null;

  const warn = notice === 'billing_issue';
  const accent = warn ? colors.warningDark : colors.info;
  const used = snapshot.usage.ownedFields;
  const limit = snapshot.limits.ownedFields;

  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.card,
        {
          backgroundColor: warn ? colors.bannerWarningBg : colors.infoLight,
          borderColor: warn ? colors.bannerWarningBorder : colors.borderLight,
        },
      ]}
    >
      <Ionicons name={ICONS[notice]} size={22} color={accent} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 15 * fontScaleMultiplier }]}>
          {t(`billing.notice.${notice}.title`)}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14 * fontScaleMultiplier,
            lineHeight: 20 * fontScaleMultiplier,
          }}
        >
          {notice === 'expired_over_limit'
            ? t(`billing.notice.${notice}.body`, { used, limit })
            : t(`billing.notice.${notice}.body`)}
        </Text>
        {notice === 'billing_issue' && manage.canManage ? (
          <Button
            title={t('billing.notice.billing_issue.cta')}
            variant="outline"
            size="small"
            loading={manage.busy}
            onPress={() => void manage.open()}
            style={styles.action}
          />
        ) : null}
        {notice === 'needs_writable_selection' ? (
          <Button
            title={t('billing.notice.needs_writable_selection.cta')}
            variant="outline"
            size="small"
            onPress={openWritableSelection}
            style={styles.action}
          />
        ) : null}
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
  action: { alignSelf: 'flex-start', marginTop: spacing.sm },
});

export default SubscriptionNoticeCard;
