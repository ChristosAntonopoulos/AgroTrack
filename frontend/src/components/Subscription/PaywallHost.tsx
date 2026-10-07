import React from 'react';
import PaywallDrawer from './PaywallDrawer';
import WritableFieldDrawer from './WritableFieldDrawer';

/** Mounted once inside SubscriptionProvider; any screen opens these via useSubscription(). */
const PaywallHost: React.FC = () => (
  <>
    <PaywallDrawer />
    <WritableFieldDrawer />
  </>
);

export default PaywallHost;
