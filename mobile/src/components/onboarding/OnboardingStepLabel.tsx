import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ONBOARDING_JOURNEY_TOTAL,
  onboardingStepNumber,
  type OnboardingJourneyId,
} from '../../onboarding/steps';

type Props = {
  id: OnboardingJourneyId;
};

/** "3 of 9" — the same count on every cue until the first note is saved. */
const OnboardingStepLabel: React.FC<Props> = ({ id }) => {
  const { t } = useTranslation('onboarding');
  return (
    <Text style={styles.label}>
      {t('coach.progress', {
        current: onboardingStepNumber(id),
        total: ONBOARDING_JOURNEY_TOTAL,
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#2f5d38',
  },
});

export default OnboardingStepLabel;
