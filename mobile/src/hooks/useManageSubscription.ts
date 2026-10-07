import { useCallback, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { useSubscription } from '../context/SubscriptionContext';
import { ManageTarget, resolveManageTarget } from '../billing/subscriptionModel';
import { trackBillingEvent } from '../billing/billingAnalytics';

/** "Manage subscription" opens Play / App Store / the web portal depending on billing provider. */
export const useManageSubscription = () => {
  const { snapshot, billing } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const provider = snapshot?.provider ?? null;
  const target: ManageTarget = useMemo(() => resolveManageTarget(snapshot), [snapshot]);

  const open = useCallback(async () => {
    trackBillingEvent('manage_subscription_opened', { provider: provider ?? 'none' });
    setUnavailable(false);
    try {
      if (target.kind === 'store') {
        await Linking.openURL(target.url);
        return;
      }
      if (target.kind === 'web_portal') {
        setBusy(true);
        const url = await billing.getManagementUrl();
        if (url) await Linking.openURL(url);
        else setUnavailable(true);
        return;
      }
      setUnavailable(true);
    } catch {
      setUnavailable(true);
    } finally {
      setBusy(false);
    }
  }, [billing, provider, target]);

  return { target, open, busy, unavailable, canManage: target.kind !== 'none' };
};
