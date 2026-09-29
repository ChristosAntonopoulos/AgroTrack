import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import LoadingSpinner from '../components/LoadingSpinner';
import TaskViewTabs from '../components/tasks/TaskViewTabs';
import TaskContextBar from '../components/tasks/TaskContextBar';
import TodoNotebook from '../components/tasks/TodoNotebook';
import HistoryTaskView from '../components/tasks/HistoryTaskView';
import CreatedTaskBanner from '../components/tasks/CreatedTaskBanner';
import WorkSetupBanner from '../components/fields/WorkSetupBanner';
import LearningPromptSheet from '../components/tasks/LearningPromptSheet';
import ScheduleGroupSheet from '../components/tasks/ScheduleGroupSheet';
import RescheduleTaskSheet from '../components/tasks/RescheduleTaskSheet';
import type { NotebookMenuAction } from '../components/tasks/TaskNotebookCard';
import type { ProposalDismissChoice } from '../components/tasks/TaskProposalList';
import { spacing, radii } from '../theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { openChronologioHome } from '../navigation/intents';
import {
  getFieldService,
  getFieldWorkService,
  getPartnerService,
} from '../services/serviceFactory';
import {
  dismissWorkSetupBanner,
  isWorkSetupBannerDismissed,
  readWorkProfileDraft,
} from '../utils/fieldWorkProfileDraft';
import { fieldPeopleService } from '../services/fieldPeopleService';
import type { DismissalLearningChoice, FieldTask, TaskProposal } from '../services/fieldWorkService';
import type { Field } from '../services/fieldService';
import { athensCalendarYear } from '../utils/athensDate';
import { dedupeTaskProposals } from '../utils/taskProposalDedup';
import type { ProposalTemplateGroup } from '../utils/proposalPresentation';
import {
  parseTaskAssigneeId,
  parseTaskFieldId,
  parseTaskView,
  parseTaskYear,
  viewFromLegacyFilter,
  type TaskPageView,
} from '../utils/taskViewState';
import { formatLongTaskDate } from '../utils/taskFormDates';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import { notebookStatus, type NotebookAction } from '../utils/taskNotebook';

type Route = RouteProp<MainTabParamList, 'Tasks'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const OPEN_STATUSES = new Set(['planned', 'ready', 'blocked', 'in_progress']);
const HISTORY_STATUSES = new Set(['completed', 'cancelled', 'skipped']);

type DismissalLearningPrompt = {
  fieldId: string;
  templateCode: string;
  message: string;
};

const TaskListScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const { t, i18n } = useTranslation(['tasks', 'common']);
  const { setShowingCachedData } = useOfflineMode();

  const defaultYear = athensCalendarYear(new Date());
  const [view, setView] = useState<TaskPageView>(() =>
    parseTaskView(route.params?.view || viewFromLegacyFilter(route.params?.filter))
  );
  const [yearFilter, setYearFilter] = useState(() => parseTaskYear(route.params?.year, defaultYear));
  const [fieldFilter, setFieldFilter] = useState(() => parseTaskFieldId(route.params?.fieldId));
  const [assigneeFilter, setAssigneeFilter] = useState(() => parseTaskAssigneeId(undefined));
  const [createdId, setCreatedId] = useState(route.params?.created || '');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'mine' | 'everyone'>('everyone');

  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [personNames, setPersonNames] = useState<Record<string, string>>({});
  const [dismissalPrompt, setDismissalPrompt] = useState<DismissalLearningPrompt | null>(null);
  const [learningBusy, setLearningBusy] = useState(false);
  const [rescheduleTask, setRescheduleTask] = useState<FieldTask | null>(null);
  const [scheduleGroup, setScheduleGroup] = useState<ProposalTemplateGroup | null>(null);
  const [undoStartIds, setUndoStartIds] = useState<string[]>([]);
  const [workSetup, setWorkSetup] = useState<{ resume: boolean } | null>(null);

  useEffect(() => {
    if (route.params?.view || route.params?.filter) {
      setView(parseTaskView(route.params?.view || viewFromLegacyFilter(route.params?.filter)));
    }
    if (route.params?.year) setYearFilter(parseTaskYear(route.params.year, defaultYear));
    if (route.params?.fieldId !== undefined) setFieldFilter(parseTaskFieldId(route.params.fieldId));
    if (route.params?.created) setCreatedId(route.params.created);
  }, [route.params, defaultYear]);

  useEffect(() => {
    if (!fieldFilter) {
      setWorkSetup(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (await isWorkSetupBannerDismissed(fieldFilter)) {
        if (!cancelled) setWorkSetup(null);
        return;
      }
      try {
        const [profile, draft] = await Promise.all([
          getFieldWorkService().getWorkProfile(fieldFilter).catch(() => null),
          readWorkProfileDraft(fieldFilter),
        ]);
        if (cancelled) return;
        const resume = profile?.status === 'draft' || Boolean(draft?.stepId);
        if (profile == null || profile.status === 'draft') setWorkSetup({ resume });
        else setWorkSetup(null);
      } catch {
        if (!cancelled) setWorkSetup(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldFilter]);

  const fieldNames = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.id, field.name])),
    [fields]
  );

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const fw = getFieldWorkService();
      const [fieldsData, proposalsData, tasksData] = await Promise.all([
        getFieldService()
          .getFields(user?.id ?? '', user?.role ?? 'FieldOwner')
          .catch(() => [] as Field[]),
        fw.listProposals({ resultYear: yearFilter }),
        fw.listFieldTasks({ resultYear: yearFilter }),
      ]);
      setFields(fieldsData);
      setProposals(dedupeTaskProposals(proposalsData));
      setTasks(tasksData);
      setShowingCachedData(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('tasks:failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [yearFilter, user?.id, user?.role, setShowingCachedData, t]);

  useEffect(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  const { refreshing, onRefresh } = useRefresh(loadData);

  const matchesAssignee = useCallback(
    (task: FieldTask) => {
      if (!assigneeFilter) return true;
      if (assigneeFilter.startsWith('user:')) return task.assignedUserId === assigneeFilter.slice(5);
      if (assigneeFilter.startsWith('contact:')) {
        return task.assignedCollaboratorId === assigneeFilter.slice(8);
      }
      return (
        task.assignedUserId === assigneeFilter ||
        task.assignedCollaboratorId === assigneeFilter ||
        task.responsibleUserId === assigneeFilter
      );
    },
    [assigneeFilter]
  );

  const matchesScope = useCallback(
    (task: FieldTask) => {
      if (scope !== 'mine' || !user?.id) return true;
      return (
        task.assignedUserId === user.id ||
        task.responsibleUserId === user.id ||
        task.createdByUserId === user.id
      );
    },
    [scope, user?.id]
  );

  const matchesQuery = useCallback(
    (task: FieldTask) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const title = taskDisplayTitle(task.title, task.templateCode, i18n.language).toLowerCase();
      const field = (fieldNames[task.fieldId] || '').toLowerCase();
      return title.includes(q) || field.includes(q);
    },
    [fieldNames, i18n.language, query]
  );

  const visibleProposals = useMemo(
    () =>
      proposals.filter((proposal) => {
        if (fieldFilter && proposal.fieldId !== fieldFilter) return false;
        return proposal.status === 'active' || proposal.status === 'snoozed';
      }),
    [proposals, fieldFilter]
  );

  const openTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (fieldFilter && task.fieldId !== fieldFilter) return false;
        if (!matchesAssignee(task)) return false;
        if (!matchesScope(task)) return false;
        if (!matchesQuery(task)) return false;
        return OPEN_STATUSES.has(String(task.status).toLowerCase());
      }),
    [tasks, fieldFilter, matchesAssignee, matchesQuery, matchesScope]
  );

  const historyTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (fieldFilter && task.fieldId !== fieldFilter) return false;
        if (!matchesAssignee(task)) return false;
        if (!matchesScope(task)) return false;
        if (!matchesQuery(task)) return false;
        return HISTORY_STATUSES.has(String(task.status).toLowerCase());
      }),
    [tasks, fieldFilter, matchesAssignee, matchesQuery, matchesScope]
  );

  const peopleFieldKey = useMemo(
    () =>
      [...new Set([...openTasks, ...historyTasks].map((task) => task.fieldId).filter(Boolean))]
        .sort()
        .join(','),
    [openTasks, historyTasks]
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

  const assignees = useMemo(() => {
    const options: Array<{ id: string; name: string }> = [];
    const seen = new Set<string>();
    Object.entries(personNames).forEach(([id, name]) => {
      if (seen.has(id)) return;
      seen.add(id);
      options.push({ id, name });
    });
    return options.sort((a, b) => a.name.localeCompare(b.name, i18n.language));
  }, [personNames, i18n.language]);

  const openTask = (task: FieldTask) => navigation.navigate('TaskDetail', { taskId: task.id });

  const handleStart = async (task: FieldTask) => {
    const peers = task.workGroupId
      ? tasks.filter(
          (item) => item.workGroupId === task.workGroupId && notebookStatus(item.status) === 'todo'
        )
      : [];
    const targets = peers.length > 0 ? peers : [task];
    try {
      setBusyId(task.id);
      const fw = getFieldWorkService();
      for (const item of targets) {
        await fw.startFieldTask(item.id);
      }
      const startedIds = targets.map((item) => item.id);
      setUndoStartIds(startedIds);
      setTimeout(
        () => setUndoStartIds((current) => (current[0] === startedIds[0] ? [] : current)),
        8000
      );
      navigation.navigate('TaskDetail', { taskId: task.id });
    } catch {
      setError(t('fieldWork.errors.start'));
    } finally {
      setBusyId(null);
    }
  };

  const handleUndoStart = async () => {
    if (undoStartIds.length === 0) return;
    try {
      setBusyId(undoStartIds[0]);
      const fw = getFieldWorkService();
      for (const id of undoStartIds) {
        await fw.undoStartFieldTask(id);
      }
      setUndoStartIds([]);
      await loadData();
    } catch {
      setError(t('fieldWork.errors.undoStart'));
    } finally {
      setBusyId(null);
    }
  };

  const handlePrimary = async (task: FieldTask, action: NotebookAction) => {
    if (action === 'start') {
      await handleStart(task);
      return;
    }
    if (action === 'resolve') {
      try {
        setBusyId(task.id);
        await getFieldWorkService().resolveFieldTask(task.id);
        await loadData();
      } catch {
        setError(t('fieldWork.errors.start'));
      } finally {
        setBusyId(null);
      }
      return;
    }
    openTask(task);
  };

  const handleMenu = async (task: FieldTask, action: NotebookMenuAction) => {
    if (action === 'reschedule') {
      setRescheduleTask(task);
      return;
    }
    try {
      setBusyId(task.id);
      const fw = getFieldWorkService();
      if (action === 'block') await fw.blockFieldTask(task.id);
      else if (action === 'skip') await fw.skipFieldTask(task.id);
      else if (action === 'cancel') await fw.cancelFieldTask(task.id);
      else if (action === 'reopen') await fw.reopenFieldTask(task.id);
      await loadData();
    } catch {
      setError(t('fieldWork.errors.cancel'));
    } finally {
      setBusyId(null);
    }
  };

  const handleReschedule = async (plannedStart: string, plannedEnd?: string) => {
    if (!rescheduleTask) return;
    try {
      setBusyId(rescheduleTask.id);
      await getFieldWorkService().rescheduleFieldTask(rescheduleTask.id, {
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

  const handleScheduleGroup = async (payload: {
    proposalIds: string[];
    datesByProposalId: Record<string, string>;
  }) => {
    try {
      setBusyId(payload.proposalIds[0] || 'group');
      const fw = getFieldWorkService();
      let lastId = '';
      for (const proposalId of payload.proposalIds) {
        const date = payload.datesByProposalId[proposalId];
        const result = await fw.acceptProposal(proposalId, {
          plannedStart: date || undefined,
          plannedEnd: date || undefined,
        });
        lastId = result.acceptedTaskId || lastId;
      }
      setScheduleGroup(null);
      await loadData();
      setView('todo');
      if (lastId) setCreatedId(lastId);
    } catch {
      setError(t('fieldWork.errors.schedule'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDismissChoice = async (group: ProposalTemplateGroup, choice: ProposalDismissChoice) => {
    try {
      setBusyId(group.proposals[0]?.id || null);
      const fw = getFieldWorkService();
      for (const proposal of group.proposals) {
        if (choice === 'remind_later') {
          await fw.snoozeProposal(proposal.id);
        } else if (choice === 'already_done') {
          await fw.dismissProposal(proposal.id, 'dismiss_for_year');
        } else {
          await fw.dismissProposal(proposal.id, 'not_for_this_field');
          try {
            const evalResult = await fw.evaluateDismissalLearning(
              proposal.fieldId,
              proposal.templateCode
            );
            if (evalResult.shouldPrompt) {
              setDismissalPrompt({
                fieldId: proposal.fieldId,
                templateCode: proposal.templateCode,
                message:
                  evalResult.promptMessage || t('fieldWork.profile.learning.dismissalMessage'),
              });
            }
          } catch {
            /* optional */
          }
        }
      }
      await loadData();
    } catch {
      setError(t('fieldWork.errors.dismiss'));
    } finally {
      setBusyId(null);
    }
  };

  const applyDismissalLearning = async (choice: DismissalLearningChoice) => {
    if (!dismissalPrompt) return;
    try {
      setLearningBusy(true);
      await getFieldWorkService().applyDismissalLearning(
        dismissalPrompt.fieldId,
        dismissalPrompt.templateCode,
        choice
      );
      setDismissalPrompt(null);
    } catch {
      setError(t('fieldWork.profile.learning.applyFailed'));
    } finally {
      setLearningBusy(false);
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
      await getFieldWorkService().cancelFieldTask(createdId);
      setCreatedId('');
      await loadData();
    } catch {
      setError(t('fieldWork.form.failedSave'));
    } finally {
      setBusyId(null);
    }
  };

  const years = useMemo(() => [defaultYear - 1, defaultYear, defaultYear + 1], [defaultYear]);
  const handleCreate = () => navigation.navigate('CreateTask', { fieldId: fieldFilter || undefined });

  if (loading && tasks.length === 0 && proposals.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

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
          title={t('fieldWork.pageTitle')}
          subtitle={t('fieldWork.pageSubtitle')}
          action={
            <HeaderIconButton
              icon="add"
              accessibilityLabel={t('fieldWork.addTask')}
              onPress={handleCreate}
              active
            />
          }
        />

        <TaskViewTabs
          activeView={view}
          onChange={setView}
          views={[
            { id: 'todo', label: t('notebook.tabs.todo'), count: openTasks.length },
            { id: 'done', label: t('notebook.tabs.done'), count: historyTasks.length },
          ]}
        />

        <View style={styles.toolbar}>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                minHeight: Math.max(46, tapMin * 0.92),
                flex: 1,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('notebook.search')}
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel={t('notebook.search')}
              style={[
                styles.search,
                {
                  color: colors.textPrimary,
                  fontSize: 15 * fontScaleMultiplier,
                },
              ]}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel={t('common:clear', { defaultValue: 'Clear' })}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </Pressable>
            ) : null}
          </View>
          <View
            style={[styles.scope, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }]}
            accessibilityRole="tablist"
            accessibilityLabel={t('notebook.scope')}
          >
            {(['mine', 'everyone'] as const).map((id) => {
              const selected = scope === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setScope(id)}
                  style={[
                    styles.scopeBtn,
                    {
                      minHeight: Math.max(36, tapMin * 0.75),
                      backgroundColor: selected ? colors.primaryLight : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selected ? colors.primary : colors.textSecondary,
                      fontWeight: selected ? '700' : '500',
                      fontSize: 13 * fontScaleMultiplier,
                    }}
                  >
                    {t(`notebook.${id}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TaskContextBar
          yearLabel={t('fieldWork.year')}
          year={yearFilter}
          years={years}
          defaultYear={defaultYear}
          fieldLabel={t('fieldFilterLabel')}
          allFieldsLabel={t('fieldWork.allFields')}
          fieldId={fieldFilter}
          fields={fields}
          moreFiltersLabel={t('fieldWork.moreFilters')}
          assigneeLabel={t('fieldWork.allAssigneesLabel')}
          allAssigneesLabel={t('fieldWork.allAssignees')}
          assigneeId={assigneeFilter}
          assignees={assignees}
          onYearChange={setYearFilter}
          onFieldChange={setFieldFilter}
          onAssigneeChange={setAssigneeFilter}
          clearYearLabel={t('fieldWork.context.clearYear')}
          clearFieldLabel={t('fieldWork.context.clearField')}
          clearAssigneeLabel={t('fieldWork.context.clearAssignee')}
        />

        {fieldFilter && workSetup ? (
          <WorkSetupBanner
            fieldId={fieldFilter}
            resume={workSetup.resume}
            onDismiss={() => {
              void dismissWorkSetupBanner(fieldFilter);
              setWorkSetup(null);
            }}
          />
        ) : null}

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
            <Text style={{ color: colors.error }}>{error}</Text>
          </View>
        ) : null}

        {undoStartIds.length > 0 ? (
          <View style={[styles.undoBanner, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}>
            <Ionicons name="play-circle-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.textPrimary, flex: 1, fontWeight: '600' }}>
              {t('fieldWork.undoStart.message')}
            </Text>
            <Pressable onPress={() => void handleUndoStart()}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {t('fieldWork.undoStart.action')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {createdTask ? (
          <CreatedTaskBanner
            title={taskDisplayTitle(createdTask.title, createdTask.templateCode, i18n.language)}
            fieldName={fieldNames[createdTask.fieldId] || t('fieldWork.unknownField')}
            dateLabel={formatLongTaskDate(createdTask.plannedStart, i18n.language)}
            onView={() => openTask(createdTask)}
            onCreateAnother={handleCreate}
            onUndo={() => void handleUndoCreated()}
          />
        ) : null}

        {view === 'todo' ? (
          <TodoNotebook
            tasks={openTasks}
            fields={fields}
            fieldNames={fieldNames}
            personNames={personNames}
            year={yearFilter}
            busyId={busyId}
            proposals={visibleProposals}
            onOpen={openTask}
            onPrimary={(task, action) => void handlePrimary(task, action)}
            onMenu={(task, action) => void handleMenu(task, action)}
            onScheduleGroup={setScheduleGroup}
            onDismissChoice={(group, choice) => void handleDismissChoice(group, choice)}
          />
        ) : (
          <HistoryTaskView
            tasks={historyTasks}
            fields={fields}
            fieldNames={fieldNames}
            personNames={personNames}
            year={yearFilter}
            busyId={busyId}
            onOpen={openTask}
            onPrimary={(task, action) => void handlePrimary(task, action)}
            onMenu={(task, action) => void handleMenu(task, action)}
            onOpenChronologio={() => openChronologioHome(navigation)}
          />
        )}
      </ScrollView>

      <RescheduleTaskSheet
        task={rescheduleTask}
        open={Boolean(rescheduleTask)}
        busy={Boolean(rescheduleTask && busyId === rescheduleTask.id)}
        onClose={() => setRescheduleTask(null)}
        onConfirm={(start, end) => void handleReschedule(start, end)}
      />

      <ScheduleGroupSheet
        group={scheduleGroup}
        fieldNames={fieldNames}
        open={Boolean(scheduleGroup)}
        busy={Boolean(busyId)}
        onClose={() => setScheduleGroup(null)}
        onConfirm={(payload) => void handleScheduleGroup(payload)}
      />

      <LearningPromptSheet
        open={Boolean(dismissalPrompt)}
        title={t('fieldWork.profile.learning.dismissalTitle')}
        message={dismissalPrompt?.message || ''}
        busy={learningBusy}
        onClose={() => setDismissalPrompt(null)}
        onAction={(actionId) => void applyDismissalLearning(actionId as DismissalLearningChoice)}
        actions={[
          {
            id: 'dont_propose',
            label: t('fieldWork.profile.learning.dontPropose'),
            variant: 'caution',
          },
          { id: 'ask_when_indicated', label: t('fieldWork.profile.learning.askWhenIndicated') },
          {
            id: 'keep_proposing',
            label: t('fieldWork.profile.learning.keepProposing'),
          },
        ]}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'], gap: spacing.md },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    minWidth: 160,
  },
  search: {
    flex: 1,
    paddingVertical: 10,
  },
  scope: {
    flexDirection: 'row',
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 2,
    flexShrink: 0,
  },
  scopeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    paddingHorizontal: 12,
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
});

export default TaskListScreen;
