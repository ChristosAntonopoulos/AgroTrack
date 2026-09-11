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
import TaskViewTabs from '../components/tasks/TaskViewTabs';
import TaskContextBar from '../components/tasks/TaskContextBar';
import TaskProposalCard from '../components/tasks/TaskProposalCard';
import PlannedTaskRow from '../components/tasks/PlannedTaskRow';
import InProgressTaskRow from '../components/tasks/InProgressTaskRow';
import CreatedTaskBanner from '../components/tasks/CreatedTaskBanner';
import LearningPromptSheet from '../components/tasks/LearningPromptSheet';
import { TaskHelpText } from '../components/tasks/TaskChoiceChips';
import { typography, spacing } from '../theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import {
  getFieldService,
  getFieldWorkService,
  getPartnerService,
} from '../services/serviceFactory';
import { fieldPeopleService } from '../services/fieldPeopleService';
import { weatherService } from '../services/weatherService';
import type {
  DismissalLearningChoice,
  FieldTask,
  TaskProposal,
} from '../services/fieldWorkService';
import type { Field } from '../services/fieldService';
import type { FieldWeather } from '../services/geospatialService';
import { athensCalendarYear } from '../utils/athensDate';
import { dedupeTaskProposals } from '../utils/taskProposalDedup';
import { groupProposals, stashProposalForSchedule } from '../utils/proposalPresentation';
import {
  parseTaskFieldId,
  parseTaskView,
  parseTaskYear,
  viewFromLegacyFilter,
  type TaskPageView,
} from '../utils/taskViewState';
import { groupPlannedTasks, resolveTaskPerson } from '../utils/plannedTaskGroups';
import { formatLongTaskDate } from '../utils/taskFormDates';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';

