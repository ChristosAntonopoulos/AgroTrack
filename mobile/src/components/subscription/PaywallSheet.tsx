import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useSubscription } from '../../context/SubscriptionContext';
import type { BillingPackage, OfferingsResult } from '../../billing/types';
import {
  annualPerMonthLabel,
  annualSavingsPercent,
  pickDefaultPackage,
} from '../../billing/packageSelection';
import { isAtProLimit, isBilledElsewhere } from '../../billing/subscriptionModel';
import { BILLING_LEGAL_URLS, BILLING_SUPPORT_EMAIL } from '../../billing/billingConfig';
import { trackBillingEvent } from '../../billing/billingAnalytics';
import { spacing, radii } from '../../theme';

type Phase = 'select' | 'purchasing' | 'syncing' | 'restoring' | 'success' | 'pending';
type Notice = 'cancelled' | 'failed' | 'restore_none' | 'restore_failed' | null;
type OfferingsState = { status: 'loading' } | OfferingsResult;

const LOCALE_TAGS: Record<string, string> = { el: 'el-GR', en: 'en-US', it: 'it-IT' };

/**
 * Contextual paywall. Prices come only from store Offerings (RevenueCat); the backend
 * decides the resulting plan. A cancelled purchase is a calm outcome, never a red error.
 */
