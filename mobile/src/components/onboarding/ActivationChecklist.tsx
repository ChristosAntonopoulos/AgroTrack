import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOwnerActivation } from '../../onboarding/OwnerActivationContext';
import { canVisitActivationStep } from '../../onboarding/evaluate';
import { OWNER_CHECKLIST_STEPS, type OwnerActivationStepId } from '../../onboarding/steps';

/** Top horizontal setup bar — Later snoozes hard lock until όρια. */
const ActivationChecklist: React.FC = () => {
  const { t } = useTranslation('onboarding');
  const insets = useSafeAreaInsets();
  const {
    visible,
    celebrating,
    checklistCollapsed,
    completion,
    activeStep,
    spotlightStep,
    locked,
    laterSnoozed,
    setupUnlocked,
    setCollapsed,
    goToStep,
    clearCelebration,
  } = useOwnerActivation();

  if (!visible) return null;

  // Full-screen boundary stage owns the lesson — keep the map free of the setup bar.
  if (spotlightStep === 'drawBoundary') return null;

  const total = OWNER_CHECKLIST_STEPS.length;
  const top = insets.top + 8;
  const resumeStep = activeStep || (completion.createGrove ? 'drawBoundary' : 'createGrove');
  const resumeTarget =
    resumeStep === 'firstObservation' || resumeStep === 'loadData' ? 'loadData' : resumeStep;
  // Name step is the page itself. Boundary tip stays off while the map coach is up.
  const tipKey =
    spotlightStep === 'createGrove' || (locked && spotlightStep === 'drawBoundary')
      ? null
      : spotlightStep === 'drawBoundary'
        ? 'drawBoundary'
        : null;

  if (celebrating) {
    return (
      <View style={[styles.bar, { top }]} accessibilityRole="summary">
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>{t('checklist.celebrateTitle')}</Text>
          <Text style={styles.body}>{t('checklist.celebrateBody')}</Text>
        </View>
        <Pressable style={styles.primary} onPress={clearCelebration}>
          <Text style={styles.primaryText}>{t('checklist.dismiss')}</Text>
        </Pressable>
      </View>
    );
  }

  if (laterSnoozed && !setupUnlocked) {
    return (
      <View
        style={[styles.bar, { top }]}
        accessibilityLabel={t('checklist.title')}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>{t('checklist.continueTitle')}</Text>
          <Text style={styles.body}>{t('checklist.continueBody')}</Text>
        </View>
        <Pressable style={styles.primary} onPress={() => goToStep(resumeTarget)}>
          <Text style={styles.primaryText}>{t('checklist.continueCta')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.bar, { top, right: 54 }]} accessibilityLabel={t('checklist.title')}>
      <View style={styles.brand}>
        <Text style={styles.title}>{t('checklist.title')}</Text>
        <Text style={styles.progress}>
          {t('checklist.progress', {
            done: OWNER_CHECKLIST_STEPS.filter((s) => completion[s]).length,
            total,
          })}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.steps}>
        {OWNER_CHECKLIST_STEPS.map((step: OwnerActivationStepId, index) => {
          const done = completion[step];
          const current = activeStep === step;
          const visit = canVisitActivationStep(step, completion);
          return (
            <Pressable
              key={step}
              disabled={!visit}
              onPress={() => visit && goToStep(step)}
              style={[
                styles.step,
                current ? styles.stepCurrent : null,
                done ? styles.stepDone : null,
                !visit ? styles.stepDisabled : null,
              ]}
            >
              <View style={[styles.stepNum, done || current ? styles.stepNumActive : null]}>
                {done ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : (
                  <Text style={[styles.stepNumText, current ? styles.stepNumTextActive : null]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text style={[styles.stepLabel, !visit ? styles.stepLabelMuted : null]} numberOfLines={1}>
                {t(`steps.${step}.title`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!checklistCollapsed && tipKey ? (
        <View style={styles.tip}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.tipTitle}>{t(`spotlight.${tipKey}.title`)}</Text>
            <Text style={styles.tipBody} numberOfLines={2}>
              {t(`spotlight.${tipKey}.body`)}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={() => setCollapsed(!checklistCollapsed)} hitSlop={8}>
          <Ionicons
            name={checklistCollapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color="#4a5746"
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 40, 31, 0.16)',
    backgroundColor: '#fffdf8',
    padding: 10,
    gap: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  brand: { gap: 1 },
  title: { fontSize: 13, fontWeight: '700', color: '#1e261c' },
  progress: { fontSize: 11, color: '#4a5746' },
  body: { fontSize: 12, lineHeight: 16, color: '#3d4a38' },
  steps: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(30, 50, 36, 0.06)',
    borderWidth: 1,
    borderColor: 'transparent',
    maxWidth: 180,
  },
  stepCurrent: {
    borderColor: 'rgba(47, 93, 56, 0.45)',
    backgroundColor: 'rgba(47, 93, 56, 0.14)',
  },
  stepDone: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(47, 93, 56, 0.22)',
  },
  stepDisabled: {
    opacity: 0.45,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47, 93, 56, 0.14)',
  },
  stepNumActive: { backgroundColor: '#2f5d38' },
  stepNumText: { fontSize: 11, fontWeight: '800', color: '#2f5d38' },
  stepNumTextActive: { color: '#fff' },
  stepLabel: { fontSize: 12, fontWeight: '600', color: '#1e261c', flexShrink: 1 },
  stepLabelMuted: { color: '#6b7568' },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(47, 93, 56, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(47, 93, 56, 0.18)',
  },
  tipTitle: { fontSize: 12, fontWeight: '700', color: '#1e261c' },
  tipBody: { fontSize: 11, lineHeight: 15, color: '#4a5746', marginTop: 1 },
  actions: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'flex-end' },
  primary: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#2f5d38',
  },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});

export default ActivationChecklist;
