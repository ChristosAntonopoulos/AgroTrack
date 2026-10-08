import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getFieldService, getTaskService } from '../services/serviceFactory';
import type { Task } from '../services/taskService';
import type { Field } from '../services/fieldService';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import { notebookStatus } from '../utils/taskNotebook';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { formatCompactTaskPeriod } from '../utils/taskDateRange';
import type { RootStackParamList } from '../navigation/types';
import { radii, spacing } from '../theme';
import TaskCategoryGlyph from '../components/tasks/TaskCategoryGlyph';
import { resolveTaskCategoryAccent } from '../utils/taskCategoryAccents';
import RescheduleTaskSheet from '../components/tasks/RescheduleTaskSheet';

type Route = RouteProp<RootStackParamList, 'TaskDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;

const TaskDetailScreen = () => {
  const { t, i18n } = useTranslation(['tasks', 'common']);
  const navigation = useNavigation<Nav>();
  const { taskId } = useRoute<Route>().params;
  const { user } = useAuth();
  const { colors, tapMin, fontScaleMultiplier } = useTheme();

  const [task, setTask] = useState<Task | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipOpen, setSkipOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getTaskService().getTask(taskId);
      setTask(data);
      setNote(data.note || data.notes || '');
      setTitleDraft(data.title);
      const fields = await getFieldService()
        .getFields(user?.id || '', user?.role || '')
        .catch(() => [] as Field[]);
      setField(fields.find((item) => item.id === data.fieldId) || null);
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

  const saveNote = async () => {
    if (!task) return;
    const next = note.trim();
    if (next === (task.note || task.notes || '').trim()) return;
    setBusy(true);
    try {
      setTask(await getTaskService().patchTask(taskId, { note: next, notes: next }));
    } catch {
      setError(t('detail.failedStatus', { defaultValue: t('complete.failed') }));
    } finally {
      setBusy(false);
    }
  };

  const saveTitle = async () => {
    if (!task) return;
    const next = titleDraft.trim();
    if (!next || next === task.title) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      setTask(await getTaskService().patchTask(taskId, { title: next }));
      setEditing(false);
    } catch {
      setError(t('detail.failedStatus', { defaultValue: t('complete.failed') }));
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    setBusy(true);
    try {
      await getTaskService().completeTask(taskId);
      navigation.navigate('Main', { screen: 'Tasks', params: { view: 'done' } });
    } catch {
      setError(t('complete.failed'));
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    setBusy(true);
    try {
      await getTaskService().skipTask(taskId, skipReason.trim() || undefined);
      navigation.navigate('Main', { screen: 'Tasks', params: { view: 'done' } });
    } catch {
      setError(t('detail.failedStatus', { defaultValue: t('complete.failed') }));
    } finally {
      setBusy(false);
    }
  };

  const reschedule = async (plannedStart: string, plannedEnd?: string) => {
    setBusy(true);
    try {
      setTask(
        await getTaskService().patchTask(taskId, {
          scheduledFor: plannedStart,
          plannedStart,
          plannedEnd: plannedEnd || plannedStart,
        })
      );
      setRescheduleOpen(false);
    } catch {
      setError(t('fieldWork.errors.reschedule'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  if (!task) {
    return (
      <ScreenLayout style={styles.screen}>
        <View style={styles.content}>
          <Text style={{ color: colors.textSecondary }}>{error || t('detail.notFound')}</Text>
          <Button
            title={t('detail.backToTasks')}
            variant="outline"
            onPress={() => navigation.navigate('Main', { screen: 'Tasks' })}
          />
        </View>
      </ScreenLayout>
    );
  }

  const status = notebookStatus(task.status);
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const fieldName = friendlyFieldLabel(field?.name) || task.fieldId;
  const locked = status === 'done' || status === 'skipped';
  const period = formatCompactTaskPeriod(
    task.scheduledFor || task.plannedStart,
    task.plannedEnd,
    i18n.language,
    task.resultYear
  );
  const statusLabel = t(`notebook.status.${status}`, { defaultValue: status });
  const metaParts = [fieldName, period, statusLabel].filter(Boolean);
  const accent = resolveTaskCategoryAccent(task.templateCode);

  return (
    <ScreenLayout style={styles.screen} scroll>
      <View style={styles.content}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('detail.backToTasks')}</Text>
        </Pressable>

        <View style={styles.head}>
          <TaskCategoryGlyph templateCode={task.templateCode} accent={accent} size={44} />
          <View style={{ flex: 1, gap: 4 }}>
            {editing ? (
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                onBlur={() => void saveTitle()}
                autoFocus
                style={[
                  styles.titleInput,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.borderLight,
                    backgroundColor: colors.surface,
                    fontSize: 20 * fontScaleMultiplier,
                  },
                ]}
              />
            ) : (
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 22 * fontScaleMultiplier,
                  fontWeight: '800',
                }}
              >
                {title}
              </Text>
            )}
            <Text style={{ color: colors.textSecondary }}>{metaParts.join(' · ')}</Text>
          </View>
        </View>

        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('detail.note')}</Text>
          <TextInput
            value={note}
            editable={!locked && !busy}
            onChangeText={setNote}
            onBlur={() => void saveNote()}
            placeholder={t('detail.notePlaceholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[
              styles.note,
              {
                color: colors.textPrimary,
                borderColor: colors.borderLight,
                backgroundColor: colors.surfaceMuted,
                minHeight: Math.max(96, tapMin * 2),
              },
            ]}
          />
        </View>

        {!locked ? (
          <View style={styles.actions}>
            <Button title={t('detail.markDone')} onPress={() => void complete()} disabled={busy} loading={busy} />
            <Button
              title={t('notebook.menu.reschedule')}
              variant="outline"
              onPress={() => setRescheduleOpen(true)}
              disabled={busy}
            />
            <Button
              title={t('detail.editTask')}
              variant="outline"
              onPress={() => setEditing(true)}
              disabled={busy}
            />
            <Button
              title={t('notebook.menu.skip')}
              variant="ghost"
              onPress={() => setSkipOpen((open) => !open)}
              disabled={busy}
            />
          </View>
        ) : null}

        {skipOpen && !locked ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('detail.skipReason')}</Text>
            <TextInput
              value={skipReason}
              onChangeText={setSkipReason}
              placeholder={t('detail.skipReasonPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              multiline
              style={[
                styles.note,
                {
                  color: colors.textPrimary,
                  borderColor: colors.borderLight,
                  backgroundColor: colors.surfaceMuted,
                  minHeight: 80,
                },
              ]}
            />
            <Button title={t('detail.confirmSkip')} onPress={() => void skip()} disabled={busy} />
          </View>
        ) : null}
      </View>

      <RescheduleTaskSheet
        task={task}
        open={rescheduleOpen}
        busy={busy}
        onClose={() => setRescheduleOpen(false)}
        onConfirm={(start, end) => void reschedule(start, end)}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.md, paddingBottom: spacing['2xl'] },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  titleInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontWeight: '700',
  },
  card: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 13, fontWeight: '700' },
  note: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  actions: { gap: spacing.sm },
});

export default TaskDetailScreen;
