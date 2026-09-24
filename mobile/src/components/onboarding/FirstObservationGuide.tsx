import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCaptureOptional } from '../../context/CaptureContext';
import { useOwnerActivation } from '../../onboarding/OwnerActivationContext';
import { CAPTURE_SAVED_EVENT, type CaptureSavedDetail } from '../../capture/types';
import type { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme';

type Props = {
  fieldId: string;
};

/**
 * Mandatory first Chronologio note on καρτέλα: sticky guide,
 * opens prefilled observation, completes only after save.
 */
const FirstObservationGuide: React.FC<Props> = ({ fieldId }) => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const capture = useCaptureOptional();
  const autoOpened = useRef(false);
  const {
    awaitingFirstObservation,
    completion,
    completeFirstObservation,
  } = useOwnerActivation();

  const active = awaitingFirstObservation && !completion.firstObservation;

  const finish = React.useCallback(() => {
    completeFirstObservation();
    navigation.replace('FieldDetail', { fieldId, mode: 'chronologio' });
  }, [completeFirstObservation, fieldId, navigation]);

  const openObservation = React.useCallback(() => {
    capture?.openCapture({
      fieldId,
      preferredType: 'observation',
      description: t('firstObservation.prefill'),
    });
  }, [capture, fieldId, t]);

  useEffect(() => {
    if (!active) return;
    const sub = DeviceEventEmitter.addListener(
      CAPTURE_SAVED_EVENT,
      (detail: CaptureSavedDetail) => {
        if (detail?.type !== 'observation') return;
        if (detail.fieldId && detail.fieldId !== fieldId) return;
        finish();
      }
    );
    return () => sub.remove();
  }, [active, fieldId, finish]);

  useEffect(() => {
    if (!active || autoOpened.current) return;
    autoOpened.current = true;
    const id = setTimeout(() => openObservation(), 700);
    return () => clearTimeout(id);
  }, [active, openObservation]);

  if (!active) return null;

  return (
    <View style={styles.root} accessibilityRole="summary">
      <View style={styles.icon}>
        <Ionicons name="document-text-outline" size={20} color="#2f5d38" />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{t('firstObservation.title')}</Text>
        <Text style={styles.body}>{t('firstObservation.body')}</Text>
      </View>
      <Pressable style={styles.primary} onPress={openObservation}>
        <Text style={styles.primaryText}>{t('firstObservation.cta')}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    marginBottom: spacing.base,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(47, 93, 56, 0.28)',
    backgroundColor: 'rgba(255, 253, 248, 0.98)',
    gap: 10,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47, 93, 56, 0.14)',
  },
  copy: { gap: 4 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e261c' },
  body: { fontSize: 13, lineHeight: 18, color: '#3d4a38' },
  primary: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#2f5d38',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default FirstObservationGuide;
