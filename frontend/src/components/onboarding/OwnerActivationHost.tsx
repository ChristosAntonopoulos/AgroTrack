import React from 'react';
import { useOwnerActivation } from '../../onboarding/OwnerActivationContext';
import ActivationChecklist from './ActivationChecklist';
import FocusSpotlight from './FocusSpotlight';

/** Checklist + focus spotlight for FieldOwner activation. */
const OwnerActivationHost: React.FC = () => {
  const { visible, spotlightStep, guideBeat } = useOwnerActivation();

  if (!visible || guideBeat) return null;
  // Naming is its own screen. A dim around the form hides the choices.
  if (spotlightStep === 'createGrove') return null;

  return (
    <>
      {spotlightStep ? null : <ActivationChecklist />}
      {spotlightStep ? (
        <FocusSpotlight step={spotlightStep} />
      ) : null}
    </>
  );
};

export default OwnerActivationHost;
