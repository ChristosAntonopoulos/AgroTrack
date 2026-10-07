import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../../context/SubscriptionContext';
import Button from '../Common/Button';
import './Subscription.css';

/** Settings entry: "Πρόγραμμα & συνδρομή". Shows the plan only once it is known. */
const PlanSettingsRow: React.FC = () => {
  const { t } = useTranslation('subscription');
  const { snapshot, isLoading } = useSubscription();

  const secondary = (() => {
    if (isLoading || !snapshot) return null;
    if (snapshot.hasBillingIssue) return t('billing.notice.billing_issue.title');
    const used = snapshot.usage.ownedFields;
    const limit = snapshot.limits.ownedFields;
    if (snapshot.plan === 'pro') {
      return t('billing.usage', { used, limit });
    }
    return `${t('plan.free')} · ${used}/${limit}`;
  })();

  return (
    <section className="settings-block" aria-labelledby="settings-plan">
      <h2 id="settings-plan" className="settings-block-title">
        {t('billing.settingsRow')}
      </h2>
      <div className="settings-plan-row">
        <div className="settings-plan-row-text">
          {secondary ? <p className="settings-label">{secondary}</p> : null}
          <p className="settings-help">{t('billing.settingsHint')}</p>
        </div>
        <Button as={Link} to="/settings/plan" variant="outline" size="md">
          {t('billing.settingsOpen')}
        </Button>
      </div>
    </section>
  );
};

export default PlanSettingsRow;
