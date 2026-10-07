import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaywallSource, useSubscription } from '../context/SubscriptionContext';
import { isAtProLimit, mustUpgradeToAddField } from '../billing/subscriptionModel';
import { trackBillingEvent } from '../billing/billingAnalytics';

/**
 * Single entry point for "add a grove". A Free user at their limit sees the contextual
 * paywall BEFORE the form opens. If the plan can't be determined (offline), we open the
 * form anyway — the backend stays authoritative and returns SUBSCRIPTION_FIELD_LIMIT_REACHED.
 */
export const useAddFieldAction = (path = '/fields/new') => {
  const navigate = useNavigate();
  const { ensureFresh, showUpgradePaywall } = useSubscription();

  return useCallback(
    async (source: PaywallSource = 'add_field', proceed?: () => void) => {
      const open = proceed ?? (() => navigate(path));
      const snapshot = await ensureFresh();

      if (mustUpgradeToAddField(snapshot)) {
        trackBillingEvent('field_limit_reached', { source, plan: 'free' });
        showUpgradePaywall({ source, intent: 'add_field', returnAction: open });
        return false;
      }
      if (isAtProLimit(snapshot)) {
        trackBillingEvent('field_limit_reached', { source, plan: 'pro' });
        showUpgradePaywall({ source, intent: 'pro_limit' });
        return false;
      }
      open();
      return true;
    },
    [ensureFresh, navigate, path, showUpgradePaywall]
  );
};
