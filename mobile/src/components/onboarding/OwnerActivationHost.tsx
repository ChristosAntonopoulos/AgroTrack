import React from 'react';
import ActivationChecklist from './ActivationChecklist';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';

const OwnerActivationHost: React.FC = () => {
  const activation = useOwnerActivationOptional();
  if (!activation?.visible) return null;
  return <ActivationChecklist />;
};

export default OwnerActivationHost;
