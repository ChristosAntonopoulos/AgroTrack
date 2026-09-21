import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getFieldService, getFieldWorkService } from '../services/serviceFactory';
import type {
  CompletionFrequencyChoice,
  FieldTask,
  FieldTaskChecklistItem,
  TaskExecution,
} from '../services/fieldWorkService';
import { shouldPromptCompletionFrequency } from '../utils/fieldWorkLearning';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { formatTaskDay } from '../utils/taskDateRange';
import { useTheme } from '../context/ThemeContext';
import { useCaptureOptional } from '../context/CaptureContext';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ScreenLayout from '../components/layout/ScreenLayout';
import LearningPromptSheet from '../components/tasks/LearningPromptSheet';
import { TaskChoiceChips, TaskHelpText, TaskSectionLabel } from '../components/tasks/TaskChoiceChips';
import { typography, spacing, radii } from '../theme';
import { createElevation } from '../theme/elevation';
import { RootStackParamList } from '../navigation/types';
import { openChronologioHome, openHarvestCampaign } from '../navigation/intents';

type Route = RouteProp<RootStackParamList, 'TaskCompletion'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;
type Outcome = 'completed' | 'partially_completed' | 'not_done';
type Step = 'checks' | 'result' | 'cost' | 'confirm';

const isHarvestTemplate = (code?: string | null) => {
  const normalized = String(code || '').toUpperCase();
  return normalized === 'T18' || normalized === 'T19' || normalized === 'T20' || normalized === 'T21';
};
type CheckDisposition = 'done' | 'not_needed' | 'could_not';

type AnswerDraft = {
  boolValue?: boolean;
  textValue?: string;
  numberValue?: number;
};

