import React from 'react';
import PaywallSheet from './PaywallSheet';
import WritableFieldSheet from './WritableFieldSheet';

/** Mounted once inside SubscriptionProvider; any screen opens these via useSubscription(). */
const SubscriptionHost: React.FC = () => (
  <>
    <PaywallSheet />
    <WritableFieldSheet />
  </>
);

export default SubscriptionHost;
