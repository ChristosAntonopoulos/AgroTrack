import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useOwnerActivation } from '../../onboarding/OwnerActivationContext';
import {
  coreFirstDataReady,
  kickoffFieldFirstData,
  leadingReadyCount,
  pollFieldFirstData,
  type FirstDataFlags,
} from '../../onboarding/fieldFirstData';
import type { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme';

type Props = {
  fieldId: string;
  fieldName: string;
  /** Hold each step so the welcome feels like a moment, not a flash. */
  ceremony?: boolean;
};

const STAGES = ['weather', 'satellite', 'personalized'] as const;
const POLL_MS = 2500;
const MIN_STAGE_MS = 900;
const CEREMONY_BEAT_MS = 1100;
const SATELLITE_SOFT_MS = 22000;
const MAX_WAIT_MS = 90000;

const SpatialLoadingPanel: React.FC<Props> = ({ fieldId, fieldName, ceremony = false }) => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { completion, markFieldsDirty, skipStep, beginFirstObservationGuide } = useOwnerActivation();

  const [flags, setFlags] = useState<FirstDataFlags>({
    weather: false,
    satellite: false,
    personalized: false,
    failed: false,
  });
  const [revealed, setRevealed] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [satelliteSoft, setSatelliteSoft] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const effectiveFlags: FirstDataFlags = {
    ...flags,
    satellite: flags.satellite || satelliteSoft,
  };
  const readyCount = leadingReadyCount(effectiveFlags);
  const coreReady = coreFirstDataReady(effectiveFlags);
  const allReady = readyCount >= STAGES.length;
  const canWelcome = (coreReady && effectiveFlags.satellite) || timedOut;
  const failed = flags.failed && !coreReady;

  useEffect(() => {
    let cancelled = false;
    void kickoffFieldFirstData(fieldId).then(() => {
      if (!cancelled) markFieldsDirty();
    });
    return () => {
      cancelled = true;
    };
  }, [fieldId, markFieldsDirty]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const next = await pollFieldFirstData(fieldId);
      if (cancelled) return;
      setFlags(next);
      if (next.weather || next.personalized || next.satellite) markFieldsDirty();
    };
    void tick();
    const id = setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fieldId, markFieldsDirty]);

  useEffect(() => {
    if (flags.satellite || satelliteSoft) return;
    const id = setTimeout(() => setSatelliteSoft(true), SATELLITE_SOFT_MS);
    return () => clearTimeout(id);
  }, [flags.satellite, satelliteSoft]);

  useEffect(() => {
    setTimedOut(false);
    const id = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(id);
  }, [attempt]);

  useEffect(() => {
    if (ceremony) {
      if (revealed >= STAGES.length) return;
      const id = setTimeout(() => setRevealed((n) => Math.min(n + 1, STAGES.length)), CEREMONY_BEAT_MS);
      return () => clearTimeout(id);
    }
    if (revealed >= readyCount) return;
    const id = setTimeout(() => setRevealed((n) => Math.min(n + 1, readyCount)), MIN_STAGE_MS);
    return () => clearTimeout(id);
  }, [ceremony, revealed, readyCount]);

  useEffect(() => {
    if (ceremony) {
      if (showWelcome || revealed < STAGES.length) return;
      const id = setTimeout(() => setShowWelcome(true), 400);
      return () => clearTimeout(id);
    }
    if (!canWelcome || showWelcome) return;
    if (revealed < Math.min(readyCount, STAGES.length) && !timedOut && !failed) return;
    const id = setTimeout(() => setShowWelcome(true), 500);
    return () => clearTimeout(id);
  }, [ceremony, canWelcome, showWelcome, revealed, readyCount, timedOut, failed]);

  if (!ceremony && !completion.drawBoundary) return null;

  const firstName = user?.firstName?.trim();
  const displayName = fieldName.trim() || t('welcome.groveFallback');

  const continueToGrove = () => {
    beginFirstObservationGuide();
    markFieldsDirty();
    navigation.replace('FieldDetail', { fieldId, mode: 'chronologio' });
  };

  const stageState = (index: number): 'pending' | 'active' | 'done' => {
    if (index < revealed) return 'done';
    if (index === revealed && !allReady) return 'active';
    if (allReady) return 'done';
    return 'pending';
  };

  const iconFor = (id: (typeof STAGES)[number], done: boolean) => {
    if (done) return <Ionicons name="checkmark" size={18} color="#fff" />;
    if (id === 'weather') return <Ionicons name="partly-sunny-outline" size={20} color="#2f5d38" />;
    if (id === 'satellite') return <Ionicons name="globe-outline" size={20} color="#2f5d38" />;
    return <Ionicons name="leaf-outline" size={20} color="#2f5d38" />;
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => skipStep('loadData')}>
      <View style={styles.root}>
        <View style={styles.backdrop} />
        <View style={styles.card}>
          {!showWelcome ? (
            <>
              <Text style={styles.kicker}>{t('spatial.kicker')}</Text>
              <Text style={styles.title}>{t('spatial.title')}</Text>
              <Text style={styles.body}>{t('spatial.bodyNamed', { name: displayName })}</Text>
              <Text style={styles.hint}>{t('spatial.firstDataHint')}</Text>

              {STAGES.map((id, index) => {
                const state = stageState(index);
                return (
                  <View
                    key={id}
                    style={[
                      styles.stage,
                      state === 'active' ? styles.stageActive : null,
                      state === 'pending' ? styles.stagePending : null,
                    ]}
                  >
                    <View style={[styles.stageIcon, state === 'done' ? styles.stageIconDone : null]}>
                      {iconFor(id, state === 'done')}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stageTitle}>{t(`spatial.stages.${id}.title`)}</Text>
                      <Text style={styles.stageBody}>{t(`spatial.stages.${id}.body`)}</Text>
                    </View>
                    <Text style={styles.stageStatus}>
                      {state === 'done'
                        ? t('spatial.ready')
                        : state === 'active'
                          ? t('spatial.waiting')
                          : '·'}
                    </Text>
                  </View>
                );
              })}

              {failed ? (
                <Pressable
                  style={styles.btn}
                  onPress={() => {
                    setShowWelcome(false);
                    setRevealed(0);
                    setSatelliteSoft(false);
                    setFlags({
                      weather: false,
                      satellite: false,
                      personalized: false,
                      failed: false,
                    });
                    setAttempt((n) => n + 1);
                    void kickoffFieldFirstData(fieldId).finally(() => markFieldsDirty());
                  }}
                >
                  <Text style={styles.btnText}>{t('spatial.retry')}</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => {
                    skipStep('loadData');
                    continueToGrove();
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.skip}>{t('spotlight.skip')}</Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              <View style={styles.welcomeMark}>
                <Ionicons name="leaf-outline" size={28} color="#2f5d38" />
              </View>
              <Text style={styles.kicker}>{t('welcome.kicker')}</Text>
              <Text style={styles.title}>
                {firstName
                  ? t('welcome.titleNamed', { name: firstName, grove: displayName })
                  : t('welcome.title', { grove: displayName })}
              </Text>
              <Text style={styles.body}>{t('welcome.body')}</Text>
              <View style={styles.points}>
                <Text style={styles.point}>✓ {t('welcome.pointWeather')}</Text>
                <Text style={styles.point}>✓ {t('welcome.pointSatellite')}</Text>
                <Text style={styles.point}>✓ {t('welcome.pointMap')}</Text>
              </View>
              <Pressable style={styles.btn} onPress={continueToGrove}>
                <Text style={styles.btnText}>{t('welcome.openGrove')}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 16, 14, 0.72)',
  },
  card: {
    backgroundColor: '#fffdf8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(34, 40, 31, 0.14)',
    padding: 20,
    gap: 8,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#2f5d38',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e261c',
    lineHeight: 28,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#3d4a38',
    marginBottom: 2,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4a5746',
    marginBottom: 8,
  },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 50, 36, 0.04)',
    marginBottom: 6,
  },
  stageActive: {
    backgroundColor: 'rgba(47, 93, 56, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(47, 93, 56, 0.28)',
  },
  stagePending: { opacity: 0.55 },
  stageIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47, 93, 56, 0.12)',
  },
  stageIconDone: { backgroundColor: '#2f5d38' },
  stageTitle: { fontSize: 14, fontWeight: '700', color: '#1e261c' },
  stageBody: { fontSize: 12, lineHeight: 16, color: '#4a5746', marginTop: 2 },
  stageStatus: { fontSize: 11, fontWeight: '700', color: '#2f5d38' },
  skip: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#2f5d38',
  },
  btn: {
    marginTop: spacing.sm,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2f5d38',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  welcomeMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47, 93, 56, 0.12)',
    marginBottom: 4,
  },
  points: { gap: 6, marginVertical: 8 },
  point: { fontSize: 13, color: '#3d4a38', fontWeight: '600' },
});

export default SpatialLoadingPanel;