type CompletionDraft = {
  outcome: Outcome;
  notes: string;
  answers: Record<string, AnswerDraft>;
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

const itemType = (item: FieldTaskChecklistItem) => String(item.itemType || 'checkbox').toLowerCase();

const isBooleanCheck = (item: FieldTaskChecklistItem) => {
  const type = itemType(item);
  return type === 'checkbox' || type === 'confirmation';
};

const isResultField = (item: FieldTaskChecklistItem) => {
  const type = itemType(item);
  return type === 'number' || type === 'quantity_with_unit' || type === 'text' || type === 'choice';
};

const isDateLike = (item: FieldTaskChecklistItem) => {
  const key = item.key.toLowerCase();
  return /date|start|end|next_check|install/.test(key) && itemType(item) === 'text';
};

const dispositionOf = (answer?: AnswerDraft): CheckDisposition | null => {
  if (!answer) return null;
  if (answer.boolValue === true) return 'done';
  if (answer.textValue === 'not_needed') return 'not_needed';
  if (answer.textValue === 'could_not') return 'could_not';
  if (answer.boolValue === false) return 'could_not';
  return null;
};

const choiceOptions = (item: FieldTaskChecklistItem, lang: string): string[] => {
  if (item.choices?.length) return item.choices;
  if (item.key === 'output') {
    return lang.toLowerCase().startsWith('el')
      ? ['Λάδι', 'Επιτραπέζιες']
      : ['Oil', 'Table olives'];
  }
  const label = checklistLabel(item, lang);
  const colon = label.includes(':') ? label.split(':').slice(1).join(':').trim() : label;
  const parts = colon
    .split(/\s*(?:[/|·]|\s(?:ή|or|o)\s)\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && part.length < 40);
  return parts.length >= 2 ? parts : [];
};

const TaskCompletionScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { taskId } = route.params;
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const capture = useCaptureOptional();
  const { t, i18n } = useTranslation(['tasks', 'common', 'fields']);

  const [task, setTask] = useState<FieldTask | null>(null);
  const [fieldName, setFieldName] = useState('');
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
  const [step, setStep] = useState<Step>('result');
  const [showOptional, setShowOptional] = useState(false);
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

        const field = await getFieldService()
          .getField(data.fieldId)
          .catch(() => null);
        if (!cancelled) {
          setFieldName(friendlyFieldLabel(field?.name) || data.fieldId);
        }

        const saved = await readDraft(taskId);
        if (saved) {
          setDraft(saved);
        } else {
          const answers: CompletionDraft['answers'] = {};
          (data.checklist || []).forEach((item) => {
            answers[item.key] = {
              boolValue: item.boolValue,
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

        const hasChecks = (data.checklist || []).some(isBooleanCheck);
        setStep(hasChecks ? 'checks' : 'result');
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

  const booleanChecks = useMemo(
    () =>
      (task?.checklist || [])
        .filter(isBooleanCheck)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [task]
  );

  const resultFields = useMemo(
    () =>
      (task?.checklist || [])
        .filter(isResultField)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [task]
  );

  const essentialResults = resultFields.filter((item) => item.isEssential);
  const optionalResults = resultFields.filter((item) => !item.isEssential);
  const essentialChecks = booleanChecks.filter((item) => item.isEssential);
  const optionalChecks = booleanChecks.filter((item) => !item.isEssential);

  const steps = useMemo((): Step[] => {
    const list: Step[] = [];
    if (booleanChecks.length > 0) list.push('checks');
    list.push('result', 'cost', 'confirm');
    return list;
  }, [booleanChecks.length]);

  const stepIndex = Math.max(0, steps.indexOf(step));
  const stepLabels: Record<Step, string> = {
    checks: t('fieldWork.completion.steps.checks', { defaultValue: 'Checks' }),
    result: t('fieldWork.completion.steps.result', { defaultValue: 'Result' }),
    cost: t('fieldWork.completion.steps.cost', { defaultValue: 'Cost' }),
    confirm: t('fieldWork.completion.steps.confirm', { defaultValue: 'Confirm' }),
  };

  const unansweredEssentialChecks = essentialChecks.filter(
    (item) => !dispositionOf(draft.answers[item.key])
  );
  const missingEssentialResults = essentialResults.filter((item) => {
    const answer = draft.answers[item.key] || {};
    const type = itemType(item);
    if (type === 'number' || type === 'quantity_with_unit') {
      return answer.numberValue === undefined || Number.isNaN(answer.numberValue);
    }
    return !(answer.textValue || '').trim();
  });

  const setAnswer = (key: string, patch: AnswerDraft) => {
    setDraft((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [key]: { ...prev.answers[key], ...patch },
      },
    }));
  };

  const setDisposition = (key: string, disposition: CheckDisposition) => {
    if (disposition === 'done') {
      setAnswer(key, { boolValue: true, textValue: undefined });
      return;
    }
    setAnswer(key, {
      boolValue: false,
      textValue: disposition === 'not_needed' ? 'not_needed' : 'could_not',
    });
  };

  const goNext = () => {
    const next = steps[stepIndex + 1];
    if (next) {
      setShowOptional(false);
      setStep(next);
    }
  };

  const goBack = () => {
    const prev = steps[stepIndex - 1];
    if (prev) {
      setShowOptional(false);
      setStep(prev);
    } else {
      navigation.goBack();
    }
  };

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

  const renderResultField = (item: FieldTaskChecklistItem) => {
    const answer = draft.answers[item.key] || {};
    const type = itemType(item);
    const label = checklistLabel(item, i18n.language);
    const options = choiceOptions(item, i18n.language);

    if (type === 'choice' && options.length > 0) {
      return (
        <View key={item.key} style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{label}</Text>
          <TaskChoiceChips
            options={options.map((option) => ({ id: option, label: option }))}
            value={answer.textValue || ''}
            onChange={(id) => setAnswer(item.key, { textValue: id, boolValue: true })}
          />
        </View>
      );
    }

    if (type === 'number' || type === 'quantity_with_unit') {
      const showUnit =
        Boolean(item.unit) ||
        type === 'quantity_with_unit' ||
        /kg|kilo|κιλά/i.test(item.key + label);
      return (
        <View key={item.key} style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{label}</Text>
          <View style={styles.unitRow}>
            <TextInput
              value={answer.numberValue != null && !Number.isNaN(answer.numberValue) ? String(answer.numberValue) : ''}
              onChangeText={(raw) =>
                setAnswer(item.key, {
                  numberValue: raw === '' ? undefined : Number(raw),
                  boolValue: raw !== '',
                })
              }
              keyboardType="decimal-pad"
              style={[
                styles.input,
                { flex: 1, color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            />
            {showUnit ? (
              <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>{item.unit || 'kg'}</Text>
            ) : null}
          </View>
        </View>
      );
    }

    if (isDateLike(item)) {
      return (
        <View key={item.key} style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{label}</Text>
          <TextInput
            value={answer.textValue || ''}
            onChangeText={(value) =>
              setAnswer(item.key, { textValue: value, boolValue: Boolean(value.trim()) })
            }
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            style={[
              styles.input,
              { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          />
        </View>
      );
    }

    return (
      <View key={item.key} style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{label}</Text>
        <TextInput
          value={answer.textValue || ''}
          onChangeText={(value) =>
            setAnswer(item.key, { textValue: value, boolValue: Boolean(value.trim()) })
          }
          style={[
            styles.input,
            { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        />
      </View>
    );
  };

  const renderCheckList = (items: FieldTaskChecklistItem[]) =>
    items.map((item) => {
      const disposition = dispositionOf(draft.answers[item.key]);
      const triad: Array<{ value: CheckDisposition; key: 'done' | 'notNeeded' | 'couldNot'; fallback: string }> = [
        { value: 'done', key: 'done', fallback: 'Done' },
        { value: 'not_needed', key: 'notNeeded', fallback: 'Not needed' },
        { value: 'could_not', key: 'couldNot', fallback: 'Couldn’t' },
      ];
      return (
        <View
          key={item.key}
          style={[styles.checkCard, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}
        >
          <Text style={[styles.checkTitle, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
            {checklistLabel(item, i18n.language)}
            {item.isEssential ? (
              <Text style={{ color: colors.warning }}>
                {' '}
                ({t('fieldWork.completion.required', { defaultValue: 'required' })})
              </Text>
            ) : null}
          </Text>
          <View style={styles.triad}>
            {triad.map(({ value, key, fallback }) => {
              const selected = disposition === value;
              const warn = value === 'could_not' && selected;
              return (
                <Pressable
                  key={value}
                  onPress={() => setDisposition(item.key, value)}
                  style={[
                    styles.triadBtn,
                    {
                      minHeight: Math.max(40, tapMin * 0.85),
                      borderColor: selected
                        ? warn
                          ? colors.warning
                          : colors.oliveBorder
                        : colors.borderLight,
                      backgroundColor: selected
                        ? warn
                          ? colors.warningLight
                          : colors.primaryLight
                        : colors.surfaceMuted,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selected ? (warn ? colors.warning : colors.primary) : colors.textSecondary,
                      fontWeight: selected ? '700' : '600',
                      fontSize: 13 * fontScaleMultiplier,
                      textAlign: 'center',
                    }}
                  >
                    {t(`fieldWork.completion.check.${key}`, { defaultValue: fallback })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    });

  const renderOutcomes = () => (
    <View style={styles.outcomes}>
      {(
        [
          ['completed', 'completed', 'completedHint', 'Everything that was needed'],
          ['partially_completed', 'partial', 'partialHint', 'Something left for later'],
          ['not_done', 'notDone', 'notDoneHint', 'Log without a result'],
        ] as const
      ).map(([value, key, hint, hintFallback]) => {
        const selected = draft.outcome === value;
        return (
          <Pressable
            key={value}
            onPress={() => setDraft((prev) => ({ ...prev, outcome: value }))}
            style={[
              styles.outcome,
              {
                minHeight: tapMin,
                borderColor: selected ? colors.oliveBorder : colors.borderLight,
                backgroundColor: selected ? colors.primaryLight : colors.surface,
              },
            ]}
          >
            <View
              style={[
                styles.outcomeMark,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : 'transparent',
                },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {t(`fieldWork.completion.outcomes.${key}`)}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }}>
                {t(`fieldWork.completion.outcomes.${hint}`, { defaultValue: hintFallback })}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  if (loading) return <LoadingSpinner fullScreen />;

  if (!task) {
    return (
      <ScreenLayout padded>
        <View style={styles.centered}>
          <Text style={{ color: colors.error }}>{error || t('detail.notFound')}</Text>
          <Button title={t('detail.backToTasks')} variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </ScreenLayout>
    );
  }

  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const whenLabel = formatTaskDay(
    task.plannedStart || task.startedAt || new Date().toISOString(),
    i18n.language,
    task.resultYear
  );

  const learningSheet = (
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
  );

  if (undoToast) {
    return (
      <ScreenLayout scroll contentContainerStyle={styles.content}>
        <Text style={[styles.kicker, { color: colors.primary }]}>
          {t('fieldWork.completion.title', { defaultValue: 'Complete task' })}
        </Text>
        <Text style={[styles.h1, { color: colors.textPrimary, fontSize: 28 * fontScaleMultiplier }]}>
          {t('fieldWork.completion.savedTitle', { defaultValue: 'Task completed' })}
        </Text>
        <TaskHelpText>
          {t('fieldWork.completion.savedBody', { defaultValue: 'Saved to Chronologio.' })}
        </TaskHelpText>
        <View style={styles.successActions}>
          <Button
            title={t('fieldWork.seeCompletedInChronologio')}
            onPress={() => openChronologioHome(navigation)}
            disabled={busy}
          />
          {isHarvestTemplate(task.templateCode) ? (
            <Button
              title={t('fieldWork.completion.openHarvest', {
                defaultValue: t('fields:harvestCampaign.title', { defaultValue: 'Harvest' }),
              })}
              variant="outline"
              onPress={() => openHarvestCampaign(navigation)}
            />
          ) : null}
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
              variant="outline"
              onPress={() =>
                capture?.openCapture({
                  preferredType: 'expense',
                  fieldId: task.fieldId,
                  taskId: task.id,
                })
              }
            />
          ) : null}
          <Button
            title={t('fieldWork.completion.undo')}
            variant="ghost"
            onPress={() => void handleUndo()}
            disabled={busy}
          />
          <Button
            title={t('detail.backToTasks')}
            variant="ghost"
            onPress={() => navigation.navigate('Main', { screen: 'Tasks' })}
          />
        </View>
        {learningSheet}
      </ScreenLayout>
    );
  }

  const canAdvance =
    !(step === 'checks' && unansweredEssentialChecks.length > 0) &&
    !(step === 'result' && draft.outcome === 'completed' && missingEssentialResults.length > 0) &&
    !(step === 'cost' && draft.hadCost === null);

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[styles.kicker, { color: colors.primary }]}>
            {t('fieldWork.completion.title', { defaultValue: 'Complete task' })}
          </Text>
          <Text style={[styles.h1, { color: colors.textPrimary, fontSize: 28 * fontScaleMultiplier }]}>{title}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {fieldName}
            {whenLabel ? ` · ${whenLabel}` : ''}
          </Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
              <Text style={{ color: colors.error }}>{error}</Text>
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepPills}>
              {steps.map((idStep, index) => {
                const active = index === stepIndex;
                const done = index < stepIndex;
                return (
                  <View
                    key={idStep}
                    style={[
                      styles.stepPill,
                      {
                        borderColor: active || done ? colors.oliveBorder : colors.borderLight,
                        backgroundColor: active ? colors.primaryLight : done ? colors.successLight : colors.surfaceMuted,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.stepNum,
                        {
                          backgroundColor: active ? colors.primary : done ? colors.success : colors.border,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.onOlive, fontSize: 11, fontWeight: '700' }}>{index + 1}</Text>
                    </View>
                    <Text
                      style={{
                        color: active ? colors.primary : colors.textSecondary,
                        fontWeight: active ? '700' : '600',
                        fontSize: 13 * fontScaleMultiplier,
                      }}
                    >
                      {stepLabels[idStep]}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

            {step === 'checks' ? (
              <View style={styles.section}>
                <TaskSectionLabel>
                  {t('fieldWork.completion.checksTitle', { defaultValue: 'What did you get done?' })}
                </TaskSectionLabel>
                <TaskHelpText>
                  {t('fieldWork.completion.incompleteOnly', {
                    defaultValue: 'Only what is still open — mark each one.',
                  })}
                </TaskHelpText>
                {renderCheckList(essentialChecks)}
                {optionalChecks.length > 0 ? (
                  <>
                    <Pressable onPress={() => setShowOptional((v) => !v)} style={{ paddingVertical: spacing.sm }}>
                      <Text style={{ color: colors.primary, fontWeight: '700' }}>
                        {showOptional
                          ? t('fieldWork.detail.hideMoreChecks')
                          : t('fieldWork.detail.moreChecks')}
                      </Text>
                    </Pressable>
                    {showOptional ? renderCheckList(optionalChecks) : null}
                  </>
                ) : null}
                {unansweredEssentialChecks.length > 0 ? (
                  <Text style={{ color: colors.warning }}>
                    {t('fieldWork.completion.blockEssential', {
                      count: unansweredEssentialChecks.length,
                      defaultValue: `Complete ${unansweredEssentialChecks.length} required checks to continue.`,
                    })}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {step === 'result' ? (
              <View style={styles.section}>
                <TaskSectionLabel>
                  {t('fieldWork.completion.resultTitle', { defaultValue: 'Record the result' })}
                </TaskSectionLabel>
                <TaskHelpText>
                  {t('fieldWork.completion.resultLead', { defaultValue: 'Fill in the fields for this task.' })}
                </TaskHelpText>
                {essentialResults.map(renderResultField)}
                {optionalResults.length > 0 ? (
                  <>
                    <Pressable onPress={() => setShowOptional((v) => !v)} style={{ paddingVertical: spacing.sm }}>
                      <Text style={{ color: colors.primary, fontWeight: '700' }}>
                        {showOptional
                          ? t('fieldWork.completion.hideOptional', { defaultValue: 'Hide optional' })
                          : t('fieldWork.completion.showOptional', {
                              count: optionalResults.length,
                              defaultValue: `Optional · ${optionalResults.length} more`,
                            })}
                      </Text>
                    </Pressable>
                    {showOptional ? optionalResults.map(renderResultField) : null}
                  </>
                ) : null}
                {resultFields.length === 0 ? (
                  renderOutcomes()
                ) : (
                  <>
                    <View style={styles.fieldBlock}>
                      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                        {t('fieldWork.form.notes')}
                      </Text>
                      <TextInput
                        value={draft.notes}
                        onChangeText={(notes) => setDraft((prev) => ({ ...prev, notes }))}
                        multiline
                        placeholder={t('fieldWork.completion.notesPlaceholder', {
                          defaultValue: 'Optional note…',
                        })}
                        placeholderTextColor={colors.textTertiary}
                        style={[
                          styles.notes,
                          {
                            color: colors.textPrimary,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.fieldBlock}>
                      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                        {t('fieldWork.completion.whatHappened')}
                      </Text>
                      {renderOutcomes()}
                    </View>
                  </>
                )}
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
                    <Text style={{ color: colors.textPrimary, flex: 1 }}>
                      {t('fieldWork.completion.createFollowUp')}
                    </Text>
                  </Pressable>
                ) : null}
                {missingEssentialResults.length > 0 && draft.outcome === 'completed' ? (
                  <Text style={{ color: colors.warning }}>
                    {t('fieldWork.completion.blockResults', {
                      count: missingEssentialResults.length,
                      defaultValue: `Fill in ${missingEssentialResults.length} required fields to finish.`,
                    })}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {step === 'cost' ? (
              <View style={styles.section}>
                <TaskSectionLabel>{t('fieldWork.completion.hadCost')}</TaskSectionLabel>
                <TaskHelpText>{t('fieldWork.completion.hadCostHint')}</TaskHelpText>
                <View style={styles.costRow}>
                  <Button
                    title={t('fieldWork.completion.hadCostYes')}
                    variant={draft.hadCost === true ? 'primary' : 'outline'}
                    onPress={() => setDraft((prev) => ({ ...prev, hadCost: true }))}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={t('fieldWork.completion.hadCostNo')}
                    variant={draft.hadCost === false ? 'primary' : 'outline'}
                    onPress={() => setDraft((prev) => ({ ...prev, hadCost: false }))}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : null}

            {step === 'confirm' ? (
              <View style={styles.section}>
                <TaskSectionLabel>{t('fieldWork.completion.confirm')}</TaskSectionLabel>
                <View style={[styles.confirmBox, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}>
                  <Text style={{ color: colors.textPrimary, lineHeight: 22 }}>
                    {t('fieldWork.completion.chronologioConfirm', {
                      field: fieldName,
                      date: whenLabel,
                      defaultValue: `This will be saved to Chronologio for ${fieldName}, on ${whenLabel}.`,
                    })}
                  </Text>
                </View>
                <View style={styles.summary}>
                  <Text style={{ color: colors.textSecondary }}>
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                      {t('fieldWork.completion.whatHappened')}:{' '}
                    </Text>
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
                  <Text style={{ color: colors.textSecondary }}>
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                      {t('fieldWork.completion.hadCost')}:{' '}
                    </Text>
                    {draft.hadCost
                      ? t('fieldWork.completion.hadCostYes')
                      : t('fieldWork.completion.hadCostNo')}
                  </Text>
                  {draft.notes ? (
                    <Text style={{ color: colors.textSecondary }}>
                      <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                        {t('fieldWork.form.notes')}:{' '}
                      </Text>
                      {draft.notes}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.surfaceElevated,
              borderTopColor: colors.border,
              ...createElevation(colors, 'lg'),
            },
          ]}
        >
          <Button
            title={
              stepIndex === 0
                ? t('common:back')
                : t('fieldWork.completion.return', { defaultValue: 'Back' })
            }
            variant="outline"
            onPress={goBack}
            disabled={busy}
            style={{ flex: 1 }}
          />
          {step === 'confirm' ? (
            <Button
              title={t('fieldWork.completion.saveYes', { defaultValue: 'Yes, completed' })}
              variant="success"
              onPress={() => void submit()}
              disabled={busy}
              loading={busy}
              style={{ flex: 1 }}
            />
          ) : (
            <Button
              title={t('common:next')}
              onPress={goNext}
              disabled={!canAdvance}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </View>
      {learningSheet}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  content: { padding: spacing.base, paddingBottom: spacing.xl, gap: spacing.md },
  kicker: { ...typography.styles.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  h1: { ...typography.styles.h2, fontWeight: '700' },
  meta: { ...typography.styles.bodySmall },
  card: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.base, gap: spacing.md },
  section: { gap: spacing.md },
  stepPills: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stepNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  checkTitle: { fontWeight: '600' },
  triad: { flexDirection: 'row', gap: spacing.xs },
  triadBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  fieldBlock: { gap: spacing.xs },
  fieldLabel: { ...typography.styles.caption, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unitLabel: { fontWeight: '600', minWidth: 28 },
  notes: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  outcomes: { gap: spacing.sm },
  outcome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  outcomeMark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  followUp: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  costRow: { flexDirection: 'row', gap: spacing.sm },
  confirmBox: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  summary: { gap: spacing.sm },
  successActions: { gap: spacing.sm, marginTop: spacing.md },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.base,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  errorBox: { borderRadius: radii.md, padding: spacing.md },
});

export default TaskCompletionScreen;
