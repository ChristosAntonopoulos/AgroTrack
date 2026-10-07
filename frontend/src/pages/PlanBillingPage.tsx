import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../context/LocaleProvider';
import { useSubscription } from '../context/SubscriptionContext';
import { useManageSubscription } from '../hooks/useManageSubscription';
import { formatDate } from '../utils/localeFormatters';
import { LANDING_SUPPORT_EMAIL } from '../config/landingConfig';
import { isPro } from '../billing/subscriptionModel';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import PageHeader from '../components/Common/PageHeader';
import Button from '../components/Common/Button';
import SubscriptionNoticeCard from '../components/Subscription/SubscriptionNoticeCard';
import '../components/Subscription/Subscription.css';

/**
 * Plan & billing. Reads only the shared subscription state — status logic is never
 * re-derived here. While loading we render a skeleton, never a flash of "Free".
 */
const PlanBillingPage: React.FC = () => {
  const { t } = useTranslation(['subscription', 'common']);
  const { locale } = useLocale();
  const { snapshot, isLoading, loadState, isStale, refresh, showUpgradePaywall } = useSubscription();
  const manage = useManageSubscription();

  // Opening this page is a good moment to make sure the numbers are current.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const fmt = (iso: string | null) => (iso ? formatDate(new Date(iso), { locale, dateFormat: 'medium' }) : '');

  const renderCard = () => {
    if (!snapshot) return null;
    const pro = isPro(snapshot);
    const { used, limit } = { used: snapshot.usage.ownedFields, limit: snapshot.limits.ownedFields };
    const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

    const statusLine = (() => {
      if (pro && snapshot.status === 'cancel_at_period_end') return t('subscription:billing.endsOn', { date: fmt(snapshot.expiresAt) });
      if (pro && snapshot.renewsAt) return t('subscription:billing.renewsOn', { date: fmt(snapshot.renewsAt) });
      if (!pro && snapshot.status === 'expired' && snapshot.expiresAt) {
        return t('subscription:billing.expiredOn', { date: fmt(snapshot.expiresAt) });
      }
      return null;
    })();

    return (
      <section className="plan-card" aria-labelledby="plan-current-name">
        <div className="plan-card-head">
          <h2 id="plan-current-name" className="plan-card-name">
            {pro ? t('subscription:plan.proName') : t('subscription:plan.freeName')}
          </h2>
          <span className={`plan-chip ${pro ? '' : 'plan-chip--free'}`}>
            {pro ? t('subscription:plan.pro') : t('subscription:plan.free')}
          </span>
        </div>

        <div className="plan-usage">
          <p className="plan-meta">{t('subscription:billing.usage', { used, limit })}</p>
          <div className="plan-usage-bar" role="presentation">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>

        {statusLine || (pro && snapshot.provider) ? (
          <p className="plan-meta">
            {statusLine ? <span>{statusLine}</span> : null}
            {pro && snapshot.provider ? (
              <span>{t('subscription:billing.via', { provider: t(`subscription:providers.${snapshot.provider}`) })}</span>
            ) : null}
          </p>
        ) : null}

        <div className="plan-actions">
          {pro && manage.canManage ? (
            <Button variant="outline" loading={manage.busy} onClick={() => void manage.open()}>
              {t('subscription:billing.manage.cta')}
            </Button>
          ) : null}
          {!pro ? (
            <Button onClick={() => showUpgradePaywall({ source: 'settings', intent: 'upgrade' })}>
              {t('subscription:billing.upgrade')}
            </Button>
          ) : null}
        </div>

        {pro && manage.target.kind !== 'none' ? (
          <p className="plan-hint">{t(`subscription:billing.manage.${snapshot.provider}`)}</p>
        ) : null}
        {manage.unavailable ? (
          <p className="plan-hint" role="status">
            {t('subscription:billing.manage.unavailable', { email: LANDING_SUPPORT_EMAIL })}
          </p>
        ) : null}
      </section>
    );
  };

  return (
    <PageContainer>
      <div className="plan-page">
        <Breadcrumbs />
        <PageHeader title={t('subscription:billing.title')} subtitle={t('subscription:billing.subtitle')} />

        {isLoading ? (
          <div className="plan-skeleton" role="status" aria-label={t('subscription:billing.loading')} />
        ) : null}

        {!snapshot && !isLoading && loadState === 'error' ? (
          <div className="sub-calm" role="alert">
            <p className="sub-calm-title">{t('subscription:billing.loadError.title')}</p>
            <p className="sub-calm-body">{t('subscription:billing.loadError.body')}</p>
            <Button variant="outline" onClick={() => void refresh()}>
              {t('subscription:billing.loadError.retry')}
            </Button>
          </div>
        ) : null}

        {snapshot ? (
          <>
            {isStale ? <p className="plan-hint">{t('subscription:billing.stale')}</p> : null}
            <SubscriptionNoticeCard />
            {renderCard()}
          </>
        ) : null}
      </div>
    </PageContainer>
  );
};

export default PlanBillingPage;
