import React, { useEffect } from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import type { RootStackParamList } from '../../navigation/types';

type NavRef = React.RefObject<NavigationContainerRef<RootStackParamList> | null>;

const ALLOWED_WHILE_LOCKED = new Set([
  'FieldForm',
  'FieldMapBoundary',
  'Settings',
  'Legal',
  'InviteAccept',
  'FamilyInviteAccept',
  'PartnerInviteAccept',
]);

/** Redirect locked FieldOwners away from non-setup screens. */
const ActivationGate: React.FC<{ navRef: NavRef }> = ({ navRef }) => {
  const activation = useOwnerActivationOptional();

  useEffect(() => {
    if (!activation?.locked) return;
    const nav = navRef.current;
    if (!nav) return;

    const redirect = () => {
      const route = nav.getCurrentRoute();
      const name = route?.name;
      if (!name) return;
      if (ALLOWED_WHILE_LOCKED.has(name)) return;
      // Spatial welcome right after boundary save.
      if (name === 'FieldDetail') {
        const params = route.params as RootStackParamList['FieldDetail'] | undefined;
        if (params?.activation === 'spatial') return;
      }

      const step =
        activation.activeStep || (activation.completion.createGrove ? 'drawBoundary' : 'createGrove');
      if (step === 'createGrove') {
        nav.navigate('FieldForm', activation.primaryField ? { fieldId: activation.primaryField.id } : {});
        return;
      }
      if (activation.primaryField) {
        nav.navigate('FieldMapBoundary', { fieldId: activation.primaryField.id });
      } else {
        nav.navigate('FieldForm', {});
      }
    };

    redirect();
    const unsub = nav.addListener('state', redirect);
    return unsub;
  }, [
    activation?.locked,
    activation?.activeStep,
    activation?.completion.createGrove,
    activation?.primaryField?.id,
    navRef,
  ]);

  return null;
};

export default ActivationGate;
