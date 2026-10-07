import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CalendarClock, Info, MapPin } from 'lucide-react';
import Button from '../Common/Button';
import { useSubscription } from '../../context/SubscriptionContext';
import { useManageSubscription } from '../../hooks/useManageSubscription';
import { SubscriptionNotice, resolveSubscriptionNotice } from '../../billing/subscriptionModel';
import './Subscription.css';

interface Props {
  only?: SubscriptionNotice[];
  className?: string;
}

const SubscriptionNoticeCard: React.FC<Props> = ({ only, className }) => {
  const { t } = useTranslation('subscription');
  const { snapshot, openWritableSelection } = useSubscription();
  const manage = useManageSubscription();
  const notice = resolveSubscriptionNotice(snapshot);

  if (!snapshot || !notice || (only && !only.includes(notice))) return null;

  const Icon =
    notice === 'billing_issue'
      ? AlertCircle
      : notice === 'needs_writable_selection'
        ? MapPin
        : notice === 'cancel_at_period_end'
          ? CalendarClock
          : Info;

  const tone = notice === 'billing_issue' ? 'warn' : 'info';
  const used = snapshot.usage.ownedFields;
  const limit = snapshot.limits.ownedFields;

  return (
    <aside
      className={['sub-notice-card', `sub-notice-card--${tone}`, className].filter(Boolean).join(' ')}
      role="status"
    >
      <span className="sub-notice-card-icon" aria-hidden>
        <Icon size={18} />
      </span>
      <div className="sub-notice-card-copy">
        <p className="sub-notice-card-title">{t(`billing.notice.${notice}.title`)}</p>
        <p className="sub-notice-card-body">
          {notice === 'expired_over_limit'
            ? t(`billing.notice.${notice}.body`, { used, limit })
            : t(`billing.notice.${notice}.body`)}
        </p>
        <div className="sub-notice-card-actions">
          {notice === 'billing_issue' ? (
            <Button size="sm" variant="outline" loading={manage.busy} onClick={() => void manage.open()}>
              {t('billing.notice.billing_issue.cta')}
            </Button>
          ) : null}
          {notice === 'needs_writable_selection' ? (
            <Button size="sm" variant="outline" onClick={openWritableSelection}>
              {t('billing.notice.needs_writable_selection.cta')}
            </Button>
          ) : null}
        </div>
      </div>
    </aside>
  );
};

export default SubscriptionNoticeCard;
