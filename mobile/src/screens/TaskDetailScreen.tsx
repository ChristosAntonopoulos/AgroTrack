import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/layout/ScreenLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCaptureOptional } from '../context/CaptureContext';
import {
  getFieldService,
  getFieldWorkService,
  getFinancialSummaryService,
} from '../services/serviceFactory';
import type { FieldTask, FieldTaskChecklistItem } from '../services/fieldWorkService';
import type { Field } from '../services/fieldService';
import type { TaskFinancialSummary } from '../services/financialSummaryService';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import { notebookStatus, requiredChecksRemaining } from '../utils/taskNotebook';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { formatOfficialAmount } from '../finance/format';
import { taskExpenseCaptureContext } from '../utils/taskExpenseContext';
import type { RootStackParamList } from '../navigation/types';
import { createElevation, radii, spacing, typography } from '../theme';
import TaskCategoryGlyph from '../components/tasks/TaskCategoryGlyph';
import { resolveTaskCategoryAccent } from '../utils/taskCategoryAccents';
import { hexToRgba } from '../utils/hexToRgba';

type Route = RouteProp<RootStackParamList, 'TaskDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;

const checkLabel = (item: FieldTaskChecklistItem, language: string) => {
  if (language.toLowerCase().startsWith('el')) return item.greekLabel || item.label;
  return item.englishLabel || item.label;
};

