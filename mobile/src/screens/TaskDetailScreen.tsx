import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { FieldTask, FieldTaskChecklistItem } from '../services/fieldWorkService';
import type { Field } from '../services/fieldService';
import type { TaskFinancialSummary } from '../services/financialSummaryService';
import {
  getFieldWorkService,
  getFieldService,
  getFinancialSummaryService,
  getPartnerService,
} from '../services/serviceFactory';
import { fieldPeopleService, type FieldMembership } from '../services/fieldPeopleService';
import type { SavedContact } from '../services/partnerService';
import { useTheme } from '../context/ThemeContext';
import { useCaptureOptional } from '../context/CaptureContext';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import OfflineBanner from '../components/OfflineBanner';
import Sheet from '../components/ui/Sheet';
import ScreenLayout from '../components/layout/ScreenLayout';
import { TaskHelpText, TaskWeatherChip } from '../components/tasks/TaskChoiceChips';
import { typography, spacing, radii } from '../theme';
import { formatOfficialAmount, formatOfficialNet } from '../finance/format';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import { formatTaskDateRange, formatTaskDay } from '../utils/taskDateRange';
import { checklistProgress } from '../utils/plannedTaskGroups';
import { resolveWeatherKind } from '../utils/taskWeather';
import { isWeatherSensitiveTemplate } from '../data/fieldWorkCatalogueLabels';
import { weatherExplanationCopy } from '../utils/proposalPresentation';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'TaskDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const checklistLabel = (item: FieldTaskChecklistItem, lang: string) => {
  if (lang.toLowerCase().startsWith('el')) return item.greekLabel || item.label;
  return item.englishLabel || item.label;
};

const checklistValue = (item: FieldTaskChecklistItem, lang: string): string | null => {
  if (!item.isAnswered) return null;
  const type = (item.itemType || '').toLowerCase();
  if (type === 'number' && item.numberValue != null) {
    return `${item.numberValue}${item.unit ? ` ${item.unit}` : ''}`;
  }
  if (type === 'text' && item.textValue) return item.textValue;
  if (type === 'choice' && item.textValue) return item.textValue;
  if (item.boolValue === true) return lang.toLowerCase().startsWith('el') ? 'Ναι' : 'Yes';
  if (item.boolValue === false) return lang.toLowerCase().startsWith('el') ? 'Όχι' : 'No';
  return lang.toLowerCase().startsWith('el') ? 'Έγινε' : 'Done';
};

const TaskDetailScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { taskId } = route.params;
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const capture = useCaptureOptional();
  const { t, i18n } = useTranslation(['tasks', 'common', 'money']);
  const [task, setTask] = useState<FieldTask | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [money, setMoney] = useState<TaskFinancialSummary | null>(null);
  const [people, setPeople] = useState<FieldMembership[]>([]);
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMoreChecks, setShowMoreChecks] = useState(false);
  const [assigneeKey, setAssigneeKey] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const data = await getFieldWorkService().getFieldTask(taskId);
      setTask(data);
      if (data.assignedUserId) setAssigneeKey(`user:${data.assignedUserId}`);
      else if (data.assignedCollaboratorId) setAssigneeKey(`contact:${data.assignedCollaboratorId}`);
      else setAssigneeKey('');

      const [fieldData, memberships, saved, taskMoney] = await Promise.all([
        getFieldService().getField(data.fieldId).catch(() => null),
        fieldPeopleService.getPeople(data.fieldId).catch(() => [] as FieldMembership[]),
        getPartnerService()
          .getContacts({ fieldId: data.fieldId, includeUnassigned: true })
          .catch(() => [] as SavedContact[]),
        getFinancialSummaryService().getTaskSummary(taskId).catch(() => null),
      ]);
      setField(fieldData);
      setPeople(Array.isArray(memberships) ? memberships : []);
      setContacts(Array.isArray(saved) ? saved : []);
      setMoney(taskMoney);
    } catch {
      setError(t('detail.failedLoad'));
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void load();
  }, [taskId]);

  const assigneeOptions = useMemo(() => {
    const opts: Array<{ key: string; label: string; userId?: string; contactId?: string }> = [
      { key: '', label: t('fieldWork.form.unassigned') },
    ];
    people.forEach((person) => {
      opts.push({
        key: `user:${person.userId}`,
        label: person.displayName || person.email || person.userId,
        userId: person.userId,
      });
    });
    contacts.forEach((contact) => {
      if (contact.linkedUserId && people.some((person) => person.userId === contact.linkedUserId)) return;
      opts.push({
        key: `contact:${contact.id}`,
        label: contact.displayName,
        contactId: contact.id,
        userId: contact.linkedUserId,
      });
    });
    return opts;
  }, [people, contacts, t]);

  const essential = useMemo(
    () =>
      (task?.checklist || [])
        .filter((item) => item.isEssential)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 5),
    [task]
  );
  const extra = useMemo(
    () =>
      (task?.checklist || [])
        .filter((item) => !essential.some((e) => e.key === item.key))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [task, essential]
  );

  const status = String(task?.status || '').toLowerCase();
  const canStart = status === 'planned' || status === 'ready' || status === 'blocked';
  const canComplete = status === 'in_progress' || status === 'ready' || status === 'planned';
  const isTerminal = status === 'completed' || status === 'cancelled';
  const progress = task ? checklistProgress(task) : { done: 0, total: 0 };
  const title = task ? taskDisplayTitle(task.title, task.templateCode, i18n.language) : '';
  const fieldName = field?.name || task?.fieldId || '';
  const period = task ? formatTaskDateRange(task.plannedStart, task.plannedEnd, i18n.language) : '';
  const started = task?.startedAt ? formatTaskDay(task.startedAt, i18n.language, task.resultYear) : '';

  const weatherKind = resolveWeatherKind(task?.weatherSuitability);
  const showWeather =
    Boolean(task) &&
    (weatherKind === 'unknown' ||
      (isWeatherSensitiveTemplate(task?.templateCode) && weatherKind !== 'not_sensitive'));
  const weatherCopy = weatherExplanationCopy(
    weatherKind === 'not_sensitive' ? 'not_sensitive' : weatherKind,
    [],
    i18n.language
  );

  const handleStart = async () => {
    setBusy(true);
    try {
      const updated = await getFieldWorkService().startFieldTask(taskId);
      setTask(updated);
    } catch {
      setError(t('fieldWork.errors.start'));
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async () => {
    setBusy(true);
    try {
      const updated = await getFieldWorkService().resumeFieldTask(taskId);
      setTask(updated);
    } catch {
      setError(t('fieldWork.errors.start'));
    } finally {
      setBusy(false);
    }
  };

  const handlePause = async () => {
    setBusy(true);
    try {
      const updated = await getFieldWorkService().pauseFieldTask(taskId, {
        reason: t('fieldWork.pause.reasons.anotherDay', {
          defaultValue: 'Continue another day',
        }),
      });
      setTask(updated);
    } catch {
      setError(t('fieldWork.errors.pause', { defaultValue: t('fieldWork.errors.start') }));
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async (nextKey: string) => {
    if (isTerminal) return;
    setAssigneeKey(nextKey);
    setAssignOpen(false);
    setBusy(true);
    try {
      const selected = assigneeOptions.find((option) => option.key === nextKey);
      const updated = await getFieldWorkService().assignFieldTask(taskId, {
        assignedUserId: selected?.userId,
        assignedCollaboratorId: selected?.contactId,
      });
      setTask(updated);
    } catch {
      setError(t('detail.failedAssign'));
      if (task?.assignedUserId) setAssigneeKey(`user:${task.assignedUserId}`);
      else if (task?.assignedCollaboratorId) setAssigneeKey(`contact:${task.assignedCollaboratorId}`);
      else setAssigneeKey('');
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = () => navigation.navigate('TaskCompletion', { taskId });
  const isPaused = Boolean(task?.isPaused);
  const checksDone = progress.total > 0 && progress.done >= progress.total;
  const nextStepHelp = isPaused
    ? t('fieldWork.detail.nextStepPaused', {
        defaultValue: 'This task is paused. Continue when ready.',
      })
    : canStart
      ? t('fieldWork.detail.nextStepStart')
      : checksDone
        ? t('fieldWork.detail.nextStepRecordResult', {
            defaultValue: 'All checks are complete.',
          })
        : progress.total > 0
          ? t('fieldWork.detail.nextStepContinueChecks', {
              count: Math.max(0, progress.total - progress.done),
              defaultValue: `Complete ${Math.max(0, progress.total - progress.done)} more checks.`,
            })
          : t('fieldWork.detail.nextStepComplete');
  const primaryCompleteLabel = checksDone
    ? t('fieldWork.actions.recordResult', { defaultValue: 'Record result' })
    : t('fieldWork.actions.continueChecks', { defaultValue: 'Continue checks' });

  const selectedAssignee = assigneeOptions.find((option) => option.key === assigneeKey);
  const statusClass =
    status === 'in_progress'
      ? colors.primary
      : status === 'completed'
        ? colors.success
        : status === 'blocked'
          ? colors.warning
          : colors.textSecondary;

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

  const renderCheck = (item: FieldTaskChecklistItem) => {
    const value = checklistValue(item, i18n.language);
    return (
      <View key={item.key} style={styles.checkRow}>
        <Text style={{ color: item.isAnswered ? colors.success : colors.textTertiary, width: 20 }}>
          {item.isAnswered ? '✓' : '○'}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
            {checklistLabel(item, i18n.language)}
          </Text>
          {value ? <Text style={{ color: colors.textSecondary }}>{value}</Text> : null}
          {!item.isAnswered && !isTerminal ? (
            <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{t('fieldWork.detail.checkPending')}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <ScreenLayout>
    <View style={styles.screen}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.chips}>
            <View style={[styles.statusPill, { backgroundColor: statusClass + '22' }]}>
              <Text style={{ color: statusClass, fontWeight: '700', fontSize: 12 }}>{task.statusLabel}</Text>
            </View>
            <Text style={{ color: colors.textTertiary, fontWeight: '700' }}>{task.resultYear}</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: 24 * fontScaleMultiplier }]}>
            {title}
          </Text>
          <Pressable
            onPress={() => navigation.navigate('FieldDetail', { fieldId: task.fieldId })}
            style={styles.fieldLink}
          >
            <Ionicons name="leaf-outline" size={14} color={colors.link} />
            <Text style={{ color: colors.link, fontWeight: '600' }}>{fieldName}</Text>
          </Pressable>
          {period ? <Text style={{ color: colors.textSecondary }}>{period}</Text> : null}
          {started ? (
            <Text style={{ color: colors.textSecondary }}>
              {t('detail.actualStart')}: {started}
            </Text>
          ) : null}
          {showWeather ? (
            <View style={{ marginTop: spacing.sm }}>
              <TaskWeatherChip
                kind={
                  weatherKind === 'good'
                    ? 'good'
                    : weatherKind === 'caution'
                      ? 'caution'
                      : weatherKind === 'unsuitable'
                        ? 'unsuitable'
                        : 'unknown'
                }
                label={
                  weatherKind === 'unknown'
                    ? t('fieldWork.weather.unknown')
                    : t(`fieldWork.proposal.chips.${weatherKind}`)
                }
              />
              {weatherCopy.headline ? <TaskHelpText>{weatherCopy.headline}</TaskHelpText> : null}
            </View>
          ) : null}
          {task.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{task.description}</Text>
          ) : null}
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
            <Text style={{ color: colors.error }}>{error}</Text>
          </View>
        ) : null}

        {!isTerminal ? (
          <View style={[styles.card, styles.nextCard, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('fieldWork.detail.nextStep')}</Text>
            <TaskHelpText>{nextStepHelp}</TaskHelpText>
            <View style={styles.actions}>
              {isPaused ? (
                <Button
                  title={t('fieldWork.actions.continueIt', { defaultValue: 'Continue' })}
                  onPress={() => void handleResume()}
                  disabled={busy}
                  style={{ flex: 1 }}
                />
              ) : canStart ? (
                <Button
                  title={t('fieldWork.actions.start')}
                  onPress={() => void handleStart()}
                  disabled={busy}
                  style={{ flex: 1 }}
                />
              ) : canComplete ? (
                <Button
                  title={primaryCompleteLabel}
                  variant="success"
                  onPress={handleComplete}
                  disabled={busy}
                  style={{ flex: 1 }}
                />
              ) : null}
              {!isPaused && status === 'in_progress' ? (
                <Button
                  title={t('fieldWork.actions.pause', { defaultValue: 'Pause' })}
                  variant="outline"
                  onPress={() => void handlePause()}
                  disabled={busy}
                  style={{ flex: 1 }}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('fieldWork.detail.checklist')}</Text>
            {progress.total > 0 ? (
              <Text style={{ color: colors.textTertiary }}>
                {t('fieldWork.task.checksShort', { done: progress.done, total: progress.total })}
              </Text>
            ) : null}
          </View>
          {progress.total > 0 ? (
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceMuted }]}>
              <View
                style={{
                  width: `${progress.done > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                  height: 6,
                  backgroundColor: colors.primary,
                  borderRadius: radii.full,
                }}
              />
            </View>
          ) : null}
          {!isTerminal ? <TaskHelpText>{t('fieldWork.detail.checklistHint')}</TaskHelpText> : null}
          {essential.length > 0 ? essential.map(renderCheck) : <TaskHelpText>{t('fieldWork.detail.noChecks')}</TaskHelpText>}
          {extra.length > 0 ? (
            <>
              <Pressable onPress={() => setShowMoreChecks((value) => !value)} style={{ paddingVertical: spacing.sm }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {showMoreChecks ? t('fieldWork.detail.hideMoreChecks') : t('fieldWork.detail.moreChecks')}
                </Text>
              </Pressable>
              {showMoreChecks ? extra.map(renderCheck) : null}
            </>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('fieldWork.person')}</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('detail.assignedTo')}</Text>
          <Pressable
            disabled={isTerminal || busy}
            onPress={() => setAssignOpen(true)}
            style={[
              styles.select,
              { borderColor: colors.border, backgroundColor: colors.surfaceMuted, minHeight: tapMin },
            ]}
          >
            <Text style={{ color: colors.textPrimary, flex: 1 }}>{selectedAssignee?.label || t('fieldWork.form.unassigned')}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('fieldWork.detail.money')}</Text>
          <View style={styles.moneyRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textTertiary }}>{t('fieldWork.detail.estimated')}</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {formatOfficialAmount(
                  money?.estimatedCost ?? task.estimatedCost,
                  'EUR',
                  i18n.language,
                  t('money:unknownAmount')
                )}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textTertiary }}>{t('fieldWork.detail.actual')}</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {formatOfficialAmount(money?.actualCost, 'EUR', i18n.language, t('fieldWork.detail.noActual'))}
              </Text>
            </View>
          </View>
          {money?.difference != null ? (
            <Text style={{ color: colors.textSecondary }}>
              {t('fieldWork.detail.difference')}:{' '}
              {formatOfficialNet(money.difference, 'EUR', i18n.language, t('money:unknownAmount'))}
            </Text>
          ) : null}
          <TaskHelpText>{t('fieldWork.detail.estimateHint')}</TaskHelpText>
          <View style={styles.actions}>
            <Button
              title={t('fieldWork.detail.addExpense')}
              onPress={() =>
                capture?.openCapture({
                  preferredType: 'expense',
                  fieldId: task.fieldId,
                  taskId: task.id,
                })
              }
              style={{ flex: 1 }}
            />
            <Button
              title={t('fieldWork.detail.seeMoney')}
              variant="outline"
              onPress={() => navigation.navigate('Money', { fieldId: task.fieldId })}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('fieldWork.form.notes')}</Text>
          {task.notes?.trim() ? (
            <Text style={{ color: colors.textSecondary }}>{task.notes}</Text>
          ) : (
            <TaskHelpText>
              {isTerminal ? t('fieldWork.detail.noNotes') : t('fieldWork.detail.notesOnComplete')}
            </TaskHelpText>
          )}
        </View>

        {status === 'completed' ? (
          <Pressable onPress={() => navigation.navigate('Chronologio', {})} style={{ paddingVertical: spacing.md }}>
            <Text style={{ color: colors.link, fontWeight: '700', textAlign: 'center' }}>
              {t('fieldWork.seeCompletedInChronologio')}
            </Text>
          </Pressable>
        ) : null}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>

      <Sheet open={assignOpen} onClose={() => setAssignOpen(false)} title={t('detail.assignedTo')} edge="bottom" size="md">
        {assigneeOptions.map((option) => (
          <Pressable
            key={option.key || 'unassigned'}
            onPress={() => void handleAssign(option.key)}
            style={[
              styles.assignRow,
              {
                minHeight: tapMin,
                backgroundColor: option.key === assigneeKey ? colors.primaryLight : 'transparent',
              },
            ]}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: option.key === assigneeKey ? '700' : '500' }}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </Sheet>
    </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  content: { padding: spacing.base, gap: spacing.md },
  card: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.base, gap: spacing.sm },
  nextCard: {},
  title: { ...typography.styles.h2, fontWeight: '700' },
  description: { ...typography.styles.bodySmall, marginTop: spacing.xs },
  chips: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusPill: { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  fieldLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTitle: { ...typography.styles.h4, fontWeight: '700' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  checkRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  barTrack: { height: 6, borderRadius: radii.full, overflow: 'hidden' },
  label: { ...typography.styles.caption, fontWeight: '600' },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  moneyRow: { flexDirection: 'row', gap: spacing.md },
  errorBox: { borderRadius: radii.md, padding: spacing.md },
  assignRow: { paddingHorizontal: spacing.sm, justifyContent: 'center', borderRadius: radii.md },
});

export default TaskDetailScreen;