const PaywallSheet: React.FC = () => {
  const { t, i18n } = useTranslation(['subscription']);
  const { colors, fontScaleMultiplier, tapMin } = useTheme();
  const { paywall, closePaywall, snapshot, isLoading, billing, syncAfterPurchase } = useSubscription();

  const open = paywall != null;
  const [phase, setPhase] = useState<Phase>('select');
  const [notice, setNotice] = useState<Notice>(null);
  const [offerings, setOfferings] = useState<OfferingsState>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const returnActionRef = useRef<(() => void) | null>(null);
  const requestRef = useRef(paywall);
  if (paywall) requestRef.current = paywall;
  const request = paywall ?? requestRef.current;

  const proLimit = isAtProLimit(snapshot) || request?.intent === 'pro_limit';
  const billedElsewhere = isBilledElsewhere(snapshot, billing.ownProvider);
  const canSell = open && snapshot != null && !proLimit && !billedElsewhere;
  const busy = phase === 'purchasing' || phase === 'syncing' || phase === 'restoring';

  const loadOfferings = useCallback(async () => {
    setOfferings({ status: 'loading' });
    const result = await billing.loadOfferings();
    setOfferings(result);
    if (result.status === 'ready') {
      setSelectedId((prev) =>
        prev && result.packages.some((p) => p.id === prev)
          ? prev
          : pickDefaultPackage(result.packages)?.id ?? null
      );
    } else {
      trackBillingEvent('offerings_unavailable', { reason: result.reason });
    }
  }, [billing]);

  // Runs once per opening (and when the snapshot first arrives while open).
  useEffect(() => {
    if (!open) return;
    returnActionRef.current = paywall?.returnAction ?? null;
    setPhase('select');
    setNotice(null);
    trackBillingEvent('paywall_viewed', { source: paywall?.source, intent: paywall?.intent });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sellable = canSell;
  useEffect(() => {
    if (sellable) void loadOfferings();
  }, [sellable, loadOfferings]);

  const selected = useMemo(() => {
    if (offerings.status !== 'ready' || !selectedId) return null;
    return offerings.packages.find((p) => p.id === selectedId) ?? null;
  }, [offerings, selectedId]);

  const savings = offerings.status === 'ready' ? annualSavingsPercent(offerings.packages) : null;
  const titleKey =
    request?.intent === 'pro_limit' ? 'pro_limit' : request?.intent === 'add_field' ? 'add_field' : 'upgrade';
  const freeLimit = snapshot?.limits.ownedFields ?? 1;
  const localeTag = LOCALE_TAGS[i18n.language?.slice(0, 2)] ?? 'en-US';

  const onClose = () => {
    trackBillingEvent(phase === 'success' ? 'paywall_closed' : 'paywall_dismissed', {
      source: request?.source,
      phase,
    });
    closePaywall();
  };

  const completeSuccess = (period?: string) => {
    trackBillingEvent('purchase_completed', { source: request?.source, period });
    trackBillingEvent('purchase_succeeded', { source: request?.source, period });
    setPhase('success');
  };

  const purchase = async () => {
    if (!selected || busy) return;
    setNotice(null);
    setPhase('purchasing');
    trackBillingEvent('purchase_started', {
      source: request?.source,
      period: selected.period,
      package_id: selected.id,
    });
    try {
      const outcome = await billing.purchase(selected.id);
      if (outcome.status === 'cancelled') {
        trackBillingEvent('purchase_cancelled', { source: request?.source });
        setNotice('cancelled');
        setPhase('select');
        return;
      }
      if (outcome.status === 'pending') {
        trackBillingEvent('purchase_pending_sync', { source: request?.source, reason: 'store_pending' });
        setPhase('pending');
        return;
      }
      setPhase('syncing');
      const synced = await syncAfterPurchase(outcome.hint);
      if (synced?.entitlementActive || synced?.plan === 'pro') {
        completeSuccess(selected.period);
      } else {
        trackBillingEvent('purchase_pending_sync', { source: request?.source });
        setPhase('pending');
      }
    } catch {
      trackBillingEvent('purchase_failed', { source: request?.source });
      setNotice('failed');
      setPhase('select');
    }
  };

  const restore = async () => {
    if (busy) return;
    setNotice(null);
    setPhase('restoring');
    trackBillingEvent('restore_started', { source: request?.source });
    try {
      const outcome = await billing.restore();
      if (outcome.status === 'none' || !outcome.hint) {
        setNotice('restore_none');
        setPhase('select');
        return;
      }
      const synced = await syncAfterPurchase(outcome.hint);
      if (synced?.entitlementActive || synced?.plan === 'pro') {
        trackBillingEvent('restore_succeeded', { source: request?.source });
        setPhase('success');
      } else {
        setPhase('pending');
      }
    } catch {
      trackBillingEvent('restore_failed', { source: request?.source });
      setNotice('restore_failed');
      setPhase('select');
    }
  };

  const recheck = async () => {
    setPhase('syncing');
    const hint = await billing.getCustomerHint();
    const synced = await syncAfterPurchase(hint ?? { entitlementActive: true });
    if (synced?.entitlementActive || synced?.plan === 'pro') setPhase('success');
    else setPhase('pending');
  };

  const finishSuccess = () => {
    const action = returnActionRef.current;
    returnActionRef.current = null;
    closePaywall();
    if (action) action();
  };

  const body = (size: number) => ({
    color: colors.textSecondary,
    fontSize: size * fontScaleMultiplier,
    lineHeight: size * 1.45 * fontScaleMultiplier,
  });

  const renderPackage = (pkg: BillingPackage) => {
    const isSelected = selectedId === pkg.id;
    const isAnnual = pkg.period === 'annual';
    const monthlyEq =
      isAnnual && offerings.status === 'ready' ? annualPerMonthLabel(offerings.packages, localeTag) : null;
    return (
      <Pressable
        key={pkg.id}
        onPress={() => {
          if (busy) return;
          setSelectedId(pkg.id);
          trackBillingEvent('plan_selected', { period: pkg.period, package_id: pkg.id });
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected, disabled: busy }}
        style={[
          styles.planCard,
          {
            minHeight: tapMin + 20,
            borderColor: isSelected ? colors.primary : colors.border,
            backgroundColor: isSelected ? colors.primaryLight : colors.surfaceElevated,
          },
        ]}
      >
        <View style={styles.planMain}>
          <View style={styles.planTitleRow}>
            <Text style={[styles.planName, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
              {isAnnual ? t('subscription:paywall.plans.annual') : t('subscription:paywall.plans.monthly')}
            </Text>
            {isAnnual && savings != null ? (
              <View style={[styles.badge, { backgroundColor: colors.accentGold }]}>
                <Text style={[styles.badgeText, { color: colors.onOlive }]}>
                  {t('subscription:paywall.plans.bestValue')}
                </Text>
              </View>
            ) : null}
          </View>
          {monthlyEq ? (
            <Text style={body(13)}>{t('subscription:paywall.plans.perMonthEquivalent', { price: monthlyEq })}</Text>
          ) : null}
          {isAnnual && savings != null ? (
            <Text style={[body(13), { color: colors.success, fontWeight: '600' }]}>
              {t('subscription:paywall.plans.save', { percent: savings })}
            </Text>
          ) : null}
        </View>
        <View style={styles.planPriceCol}>
          <Text style={[styles.planPrice, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
            {pkg.formattedPrice}
          </Text>
          <Text style={body(12)}>
            {isAnnual ? t('subscription:paywall.plans.perYear') : t('subscription:paywall.plans.perMonth')}
          </Text>
        </View>
        <Ionicons
          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
          size={22}
          color={isSelected ? colors.primary : colors.textTertiary}
        />
      </Pressable>
    );
  };

  const calmBox = (children: React.ReactNode) => (
    <View style={[styles.calm, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }]}>
      {children}
    </View>
  );

  const showSubscribe = canSell && offerings.status === 'ready' && phase !== 'success' && phase !== 'pending';
  const showRestore =
    canSell && billing.isConfigured && phase !== 'success' && phase !== 'pending' && offerings.status !== 'loading';

  const footer =
    phase === 'success' ? (
      <Button
        title={returnActionRef.current ? t('subscription:paywall.cta.continueAddField') : t('subscription:paywall.cta.done')}
        onPress={finishSuccess}
        fullWidth
      />
    ) : phase === 'pending' ? (
      <>
        <Button title={t('subscription:paywall.cta.recheck')} variant="outline" onPress={() => void recheck()} fullWidth />
        <Button title={t('subscription:paywall.cta.close')} variant="text" onPress={onClose} fullWidth />
      </>
    ) : (
      <>
        {showSubscribe ? (
          <>
            <Button
              title={t('subscription:paywall.cta.subscribe')}
              onPress={() => void purchase()}
              disabled={!selected || busy}
              loading={phase === 'purchasing' || phase === 'syncing'}
              fullWidth
              size="large"
            />
            <Text style={[body(12), styles.fine]}>{t('subscription:paywall.finePrint')}</Text>
          </>
        ) : null}
        {showRestore ? (
          <Button
            title={phase === 'restoring' ? t('subscription:paywall.restoreBusy') : t('subscription:paywall.cta.restore')}
            variant="text"
            size="small"
            onPress={() => void restore()}
            disabled={busy}
            fullWidth
          />
        ) : null}
        {!showSubscribe ? (
          <Button title={t('subscription:paywall.cta.notNow')} variant="text" onPress={onClose} fullWidth />
        ) : (
          <Button
            title={t('subscription:paywall.cta.notNow')}
            variant="text"
            size="small"
            onPress={onClose}
            disabled={phase === 'purchasing' || phase === 'syncing'}
            fullWidth
          />
        )}
        <View style={styles.legalRow}>
          <Text
            style={[body(12), { color: colors.link, textDecorationLine: 'underline' }]}
            onPress={() => void Linking.openURL(BILLING_LEGAL_URLS.terms)}
            accessibilityRole="link"
          >
            {t('subscription:paywall.legal.terms')}
          </Text>
          <Text style={body(12)}> · </Text>
          <Text
            style={[body(12), { color: colors.link, textDecorationLine: 'underline' }]}
            onPress={() => void Linking.openURL(BILLING_LEGAL_URLS.privacy)}
            accessibilityRole="link"
          >
            {t('subscription:paywall.legal.privacy')}
          </Text>
        </View>
      </>
    );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      edge="bottom"
      accent
      kicker={t('subscription:paywall.kicker')}
      title={t(`subscription:paywall.title.${titleKey}`)}
      icon={<Ionicons name="leaf-outline" size={22} color={colors.primary} />}
      footer={footer}
    >
      {isLoading && !snapshot ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : (
        <View style={styles.content}>
          <Text style={body(15)}>
            {request?.intent === 'pro_limit'
              ? t('subscription:paywall.intro.pro_limit', { count: freeLimit })
              : request?.intent === 'add_field'
                ? t('subscription:paywall.intro.add_field', { count: freeLimit })
                : t('subscription:paywall.intro.upgrade')}
          </Text>

          {phase !== 'success' && phase !== 'pending' ? (
            <View style={styles.benefits}>
              {(t('subscription:paywall.benefits', { returnObjects: true }) as string[]).map((item) => (
                <View key={item} style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={[body(14), { flex: 1, color: colors.textPrimary }]}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {proLimit
            ? calmBox(
                <>
                  <Text style={body(14)}>{t('subscription:paywall.intro.pro_limit_hint')}</Text>
                  <Text
                    style={[body(14), { color: colors.link, fontWeight: '600' }]}
                    onPress={() => void Linking.openURL(`mailto:${BILLING_SUPPORT_EMAIL}`)}
                    accessibilityRole="link"
                  >
                    {BILLING_SUPPORT_EMAIL}
                  </Text>
                </>
              )
            : null}

          {billedElsewhere && snapshot?.provider
            ? calmBox(
                <Text style={body(14)}>
                  {t('subscription:paywall.billedElsewhere', {
                    provider: t(`subscription:providers.${snapshot.provider}`),
                  })}
                </Text>
              )
            : null}

          {canSell && offerings.status === 'loading' ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={body(14)}>{t('subscription:paywall.loadingOfferings')}</Text>
            </View>
          ) : null}

          {/* Offline / empty / not configured: calm retry state, nothing charged. */}
          {canSell && offerings.status === 'unavailable'
            ? calmBox(
                <>
                  <Text style={[styles.calmTitle, { color: colors.textPrimary, fontSize: 15 * fontScaleMultiplier }]}>
                    {t('subscription:paywall.unavailable.title')}
                  </Text>
                  <Text style={body(14)}>{t(`subscription:paywall.unavailable.${offerings.reason}`)}</Text>
                  {offerings.reason !== 'not_configured' ? (
                    <Button
                      title={t('subscription:paywall.cta.retry')}
                      variant="outline"
                      size="small"
                      onPress={() => void loadOfferings()}
                    />
                  ) : null}
                </>
              )
            : null}

          {canSell && offerings.status === 'ready' && phase !== 'success' && phase !== 'pending' ? (
            <View style={styles.plans} accessibilityRole="radiogroup" accessibilityLabel={t('subscription:paywall.plans.label')}>
              {offerings.packages.map(renderPackage)}
            </View>
          ) : null}

          {phase === 'syncing' ? <Text style={body(14)}>{t('subscription:paywall.purchasing')}</Text> : null}

          {notice === 'cancelled' ? <Text style={body(14)}>{t('subscription:paywall.cancelled')}</Text> : null}
          {notice === 'failed'
            ? calmBox(<Text style={[body(14), { color: colors.textPrimary }]}>{t('subscription:paywall.failed')}</Text>)
            : null}
          {notice === 'restore_none' ? <Text style={body(14)}>{t('subscription:paywall.restore.none')}</Text> : null}
          {notice === 'restore_failed' ? <Text style={body(14)}>{t('subscription:paywall.restore.failed')}</Text> : null}

          {phase === 'success'
            ? calmBox(
                <>
                  <Text style={[styles.calmTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
                    {t('subscription:paywall.success.title')}
                  </Text>
                  <Text style={body(14)}>
                    {request?.intent === 'add_field'
                      ? t('subscription:paywall.success.body')
                      : t('subscription:paywall.success.bodyGeneric')}
                  </Text>
                </>
              )
            : null}

          {phase === 'pending'
            ? calmBox(
                <>
                  <Text style={[styles.calmTitle, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
                    {t('subscription:paywall.pending.title')}
                  </Text>
                  <Text style={body(14)}>{t('subscription:paywall.pending.body')}</Text>
                </>
              )
            : null}
        </View>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  spinner: { paddingVertical: spacing.xl },
  benefits: { gap: spacing.sm },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  plans: { gap: spacing.sm },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  planMain: { flex: 1, gap: 2 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  planName: { fontWeight: '700' },
  planPriceCol: { alignItems: 'flex-end' },
  planPrice: { fontWeight: '700' },
  badge: { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  calm: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  calmTitle: { fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fine: { textAlign: 'center' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});

export default PaywallSheet;
