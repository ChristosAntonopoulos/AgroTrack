import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCaptureOptional } from '../../context/CaptureContext';
import { useOwnerActivation } from '../../onboarding/OwnerActivationContext';
import { useTheme } from '../../context/ThemeContext';
import { CAPTURE_SAVED_EVENT, type CaptureSavedDetail } from '../../capture/types';
import type { RootStackParamList } from '../../navigation/types';
import { radii, spacing } from '../../theme';

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
  const { colors, tapMin } = useTheme();
  const autoOpened = useRef(false);
  const {
    awaitingFirstObservation,
    completion,
    completeFirstObservation,
  } = useOwnerActivation();

  const active = awaitingFirstObservation && !completion.firstObservation;
  const accent = colors.eventObservation;
  const accentSoft = colors.eventObservationSoft;

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
    <View
      style={[
        styles.root,
        {
          borderColor: accent,
          backgroundColor: accentSoft,
        },
      ]}
      accessibilityRole="summary"
    >
      <View style={[styles.icon, { backgroundColor: colors.surface }]}>
        <Ionicons name="document-text-outline" size={20} color={accent} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('firstObservation.title')}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{t('firstObservation.body')}</Text>
      </View>
      <Pressable
        style={[styles.primary, { backgroundColor: accent, minHeight: tapMin }]}
        onPress={openObservation}
      >
        <Text style={styles.primaryText}>{t('firstObservation.cta')}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    marginBottom: spacing.base,
    padding: 14,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: 4 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 14, lineHeight: 20 },
  primary: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default FirstObservationGuide;
