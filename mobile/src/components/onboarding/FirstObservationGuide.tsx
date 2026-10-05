import React, { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useOwnerActivation } from '../../onboarding/OwnerActivationContext';
import { CAPTURE_SAVED_EVENT, type CaptureSavedDetail } from '../../capture/types';
import type { RootStackParamList } from '../../navigation/types';
import { openChronologioHome } from '../../navigation/intents';

type Props = {
  fieldId: string;
};

/**
 * Completes the first History note once Observation is saved.
 * The dock + and Capture sheet coach the taps — this only listens for the save.
 */
const FirstObservationGuide: React.FC<Props> = ({ fieldId }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    awaitingFirstObservation,
    completion,
    completeFirstObservation,
  } = useOwnerActivation();

  const active = awaitingFirstObservation && !completion.firstObservation;

  useEffect(() => {
    if (!active) return;
    const sub = DeviceEventEmitter.addListener(
      CAPTURE_SAVED_EVENT,
      (detail: CaptureSavedDetail) => {
        if (detail?.type !== 'observation') return;
        if (detail.fieldId && detail.fieldId !== fieldId) return;
        completeFirstObservation();
        openChronologioHome(navigation);
      }
    );
    return () => sub.remove();
  }, [active, fieldId, completeFirstObservation, navigation]);

  return null;
};

export default FirstObservationGuide;