type Route = RouteProp<MainTabParamList, 'Tasks'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const PLANNED_STATUSES = new Set(['planned', 'ready', 'blocked']);
const IN_PROGRESS_STATUSES = new Set(['in_progress']);
const FUTURE_WORK_STATUSES = new Set([...PLANNED_STATUSES, ...IN_PROGRESS_STATUSES]);

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
  const [weatherByField, setWeatherByField] = useState<Record<string, FieldWeather | null>>({});
  const [personNames, setPersonNames] = useState<Record<string, string>>({});
  const [dismissalPrompt, setDismissalPrompt] = useState<{
    fieldId: string;
    templateCode: string;
    message: string;
  } | null>(null);
  const [learningBusy, setLearningBusy] = useState(false);

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
      setError(err instanceof Error ? err.message : t('tasks:failedLoad', { defaultValue: 'Failed to load tasks' }));
    } finally {
      setLoading(false);
    }
  }, [yearFilter, user?.id, user?.role, setShowingCachedData, t]);

  useEffect(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  const { refreshing, onRefresh } = useRefresh(loadData);

  const visibleProposals = useMemo(
    () =>
      proposals.filter((proposal) => {
        if (fieldFilter && proposal.fieldId !== fieldFilter) return false;
        return proposal.status === 'active' || proposal.status === 'snoozed';
      }),
    [proposals, fieldFilter]
  );

  const weatherFieldKey = useMemo(
    () =>
      [...new Set(visibleProposals.map((proposal) => proposal.fieldId).filter(Boolean))]
        .sort()
        .join(','),
    [visibleProposals]
  );

  useEffect(() => {
    if (view !== 'proposals' || !weatherFieldKey) return;
    let cancelled = false;
    const ids = weatherFieldKey.split(',').filter(Boolean);
    void Promise.all(
      ids.map(async (fieldId) => {
        try {
          const weather = await weatherService.getFieldWeather(fieldId);
          return [fieldId, weather] as const;
        } catch {
          return [fieldId, null] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) setWeatherByField(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [view, weatherFieldKey]);

  const futureTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (fieldFilter && task.fieldId !== fieldFilter) return false;
        return FUTURE_WORK_STATUSES.has(String(task.status).toLowerCase());
      }),
    [tasks, fieldFilter]
  );

  const planned = useMemo(
    () => futureTasks.filter((task) => PLANNED_STATUSES.has(String(task.status).toLowerCase())),
    [futureTasks]
  );

  const inProgress = useMemo(
    () => futureTasks.filter((task) => IN_PROGRESS_STATUSES.has(String(task.status).toLowerCase())),
    [futureTasks]
  );

  const peopleFieldKey = useMemo(
    () => [...new Set(futureTasks.map((task) => task.fieldId).filter(Boolean))].sort().join(','),
    [futureTasks]
  );

  useEffect(() => {
    if ((view !== 'planned' && view !== 'active') || !peopleFieldKey) return;
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

  const handleSchedule = (proposal: TaskProposal) => {
    stashProposalForSchedule(proposal);
    navigation.navigate('CreateTask', { fieldId: proposal.fieldId, proposalId: proposal.id });
  };

  const handleLater = async (proposal: TaskProposal) => {
    try {
      setBusyId(proposal.id);
      await getFieldWorkService().snoozeProposal(proposal.id);
      await loadData();
    } catch {
      setError(t('fieldWork.errors.snooze'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (
    proposal: TaskProposal,
    decision: 'not_for_this_field' | 'dismiss_for_year'
  ) => {
    try {
      setBusyId(proposal.id);
      await getFieldWorkService().dismissProposal(proposal.id, decision);
      await loadData();
      try {
        const evalResult = await getFieldWorkService().evaluateDismissalLearning(
          proposal.fieldId,
          proposal.templateCode
        );
        if (evalResult.shouldPrompt) {
          setDismissalPrompt({
            fieldId: proposal.fieldId,
            templateCode: proposal.templateCode,
            message: evalResult.promptMessage || t('fieldWork.profile.learning.dismissalMessage'),
          });
        }
      } catch {
        /* optional */
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
    () => planned.find((task) => task.id === createdId),
    [planned, createdId]
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
      setView('active');
    } catch {
      setError(t('fieldWork.errors.start'));
    } finally {
      setBusyId(null);
    }
  };

  const years = useMemo(() => [defaultYear - 1, defaultYear, defaultYear + 1], [defaultYear]);
  const groupedProposals = useMemo(() => groupProposals(visibleProposals), [visibleProposals]);
  const plannedGroups = useMemo(() => groupPlannedTasks(planned), [planned]);

  const openChronologio = () => navigation.navigate('Chronologio', {});
  const handleCreate = () => navigation.navigate('CreateTask', { fieldId: fieldFilter || undefined });

  if (loading && tasks.length === 0 && proposals.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  const renderProposalList = (items: TaskProposal[]) =>
    items.map((proposal) => (
      <TaskProposalCard
        key={proposal.id}
        proposal={proposal}
        fieldName={fieldNames[proposal.fieldId] || t('fieldWork.unknownField')}
        weather={weatherByField[proposal.fieldId]}
        busy={busyId === proposal.id}
        onSchedule={() => handleSchedule(proposal)}
        onSnooze={() => void handleLater(proposal)}
        onDismiss={(decision) => void handleDismiss(proposal, decision)}
      />
    ));

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

        <TaskViewTabs
          activeView={view}
          onChange={setView}
          views={[
            { id: 'proposals', label: t('fieldWork.views.proposals'), count: visibleProposals.length },
            { id: 'planned', label: t('fieldWork.views.planned'), count: planned.length },
            { id: 'active', label: t('fieldWork.views.active'), count: inProgress.length },
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

        {view === 'proposals' ? (
          <View style={styles.panel}>
            <Text style={[styles.introTitle, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
              {t('fieldWork.proposalsIntro.title')}
            </Text>
            <TaskHelpText>{t('fieldWork.proposalsIntro.subtitle')}</TaskHelpText>
            {visibleProposals.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="sparkles-outline" size={36} color={colors.primary} />}
                title={t('fieldWork.empty.proposalsTitle')}
                description={t('fieldWork.empty.proposalsDescription')}
              />
            ) : groupedProposals.canWait.length > 0 ? (
              <>
                <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                  {t('fieldWork.proposalGroups.needsDecision')}
                </Text>
                {renderProposalList(groupedProposals.needsDecision)}
                <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                  {t('fieldWork.proposalGroups.canWait')}
                </Text>
                {renderProposalList(groupedProposals.canWait)}
              </>
            ) : (
              renderProposalList(groupedProposals.needsDecision)
            )}
          </View>
        ) : null}

        {view === 'planned' ? (
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
            {planned.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="calendar-outline" size={36} color={colors.primary} />}
                title={t('fieldWork.empty.plannedTitle')}
                description={t('fieldWork.empty.plannedDescription')}
                action={{ label: t('fieldWork.addTask'), onPress: handleCreate }}
              />
            ) : (
              plannedGroups.map((group) => (
                <View key={group.id}>
                  <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                    {t(`fieldWork.plannedGroups.${group.id}`)}
                  </Text>
                  {group.tasks.map((task) => (
                    <PlannedTaskRow
                      key={task.id}
                      task={task}
                      fieldName={fieldNames[task.fieldId] || t('fieldWork.unknownField')}
                      personName={resolveTaskPerson(task, personNames)}
                      year={yearFilter}
                      busy={busyId === task.id}
                      highlighted={task.id === createdId}
                      onStart={() => void handleStart(task)}
                      onOpen={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                    />
                  ))}
                </View>
              ))
            )}
            <Pressable onPress={openChronologio} style={styles.chronoLink}>
              <Text style={{ color: colors.link, fontWeight: '700' }}>
                {t('fieldWork.seeCompletedInChronologio')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {view === 'active' ? (
          <View style={styles.panel}>
            {inProgress.length === 0 ? (
              <EmptyState
                icon={<Ionicons name="play-circle-outline" size={36} color={colors.primary} />}
                title={t('fieldWork.empty.activeTitle')}
                description={t('fieldWork.empty.activeDescription')}
              />
            ) : (
              [...inProgress]
                .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
                .map((task) => (
                  <InProgressTaskRow
                    key={task.id}
                    task={task}
                    fieldName={fieldNames[task.fieldId] || t('fieldWork.unknownField')}
                    personName={resolveTaskPerson(task, personNames)}
                    year={yearFilter}
                    busy={busyId === task.id}
                    onContinue={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                  />
                ))
            )}
            <Pressable onPress={openChronologio} style={styles.chronoLink}>
              <Text style={{ color: colors.link, fontWeight: '700' }}>
                {t('fieldWork.seeCompletedInChronologio')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

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
});

export default TaskListScreen;
