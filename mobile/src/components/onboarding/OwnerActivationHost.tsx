import React from 'react';
import ActivationChecklist from './ActivationChecklist';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';

const OwnerActivationHost: React.FC = () => {
  const activation = useOwnerActivationOptional();
  if (!activation?.visible || activation.guideBeat) return null;
  // Focus cards teach each step. The top bar only returns if they left early.
  if (!activation.completion.firstObservation) {
    if (activation.laterSnoozed && !activation.setupUnlocked) return <ActivationChecklist />;
    return null;
  }
  return <ActivationChecklist />;
};

export default OwnerActivationHost;
