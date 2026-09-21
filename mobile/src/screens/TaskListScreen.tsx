import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Sheet from '../components/ui/Sheet';
import Button from '../components/ui/Button';
import TaskViewTabs from '../components/tasks/TaskViewTabs';
import TaskContextBar from '../components/tasks/TaskContextBar';
import TaskSeasonStrip from '../components/tasks/TaskSeasonStrip';
import TaskWorkCard from '../components/tasks/TaskWorkCard';
import GroupedProposalCard from '../components/tasks/GroupedProposalCard';
import CreatedTaskBanner from '../components/tasks/CreatedTaskBanner';
import LearningPromptSheet from '../components/tasks/LearningPromptSheet';
import { TaskHelpText } from '../components/tasks/TaskChoiceChips';
import { typography, spacing, radii } from '../theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { openChronologioHome } from '../navigation/intents';
import {
  getFieldService,
  getFieldWorkService,
  getPartnerService,
} from '../services/serviceFactory';
import { fieldPeopleService } from '../services/fieldPeopleService';
import type {
  DismissalLearningChoice,
  FieldTask,
  TaskProposal,
} from '../services/fieldWorkService';
import type { Field } from '../services/fieldService';
import { athensCalendarYear } from '../utils/athensDate';
import { dedupeTaskProposals } from '../utils/taskProposalDedup';
import {
  groupProposalsByTemplate,
  proposalExplanation,
  sectionProposalGroups,
  stashProposalForSchedule,
} from '../utils/proposalPresentation';
import {
  parseTaskFieldId,
  parseTaskView,
  parseTaskYear,
  viewFromLegacyFilter,
  type TaskPageView,
} from '../utils/taskViewState';
import { resolveTaskPerson } from '../utils/plannedTaskGroups';
import { formatLongTaskDate } from '../utils/taskFormDates';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import { farmerSeasonFor } from '../utils/farmerSeason';
import { buildNowBuckets, countNowAttention } from '../utils/nowAttention';
import { groupUpcomingTasks } from '../utils/upcomingTaskGroups';
import { isTaskDueToday } from '../utils/taskListUtils';
import { resolveWeatherKind } from '../utils/taskWeather';

type Route = RouteProp<MainTabParamList, 'Tasks'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const OPEN_STATUSES = new Set(['planned', 'ready', 'blocked', 'in_progress']);
const HISTORY_STATUSES = new Set(['completed', 'cancelled']);
const PAUSE_REASONS = ['weather', 'waitingPerson', 'waitingEquipment', 'anotherDay', 'other'] as const;

const TaskListScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const { colors, fontScaleMultiplier } = useTheme();
  const { t, i18n } = useTranslation(['tasks', 'common']);
  const { setShowingCachedData } = useOfflineMode();

  const defaultYear = athensCalendarYear(new Date());
  const [view, setView] = useState<TaskPageView>(() =>
    parseTaskView(route.params?.view || viewFromLegacyFilter(route.params?.filter))
  );
  const [yearFilter, setYearFilter] = useState(() => parseTaskYear(route.params?.year, defaultYear));
  const [fieldFilter, setFieldFilter] = useState(() => parseTaskFieldId(route.params?.fieldId));
  const [createdId, setCreatedId] = useState(route.params?.created || '');

  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [personNames, setPersonNames] = useState<Record<string, string>>({});
  const [dismissalPrompt, setDismissalPrompt] = useState<{
    fieldId: string;
    templateCode: string;
    message: string;
  } | null>(null);
  const [learningBusy, setLearningBusy] = useState(false);
  const [pauseTask, setPauseTask] = useState<FieldTask | null>(null);
  const [dismissGroup, setDismissGroup] = useState<{
    proposals: TaskProposal[];
  } | null>(null);
  const [whyText, setWhyText] = useState<string | null>(null);
  const [undoStartId, setUndoStartId] = useState<string | null>(null);
  const [laterYearOpen, setLaterYearOpen] = useState(false);

  useEffect(() => {
    if (route.params?.view || route.params?.filter) {
      setView(parseTaskView(route.params?.view || viewFromLegacyFilter(route.params?.filter)));
    }
    if (route.params?.year) setYearFilter(parseTaskYear(route.params.year, defaultYear));
    if (route.params?.fieldId !== undefined) setFieldFilter(parseTaskFieldId(route.params.fieldId));
    if (route.params?.created) setCreatedId(route.params.created);
  }, [route.params, defaultYear]);

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
      setError(
        err instanceof Error
          ? err.message
          : t('tasks:failedLoad', { defaultValue: 'Failed to load tasks' })
      );
    } finally {
      setLoading(false);
    }
  }, [yearFilter, user?.id, user?.role, setShowingCachedData, t]);

  useEffect(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  const { refreshing, onRefresh } = useRefresh(loadData);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => !fieldFilter || task.fieldId === fieldFilter),
    [tasks, fieldFilter]
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
    () => filteredTasks.filter((task) => OPEN_STATUSES.has(String(task.status).toLowerCase())),
    [filteredTasks]
  );

  const historyTasks = useMemo(
    () =>
      filteredTasks
        .filter((task) => HISTORY_STATUSES.has(String(task.status).toLowerCase()))
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))),
    [filteredTasks]
  );

  const nowBuckets = useMemo(() => buildNowBuckets(openTasks), [openTasks]);
  const upcomingGroups = useMemo(() => groupUpcomingTasks(openTasks), [openTasks]);
  const attentionCount = useMemo(() => countNowAttention(openTasks), [openTasks]);
  const suitableToday = useMemo(
    () =>
      openTasks.filter((task) => {
        if (!isTaskDueToday(task)) return false;
        const kind = resolveWeatherKind(task.weatherSuitability);
        return kind === 'good' || kind === 'not_sensitive' || kind === 'unknown';
      }).length,
    [openTasks]
  );
  const season = useMemo(() => farmerSeasonFor(new Date()), []);
  const proposalGroups = useMemo(
    () => sectionProposalGroups(groupProposalsByTemplate(visibleProposals)),
    [visibleProposals]
  );
  const upcomingCount = useMemo(
    () => upcomingGroups.reduce((sum, group) => sum + group.tasks.length, 0),
    [upcomingGroups]
  );

  const peopleFieldKey = useMemo(
    () => [...new Set(openTasks.map((task) => task.fieldId).filter(Boolean))].sort().join(','),
    [openTasks]
  );

  useEffect(() => {
    if ((view !== 'now' && view !== 'upcoming' && view !== 'history') || !peopleFieldKey) return;
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
  }, [view, peopleFieldKey]);

  const handleScheduleGroup = (proposalsInGroup: TaskProposal[]) => {
    const first = proposalsInGroup[0];
    if (!first) return;
    stashProposalForSchedule(first);
    navigation.navigate('CreateTask', { fieldId: first.fieldId, proposalId: first.id });
  };

  const handleDismissDecision = async (
    proposalsInGroup: TaskProposal[],
    decision: 'not_for_this_field' | 'dismiss_for_year' | 'snooze'
  ) => {
    setDismissGroup(null);
    try {
      setBusyId(proposalsInGroup[0]?.id || 'group');
      const fw = getFieldWorkService();
      for (const proposal of proposalsInGroup) {
        if (decision === 'snooze') await fw.snoozeProposal(proposal.id);
        else await fw.dismissProposal(proposal.id, decision);
      }
      await loadData();
      const first = proposalsInGroup[0];
      if (first && decision !== 'snooze') {
        try {
          const evalResult = await fw.evaluateDismissalLearning(first.fieldId, first.templateCode);
          if (evalResult.shouldPrompt) {
            setDismissalPrompt({
              fieldId: first.fieldId,
              templateCode: first.templateCode,
              message: evalResult.promptMessage || t('fieldWork.profile.learning.dismissalMessage'),
            });
          }
        } catch {
          /* optional */
        }
      }
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
    () => openTasks.find((task) => task.id === createdId),
    [openTasks, createdId]
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

  const handleStart = async (task: FieldTask) => {
    try {
      setBusyId(task.id);
      await getFieldWorkService().startFieldTask(task.id);
      await loadData();
      setView('now');
      setUndoStartId(task.id);
      setTimeout(() => setUndoStartId((current) => (current === task.id ? null : current)), 8000);
    } catch {
      setError(t('fieldWork.errors.start'));
    } finally {
      setBusyId(null);
    }
  };

  const handleUndoStart = async () => {
    if (!undoStartId) return;
    try {
      setBusyId(undoStartId);
      await getFieldWorkService().undoStartFieldTask(undoStartId);
      setUndoStartId(null);
      await loadData();
    } catch {
      setError(t('fieldWork.errors.start'));
    } finally {
      setBusyId(null);
    }
  };

  const handlePause = async (reasonKey: (typeof PAUSE_REASONS)[number]) => {
    if (!pauseTask) return;
    try {
      setBusyId(pauseTask.id);
      await getFieldWorkService().pauseFieldTask(pauseTask.id, {
        reason: t(`fieldWork.pause.reasons.${reasonKey}`, { defaultValue: reasonKey }),
      });
      setPauseTask(null);
      await loadData();
    } catch {
      setError(t('fieldWork.errors.pause', { defaultValue: t('fieldWork.errors.start') }));
    } finally {
      setBusyId(null);
    }
  };

  const handleResume = async (task: FieldTask) => {
    try {
      setBusyId(task.id);
      await getFieldWorkService().resumeFieldTask(task.id);
      await loadData();
    } catch {
      setError(t('fieldWork.errors.start'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (task: FieldTask) => {
    try {
      setBusyId(task.id);
      // Cancelled → open detail to re-plan; completed → create similar via form
      if (String(task.status).toLowerCase() === 'cancelled') {
        navigation.navigate('TaskDetail', { taskId: task.id });
      } else {
        navigation.navigate('CreateTask', { fieldId: task.fieldId });
      }
    } finally {
      setBusyId(null);
    }
  };

  const years = useMemo(() => [defaultYear - 1, defaultYear, defaultYear + 1], [defaultYear]);
  const openChronologio = () => openChronologioHome(navigation);
  const handleCreate = () => navigation.navigate('CreateTask', { fieldId: fieldFilter || undefined });

  const renderTaskCard = (
    task: FieldTask,
    opts: {
      primary: 'start' | 'continue' | 'open' | 'viewResult' | 'restore' | 'repeat';
      secondary?: 'reschedule' | 'pause' | null;
      attentionReasonId?: Parameters<typeof TaskWorkCard>[0]['attentionReasonId'];
      attentionParams?: Record<string, string | number>;
    }
  ) => (
    <TaskWorkCard
      key={task.id}
      task={task}
      fieldName={fieldNames[task.fieldId] || t('fieldWork.unknownField')}
      personName={resolveTaskPerson(task, personNames)}
      year={yearFilter}
      busy={busyId === task.id}
      highlighted={task.id === createdId}
      attentionReasonId={opts.attentionReasonId}
      attentionParams={opts.attentionParams}
      primaryAction={opts.primary}
      secondaryAction={opts.secondary}
      onPrimary={() => {
        if (opts.primary === 'start') void handleStart(task);
        else if (opts.primary === 'continue') {
          if (task.isPaused) void handleResume(task);
          else navigation.navigate('TaskDetail', { taskId: task.id });
        } else if (opts.primary === 'viewResult' || opts.primary === 'open') {
          navigation.navigate('TaskDetail', { taskId: task.id });
        } else void handleRestore(task);
      }}
      onSecondary={
        opts.secondary === 'pause'
          ? () => setPauseTask(task)
          : opts.secondary === 'reschedule'
            ? () => navigation.navigate('TaskDetail', { taskId: task.id })
            : undefined
      }
      onOpen={() => navigation.navigate('TaskDetail', { taskId: task.id })}
    />
  );

  if (loading && tasks.length === 0 && proposals.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  const nowEmpty =
    nowBuckets.attention.length === 0 &&
    nowBuckets.inProgress.length === 0 &&
    nowBuckets.today.length === 0 &&
    nowBuckets.thisWeekPreview.length === 0;

  return (
    <ScreenLayout style={styles.screen} tabBarInset>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
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

        <TaskSeasonStrip
          season={season}
          attentionCount={attentionCount}
          suitableTodayCount={suitableToday}
          onPress={openChronologio}
        />

        <TaskViewTabs
          activeView={view}
          onChange={setView}
          views={[
            { id: 'now', label: t('fieldWork.views.now'), count: attentionCount + nowBuckets.inProgress.length + nowBuckets.today.length },
            { id: 'upcoming', label: t('fieldWork.views.upcoming'), count: upcomingCount },
            { id: 'proposals', label: t('fieldWork.views.proposals'), count: visibleProposals.length },
            { id: 'history', label: t('fieldWork.views.history'), count: historyTasks.length },
          ]}
        />

        <View style={{ height: spacing.md }} />

        <TaskContextBar
          yearLabel={t('fieldWork.year')}
          year={yearFilter}
          years={years}
          defaultYear={defaultYear}
          fieldLabel={t('fieldFilterLabel')}
          allFieldsLabel={t('fieldWork.allFields')}
          fieldId={fieldFilter}
          fields={fields}
          moreFiltersLabel={t('fieldWork.moreFilters', { defaultValue: 'More filters' })}
          onYearChange={setYearFilter}
          onFieldChange={setFieldFilter}
          clearYearLabel={t('fieldWork.context.clearYear')}
          clearFieldLabel={t('fieldWork.context.clearField')}
        />

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
            <Text style={{ color: colors.error }}>{error}</Text>
          </View>
        ) : null}

        {undoStartId ? (
          <View style={[styles.undoBanner, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}>
            <Text style={{ color: colors.textPrimary, flex: 1, fontWeight: '600' }}>
              {t('fieldWork.task.startedToast', { defaultValue: 'Task started' })}
            </Text>
            <Pressable onPress={() => void handleUndoStart()}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('common:undo', { defaultValue: 'Undo' })}</Text>
            </Pressable>
          </View>
        ) : null}

        {view === 'now' ? (
          <View style={styles.panel}>
            {createdTask ? (
              <CreatedTaskBanner
                title={taskDisplayTitle(createdTask.title, createdTask.templateCode, i18n.language)}
                fieldName={fieldNames[createdTask.fieldId] || t('fieldWork.unknownField')}
                dateLabel={formatLongTaskDate(createdTask.plannedStart, i18n.language)}
                onView={() => navigation.navigate('TaskDetail', { taskId: createdTask.id })}
                onCreateAnother={handleCreate}
                onUndo={() => void handleUndoCreated()}
              />
            ) : null}

            {nowEmpty ? (
              <EmptyState
                icon={<Ionicons name="sunny-outline" size={36} color={colors.primary} />}
                title={t('fieldWork.empty.nowTitle')}
                description={
                  nowBuckets.nextUpcoming
                    ? t('fieldWork.empty.nowNext', {
                        title: taskDisplayTitle(
                          nowBuckets.nextUpcoming.title,
                          nowBuckets.nextUpcoming.templateCode,
                          i18n.language
                        ),
                        date: formatLongTaskDate(nowBuckets.nextUpcoming.plannedStart, i18n.language),
                      })
                    : t('fieldWork.empty.nowDescription')
                }
                action={{
                  label: t('fieldWork.empty.seeUpcoming'),
                  onPress: () => setView('upcoming'),
                }}
              />
            ) : (
              <>
                {nowBuckets.attention.length > 0 ? (
                  <>
                    <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                      {t('fieldWork.nowSections.attention')}
                    </Text>
                    {nowBuckets.attention.map((item) =>
                      renderTaskCard(item.task, {
                        primary: item.task.isPaused
                          ? 'continue'
                          : String(item.task.status).toLowerCase() === 'in_progress'
                            ? 'continue'
                            : 'start',
                        secondary: item.task.isPaused
                          ? 'reschedule'
                          : String(item.task.status).toLowerCase() === 'in_progress'
                            ? 'pause'
                            : 'reschedule',
                        attentionReasonId: item.reasonId,
                        attentionParams: item.params,
                      })
                    )}
                  </>
                ) : null}

                {nowBuckets.inProgress.length > 0 ? (
                  <>
                    <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                      {t('fieldWork.nowSections.inProgress')}
                    </Text>
                    {nowBuckets.inProgress.map((task) =>
                      renderTaskCard(task, { primary: 'continue', secondary: 'pause' })
                    )}
                  </>
                ) : null}

                {nowBuckets.today.length > 0 ? (
                  <>
                    <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                      {t('fieldWork.nowSections.today')}
                    </Text>
                    {nowBuckets.today.map((task) =>
                      renderTaskCard(task, { primary: 'start', secondary: 'reschedule' })
                    )}
                  </>
                ) : null}

                {nowBuckets.thisWeekPreview.length > 0 ? (
                  <>
                    <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                      {t('fieldWork.nowSections.thisWeek')}
                    </Text>
                    {nowBuckets.thisWeekPreview.map((task) =>
                      renderTaskCard(task, { primary: 'start', secondary: 'reschedule' })
                    )}
                    <Pressable onPress={() => setView('upcoming')} style={styles.chronoLink}>
                      <Text style={{ color: colors.link, fontWeight: '700' }}>
                        {t('fieldWork.nowSections.seeAllUpcoming')}
                      </Text>
                    </Pressable>
                  </>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        {view === 'upcoming' ? (
          <View style={styles.panel}>
            {upcomingCount === 0 ? (
              <EmptyState
                icon={<Ionicons name="calendar-outline" size={36} color={colors.primary} />}
                title={t('fieldWork.empty.upcomingTitle')}
                description={t('fieldWork.empty.upcomingDescription')}
                action={{ label: t('fieldWork.addTask'), onPress: handleCreate }}
              />
            ) : (
              upcomingGroups.map((group) => (
                <View key={group.id}>
                  <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                    {t('fieldWork.upcomingGroups.withCount', {
                      label: t(`fieldWork.upcomingGroups.${group.id}`),
                      count: group.tasks.length,
                    })}
                  </Text>
                  {group.tasks.map((task) =>
                    renderTaskCard(task, { primary: 'start', secondary: 'reschedule' })
                  )}
                </View>
              ))
            )}
          </View>
        ) : null}

        {view === 'proposals' ? (
          <View style={styles.panel}>
            <Text
              style={[styles.introTitle, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}
            >
              {t('fieldWork.proposalsIntro.title')}
            </Text>
            <TaskHelpText>{t('fieldWork.proposalsIntro.subtitle')}</TaskHelpText>
            {visibleProposals.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="sparkles-outline" size={36} color={colors.primary} />}
                title={t('fieldWork.empty.proposalsTitle')}
                description={t('fieldWork.empty.proposalsDescription')}
              />
            ) : (
              <>
                {(
                  [
                    ['doNow', proposalGroups.doNow],
                    ['canWait', proposalGroups.canWait],
                  ] as const
                ).map(([section, groups]) =>
                  groups.length > 0 ? (
                    <View key={section}>
                      <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                        {t(`fieldWork.proposalGroups.${section === 'doNow' ? 'doNow' : 'canWait'}`)}
                        {` · ${groups.length}`}
                      </Text>
                      {groups.map((group) => (
                        <GroupedProposalCard
                          key={group.key}
                          group={group}
                          fieldNames={fieldNames}
                          unknownField={t('fieldWork.unknownField')}
                          busy={busyId === group.proposals[0]?.id}
                          onSchedule={() => handleScheduleGroup(group.proposals)}
                          onDismiss={() => setDismissGroup({ proposals: group.proposals })}
                          onWhy={() =>
                            setWhyText(
                              group.proposals[0]
                                ? proposalExplanation(group.proposals[0], i18n.language)
                                : null
                            )
                          }
                        />
                      ))}
                    </View>
                  ) : null
                )}
                {proposalGroups.laterYear.length > 0 ? (
                  <View>
                    <Pressable
                      onPress={() => setLaterYearOpen((v) => !v)}
                      style={styles.laterToggle}
                    >
                      <Text style={[styles.groupLabel, { color: colors.textSecondary, marginTop: 0 }]}>
                        {t('fieldWork.proposalGroups.laterYear')} · {proposalGroups.laterYear.length}
                      </Text>
                      <Text style={{ color: colors.primary, fontWeight: '700' }}>
                        {laterYearOpen
                          ? t('fieldWork.proposal.hideLater')
                          : t('fieldWork.proposal.showLater')}
                      </Text>
                    </Pressable>
                    {laterYearOpen
                      ? proposalGroups.laterYear.map((group) => (
                          <GroupedProposalCard
                            key={group.key}
                            group={group}
                            fieldNames={fieldNames}
                            unknownField={t('fieldWork.unknownField')}
                            busy={busyId === group.proposals[0]?.id}
                            onSchedule={() => handleScheduleGroup(group.proposals)}
                            onDismiss={() => setDismissGroup({ proposals: group.proposals })}
                          />
                        ))
                      : null}
                  </View>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        {view === 'history' ? (
          <View style={styles.panel}>
            <View style={[styles.historyBanner, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}>
              <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
                {t('fieldWork.history.banner')}
              </Text>
              <Pressable onPress={openChronologio} style={{ marginTop: spacing.sm }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {t('fieldWork.history.openChronologio')}
                </Text>
              </Pressable>
            </View>
            {historyTasks.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="time-outline" size={36} color={colors.primary} />}
                title={t('fieldWork.empty.historyTitle')}
                description={t('fieldWork.empty.historyDescription')}
              />
            ) : (
              historyTasks.map((task) =>
                renderTaskCard(task, {
                  primary:
                    String(task.status).toLowerCase() === 'cancelled' ? 'restore' : 'viewResult',
                  secondary: null,
                })
              )
            )}
          </View>
        ) : null}
      </ScrollView>

      <Sheet
        open={Boolean(pauseTask)}
        onClose={() => setPauseTask(null)}
        title={t('fieldWork.pause.title', { defaultValue: 'Why pause?' })}
        edge="bottom"
        size="md"
      >
        <TaskHelpText>
          {t('fieldWork.pause.copy', { defaultValue: 'Choose why work is pausing temporarily.' })}
        </TaskHelpText>
        {PAUSE_REASONS.map((reason) => (
          <Button
            key={reason}
            title={t(`fieldWork.pause.reasons.${reason}`, { defaultValue: reason })}
            variant="outline"
            onPress={() => void handlePause(reason)}
            disabled={Boolean(busyId)}
          />
        ))}
      </Sheet>

      <Sheet
        open={Boolean(dismissGroup)}
        onClose={() => setDismissGroup(null)}
        title={t('fieldWork.dismiss.title', { defaultValue: 'Not relevant' })}
        edge="bottom"
        size="md"
      >
        <TaskHelpText>
          {t('fieldWork.dismiss.copy', { defaultValue: 'Choose what applies to this proposal.' })}
        </TaskHelpText>
        <Button
          title={t('fieldWork.dismiss.dontDo')}
          onPress={() =>
            dismissGroup && void handleDismissDecision(dismissGroup.proposals, 'not_for_this_field')
          }
        />
        <Button
          title={t('fieldWork.dismiss.alreadyDone')}
          variant="outline"
          onPress={() =>
            dismissGroup && void handleDismissDecision(dismissGroup.proposals, 'dismiss_for_year')
          }
        />
        <Button
          title={t('fieldWork.dismiss.remindLater')}
          variant="outline"
          onPress={() => dismissGroup && void handleDismissDecision(dismissGroup.proposals, 'snooze')}
        />
      </Sheet>

      <Sheet open={Boolean(whyText)} onClose={() => setWhyText(null)} title={t('fieldWork.proposal.why')} edge="bottom" size="sm">
        <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>{whyText}</Text>
      </Sheet>

      <LearningPromptSheet
        open={Boolean(dismissalPrompt)}
        title={t('fieldWork.profile.learning.dismissalTitle')}
        message={dismissalPrompt?.message || ''}
        busy={learningBusy}
        onClose={() => setDismissalPrompt(null)}
        onAction={(id) => void applyDismissalLearning(id as DismissalLearningChoice)}
        actions={[
          { id: 'dont_propose', label: t('fieldWork.profile.learning.dontPropose') },
          { id: 'ask_when_indicated', label: t('fieldWork.profile.learning.askWhenIndicated') },
          {
            id: 'keep_proposing',
            label: t('fieldWork.profile.learning.keepProposing'),
            variant: 'outline',
          },
        ]}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing['3xl'] },
  panel: { marginTop: spacing.lg, gap: spacing.sm },
  introTitle: { ...typography.styles.body, fontWeight: '700' },
  groupLabel: {
    ...typography.styles.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  errorBox: { borderRadius: 12, padding: spacing.md, marginTop: spacing.md },
  chronoLink: { paddingVertical: spacing.md, alignItems: 'center' },
  undoBanner: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyBanner: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  laterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
});

export default TaskListScreen;
