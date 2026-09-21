import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useOfflineMode } from '../context/OfflineContext';
import { isDeviceOnline } from '../utils/networkStatus';
import { getFieldService, getFieldWorkService, getPartnerService } from '../services/serviceFactory';
import { fieldPeopleService } from '../services/fieldPeopleService';
import { weatherService } from '../services/weatherService';
import type { DismissalLearningChoice, FieldTask, TaskProposal } from '../services/fieldWorkService';
import type { Field } from '../services/fieldService';
import type { FieldWeather } from '../services/geospatialService';
import { getApiErrorMessage } from '../utils/translateApiError';
import { athensCalendarYear } from '../utils/athensDate';
import { dedupeTaskProposals } from '../utils/taskProposalDedup';
import type { ProposalTemplateGroup } from '../utils/proposalPresentation';
import { farmerSeasonFor } from '../utils/farmerSeason';
import { buildNowBuckets, countNowAttention } from '../utils/nowAttention';
import { isTaskDueToday } from '../utils/taskListUtils';
import { resolveWeatherKind } from '../utils/taskWeather';
import LearningPromptSheet from '../components/FieldWork/LearningPromptSheet';
import { useDrawerPresence } from '../hooks/useDrawerPresence';
import { useModulePageGuard } from '../hooks/useModulePageGuard';
import {
  buildTaskSearchParams,
  parseTaskAssigneeId,
  parseTaskFieldId,
  parseTaskView,
  parseTaskYear,
  readTaskListScroll,
  saveTaskListScroll,
  type TaskPageView,
} from '../utils/taskViewState';
import { readFieldId } from '../navigation/intents';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import TasksPageHeader from '../components/Tasks/TasksPageHeader';
import TaskViewTabs from '../components/Tasks/TaskViewTabs';
import TaskContextBar from '../components/Tasks/TaskContextBar';
import TaskSeasonStrip from '../components/Tasks/TaskSeasonStrip';
import TaskProposalList, { type ProposalDismissChoice } from '../components/Tasks/TaskProposalList';
import NowTaskView from '../components/Tasks/NowTaskView';
import UpcomingTaskView from '../components/Tasks/UpcomingTaskView';
import HistoryTaskView from '../components/Tasks/HistoryTaskView';
import CreatedTaskBanner from '../components/Tasks/CreatedTaskBanner';
import PauseTaskSheet, { type PauseReason } from '../components/Tasks/PauseTaskSheet';
import RescheduleTaskSheet from '../components/Tasks/RescheduleTaskSheet';
import ScheduleGroupSheet from '../components/Tasks/ScheduleGroupSheet';
import TaskDetailDrawer from '../components/Tasks/TaskDetailDrawer';
import { formatLongTaskDate } from '../utils/taskFormDates';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import '../components/Tasks/TasksShell.css';

const PLANNED_STATUSES = new Set(['planned', 'ready', 'blocked']);
const IN_PROGRESS_STATUSES = new Set(['in_progress']);
const OPEN_STATUSES = new Set([...PLANNED_STATUSES, ...IN_PROGRESS_STATUSES]);
const HISTORY_STATUSES = new Set(['completed', 'cancelled']);

type DismissalLearningPrompt = {
  fieldId: string;
  templateCode: string;
  message: string;
};

