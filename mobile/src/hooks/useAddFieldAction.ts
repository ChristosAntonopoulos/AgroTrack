import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PaywallSource, useSubscription } from '../context/SubscriptionContext';
import { isAtProLimit, mustUpgradeToAddField } from '../billing/subscriptionModel';
import { trackBillingEvent } from '../billing/billingAnalytics';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Single entry point for "add a grove". A Free user at their limit sees the contextual
 * paywall BEFORE the form opens. If the plan can't be determined (offline / mock mode) we
 * open the form anyway — the backend stays authoritative and returns
 * SUBSCRIPTION_FIELD_LIMIT_REACHED, which the form turns into the same paywall.
 */
export const useAddFieldAction = () => {
  const navigation = useNavigation<Nav>();
  const { ensureFresh, showUpgradePaywall } = useSubscription();

  return useCallback(
    async (source: PaywallSource = 'add_field', proceed?: () => void): Promise<boolean> => {
      const open = proceed ?? (() => navigation.navigate('FieldForm', {}));
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
    [ensureFresh, navigation, showUpgradePaywall]
  );
};
