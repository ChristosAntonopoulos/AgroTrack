import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Sprout } from 'lucide-react';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import LoadingSpinner from '../Common/LoadingSpinner';
import { useSubscription } from '../../context/SubscriptionContext';
import { BillingPackage, OfferingsResult } from '../../billing/types';
import {
  annualPerMonthLabel,
  annualSavingsPercent,
  pickDefaultPackage,
} from '../../billing/packageSelection';
import { isAtProLimit, isBilledOutsideWeb } from '../../billing/subscriptionModel';
import { trackBillingEvent } from '../../billing/billingAnalytics';
import { LANDING_SUPPORT_EMAIL } from '../../config/landingConfig';
import './Subscription.css';

type Phase = 'select' | 'purchasing' | 'syncing' | 'success' | 'pending';
type Notice = 'cancelled' | 'failed' | null;
type OfferingsState = { status: 'loading' } | OfferingsResult;

const PaywallDrawer: React.FC = () => {
  const { t, i18n } = useTranslation(['subscription', 'common']);
  const {
    paywall,
    closePaywall,
    snapshot,
    isLoading,
    billing,
    syncAfterPurchase,
  } = useSubscription();

  const open = paywall != null;
  const [phase, setPhase] = useState<Phase>('select');
  const [notice, setNotice] = useState<Notice>(null);
  const [offerings, setOfferings] = useState<OfferingsState>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const viewedRef = useRef(false);
  const returnActionRef = useRef<(() => void) | null>(null);

  const proLimit = isAtProLimit(snapshot) || paywall?.intent === 'pro_limit';
  const billedElsewhere = isBilledOutsideWeb(snapshot);
  const canSell = open && snapshot != null && !proLimit && !billedElsewhere;

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

  useEffect(() => {
    if (!open) {
      viewedRef.current = false;
      return;
    }
    returnActionRef.current = paywall?.returnAction ?? null;
    setPhase('select');
    setNotice(null);
    if (!viewedRef.current) {
      viewedRef.current = true;
      trackBillingEvent('paywall_viewed', { source: paywall?.source, intent: paywall?.intent });
    }
    if (canSell) {
      void loadOfferings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = useMemo(() => {
    if (offerings.status !== 'ready' || !selectedId) return null;
    return offerings.packages.find((p) => p.id === selectedId) ?? null;
  }, [offerings, selectedId]);

  const savings =
    offerings.status === 'ready' ? annualSavingsPercent(offerings.packages) : null;

  const titleKey =
    paywall?.intent === 'pro_limit'
      ? 'pro_limit'
      : paywall?.intent === 'add_field'
        ? 'add_field'
        : 'upgrade';

  const freeLimit = snapshot?.limits.ownedFields ?? 1;

  const onClose = () => {
    trackBillingEvent('paywall_closed', { source: paywall?.source });
    closePaywall();
  };

  const purchase = async () => {
    if (!selected) return;
    setNotice(null);
    setPhase('purchasing');
    trackBillingEvent('purchase_started', {
      source: paywall?.source,
      period: selected.period,
      package_id: selected.id,
    });
    try {
      const outcome = await billing.purchase(selected.id);
      if (outcome.status === 'cancelled') {
        trackBillingEvent('purchase_cancelled', { source: paywall?.source });
        setNotice('cancelled');
        setPhase('select');
        return;
      }
      setPhase('syncing');
      const synced = await syncAfterPurchase(outcome.hint);
      if (synced?.entitlementActive || synced?.plan === 'pro') {
        trackBillingEvent('purchase_completed', { source: paywall?.source, period: selected.period });
        setPhase('success');
      } else {
        setPhase('pending');
      }
    } catch {
      trackBillingEvent('purchase_failed', { source: paywall?.source });
      setNotice('failed');
      setPhase('select');
    }
  };

  const finishSuccess = () => {
    const action = returnActionRef.current;
    returnActionRef.current = null;
    closePaywall();
    if (action) action();
  };

  const renderPackage = (pkg: BillingPackage) => {
    const selectedNow = selectedId === pkg.id;
    const isAnnual = pkg.period === 'annual';
    const monthlyEq =
      isAnnual && offerings.status === 'ready'
        ? annualPerMonthLabel(offerings.packages, i18n.language)
        : null;

    return (
      <button
        key={pkg.id}
        type="button"
        className={`sub-plan-card ${selectedNow ? 'is-selected' : ''}`}
        onClick={() => {
          setSelectedId(pkg.id);
          trackBillingEvent('plan_selected', { period: pkg.period, package_id: pkg.id });
        }}
        aria-pressed={selectedNow}
      >
        {isAnnual ? <span className="sub-plan-badge">{t('subscription:paywall.plans.bestValue')}</span> : null}
        <span className="sub-plan-name">
          {isAnnual ? t('subscription:paywall.plans.annual') : t('subscription:paywall.plans.monthly')}
        </span>
        <span className="sub-plan-price">
          {pkg.formattedPrice}
          <span className="sub-plan-period">
            {isAnnual ? t('subscription:paywall.plans.perYear') : t('subscription:paywall.plans.perMonth')}
          </span>
        </span>
        {monthlyEq ? (
          <span className="sub-plan-equiv">
            {t('subscription:paywall.plans.perMonthEquivalent', { price: monthlyEq })}
          </span>
        ) : null}
        {isAnnual && savings != null ? (
          <span className="sub-plan-save">{t('subscription:paywall.plans.save', { percent: savings })}</span>
        ) : null}
        <span className="sub-plan-radio" aria-hidden />
      </button>
    );
  };

  const footer =
    phase === 'success' ? (
      <Button variant="primary" fullWidth onClick={finishSuccess}>
        {returnActionRef.current || paywall?.returnAction
          ? t('subscription:paywall.cta.continueAddField')
          : t('subscription:paywall.cta.done')}
      </Button>
    ) : phase === 'pending' ? (
      <Button variant="outline" fullWidth onClick={() => void syncAfterPurchase({ entitlementActive: true }).then((s) => {
        if (s?.entitlementActive) setPhase('success');
      })}>
        {t('subscription:paywall.cta.recheck')}
      </Button>
    ) : canSell && offerings.status === 'ready' ? (
      <div className="sub-drawer-footer">
        <Button
          variant="primary"
          fullWidth
          disabled={!selected || phase === 'purchasing' || phase === 'syncing'}
          loading={phase === 'purchasing' || phase === 'syncing'}
          onClick={() => void purchase()}
        >
          {t('subscription:paywall.cta.subscribe')}
        </Button>
        <p className="sub-fine-print">{t('subscription:paywall.finePrint')}</p>
        <p className="sub-legal-links">
          <Link to="/terms" target="_blank" rel="noreferrer">{t('common:legal.terms', { defaultValue: 'Όροι' })}</Link>
          {' · '}
          <Link to="/privacy" target="_blank" rel="noreferrer">{t('common:legal.privacy', { defaultValue: 'Απόρρητο' })}</Link>
        </p>
      </div>
    ) : null;

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={t(`subscription:paywall.title.${titleKey}`)}
      kicker={t('subscription:paywall.kicker')}
      icon={<Sprout size={20} />}
      size="md"
      footer={footer}
    >
      {isLoading && !snapshot ? (
        <LoadingSpinner className="page-inline-loading" />
      ) : (
        <>
          <p className="sub-paywall-intro">
            {paywall?.intent === 'pro_limit'
              ? t('subscription:paywall.intro.pro_limit', { count: freeLimit })
              : paywall?.intent === 'add_field'
                ? t('subscription:paywall.intro.add_field', { count: freeLimit })
                : t('subscription:paywall.intro.upgrade')}
          </p>

          <ul className="sub-benefit-list">
            {(t('subscription:paywall.benefits', { returnObjects: true }) as string[]).map((item) => (
              <li key={item}>
                <Check size={16} aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          {proLimit ? (
            <div className="sub-calm">
              <p className="sub-calm-body">{t('subscription:paywall.intro.pro_limit_hint')}</p>
              <a href={`mailto:${LANDING_SUPPORT_EMAIL}`}>{LANDING_SUPPORT_EMAIL}</a>
            </div>
          ) : null}

          {billedElsewhere && snapshot?.provider ? (
            <div className="sub-calm">
              <p>
                {t('subscription:paywall.billedElsewhere', {
                  provider: t(`subscription:providers.${snapshot.provider}`),
                })}
              </p>
            </div>
          ) : null}

          {canSell && offerings.status === 'loading' ? (
            <p className="sub-calm-body">{t('subscription:paywall.loadingOfferings')}</p>
          ) : null}

          {canSell && offerings.status === 'unavailable' ? (
            <div className="sub-calm">
              <p className="sub-calm-title">{t('subscription:paywall.unavailable.title')}</p>
              <p className="sub-calm-body">
                {t(`subscription:paywall.unavailable.${offerings.reason}`)}
              </p>
              <Button variant="outline" onClick={() => void loadOfferings()}>
                {t('subscription:paywall.cta.retry')}
              </Button>
            </div>
          ) : null}

          {canSell && offerings.status === 'ready' ? (
            <div className="sub-plan-grid" role="radiogroup" aria-label={t('subscription:paywall.plans.label')}>
              {offerings.packages.map(renderPackage)}
            </div>
          ) : null}

          {notice === 'cancelled' ? (
            <p className="sub-calm-body" role="status">{t('subscription:paywall.cancelled')}</p>
          ) : null}
          {notice === 'failed' ? (
            <p className="sub-calm-body" role="alert">{t('subscription:paywall.failed')}</p>
          ) : null}

          {phase === 'success' ? (
            <div className="sub-success">
              <h3>{t('subscription:paywall.success.title')}</h3>
              <p>
                {paywall?.intent === 'add_field'
                  ? t('subscription:paywall.success.body')
                  : t('subscription:paywall.success.bodyGeneric')}
              </p>
            </div>
          ) : null}

          {phase === 'pending' ? (
            <div className="sub-success">
              <h3>{t('subscription:paywall.pending.title')}</h3>
              <p>{t('subscription:paywall.pending.body')}</p>
            </div>
          ) : null}
        </>
      )}
    </RightDrawer>
  );
};

export default PaywallDrawer;