const TasksPage: React.FC = () => {
  const { t, i18n } = useTranslation(['tasks', 'common', 'errors']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();
  const pageGuard = useModulePageGuard({ module: 'tasks' });

  const defaultYear = athensCalendarYear(new Date());
  const view = parseTaskView(searchParams.get('view'));
  const yearFilter = parseTaskYear(searchParams.get('year'), defaultYear);
  const fieldFilter = parseTaskFieldId(readFieldId(searchParams));
  const assigneeFilter = parseTaskAssigneeId(searchParams.get('assignee'));
  const createdId = searchParams.get('created') || '';
  const selectedTaskId = searchParams.get('task') || '';

  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [weatherByField, setWeatherByField] = useState<Record<string, FieldWeather | null>>({});
  const [personNames, setPersonNames] = useState<Record<string, string>>({});
  const [dismissalPrompt, setDismissalPrompt] = useState<DismissalLearningPrompt | null>(null);
  const dismissalDrawer = useDrawerPresence(dismissalPrompt);
  const [learningBusy, setLearningBusy] = useState(false);
  const [undoStartId, setUndoStartId] = useState<string | null>(null);
  const [pauseTask, setPauseTask] = useState<FieldTask | null>(null);
  const [rescheduleTask, setRescheduleTask] = useState<FieldTask | null>(null);
  const [scheduleGroup, setScheduleGroup] = useState<ProposalTemplateGroup | null>(null);

  const fieldNames = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.id, field.name])),
    [fields]
  );

  const writeParams = useCallback(
    (next: {
      view?: TaskPageView;
      year?: number;
      fieldId?: string;
      assigneeId?: string;
      taskId?: string | null;
    }) => {
      const params = buildTaskSearchParams({
        view: next.view ?? view,
        year: next.year ?? yearFilter,
        defaultYear,
        fieldId: next.fieldId !== undefined ? next.fieldId : fieldFilter,
        assigneeId: next.assigneeId !== undefined ? next.assigneeId : assigneeFilter,
        taskId: next.taskId === null ? undefined : next.taskId !== undefined ? next.taskId : selectedTaskId || undefined,
      });
      if (createdId && next.view === undefined) params.set('created', createdId);
      setSearchParams(params, { replace: false });
    },
    [
      assigneeFilter,
      createdId,
      defaultYear,
      fieldFilter,
      selectedTaskId,
      setSearchParams,
      view,
      yearFilter,
    ]
  );

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const fw = getFieldWorkService();
      const [fieldsData, proposalsData, tasksData] = await Promise.all([
        getFieldService().getFields().catch(() => [] as Field[]),
        fw.listProposals({ resultYear: yearFilter }),
        fw.listFieldTasks({ resultYear: yearFilter }),
      ]);

      setFields(fieldsData);
      setProposals(dedupeTaskProposals(proposalsData));
      setTasks(tasksData);
      setShowingCachedData(!isDeviceOnline());
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('tasks:failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [yearFilter, setShowingCachedData, t]);

  useEffect(() => {
    setLoading(true);
    void loadData();
  }, [user?.userId, user?.role, refreshGeneration, loadData]);

  useEffect(() => {
    const saved = readTaskListScroll(view);
    if (saved != null) {
      window.scrollTo(0, saved);
    }
    return () => {
      saveTaskListScroll(view, window.scrollY);
    };
  }, [view]);

  const matchesAssignee = useCallback(
    (task: FieldTask) => {
      if (!assigneeFilter) return true;
      if (assigneeFilter.startsWith('user:')) {
        return task.assignedUserId === assigneeFilter.slice(5);
      }
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
        return OPEN_STATUSES.has(String(task.status).toLowerCase());
      }),
    [tasks, fieldFilter, matchesAssignee]
  );

  const historyTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (fieldFilter && task.fieldId !== fieldFilter) return false;
        if (!matchesAssignee(task)) return false;
        return HISTORY_STATUSES.has(String(task.status).toLowerCase());
      }),
    [tasks, fieldFilter, matchesAssignee]
  );

  const planned = useMemo(
    () => openTasks.filter((task) => PLANNED_STATUSES.has(String(task.status).toLowerCase())),
    [openTasks]
  );

  const nowBuckets = useMemo(() => buildNowBuckets(openTasks), [openTasks]);
  const nowCount =
    nowBuckets.attention.length +
    nowBuckets.inProgress.length +
    nowBuckets.today.length;
  const upcomingCount = planned.filter((task) => !isTaskDueToday(task)).length;
  const attentionCount = countNowAttention(openTasks);
  const suitableToday = openTasks.filter((task) => {
    if (!isTaskDueToday(task)) return false;
    const kind = resolveWeatherKind(task.weatherSuitability);
    return kind === 'good' || kind === 'not_sensitive' || kind === 'unknown';
  }).length;

  const season = farmerSeasonFor(new Date());

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
          Promise.resolve(fieldPeopleService.getPeople(fieldId)).catch(() => []),
          Promise.resolve(
            getPartnerService().getContacts({ fieldId, includeUnassigned: true })
          ).catch(() => []),
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
      if (cancelled) return;
      setPersonNames(Object.fromEntries(groups.flat()));
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

  const openTask = (task: FieldTask) => {
    saveTaskListScroll(view, window.scrollY);
    writeParams({ taskId: task.id });
  };

  const closeTask = () => {
    writeParams({ taskId: null });
    const saved = readTaskListScroll(view);
    if (saved != null) window.scrollTo(0, saved);
  };

  const handleStart = async (task: FieldTask) => {
    try {
      setBusyId(task.id);
      await getFieldWorkService().startFieldTask(task.id);
      setUndoStartId(task.id);
      window.setTimeout(() => setUndoStartId((id) => (id === task.id ? null : id)), 8000);
      await loadData();
      writeParams({ view: 'now', taskId: task.id });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.start'));
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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.undoStart'));
    } finally {
      setBusyId(null);
    }
  };

  const handlePause = async (reason: PauseReason, newDate?: string) => {
    if (!pauseTask) return;
    try {
      setBusyId(pauseTask.id);
      await getFieldWorkService().pauseFieldTask(pauseTask.id, {
        reason,
        plannedStart: newDate,
        plannedEnd: newDate,
      });
      setPauseTask(null);
      await loadData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.pause'));
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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.reschedule'));
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
      writeParams({ view: 'upcoming' });
      if (lastId) {
        const next = new URLSearchParams(searchParams);
        next.set('view', 'upcoming');
        next.set('created', lastId);
        setSearchParams(next, { replace: false });
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.schedule'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDismissChoice = async (
    group: ProposalTemplateGroup,
    choice: ProposalDismissChoice
  ) => {
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
                message: evalResult.promptMessage || t('fieldWork.profile.learning.dismissalMessage'),
              });
            }
          } catch {
            // optional
          }
        }
      }
      await loadData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.dismiss'));
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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.profile.learning.applyFailed'));
    } finally {
      setLearningBusy(false);
    }
  };

  const createdTask = useMemo(
    () => tasks.find((task) => task.id === createdId),
    [tasks, createdId]
  );

  const clearCreated = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('created');
    setSearchParams(next, { replace: true });
  };

  const handleUndoCreated = async () => {
    if (!createdId) return;
    try {
      setBusyId(createdId);
      await getFieldWorkService().cancelFieldTask(createdId);
      clearCreated();
      await loadData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.form.failedSave'));
    } finally {
      setBusyId(null);
    }
  };

  const handleOverflow = async (
    task: FieldTask,
    action: 'edit' | 'copy' | 'changeStatus' | 'cancel' | 'delete'
  ) => {
    if (action === 'edit' || action === 'changeStatus') {
      openTask(task);
      return;
    }
    if (action === 'copy' || action === 'repeat' as string) {
      navigate(
        `/tasks/new?fieldId=${encodeURIComponent(task.fieldId)}&templateCode=${encodeURIComponent(task.templateCode || '')}`
      );
      return;
    }
    if (action === 'cancel') {
      try {
        setBusyId(task.id);
        await getFieldWorkService().cancelFieldTask(task.id);
        await loadData();
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, t) || t('fieldWork.errors.cancel'));
      } finally {
        setBusyId(null);
      }
    }
  };

  const handleRestore = async (task: FieldTask) => {
    navigate(
      `/tasks/new?fieldId=${encodeURIComponent(task.fieldId)}&templateCode=${encodeURIComponent(task.templateCode || '')}`
    );
  };

  const years = useMemo(() => {
    const current = defaultYear;
    return [current - 1, current, current + 1];
  }, [defaultYear]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;

  if (pageGuard.loading) {
    return (
      <PageContainer className="tasks-page-container">
        <Breadcrumbs />
        <LoadingSpinner />
      </PageContainer>
    );
  }
  if (!pageGuard.allowed) {
    return <Navigate to="/chronologio" replace />;
  }

  if (loading) {
    return (
      <PageContainer className="tasks-page-container">
        <Breadcrumbs />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="tasks-page-container">
      <Breadcrumbs />
      <div className="tasks-page">
        <TasksPageHeader
          title={t('fieldWork.pageTitle')}
          subtitle={t('fieldWork.pageSubtitle')}
          newTaskLabel={t('fieldWork.addTask')}
          newTaskTo="/tasks/new"
        />

        <TaskSeasonStrip
          seasonLabel={t(season.labelKey)}
          attentionCount={attentionCount}
          suitableTodayCount={suitableToday}
          summaryLabel={t('fieldWork.season.summary')}
          chronologioTo={`/chronologio?year=${yearFilter}`}
        />

        <TaskViewTabs
          ariaLabel={t('fieldWork.views.aria')}
          activeView={view}
          onChange={(next) => writeParams({ view: next, taskId: null })}
          views={[
            { id: 'now', label: t('fieldWork.views.now'), count: nowCount },
            { id: 'upcoming', label: t('fieldWork.views.upcoming'), count: upcomingCount },
            {
              id: 'proposals',
              label: t('fieldWork.views.proposals'),
              count: visibleProposals.length,
            },
            {
              id: 'history',
              label: t('fieldWork.views.history'),
              count: historyTasks.length,
            },
          ]}
        />

        <TaskContextBar
          fieldLabel={t('fieldFilterLabel')}
          allFieldsLabel={t('fieldWork.allFields')}
          fieldId={fieldFilter}
          fields={fields}
          onFieldChange={(fieldId) => writeParams({ fieldId })}
          assigneeLabel={t('fieldWork.allAssigneesLabel', { defaultValue: 'Υπεύθυνοι' })}
          allAssigneesLabel={t('fieldWork.allAssignees')}
          assigneeId={assigneeFilter}
          assignees={assignees}
          onAssigneeChange={(assigneeId) => writeParams({ assigneeId })}
          yearLabel={t('fieldWork.year')}
          year={yearFilter}
          years={years}
          defaultYear={defaultYear}
          onYearChange={(year) => writeParams({ year })}
          moreFiltersLabel={t('fieldWork.moreFilters')}
          clearFieldLabel={t('fieldWork.context.clearField')}
          clearAssigneeLabel={t('fieldWork.context.clearAssignee')}
          clearYearLabel={t('fieldWork.context.clearYear')}
        />

        {error && <div className="tasks-error">{error}</div>}

        {undoStartId ? (
          <div className="tasks-undo-toast" role="status">
            <span>{t('fieldWork.undoStart.message')}</span>
            <button type="button" onClick={() => void handleUndoStart()}>
              {t('fieldWork.undoStart.action')}
            </button>
          </div>
        ) : null}

        {createdTask ? (
          <CreatedTaskBanner
            title={taskDisplayTitle(createdTask.title, createdTask.templateCode, i18n.language)}
            fieldName={fieldNames[createdTask.fieldId] || t('fieldWork.unknownField')}
            dateLabel={formatLongTaskDate(createdTask.plannedStart, i18n.language)}
            onView={() => openTask(createdTask)}
            onCreateAnother={() => navigate('/tasks/new')}
            onUndo={() => void handleUndoCreated()}
          />
        ) : null}

        {view === 'now' ? (
          <section
            className="tasks-view-panel"
            role="tabpanel"
            id="tasks-panel-now"
            aria-labelledby="tasks-tab-now"
          >
            <NowTaskView
              tasks={openTasks}
              fieldNames={fieldNames}
              personNames={personNames}
              year={yearFilter}
              busyId={busyId}
              onOpen={openTask}
              onStart={(task) => void handleStart(task)}
              onContinue={openTask}
              onReschedule={setRescheduleTask}
              onPause={setPauseTask}
              onSeeUpcoming={() => writeParams({ view: 'upcoming' })}
              onOverflow={(task, action) => void handleOverflow(task, action)}
            />
          </section>
        ) : null}

        {view === 'upcoming' ? (
          <section
            className="tasks-view-panel"
            role="tabpanel"
            id="tasks-panel-upcoming"
            aria-labelledby="tasks-tab-upcoming"
          >
            <UpcomingTaskView
              tasks={planned}
              fieldNames={fieldNames}
              personNames={personNames}
              year={yearFilter}
              busyId={busyId}
              createdId={createdId}
              onOpen={openTask}
              onStart={(task) => void handleStart(task)}
              onReschedule={setRescheduleTask}
              onOverflow={(task, action) => void handleOverflow(task, action)}
            />
          </section>
        ) : null}

        {view === 'proposals' ? (
          <section
            className="tasks-view-panel"
            role="tabpanel"
            id="tasks-panel-proposals"
            aria-labelledby="tasks-tab-proposals"
          >
            <TaskProposalList
              proposals={visibleProposals}
              fieldNames={fieldNames}
              unknownField={t('fieldWork.unknownField')}
              introTitle={t('fieldWork.proposalsIntro.title')}
              introSubtitle={t('fieldWork.proposalsIntro.subtitle')}
              emptyTitle={t('fieldWork.empty.proposalsTitle')}
              emptyDescription={t('fieldWork.empty.proposalsDescription')}
              busyId={busyId}
              onScheduleGroup={setScheduleGroup}
              onDismissChoice={(group, choice) => void handleDismissChoice(group, choice)}
            />
          </section>
        ) : null}

        {view === 'history' ? (
          <section
            className="tasks-view-panel"
            role="tabpanel"
            id="tasks-panel-history"
            aria-labelledby="tasks-tab-history"
          >
            <HistoryTaskView
              tasks={historyTasks}
              fieldNames={fieldNames}
              personNames={personNames}
              year={yearFilter}
              busyId={busyId}
              onOpen={openTask}
              onRestore={(task) => void handleRestore(task)}
              onRepeat={(task) => void handleRestore(task)}
            />
          </section>
        ) : null}
      </div>

      <TaskDetailDrawer
        taskId={selectedTaskId || null}
        task={selectedTask}
        open={Boolean(selectedTaskId)}
        onClose={closeTask}
        onChanged={() => void loadData()}
        onStart={(task) => void handleStart(task)}
        onPause={setPauseTask}
        onReschedule={setRescheduleTask}
      />

      <PauseTaskSheet
        task={pauseTask}
        open={Boolean(pauseTask)}
        busy={Boolean(pauseTask && busyId === pauseTask.id)}
        onClose={() => setPauseTask(null)}
        onConfirm={(reason, date) => void handlePause(reason, date)}
      />

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

      {dismissalDrawer.mounted && dismissalDrawer.value ? (
        <LearningPromptSheet
          open={dismissalDrawer.open}
          title={t('fieldWork.profile.learning.dismissalTitle')}
          message={dismissalDrawer.value.message}
          busy={learningBusy}
          onClose={() => setDismissalPrompt(null)}
          onAction={(actionId) => void applyDismissalLearning(actionId as DismissalLearningChoice)}
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
      ) : null}
    </PageContainer>
  );
};

export default TasksPage;
