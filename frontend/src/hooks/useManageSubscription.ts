import { useCallback, useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { ManageTarget, resolveManageTarget } from '../billing/subscriptionModel';
import { trackBillingEvent } from '../billing/billingAnalytics';

/** "Manage subscription" opens the store or the web portal depending on billing provider. */
export const useManageSubscription = () => {
  const { snapshot, billing } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const target: ManageTarget = resolveManageTarget(snapshot);

  const open = useCallback(async () => {
    trackBillingEvent('manage_subscription_opened', { provider: snapshot?.provider ?? 'none' });
    setUnavailable(false);
    if (target.kind === 'store') {
      window.open(target.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (target.kind === 'web_portal') {
      setBusy(true);
      try {
        const url = await billing.getManagementUrl();
        if (url) window.location.assign(url);
        else setUnavailable(true);
      } finally {
        setBusy(false);
      }
      return;
    }
    setUnavailable(true);
  }, [billing, snapshot?.provider, target]);

  return { target, open, busy, unavailable, canManage: target.kind !== 'none' };
};
