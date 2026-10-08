import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';

/**
 * Warm goodbye after the first History note — then the grower is free to roam.
 */
const OnboardingFinishedModal: React.FC = () => {
  const { t } = useTranslation('onboarding');
  const activation = useOwnerActivationOptional();

  if (!activation?.journeyFinished) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={activation.dismissJourneyFinished}>
      <View style={styles.root}>
        <View style={styles.backdrop} />
        <View style={styles.card}>
          <Text style={styles.emoji}>🌿</Text>
          <Text style={styles.kicker}>{t('finished.kicker')}</Text>
          <Text style={styles.title}>{t('finished.title')}</Text>
          <Text style={styles.body}>{t('finished.body')}</Text>
          <Pressable style={styles.btn} onPress={activation.dismissJourneyFinished}>
            <Text style={styles.btnText}>{t('finished.cta')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 16, 14, 0.72)',
  },
  card: {
    backgroundColor: '#fffdf8',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(34, 40, 31, 0.14)',
    paddingVertical: 26,
    paddingHorizontal: 22,
    gap: 8,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#2f5d38',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#1e261c',
    lineHeight: 30,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: '#3d4a38',
    textAlign: 'center',
    marginBottom: 8,
  },
  btn: {
    marginTop: 8,
    alignSelf: 'stretch',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#2f5d38',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default OnboardingFinishedModal;
