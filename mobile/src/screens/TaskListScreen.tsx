import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useOfflineMode } from '../context/OfflineContext';
import { useRefresh } from '../hooks/useRefresh';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import HeaderIconButton from '../components/layout/HeaderIconButton';
import FieldColorMark from '../components/fields/FieldColorMark';
import TaskViewTabs from '../components/tasks/TaskViewTabs';
import TodoNotebook from '../components/tasks/TodoNotebook';
import HistoryTaskView from '../components/tasks/HistoryTaskView';
import CreatedTaskBanner from '../components/tasks/CreatedTaskBanner';
import RescheduleTaskSheet from '../components/tasks/RescheduleTaskSheet';
import ScheduleWorkSheet, {
  type ScheduleWorkPrefill,
} from '../components/tasks/ScheduleWorkSheet';
import CompletionFollowUpSheet from '../components/tasks/CompletionFollowUpSheet';
import type { NotebookMenuAction } from '../components/tasks/TaskNotebookCard';
import type { AssigneeOption } from '../components/tasks/form/AssigneeSelector';
import Sheet from '../components/ui/Sheet';
import { spacing, radii } from '../theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { openChronologioHome } from '../navigation/intents';
import {
  getFieldService,
  getPartnerService,
  getTaskService,
} from '../services/serviceFactory';
import { fieldPeopleService } from '../services/fieldPeopleService';
import type { CreateTaskInput, Task, TaskSuggestion } from '../services/taskService';
import type { Field } from '../services/fieldService';
import { athensCalendarYear } from '../utils/athensDate';
import {
  parseTaskFieldId,
  parseTaskView,
  viewFromLegacyFilter,
  type TaskPageView,
} from '../utils/taskViewState';
import { formatLongTaskDate } from '../utils/taskFormDates';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import { useRegisterCapturePage } from '../context/CapturePageContext';

