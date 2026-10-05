import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
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
import OnboardingStepLabel from './OnboardingStepLabel';

type Props = {
  fieldId: string;
  fieldName: string;
};

const STAGES = ['weather', 'satellite', 'personalized'] as const;
type StageId = (typeof STAGES)[number];

const STAGE_BEATS: Record<StageId, number> = {
  weather: 2,
  satellite: 2,
  personalized: 3,
};

const POLL_MS = 2500;
const MIN_STAGE_MS = 900;
const BEAT_MS = 2800;
/** Soft-accept satellite as “started” so welcome isn’t blocked forever by imagery lag. */
const SATELLITE_SOFT_MS = 22000;
const MAX_WAIT_MS = 90000;

const SpatialLoadingPanel: React.FC<Props> = ({ fieldId, fieldName }) => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { completion, markFieldsDirty, beginDetailsLesson } = useOwnerActivation();

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
  const [beat, setBeat] = useState(0);
  const [creep, setCreep] = useState(0);
  const [autoRetried, setAutoRetried] = useState(false);
  const sheen = useRef(new Animated.Value(0)).current;

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

  // Advance stage UI as real data arrives (with a short minimum beat).
  useEffect(() => {
    if (revealed >= readyCount) return;
    const id = setTimeout(() => setRevealed((n) => Math.min(n + 1, readyCount)), MIN_STAGE_MS);
    return () => clearTimeout(id);
  }, [revealed, readyCount]);

  // Keep the active row moving so the last stage does not look frozen.
  useEffect(() => {
    if (showWelcome || allReady) return;
    setBeat(0);
    setCreep(0);
    const started = Date.now();
    const beatId = setInterval(() => setBeat((n) => n + 1), BEAT_MS);
    const creepId = setInterval(() => {
      setCreep(Math.min(0.22, (Date.now() - started) / 50000));
    }, 200);
    return () => {
      clearInterval(beatId);
      clearInterval(creepId);
    };
  }, [revealed, showWelcome, allReady]);

  useEffect(() => {
    if (showWelcome || allReady) {
      sheen.stopAnimation();
      return;
    }
    sheen.setValue(0);
    const loop = Animated.loop(
      Animated.timing(sheen, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [revealed, showWelcome, allReady, sheen]);

  useEffect(() => {
    if (!failed || showWelcome || autoRetried) return;
    const id = setTimeout(() => {
      setAutoRetried(true);
      setShowWelcome(false);
      setRevealed(0);
      setSatelliteSoft(false);
      setFlags({ weather: false, satellite: false, personalized: false, failed: false });
      setAttempt((n) => n + 1);
      void kickoffFieldFirstData(fieldId).then(() => markFieldsDirty());
    }, 4000);
    return () => clearTimeout(id);
  }, [failed, showWelcome, autoRetried, fieldId, markFieldsDirty]);

  useEffect(() => {
    if (!canWelcome || showWelcome) return;
    if (revealed < Math.min(readyCount, STAGES.length) && !timedOut && !failed) return;
    const id = setTimeout(() => setShowWelcome(true), 500);
    return () => clearTimeout(id);
  }, [canWelcome, showWelcome, revealed, readyCount, timedOut, failed]);

  if (!completion.drawBoundary) return null;

  const firstName = user?.firstName?.trim();
  const displayName = fieldName.trim() || t('welcome.groveFallback');

  const continueToDetails = () => {
    beginDetailsLesson();
    markFieldsDirty();
    navigation.replace('FieldDetail', { fieldId, mode: 'field' });
  };

  const stageState = (index: number): 'pending' | 'active' | 'done' => {
    if (index < revealed) return 'done';
    if (allReady) return 'done';
    if (index === revealed) return 'active';
    return 'pending';
  };

  const activePhrase = (id: StageId) => {
    const index = beat % STAGE_BEATS[id];
    return t(`spatial.beats.${id}${index}`);
  };

  const fill = allReady ? 100 : Math.round(Math.min(0.96, (revealed + creep) / STAGES.length) * 100);

  const iconFor = (id: StageId, state: 'pending' | 'active' | 'done') => {
    if (state === 'done') return <Ionicons name="checkmark" size={18} color="#fff" />;
    if (state === 'active') return <ActivityIndicator size="small" color="#2f5d38" />;
    if (id === 'weather') return <Ionicons name="partly-sunny-outline" size={20} color="#2f5d38" />;
    if (id === 'satellite') return <Ionicons name="globe-outline" size={20} color="#2f5d38" />;
    return <Ionicons name="leaf-outline" size={20} color="#2f5d38" />;
  };

  const sheenX = sheen.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 280],
  });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.root}>
        <View style={styles.backdrop} />
        <View style={styles.card}>
          {!completion.firstObservation ? <OnboardingStepLabel id="groveReady" /> : null}
          <Text style={styles.title}>
            {showWelcome
              ? firstName
                ? t('welcome.titleNamed', { name: firstName, grove: displayName })
                : t('welcome.title', { grove: displayName })
              : t('spatial.titleNamed', { name: displayName })}
          </Text>

          {!showWelcome ? (
            <>
              <Text style={styles.lead}>{t('spatial.bodyNamed', { name: displayName })}</Text>

              <View style={styles.stages}>
                {STAGES.map((id, index) => {
                  const state = stageState(index);
                  return (
                    <View
                      key={id}
                      style={[
                        styles.stage,
                        state === 'active' ? styles.stageActive : null,
                        state === 'pending' ? styles.stagePending : null,
                        state === 'done' ? styles.stageDone : null,
                      ]}
                    >
                      {state === 'active' ? (
                        <Animated.View
                          pointerEvents="none"
                          style={[styles.sheen, { transform: [{ translateX: sheenX }] }]}
                        />
                      ) : null}
                      <View style={[styles.stageIcon, state === 'done' ? styles.stageIconDone : null]}>
                        {iconFor(id, state)}
                      </View>
                      <View style={styles.stageCopy}>
                        <Text style={styles.stageTitle}>{t(`spatial.stages.${id}.title`)}</Text>
                        {state === 'active' ? (
                          <Text style={styles.stageBeat}>{activePhrase(id)}</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.track} accessibilityRole="progressbar">
                <View style={[styles.trackFill, { width: `${fill}%` }]} />
              </View>
              <Text style={styles.hold}>{failed ? t('spatial.retrying') : t('spatial.stayHere')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.lead}>{t('welcome.body')}</Text>
              <Pressable style={styles.btn} onPress={continueToDetails}>
                <Text style={styles.btnText}>{t('welcome.openMap')}</Text>
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
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(34, 40, 31, 0.14)',
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#1e261c',
    lineHeight: 28,
    marginBottom: 2,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3d4a38',
    marginBottom: 10,
  },
  stages: { gap: 8, marginBottom: 6 },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 50, 36, 0.04)',
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  stageActive: {
    backgroundColor: 'rgba(47, 93, 56, 0.1)',
    borderColor: 'rgba(47, 93, 56, 0.35)',
  },
  stageDone: {
    backgroundColor: 'rgba(47, 93, 56, 0.08)',
  },
  stagePending: { opacity: 0.55 },
  sheen: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '40%',
    height: 3,
    borderRadius: 99,
    backgroundColor: '#2f5d38',
  },
  stageIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47, 93, 56, 0.12)',
  },
  stageIconDone: { backgroundColor: '#2f5d38' },
  stageCopy: { flex: 1, gap: 2, minWidth: 0 },
  stageTitle: { fontSize: 14, fontWeight: '700', color: '#1e261c' },
  stageBeat: { fontSize: 12, lineHeight: 16, color: '#4a5746' },
  track: {
    height: 6,
    marginTop: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(47, 93, 56, 0.12)',
  },
  trackFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2f5d38',
  },
  hold: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#3d4a38',
  },
  btn: {
    marginTop: spacing.sm,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2f5d38',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default SpatialLoadingPanel;
