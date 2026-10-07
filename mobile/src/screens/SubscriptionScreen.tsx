import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import Button from '../components/ui/Button';
import SubscriptionNoticeCard from '../components/subscription/SubscriptionNoticeCard';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useManageSubscription } from '../hooks/useManageSubscription';
import { isPro } from '../billing/subscriptionModel';
import { BILLING_SUPPORT_EMAIL } from '../billing/billingConfig';
import { trackBillingEvent } from '../billing/billingAnalytics';
import { spacing, radii } from '../theme';

const LOCALE_TAGS: Record<string, string> = { el: 'el-GR', en: 'en-US', it: 'it-IT' };

type RestoreNotice = 'success' | 'none' | 'failed' | null;

/**
 * Plan & billing. Reads only the shared subscription state — plan logic is never
 * re-derived here. While loading we show a skeleton, never a flash of "Free".
 */
const SubscriptionScreen = () => {
  const { t, i18n } = useTranslation(['subscription', 'common']);
  const { colors, fontScaleMultiplier } = useTheme();
  const navigation = useNavigation();
  const {
    snapshot,
    isLoading,
    loadState,
    isStale,
    refresh,
    syncAfterPurchase,
    billing,
    showUpgradePaywall,
  } = useSubscription();
  const manage = useManageSubscription();
  const [restoring, setRestoring] = useState(false);
  const [restoreNotice, setRestoreNotice] = useState<RestoreNotice>(null);
  const localeTag = LOCALE_TAGS[i18n.language?.slice(0, 2)] ?? 'en-US';

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('subscription:billing.title') });
  }, [navigation, t]);

  // Opening the screen is a good moment to make sure the numbers are current.
  useFocusEffect(
    useCallback(() => {
      trackBillingEvent('subscription_screen_viewed');
      void refresh();
    }, [refresh])
  );

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(localeTag, { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    setRestoreNotice(null);
    trackBillingEvent('restore_started', { source: 'settings' });
    try {
      const outcome = await billing.restore();
      if (outcome.status === 'none' || !outcome.hint) {
        setRestoreNotice('none');
        return;
      }
      const synced = await syncAfterPurchase(outcome.hint);
      if (synced?.entitlementActive || synced?.plan === 'pro') {
        trackBillingEvent('restore_succeeded', { source: 'settings' });
        setRestoreNotice('success');
      } else {
        setRestoreNotice('none');
      }
    } catch {
      trackBillingEvent('restore_failed', { source: 'settings' });
      setRestoreNotice('failed');
    } finally {
      setRestoring(false);
    }
  };

  const text = (size: number, color = colors.textSecondary) => ({
    color,
    fontSize: size * fontScaleMultiplier,
    lineHeight: size * 1.45 * fontScaleMultiplier,
  });

  const renderCard = () => {
    if (!snapshot) return null;
    const pro = isPro(snapshot);
    const used = snapshot.usage.ownedFields;
    const limit = snapshot.limits.ownedFields;
    const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

    const statusLine = (() => {
      if (pro && snapshot.status === 'cancel_at_period_end') {
        return t('subscription:billing.endsOn', { date: fmt(snapshot.expiresAt) });
      }
      if (pro && snapshot.renewsAt) return t('subscription:billing.renewsOn', { date: fmt(snapshot.renewsAt) });
      if (!pro && snapshot.status === 'expired' && snapshot.expiresAt) {
        return t('subscription:billing.expiredOn', { date: fmt(snapshot.expiresAt) });
      }
      return null;
    })();

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.cardHead}>
          <Text style={[styles.planName, { color: colors.textPrimary, fontSize: 19 * fontScaleMultiplier }]}>
            {pro ? t('subscription:plan.proName') : t('subscription:plan.freeName')}
          </Text>
          <View style={[styles.chip, { backgroundColor: pro ? colors.primaryLight : colors.surfaceMuted }]}>
            <Text style={{ color: pro ? colors.primary : colors.textSecondary, fontWeight: '700', fontSize: 12 }}>
              {pro ? t('subscription:plan.pro') : t('subscription:plan.free')}
            </Text>
          </View>
        </View>

        <View style={styles.usage}>
          <Text style={text(14)}>{t('subscription:billing.usage', { used, limit })}</Text>
          <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
            <View style={[styles.fill, { width: `${percent}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {statusLine ? <Text style={text(14)}>{statusLine}</Text> : null}
        {pro && snapshot.provider ? (
          <Text style={text(14)}>
            {t('subscription:billing.via', { provider: t(`subscription:providers.${snapshot.provider}`) })}
          </Text>
        ) : null}

        <View style={styles.actions}>
          {!pro ? (
            <Button
              title={t('subscription:billing.upgrade')}
              onPress={() => showUpgradePaywall({ source: 'settings', intent: 'upgrade' })}
              fullWidth
            />
          ) : null}
          {pro && manage.canManage ? (
            <Button
              title={t('subscription:billing.manage.cta')}
              variant="outline"
              loading={manage.busy}
              onPress={() => void manage.open()}
              fullWidth
            />
          ) : null}
        </View>

        {pro && snapshot.provider ? <Text style={text(13, colors.textTertiary)}>{t(`subscription:billing.manage.${snapshot.provider}`)}</Text> : null}
        {manage.unavailable ? (
          <Text
            style={text(13, colors.textTertiary)}
            onPress={() => void Linking.openURL(`mailto:${BILLING_SUPPORT_EMAIL}`)}
          >
            {t('subscription:billing.manage.unavailable', { email: BILLING_SUPPORT_EMAIL })}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <ScreenLayout scroll padded canvasOpacity={0.35} contentContainerStyle={styles.content}>
      <Text style={[text(14), styles.subtitle]}>{t('subscription:billing.subtitle')}</Text>

      {isLoading ? (
        <View style={styles.loading} accessibilityLabel={t('subscription:billing.loading')}>
          <ActivityIndicator color={colors.primary} />
          <Text style={text(14)}>{t('subscription:billing.loading')}</Text>
        </View>
      ) : null}

      {!snapshot && !isLoading && loadState === 'error' ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.planName, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
            {t('subscription:billing.loadError.title')}
          </Text>
          <Text style={text(14)}>{t('subscription:billing.loadError.body')}</Text>
          <Button
            title={t('subscription:billing.loadError.retry')}
            variant="outline"
            onPress={() => void refresh()}
            style={styles.retry}
          />
        </View>
      ) : null}

      {snapshot ? (
        <>
          {isStale || loadState === 'error' ? (
            <Text style={[text(13, colors.textTertiary), styles.stale]}>{t('subscription:billing.stale')}</Text>
          ) : null}
          <SubscriptionNoticeCard />
          {renderCard()}
        </>
      ) : null}

      {/* Restore is deliberately secondary: text link, below the plan card. */}
      {billing.isConfigured && snapshot ? (
        <View style={styles.restore}>
          <Button
            title={restoring ? t('subscription:paywall.restoreBusy') : t('subscription:paywall.cta.restore')}
            variant="text"
            size="small"
            onPress={() => void restore()}
            disabled={restoring}
          />
          {restoreNotice ? (
            <Text style={[text(13), styles.restoreNotice]}>
              {t(`subscription:paywall.restore.${restoreNotice}`)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['2xl'] },
  subtitle: { marginBottom: spacing.md },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  stale: { marginBottom: spacing.sm },
  card: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  planName: { fontWeight: '800', flexShrink: 1 },
  chip: { borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 4 },
  usage: { gap: spacing.xs, marginTop: spacing.xs },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  retry: { alignSelf: 'flex-start', marginTop: spacing.sm },
  restore: { alignItems: 'center', marginTop: spacing.lg },
  restoreNotice: { textAlign: 'center', marginTop: spacing.xs },
});

export default SubscriptionScreen;
