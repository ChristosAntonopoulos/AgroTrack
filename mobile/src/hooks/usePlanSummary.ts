import { useTranslation } from 'react-i18next';
import { useSubscriptionOptional } from '../context/SubscriptionContext';
import { isPro } from '../billing/subscriptionModel';

/**
 * Secondary text for the "Subscription" rows (More / Settings): "Free · 1/1" or "Pro · 3/10".
 * Null until the plan is actually known, so we never flash "Free" while loading.
 */
export const usePlanSummary = (): string | null => {
  const { t } = useTranslation('subscription');
  const subscription = useSubscriptionOptional();
  const snapshot = subscription?.snapshot;
  if (!subscription || subscription.isLoading || !snapshot) return null;
  if (snapshot.hasBillingIssue) return t('billing.notice.billing_issue.title');
  const used = snapshot.usage.ownedFields;
  const limit = snapshot.limits.ownedFields;
  const plan = isPro(snapshot) ? t('plan.pro') : t('plan.free');
  return `${plan} · ${used}/${limit}`;
};