type Route = RouteProp<MainTabParamList, 'Tasks'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const TaskListScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const { t, i18n } = useTranslation(['tasks', 'common']);
  const { setShowingCachedData } = useOfflineMode();

  const year = athensCalendarYear(new Date());
  const [view, setView] = useState<TaskPageView>(() =>
    parseTaskView(route.params?.view || viewFromLegacyFilter(route.params?.filter))
  );
  const [fieldFilter, setFieldFilter] = useState(() => parseTaskFieldId(route.params?.fieldId));
  const [createdId, setCreatedId] = useState(route.params?.created || '');
  const [scheduleOpen, setScheduleOpen] = useState(Boolean(route.params?.schedule));
  const [schedulePrefill, setSchedulePrefill] = useState<ScheduleWorkPrefill | null>(null);

  useRegisterCapturePage({
    sourcePage: 'tasks',
    fieldId: fieldFilter || undefined,
  });

  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [taskCounts, setTaskCounts] = useState({ today: 0, upcoming: 0, done: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [personNames, setPersonNames] = useState<Record<string, string>>({});
  const [undoCompleteId, setUndoCompleteId] = useState<string | null>(null);
  const [followUpTask, setFollowUpTask] = useState<Task | null>(null);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [rescheduleTask, setRescheduleTask] = useState<Task | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([]);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);

  useEffect(() => {
    if (route.params?.view || route.params?.filter) {
      setView(parseTaskView(route.params?.view || viewFromLegacyFilter(route.params?.filter)));
    }
    if (route.params?.fieldId !== undefined) setFieldFilter(parseTaskFieldId(route.params.fieldId));
    if (route.params?.created) setCreatedId(route.params.created);
  }, [route.params]);

  const scheduleTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!route.params?.schedule) {
      scheduleTokenRef.current = null;
      return;
    }
    const token = `${route.params.fieldId || ''}|${route.params.templateCode || ''}|${route.params.created || ''}`;
    if (scheduleTokenRef.current === token) return;
    scheduleTokenRef.current = token;
    setScheduleOpen(true);
    setSchedulePrefill({
      fieldId: route.params.fieldId || undefined,
      templateCode: route.params.templateCode || undefined,
      title: route.params.templateCode
        ? taskDisplayTitle('', route.params.templateCode, i18n.language)
        : undefined,
    });
    setScheduleError(null);
  }, [route.params?.schedule, route.params?.fieldId, route.params?.templateCode, route.params?.created, i18n.language]);

  const fieldNames = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.id, field.name])),
    [fields]
  );

  const selectedField = fields.find((field) => field.id === fieldFilter);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const tasksApi = getTaskService();
      const listOpts = { fieldId: fieldFilter || undefined };
      const [fieldsData, todayData, upcomingData, doneData] = await Promise.all([
        getFieldService()
          .getFields(user?.id ?? '', user?.role ?? 'FieldOwner', 'tasks')
          .catch(() => [] as Field[]),
        tasksApi.listTasks({ view: 'today', ...listOpts }),
        tasksApi.listTasks({ view: 'upcoming', ...listOpts }),
        tasksApi.listTasks({ view: 'done', ...listOpts }),
      ]);
      setFields(fieldsData);
      setTaskCounts({
        today: todayData.length,
        upcoming: upcomingData.length,
        done: doneData.length,
      });
      setTasks(
        view === 'done' ? doneData : view === 'upcoming' ? upcomingData : todayData
      );

      if (view === 'today') {
        const fieldIds = fieldFilter
          ? [fieldFilter]
          : fieldsData.map((field) => field.id).slice(0, 12);
        const suggestionGroups = await Promise.all(
          fieldIds.map((id) =>
            tasksApi.listSuggestions({ fieldId: id }).catch(() => [] as TaskSuggestion[])
          )
        );
        const seen = new Set<string>();
        setSuggestions(
          suggestionGroups.flat().filter((item) => {
            const key = `${item.fieldId}:${item.templateCode}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
        );
      } else {
        setSuggestions([]);
      }
      setShowingCachedData(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('tasks:failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [view, fieldFilter, user?.id, user?.role, setShowingCachedData, t]);

  useEffect(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  const { refreshing, onRefresh } = useRefresh(loadData);

  const peopleFieldKey = useMemo(
    () =>
      [...new Set(tasks.map((task) => task.fieldId).filter(Boolean))]
        .sort()
        .join(','),
    [tasks]
  );

  useEffect(() => {
    if (!peopleFieldKey) return;
    let cancelled = false;
    const ids = peopleFieldKey.split(',').filter(Boolean);
    void Promise.all(
      ids.map(async (fieldId) => {
        const [people, contacts] = await Promise.all([
          fieldPeopleService.getPeople(fieldId).catch(() => []),
          getPartnerService()
            .getContacts({ fieldId, includeUnassigned: true })
            .catch(() => []),
        ]);
        const entries: Array<[string, string]> = [];
        (Array.isArray(people) ? people : []).forEach((person) => {
          const name = person.displayName || person.email;
          if (name) entries.push([`user:${person.userId}`, name]);
        });
        (Array.isArray(contacts) ? contacts : []).forEach((contact) => {
          if (contact.displayName) entries.push([`contact:${contact.id}`, contact.displayName]);
        });
        return entries;
      })
    ).then((groups) => {
      if (!cancelled) setPersonNames(Object.fromEntries(groups.flat()));
    });
    return () => {
      cancelled = true;
    };
  }, [peopleFieldKey]);

  useEffect(() => {
    const targetField = fieldFilter || fields[0]?.id;
    if (!targetField) {
      setAssigneeOptions([
        {
          key: user?.id ? `user:${user.id}` : 'later',
          label: t('schedule.assigneeMe'),
          group: 'self',
        },
        { key: 'later', label: t('schedule.decideLater'), group: 'later' },
      ]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      fieldPeopleService.getPeople(targetField).catch(() => []),
      getPartnerService()
        .getContacts({ fieldId: targetField, includeUnassigned: true })
        .catch(() => []),
    ]).then(([people, contacts]) => {
      if (cancelled) return;
      const options: AssigneeOption[] = [
        {
          key: user?.id ? `user:${user.id}` : 'later',
          label: t('schedule.assigneeMe'),
          group: 'self',
        },
      ];
      (Array.isArray(people) ? people : []).forEach((person) => {
        if (person.userId === user?.id || person.role === 'Admin') return;
        options.push({
          key: `user:${person.userId}`,
          label: person.displayName || person.email || t('fieldWork.form.collaborator'),
          group: person.role === 'Family' ? 'family' : 'partner',
        });
      });
      (Array.isArray(contacts) ? contacts : []).forEach((contact) => {
        options.push({
          key: `contact:${contact.id}`,
          label: contact.displayName,
          group: 'contact',
        });
      });
      options.push({ key: 'later', label: t('schedule.decideLater'), group: 'later' });
      setAssigneeOptions(options);
    });
    return () => {
      cancelled = true;
    };
  }, [fieldFilter, fields, user?.id, t]);

  const openSchedule = useCallback(
    (prefill?: ScheduleWorkPrefill) => {
      setSchedulePrefill(prefill || { fieldId: fieldFilter || undefined });
      setScheduleError(null);
      setScheduleOpen(true);
    },
    [fieldFilter]
  );

  const closeSchedule = useCallback(() => {
    scheduleTokenRef.current = null;
    setScheduleOpen(false);
    setSchedulePrefill(null);
    setScheduleError(null);
  }, []);

  const openTask = (task: Task) => navigation.navigate('TaskDetail', { taskId: task.id });

  const handleComplete = async (task: Task) => {
    try {
      setBusyId(task.id);
      const updated = await getTaskService().completeTask(task.id);
      setUndoCompleteId(task.id);
      setFollowUpTask(updated);
      setFollowUpError(null);
      setTimeout(
        () => setUndoCompleteId((current) => (current === task.id ? null : current)),
        8000
      );
      await loadData();
    } catch {
      setError(t('complete.failed'));
    } finally {
      setBusyId(null);
    }
  };

  const handleUndoComplete = async () => {
    if (!undoCompleteId) return;
    try {
      setBusyId(undoCompleteId);
      await getTaskService().undoComplete(undoCompleteId);
      setUndoCompleteId(null);
      setFollowUpTask(null);
      await loadData();
    } catch {
      setError(t('complete.undoFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const handleReschedule = async (plannedStart: string, plannedEnd?: string) => {
    if (!rescheduleTask) return;
    try {
      setBusyId(rescheduleTask.id);
      await getTaskService().patchTask(rescheduleTask.id, {
        scheduledFor: plannedStart,
        plannedStart,
        plannedEnd: plannedEnd || plannedStart,
      });
      setRescheduleTask(null);
      await loadData();
    } catch {
      setError(t('fieldWork.errors.reschedule'));
    } finally {
      setBusyId(null);
    }
  };

  const handleScheduleSubmit = async (input: CreateTaskInput) => {
    try {
      setScheduleBusy(true);
      setScheduleError(null);
      const created = await getTaskService().createTask(input);
      closeSchedule();
      setView('today');
      setFieldFilter(created.fieldId);
      setCreatedId(created.id);
      await loadData();
    } catch {
      setScheduleError(t('schedule.failedSave'));
    } finally {
      setScheduleBusy(false);
    }
  };

  const handleDismissSuggestion = async (suggestion: TaskSuggestion) => {
    try {
      setBusyId(`suggestion:${suggestion.fieldId}:${suggestion.templateCode}`);
      await getTaskService().dismissSuggestion({
        fieldId: suggestion.fieldId,
        templateCode: suggestion.templateCode,
        resultYear: suggestion.resultYear,
      });
      await loadData();
    } catch {
      setError(t('suggestions.dismissFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const handleMenu = async (task: Task, action: NotebookMenuAction) => {
    if (action === 'reschedule') {
      setRescheduleTask(task);
      return;
    }
    if (action === 'edit' || action === 'assign') {
      openTask(task);
      return;
    }
    if (action === 'skip') {
      try {
        setBusyId(task.id);
        await getTaskService().skipTask(task.id);
        await loadData();
      } catch {
        setError(t('fieldWork.errors.cancel'));
      } finally {
        setBusyId(null);
      }
    }
  };

  const handleSaveCompletionDetails = async (payload: { notes: string }) => {
    if (!followUpTask) return;
    try {
      setBusyId(followUpTask.id);
      setFollowUpError(null);
      await getTaskService().createWorkRecord({
        fieldId: followUpTask.fieldId,
        title: followUpTask.title,
        templateCode: followUpTask.templateCode,
        notes: payload.notes || undefined,
        linkedTaskId: followUpTask.id,
        offerPlannedTaskMatch: false,
      });
      setFollowUpTask(null);
      await loadData();
    } catch {
      setFollowUpError(t('complete.saveFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const createdTask = useMemo(
    () => tasks.find((task) => task.id === createdId),
    [tasks, createdId]
  );

  const handleUndoCreated = async () => {
    if (!createdId) return;
    try {
      setBusyId(createdId);
      await getTaskService().skipTask(createdId, 'undo_create');
      setCreatedId('');
      await loadData();
    } catch {
      setError(t('schedule.failedSave'));
    } finally {
      setBusyId(null);
    }
  };

  const showSkeleton = loading && tasks.length === 0;

  return (
    <ScreenLayout style={styles.screen} tabBarInset>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={t('page.title')}
          action={
            <HeaderIconButton
              icon="add"
              accessibilityLabel={t('page.scheduleCta')}
              onPress={() => openSchedule({ fieldId: fieldFilter || undefined })}
              active
            />
          }
        />

        <Pressable
          onPress={() => setFieldPickerOpen(true)}
          accessibilityLabel={t('page.fieldFilter')}
          style={[
            styles.fieldChip,
            {
              borderColor: fieldFilter ? colors.oliveBorder : colors.borderLight,
              backgroundColor: fieldFilter ? colors.primaryLight : colors.surface,
              minHeight: Math.max(44, tapMin * 0.9),
            },
          ]}
        >
          {selectedField ? (
            <FieldColorMark color={selectedField.color} fieldId={selectedField.id} size={10} />
          ) : (
            <FieldColorMark hollow size={10} />
          )}
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: '600',
              flex: 1,
              fontSize: 14 * fontScaleMultiplier,
            }}
            numberOfLines={1}
          >
            {selectedField?.name || t('page.allFields')}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
        </Pressable>

        <TaskViewTabs
          activeView={view}
          onChange={setView}
          views={[
            {
              id: 'today',
              label: t('page.tabs.today'),
              count: showSkeleton ? 0 : taskCounts.today,
            },
            {
              id: 'upcoming',
              label: t('page.tabs.upcoming'),
              count: showSkeleton ? 0 : taskCounts.upcoming,
            },
            {
              id: 'done',
              label: t('page.tabs.done'),
              count: showSkeleton ? 0 : taskCounts.done,
            },
          ]}
        />

        {showSkeleton ? (
          <View style={styles.skeleton} accessibilityState={{ busy: true }}>
            <View style={[styles.skeletonSection, { backgroundColor: colors.surfaceMuted }]} />
            <View style={[styles.skeletonCard, { backgroundColor: colors.surfaceMuted }]} />
            <View style={[styles.skeletonCard, { backgroundColor: colors.surfaceMuted }]} />
            <View style={[styles.skeletonCard, { backgroundColor: colors.surfaceMuted }]} />
          </View>
        ) : null}

        {!showSkeleton && error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
            <Text style={{ color: colors.error }}>{error}</Text>
          </View>
        ) : null}

        {!showSkeleton && undoCompleteId ? (
          <View
            style={[
              styles.undoBanner,
              { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder },
            ]}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.textPrimary, flex: 1, fontWeight: '600' }}>
              {t('complete.undoMessage')}
            </Text>
            <Pressable onPress={() => void handleUndoComplete()}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('complete.undo')}</Text>
            </Pressable>
          </View>
        ) : null}

        {!showSkeleton && createdTask ? (
          <CreatedTaskBanner
            title={taskDisplayTitle(createdTask.title, createdTask.templateCode, i18n.language)}
            fieldName={fieldNames[createdTask.fieldId] || t('fieldWork.unknownField')}
            dateLabel={formatLongTaskDate(
              createdTask.scheduledFor || createdTask.plannedStart,
              i18n.language
            )}
            onView={() => openTask(createdTask)}
            onCreateAnother={() => openSchedule({ fieldId: createdTask.fieldId })}
            onUndo={() => void handleUndoCreated()}
          />
        ) : null}

        {!showSkeleton && view === 'done' ? (
          <HistoryTaskView
            tasks={tasks}
            fields={fields}
            fieldNames={fieldNames}
            personNames={personNames}
            year={year}
            busyId={busyId}
            onOpen={openTask}
            onComplete={(task) => void handleComplete(task)}
            onMenu={(task, action) => void handleMenu(task, action)}
            onOpenChronologio={() => openChronologioHome(navigation)}
          />
        ) : null}

        {!showSkeleton && view !== 'done' ? (
          <TodoNotebook
            mode={view}
            tasks={tasks}
            fields={fields}
            fieldNames={fieldNames}
            personNames={personNames}
            year={year}
            busyId={busyId}
            suggestions={view === 'today' ? suggestions : []}
            onOpen={openTask}
            onComplete={(task) => void handleComplete(task)}
            onMenu={(task, action) => void handleMenu(task, action)}
            onScheduleSuggestion={(suggestion) =>
              openSchedule({
                fieldId: suggestion.fieldId,
                templateCode: suggestion.templateCode,
                title: suggestion.title,
              })
            }
            onDismissSuggestion={(suggestion) => void handleDismissSuggestion(suggestion)}
          />
        ) : null}
      </ScrollView>

      <Sheet
        open={fieldPickerOpen}
        onClose={() => setFieldPickerOpen(false)}
        title={t('page.fieldFilter')}
        edge="bottom"
        size="sm"
      >
        <Pressable
          onPress={() => {
            setFieldFilter('');
            setFieldPickerOpen(false);
          }}
          style={[styles.pickerRow, { minHeight: tapMin }]}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: fieldFilter ? '500' : '700' }}>
            {t('page.allFields')}
          </Text>
        </Pressable>
        {fields.map((field) => (
          <Pressable
            key={field.id}
            onPress={() => {
              setFieldFilter(field.id);
              setFieldPickerOpen(false);
            }}
            style={[styles.pickerRow, { minHeight: tapMin }]}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontWeight: fieldFilter === field.id ? '700' : '500',
              }}
            >
              {field.name}
            </Text>
          </Pressable>
        ))}
      </Sheet>

      <RescheduleTaskSheet
        task={rescheduleTask}
        open={Boolean(rescheduleTask)}
        busy={Boolean(rescheduleTask && busyId === rescheduleTask.id)}
        onClose={() => setRescheduleTask(null)}
        onConfirm={(start, end) => void handleReschedule(start, end)}
      />

      <ScheduleWorkSheet
        open={scheduleOpen}
        fields={fields}
        assigneeOptions={assigneeOptions}
        suggestions={suggestions}
        prefill={schedulePrefill}
        busy={scheduleBusy}
        error={scheduleError}
        onClose={closeSchedule}
        onSubmit={handleScheduleSubmit}
      />

      <CompletionFollowUpSheet
        task={followUpTask}
        open={Boolean(followUpTask)}
        busy={Boolean(followUpTask && busyId === followUpTask.id)}
        error={followUpError}
        onClose={() => setFollowUpTask(null)}
        onDone={() => setFollowUpTask(null)}
        onSaveDetails={(payload) => void handleSaveCompletionDetails(payload)}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'], gap: spacing.md },
  fieldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  errorBox: { borderRadius: radii.md, padding: spacing.md },
  undoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  pickerRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  skeleton: { gap: spacing.sm, marginTop: 4 },
  skeletonSection: { height: 18, width: '36%', borderRadius: 8 },
  skeletonCard: { height: 78, borderRadius: radii.xl },
});

export default TaskListScreen;
