import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import Button from '../Common/Button';
import { useSubscription } from '../../context/SubscriptionContext';
import { trackBillingEvent } from '../../billing/billingAnalytics';
import './Subscription.css';

const ReadOnlyNotice: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation('subscription');
  const { snapshot, showUpgradePaywall, openWritableSelection } = useSubscription();
  const limit = snapshot?.limits.ownedFields;
  const canChoose =
    snapshot?.plan === 'free' && snapshot.usage.ownedFields > snapshot.limits.ownedFields;

  useEffect(() => {
    trackBillingEvent('read_only_notice_viewed');
  }, []);

  return (
    <aside
      className={['sub-notice-card', 'sub-notice-card--info', className].filter(Boolean).join(' ')}
      role="note"
    >
      <span className="sub-notice-card-icon" aria-hidden>
        <Eye size={18} />
      </span>
      <div className="sub-notice-card-copy">
        <p className="sub-notice-card-title">{t('readOnly.title')}</p>
        <p className="sub-notice-card-body">
          {limit != null ? t('readOnly.body', { count: limit }) : t('readOnly.bodyShort')}
        </p>
        <div className="sub-notice-card-actions">
          <Button
            size="sm"
            variant="outline"
            onClick={() => showUpgradePaywall({ source: 'read_only_notice', intent: 'upgrade' })}
          >
            {t('readOnly.upgrade')}
          </Button>
          {canChoose ? (
            <Button size="sm" variant="ghost" onClick={openWritableSelection}>
              {t('readOnly.choose')}
            </Button>
          ) : null}
        </div>
      </div>
    </aside>
  );
};

export default ReadOnlyNotice;
