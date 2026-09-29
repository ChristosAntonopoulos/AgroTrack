import React from 'react';
import { useOwnerActivation } from '../../onboarding/OwnerActivationContext';
import ActivationChecklist from './ActivationChecklist';
import FocusSpotlight from './FocusSpotlight';

/** Checklist + focus spotlight for FieldOwner activation. */
const OwnerActivationHost: React.FC = () => {
  const { visible, spotlightStep, skipStep, guideBeat } = useOwnerActivation();

  if (!visible || guideBeat) return null;

  return (
    <>
      {spotlightStep ? null : <ActivationChecklist />}
      {spotlightStep ? (
        <FocusSpotlight
          step={spotlightStep}
          onSkip={
            spotlightStep === 'createGrove' ? undefined : () => skipStep(spotlightStep)
          }
        />
      ) : null}
    </>
  );
};

export default OwnerActivationHost;