const TaskDetailScreen = () => {
  const { t, i18n } = useTranslation(['tasks', 'common', 'money']);
  const navigation = useNavigation<Nav>();
  const { taskId } = useRoute<Route>().params;
  const { user } = useAuth();
  const capture = useCaptureOptional();
  const { colors, tapMin, fontScaleMultiplier } = useTheme();

  const [task, setTask] = useState<FieldTask | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [money, setMoney] = useState<TaskFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [explaining, setExplaining] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getFieldWorkService().getFieldTask(taskId);
      setTask(data);
      setNote(data.notes || '');
      const [fields, taskMoney] = await Promise.all([
        getFieldService()
          .getFields(user?.id || '', user?.role || '')
          .catch(() => [] as Field[]),
        getFinancialSummaryService().getTaskSummary(taskId).catch(() => null),
      ]);
      setField(fields.find((item) => item.id === data.fieldId) || null);
      setMoney(taskMoney);
    } catch {
      setError(t('detail.failedLoad'));
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [t, taskId, user?.id, user?.role]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const handleStart = async () => {
    setBusy(true);
    try {
      setTask(await getFieldWorkService().startFieldTask(taskId));
    } catch {
      setError(t('fieldWork.errors.start'));
    } finally {
      setBusy(false);
    }
  };

  const toggleCheck = async (item: FieldTaskChecklistItem) => {
    if (!task) return;
    const status = notebookStatus(task.status);
    if (status === 'completed' || status === 'cancelled' || status === 'skipped') return;
    setBusy(true);
    try {
      let current = task;
      if (status === 'todo') {
        current = await getFieldWorkService().startFieldTask(taskId);
      }
      const updated = await getFieldWorkService().setChecklistItem(taskId, item.key, !item.isAnswered);
      setTask({ ...updated, startedAt: updated.startedAt || current.startedAt });
    } catch {
      setError(t('detail.failedStatus', { defaultValue: t('fieldWork.errors.start') }));
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async (value: string) => {
    if (!task) return;
    if ((value.trim() || '') === (task.notes || '').trim()) return;
    setBusy(true);
    try {
      setTask(await getFieldWorkService().updateFieldTask(taskId, { notes: value.trim() }));
    } catch {
      setError(t('detail.failedStatus', { defaultValue: t('fieldWork.errors.start') }));
    } finally {
      setBusy(false);
    }
  };

  const confirmComplete = async (allowIncomplete: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await getFieldWorkService().completeFieldTask(taskId, {
        outcome: 'completed',
        notes: note.trim() || undefined,
        allowIncomplete,
      });
      navigation.navigate('Main', { screen: 'Tasks', params: { view: 'done' } });
    } catch {
      setError(t('fieldWork.errors.complete'));
    } finally {
      setBusy(false);
    }
  };

  const blockTask = async () => {
    setBusy(true);
    try {
      setTask(await getFieldWorkService().blockFieldTask(taskId, note.trim() || undefined));
      setConfirming(false);
      setExplaining(false);
    } catch {
      setError(t('fieldWork.errors.complete'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  if (!task) {
    return (
      <ScreenLayout scroll padded>
        <Text style={{ color: colors.textSecondary }}>{error || t('detail.notFound')}</Text>
        <Button title={t('detail.backToTasks')} variant="outline" onPress={() => navigation.goBack()} />
      </ScreenLayout>
    );
  }

  const status = notebookStatus(task.status);
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const fieldName = friendlyFieldLabel(field?.name) || task.fieldId;
  const started = task.startedAt
    ? new Date(task.startedAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
    : '';
  const locked = status === 'completed' || status === 'cancelled' || status === 'skipped';
  const checks = [...(task.checklist || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const remaining = requiredChecksRemaining(task);
  const needsExplanation = confirming && remaining > 0 && !explaining;
  const accent = resolveTaskCategoryAccent(task.templateCode);
  const actualCost = formatOfficialAmount(
    money?.actualCost,
    task.estimatedCostCurrency || 'EUR',
    i18n.language,
    t('fieldWork.detail.noActual')
  );

  return (
    <ScreenLayout scroll padded>
      <View style={styles.stack}>
        <View style={styles.hero}>
          <TaskCategoryGlyph templateCode={task.templateCode} accent={accent} size={52} />
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Text style={[styles.title, { color: colors.textPrimary, fontSize: 24 * fontScaleMultiplier }]}>
              {title}
            </Text>
            <View style={styles.heroMeta}>
              <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
              <Text style={{ color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
                {fieldName}
                {started ? ` · ${t('notebook.work.started', { time: started })}` : ''}
              </Text>
            </View>
            {status !== 'todo' ? (
              <View style={[styles.statusPill, { backgroundColor: colors.primaryLight }]}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                  {t(`notebook.status.${status}`)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderLight, ...createElevation(colors, 'sm') },
          ]}
        >
          <Text style={[styles.heading, { color: colors.textTertiary }]}>{t('notebook.work.checks')}</Text>
          {checks.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>{t('notebook.work.noChecks')}</Text>
          ) : (
            checks.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => void toggleCheck(item)}
                disabled={busy || locked}
                style={[
                  styles.checkRow,
                  {
                    minHeight: tapMin,
                    opacity: busy || locked ? 0.6 : 1,
                    backgroundColor: item.isAnswered ? hexToRgba(colors.primary, 0.08) : colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons
                  name={item.isAnswered ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={item.isAnswered ? colors.primary : colors.textTertiary}
                />
                <Text style={{ color: colors.textPrimary, flex: 1, fontSize: 15 * fontScaleMultiplier }}>
                  {checkLabel(item, i18n.language)}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderLight, ...createElevation(colors, 'sm') },
          ]}
        >
          <Text style={[styles.heading, { color: colors.textTertiary }]}>{t('notebook.work.note')}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            onBlur={() => void saveNote(note)}
            editable={!locked && !busy}
            multiline
            style={[
              styles.note,
              {
                color: colors.textPrimary,
                borderColor: colors.borderLight,
                backgroundColor: colors.surfaceElevated,
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderLight, ...createElevation(colors, 'sm') },
          ]}
        >
          <Text style={[styles.heading, { color: colors.textTertiary }]}>{t('fieldWork.detail.money')}</Text>
          <Text style={{ color: colors.textSecondary }}>{t('fieldWork.detail.actual')}</Text>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 20 * fontScaleMultiplier }}>
            {actualCost}
          </Text>
          <Text style={{ color: colors.textTertiary }}>{t('fieldWork.detail.estimateHint')}</Text>
          {!locked ? (
            <View style={styles.actions}>
              <Button
                title={t('notebook.work.addPhoto')}
                variant="outline"
                onPress={() =>
                  capture?.openCapture({
                    preferredType: 'observation',
                    fieldId: task.fieldId,
                    taskId: task.id,
                  })
                }
              />
              <Button
                title={t('fieldWork.detail.addExpense')}
                variant="outline"
                onPress={() => capture?.openCapture(taskExpenseCaptureContext(task))}
              />
            </View>
          ) : null}
        </View>

        {(task.activity || []).length > 0 ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.borderLight, ...createElevation(colors, 'sm') },
            ]}
          >
            <Text style={[styles.heading, { color: colors.textTertiary }]}>{t('notebook.work.activity')}</Text>
            {task.activity?.map((event, index) => (
              <Text key={`${event.action}-${event.occurredAt}-${index}`} style={{ color: colors.textSecondary }}>
                {t(`notebook.work.activityActions.${event.action}`, { defaultValue: event.action })}
                {' · '}
                {new Date(event.occurredAt).toLocaleString(i18n.language, {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            ))}
          </View>
        ) : null}

        {confirming ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.borderLight, ...createElevation(colors, 'sm') },
            ]}
          >
            <Text style={[styles.heading, { color: colors.textTertiary }]}>{t('notebook.work.doneNow')}</Text>
            {needsExplanation ? (
              <Text style={{ color: colors.textSecondary }}>
                {t('notebook.work.incomplete', { open: remaining })}
              </Text>
            ) : null}
            {needsExplanation ? (
              <View style={styles.actions}>
                <Button
                  title={t('notebook.work.backToChecks')}
                  variant="outline"
                  onPress={() => {
                    setConfirming(false);
                    setExplaining(false);
                  }}
                />
                <Button
                  title={t('notebook.work.completeAnyway')}
                  variant="outline"
                  onPress={() => setExplaining(true)}
                />
                <Button title={t('notebook.menu.block')} variant="outline" disabled={busy} onPress={() => void blockTask()} />
              </View>
            ) : (
              <Button
                title={t('notebook.work.confirm')}
                disabled={busy}
                onPress={() => void confirmComplete(remaining > 0)}
              />
            )}
          </View>
        ) : (
          <View style={styles.actions}>
            {status === 'todo' ? (
              <Button title={t('fieldWork.actions.start')} disabled={busy} onPress={() => void handleStart()} />
            ) : null}
            {status === 'blocked' ? (
              <Button
                title={t('notebook.actions.resolve')}
                disabled={busy}
                onPress={() => {
                  setBusy(true);
                  void getFieldWorkService()
                    .resolveFieldTask(taskId)
                    .then(setTask)
                    .catch(() => setError(t('fieldWork.errors.start')))
                    .finally(() => setBusy(false));
                }}
              />
            ) : null}
            {status === 'in_progress' ? (
              <Button title={t('notebook.work.complete')} disabled={busy} onPress={() => setConfirming(true)} />
            ) : null}
          </View>
        )}
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  stack: { gap: spacing.md, paddingBottom: spacing['2xl'] },
  hero: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  title: { fontWeight: '700', letterSpacing: -0.4 },
  heading: { ...typography.styles.overline, marginBottom: spacing.sm },
  card: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base,
    gap: spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
  },
  note: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  actions: { gap: spacing.sm },
});

export default TaskDetailScreen;
