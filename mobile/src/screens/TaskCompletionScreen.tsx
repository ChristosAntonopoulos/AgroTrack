import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getFieldWorkService } from '../services/serviceFactory';
import type {
  CompletionFrequencyChoice,
  FieldTask,
  FieldTaskChecklistItem,
  TaskExecution,
} from '../services/fieldWorkService';
import { shouldPromptCompletionFrequency } from '../utils/fieldWorkLearning';
import { useTheme } from '../context/ThemeContext';
import { useCaptureOptional } from '../context/CaptureContext';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import LearningPromptSheet from '../components/tasks/LearningPromptSheet';
import { TaskChoiceChips, TaskHelpText, TaskSectionLabel } from '../components/tasks/TaskChoiceChips';
import { typography, spacing, radii } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'TaskCompletion'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;
type Outcome = 'completed' | 'partially_completed' | 'not_done';
type Step = 'outcome' | 'checks' | 'cost' | 'confirm';

type CompletionDraft = {
  outcome: Outcome;
  notes: string;
  answers: Record<string, { boolValue?: boolean; textValue?: string; numberValue?: number }>;
  createFollowUp: boolean;
  hadCost: boolean | null;
};

const draftKey = (taskId: string) => `oleachron.fieldTaskCompletion.v1.${taskId}`;

const readDraft = async (taskId: string): Promise<CompletionDraft | null> => {
  try {
    const raw = await AsyncStorage.getItem(draftKey(taskId));
    return raw ? (JSON.parse(raw) as CompletionDraft) : null;
  } catch {
    return null;
  }
};

const checklistLabel = (item: FieldTaskChecklistItem, lang: string) => {
  if (lang.toLowerCase().startsWith('el')) return item.greekLabel || item.label;
  return item.englishLabel || item.label;
};

const TaskCompletionScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { taskId } = route.params;
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const capture = useCaptureOptional();
  const { t, i18n } = useTranslation(['tasks', 'common']);

  const [task, setTask] = useState<FieldTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoToast, setUndoToast] = useState<TaskExecution | null>(null);
  const [completionPrompt, setCompletionPrompt] = useState<{
    message: string;
    resultYear: number;
    suggestNextYear: number;
  } | null>(null);
  const [learningBusy, setLearningBusy] = useState(false);
  const [step, setStep] = useState<Step>('outcome');
  const [showMore, setShowMore] = useState(false);
  const [draft, setDraft] = useState<CompletionDraft>({
    outcome: 'completed',
    notes: '',
    answers: {},
    createFollowUp: true,
    hadCost: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getFieldWorkService().getFieldTask(taskId);
        if (cancelled) return;
        setTask(data);
        const saved = await readDraft(taskId);
        if (saved) {
          setDraft(saved);
        } else {
          const answers: CompletionDraft['answers'] = {};
          (data.checklist || []).forEach((item) => {
            answers[item.key] = {
              boolValue: item.boolValue ?? (item.isAnswered ? true : undefined),
              textValue: item.textValue,
              numberValue: item.numberValue,
            };
          });
          setDraft({
            outcome: 'completed',
            notes: data.notes || '',
            answers,
            createFollowUp: true,
            hadCost: null,
          });
        }
      } catch {
        if (!cancelled) setError(t('detail.failedLoad'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId, t]);

  useEffect(() => {
    if (loading) return;
    void AsyncStorage.setItem(draftKey(taskId), JSON.stringify(draft));
  }, [draft, taskId, loading]);

  const essential = useMemo(
    () =>
      (task?.checklist || [])
        .filter((item) => item.isEssential)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 5),
    [task]
  );
  const extra = useMemo(
    () => (task?.checklist || []).filter((item) => !essential.some((e) => e.key === item.key)),
    [task, essential]
  );

  const stepNumber = step === 'outcome' ? 1 : step === 'checks' ? 2 : step === 'cost' ? 3 : 4;

  const submit = async () => {
    if (!task) return;
    setBusy(true);
    setError(null);
    try {
      const execution = await getFieldWorkService().completeFieldTask(taskId, {
        outcome: draft.outcome,
        notes: draft.notes || undefined,
        createFollowUpForRemainder: draft.outcome === 'partially_completed' && draft.createFollowUp,
        checklistAnswers: Object.entries(draft.answers).map(([key, value]) => ({ key, ...value })),
      });
      await AsyncStorage.removeItem(draftKey(taskId));
      setUndoToast(execution);
      if (shouldPromptCompletionFrequency(task.templateCode, draft.outcome) && task.templateCode) {
        try {
          const evalResult = await getFieldWorkService().evaluateCompletionLearning(task.fieldId, {
            templateCode: task.templateCode,
            outcome: draft.outcome,
            resultYear: task.resultYear,
          });
          if (evalResult.shouldPrompt) {
            setCompletionPrompt({
              message:
                evalResult.promptMessage ||
                t('fieldWork.profile.learning.completionMessage', {
                  year: evalResult.resultYear,
                  nextYear: evalResult.suggestNextYear,
                }),
              resultYear: evalResult.resultYear,
              suggestNextYear: evalResult.suggestNextYear,
            });
          }
        } catch {
          /* optional */
        }
      }
      if (draft.hadCost) {
        capture?.openCapture({
          preferredType: 'expense',
          fieldId: task.fieldId,
          taskId: task.id,
        });
      }
    } catch {
      setError(t('fieldWork.errors.complete'));
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    if (!undoToast) return;
    setBusy(true);
    try {
      await getFieldWorkService().undoCompletion(undoToast.id);
      setUndoToast(null);
      setCompletionPrompt(null);
      navigation.navigate('TaskDetail', { taskId });
    } catch {
      setError(t('fieldWork.completion.undoFailed'));
    } finally {
      setBusy(false);
    }
  };

  const applyCompletionLearning = async (choice: CompletionFrequencyChoice) => {
    if (!task?.templateCode || !completionPrompt) return;
    try {
      setLearningBusy(true);
      await getFieldWorkService().applyCompletionLearning(task.fieldId, {
        templateCode: task.templateCode,
        resultYear: completionPrompt.resultYear,
        choice,
      });
      setCompletionPrompt(null);
    } catch {
      setError(t('fieldWork.profile.learning.applyFailed'));
    } finally {
      setLearningBusy(false);
    }
  };

  const renderChecks = (items: FieldTaskChecklistItem[]) =>
    items.map((item) => {
      const answer = draft.answers[item.key] || {};
      const on = Boolean(answer.boolValue);
      return (
        <Pressable
          key={item.key}
          onPress={() =>
            setDraft((prev) => ({
              ...prev,
              answers: {
                ...prev.answers,
                [item.key]: { ...prev.answers[item.key], boolValue: !on },
              },
            }))
          }
          style={[
            styles.checkRow,
            {
              minHeight: tapMin,
              borderColor: on ? colors.oliveBorder : colors.borderLight,
              backgroundColor: on ? colors.primaryLight : colors.surface,
            },
          ]}
        >
          <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? colors.primary : colors.textTertiary} />
          <Text style={{ color: colors.textPrimary, flex: 1, fontSize: 16 * fontScaleMultiplier }}>
            {checklistLabel(item, i18n.language)}
          </Text>
        </Pressable>
      );
    });

  if (loading) return <LoadingSpinner fullScreen />;

  if (!task) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.error }}>{error || t('detail.notFound')}</Text>
        <Button title={t('detail.backToTasks')} variant="outline" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  if (undoToast) {
    return (
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('fieldWork.completion.savedTitle')}</Text>
        <TaskHelpText>{t('fieldWork.completion.savedBody')}</TaskHelpText>
        {undoToast.followUpTaskId ? (
          <Button
            title={t('fieldWork.completion.openFollowUp')}
            variant="outline"
            onPress={() => navigation.navigate('TaskDetail', { taskId: undoToast.followUpTaskId! })}
          />
        ) : null}
        {draft.hadCost ? (
          <Button
            title={t('fieldWork.completion.recordCost')}
            onPress={() =>
              capture?.openCapture({
                preferredType: 'expense',
                fieldId: task.fieldId,
                taskId: task.id,
              })
            }
          />
        ) : null}
        <Button title={t('fieldWork.completion.undo')} variant="outline" onPress={() => void handleUndo()} disabled={busy} />
        <Button
          title={t('fieldWork.seeCompletedInChronologio')}
          onPress={() => navigation.navigate('Chronologio', {})}
          disabled={busy}
        />
        <Button
          title={t('detail.backToTasks')}
          variant="ghost"
          onPress={() => navigation.navigate('Main', { screen: 'Tasks' })}
        />
        <LearningPromptSheet
          open={Boolean(completionPrompt)}
          title={t('fieldWork.profile.learning.completionTitle')}
          message={completionPrompt?.message || ''}
          busy={learningBusy}
          onClose={() => setCompletionPrompt(null)}
          onAction={(id) => void applyCompletionLearning(id as CompletionFrequencyChoice)}
          actions={[
            { id: 'every_2_years', label: t('fieldWork.profile.learning.everyTwoYears') },
            { id: 'every_year', label: t('fieldWork.profile.learning.everyYear') },
            { id: 'when_needed', label: t('fieldWork.profile.learning.whenNeeded') },
            { id: 'no_change', label: t('fieldWork.profile.learning.noChange'), variant: 'outline' },
          ]}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('fieldWork.completion.title')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{task.title}</Text>
      <Text style={[styles.stepLabel, { color: colors.primary }]}>
        {t('fieldWork.completion.step', { current: stepNumber, total: 4 })}
      </Text>
      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
          <Text style={{ color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      {step === 'outcome' ? (
        <View style={styles.section}>
          <TaskSectionLabel>{t('fieldWork.completion.whatHappened')}</TaskSectionLabel>
          <TaskChoiceChips
            options={[
              { id: 'completed', label: t('fieldWork.completion.outcomes.completed') },
              { id: 'partially_completed', label: t('fieldWork.completion.outcomes.partial') },
              { id: 'not_done', label: t('fieldWork.completion.outcomes.notDone') },
            ]}
            value={draft.outcome}
            onChange={(id) => setDraft((prev) => ({ ...prev, outcome: id }))}
          />
          <Button title={t('common:next')} onPress={() => setStep('checks')} />
        </View>
      ) : null}

      {step === 'checks' ? (
        <View style={styles.section}>
          <TaskSectionLabel>{t('fieldWork.detail.checklist')}</TaskSectionLabel>
          {renderChecks(essential)}
          {extra.length > 0 ? (
            <>
              <Pressable onPress={() => setShowMore((value) => !value)} style={{ paddingVertical: spacing.sm }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {showMore ? t('fieldWork.detail.hideMoreChecks') : t('fieldWork.detail.moreChecks')}
                </Text>
              </Pressable>
              {showMore ? renderChecks(extra) : null}
            </>
          ) : null}
          <TaskSectionLabel>{t('fieldWork.form.notes')}</TaskSectionLabel>
          <TextInput
            value={draft.notes}
            onChangeText={(notes) => setDraft((prev) => ({ ...prev, notes }))}
            multiline
            style={[
              styles.notes,
              { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          />
          {draft.outcome === 'partially_completed' ? (
            <Pressable
              onPress={() => setDraft((prev) => ({ ...prev, createFollowUp: !prev.createFollowUp }))}
              style={styles.followUp}
            >
              <Ionicons
                name={draft.createFollowUp ? 'checkbox' : 'square-outline'}
                size={22}
                color={draft.createFollowUp ? colors.primary : colors.textTertiary}
              />
              <Text style={{ color: colors.textPrimary, flex: 1 }}>{t('fieldWork.completion.createFollowUp')}</Text>
            </Pressable>
          ) : null}
          <View style={styles.nav}>
            <Button title={t('common:back')} variant="outline" onPress={() => setStep('outcome')} style={{ flex: 1 }} />
            <Button title={t('common:next')} onPress={() => setStep('cost')} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}

      {step === 'cost' ? (
        <View style={styles.section}>
          <TaskSectionLabel>{t('fieldWork.completion.hadCost')}</TaskSectionLabel>
          <TaskHelpText>{t('fieldWork.completion.hadCostHint')}</TaskHelpText>
          <TaskChoiceChips
            options={[
              { id: 'yes', label: t('fieldWork.completion.hadCostYes') },
              { id: 'no', label: t('fieldWork.completion.hadCostNo') },
            ]}
            value={draft.hadCost === true ? 'yes' : draft.hadCost === false ? 'no' : ''}
            onChange={(id) => setDraft((prev) => ({ ...prev, hadCost: id === 'yes' }))}
          />
          <View style={styles.nav}>
            <Button title={t('common:back')} variant="outline" onPress={() => setStep('checks')} style={{ flex: 1 }} />
            <Button
              title={t('common:next')}
              onPress={() => setStep('confirm')}
              disabled={draft.hadCost === null}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}

      {step === 'confirm' ? (
        <View style={styles.section}>
          <TaskSectionLabel>{t('fieldWork.completion.confirm')}</TaskSectionLabel>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t(
              `fieldWork.completion.outcomes.${
                draft.outcome === 'partially_completed'
                  ? 'partial'
                  : draft.outcome === 'not_done'
                    ? 'notDone'
                    : 'completed'
              }`
            )}
          </Text>
          {draft.notes ? <Text style={{ color: colors.textSecondary }}>{draft.notes}</Text> : null}
          <Text style={{ color: colors.textSecondary }}>
            {draft.hadCost ? t('fieldWork.completion.hadCostYes') : t('fieldWork.completion.hadCostNo')}
          </Text>
          <View style={styles.nav}>
            <Button title={t('common:back')} variant="outline" onPress={() => setStep('cost')} disabled={busy} style={{ flex: 1 }} />
            <Button
              title={t('fieldWork.completion.save')}
              variant="success"
              onPress={() => void submit()}
              disabled={busy}
              loading={busy}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  content: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  title: { ...typography.styles.h3, fontWeight: '700' },
  subtitle: { ...typography.styles.body },
  stepLabel: { ...typography.styles.caption, fontWeight: '700' },
  section: { gap: spacing.md },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  notes: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, minHeight: 88, textAlignVertical: 'top' },
  followUp: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nav: { flexDirection: 'row', gap: spacing.sm },
  errorBox: { borderRadius: radii.md, padding: spacing.md },
});

export default TaskCompletionScreen;
