import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useOfflineMode } from '../context/OfflineContext';
import { isDeviceOnline } from '../utils/networkStatus';
import { getFieldService, getFieldWorkService, getPartnerService } from '../services/serviceFactory';
import { fieldPeopleService } from '../services/fieldPeopleService';
import type { DismissalLearningChoice, FieldTask, TaskProposal } from '../services/fieldWorkService';
import type { Field } from '../services/fieldService';
import { getApiErrorMessage } from '../utils/translateApiError';
import { athensCalendarYear } from '../utils/athensDate';
import { dedupeTaskProposals } from '../utils/taskProposalDedup';
import type { ProposalTemplateGroup } from '../utils/proposalPresentation';
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
import type { ProposalDismissChoice } from '../components/Tasks/TaskProposalList';
import HistoryTaskView from '../components/Tasks/HistoryTaskView';
import TodoNotebook from '../components/Tasks/TodoNotebook';
import type { NotebookMenuAction } from '../components/Tasks/TaskNotebookCard';
import { notebookStatus, type NotebookAction } from '../utils/taskNotebook';
import CreatedTaskBanner from '../components/Tasks/CreatedTaskBanner';
import WorkSetupBanner from '../components/fields/WorkSetupBanner';
import { readWorkProfileDraft } from '../utils/fieldWorkProfileDraft';
import RescheduleTaskSheet from '../components/Tasks/RescheduleTaskSheet';
import ScheduleGroupSheet from '../components/Tasks/ScheduleGroupSheet';
import { formatLongTaskDate } from '../utils/taskFormDates';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import '../components/Tasks/TasksShell.css';
import '../components/Tasks/TaskNotebookCard.css';

const OPEN_STATUSES = new Set(['planned', 'ready', 'blocked', 'in_progress']);
const HISTORY_STATUSES = new Set(['completed', 'cancelled', 'skipped']);

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
  const [personNames, setPersonNames] = useState<Record<string, string>>({});
  const [dismissalPrompt, setDismissalPrompt] = useState<DismissalLearningPrompt | null>(null);
  const dismissalDrawer = useDrawerPresence(dismissalPrompt);
  const [learningBusy, setLearningBusy] = useState(false);
  const [undoStartIds, setUndoStartIds] = useState<string[]>([]);
  const [rescheduleTask, setRescheduleTask] = useState<FieldTask | null>(null);
  const [scheduleGroup, setScheduleGroup] = useState<ProposalTemplateGroup | null>(null);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'mine' | 'everyone'>('everyone');
  const [workSetup, setWorkSetup] = useState<{ resume: boolean } | null>(null);

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

  useEffect(() => {
    if (!fieldFilter) {
      setWorkSetup(null);
      return;
    }
    const dismissKey = `oleachron.workSetupBanner.dismissed.${fieldFilter}`;
    if (localStorage.getItem(dismissKey) === '1') {
      setWorkSetup(null);
      return;
    }
    let cancelled = false;
    void getFieldWorkService()
      .getWorkProfile(fieldFilter)
      .then((profile) => {
        if (cancelled) return;
        const resume =
          profile?.status === 'draft' || Boolean(readWorkProfileDraft(fieldFilter)?.stepId);
        if (profile == null || profile.status === 'draft') setWorkSetup({ resume });
        else setWorkSetup(null);
      })
      .catch(() => {
        if (!cancelled) setWorkSetup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldFilter, refreshGeneration]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const fw = getFieldWorkService();
      const [fieldsData, proposalsData, tasksData] = await Promise.all([
        getFieldService().getFields('tasks').catch(() => [] as Field[]),
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

  const matchesScope = useCallback(
    (task: FieldTask) => {
      if (scope !== 'mine' || !user?.userId) return true;
      return (
        task.assignedUserId === user.userId ||
        task.responsibleUserId === user.userId ||
        task.createdByUserId === user.userId
      );
    },
    [scope, user?.userId]
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

  useEffect(() => {
    if (!selectedTaskId) return;
    navigate(`/tasks/${selectedTaskId}`, { replace: true });
  }, [navigate, selectedTaskId]);

  const openTask = (task: FieldTask) => {
    saveTaskListScroll(view, window.scrollY);
    navigate(`/tasks/${task.id}`);
  };

  const handleStart = async (task: FieldTask) => {
    const peers = task.workGroupId
      ? tasks.filter(
          (item) =>
            item.workGroupId === task.workGroupId && notebookStatus(item.status) === 'todo'
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
      window.setTimeout(
        () => setUndoStartIds((current) => (current[0] === startedIds[0] ? [] : current)),
        8000
      );
      navigate(`/tasks/${task.id}`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.start'));
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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.undoStart'));
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
      writeParams({ view: 'todo' });
      if (lastId) {
        const next = new URLSearchParams(searchParams);
        next.set('view', 'todo');
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
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, t) || t('fieldWork.errors.start'));
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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.cancel'));
    } finally {
      setBusyId(null);
    }
  };

  const years = useMemo(() => {
    const current = defaultYear;
    return [current - 1, current, current + 1];
  }, [defaultYear]);

  if (pageGuard.loading) {
    return (
      <PageContainer className="tasks-page-container">
        <Breadcrumbs />
        <LoadingSpinner />
      </PageContainer>
    );
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

        <TaskViewTabs
          ariaLabel={t('fieldWork.views.aria')}
          activeView={view}
          onChange={(next) => writeParams({ view: next, taskId: null })}
          views={[
            { id: 'todo', label: t('notebook.tabs.todo'), count: openTasks.length },
            { id: 'done', label: t('notebook.tabs.done'), count: historyTasks.length },
          ]}
        />

        <TaskContextBar
          searchLabel={t('notebook.search')}
          searchPlaceholder={t('notebook.search')}
          searchValue={query}
          onSearchChange={setQuery}
          scopeLabel={t('notebook.scope')}
          scope={scope}
          mineLabel={t('notebook.mine')}
          everyoneLabel={t('notebook.everyone')}
          onScopeChange={setScope}
          fieldLabel={t('fieldFilterLabel')}
          allFieldsLabel={t('fieldWork.allFields')}
          fieldId={fieldFilter}
          fields={fields}
          onFieldChange={(fieldId) => writeParams({ fieldId })}
          assigneeLabel={t('fieldWork.allAssigneesLabel')}
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

        {fieldFilter && workSetup ? (
          <WorkSetupBanner
            fieldId={fieldFilter}
            resume={workSetup.resume}
            onDismiss={() => {
              localStorage.setItem(`oleachron.workSetupBanner.dismissed.${fieldFilter}`, '1');
              setWorkSetup(null);
            }}
          />
        ) : null}

        {undoStartIds.length > 0 ? (
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

        {view === 'todo' ? (
          <section
            className="tasks-view-panel"
            role="tabpanel"
            id="tasks-panel-todo"
            aria-labelledby="tasks-tab-todo"
          >
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
          </section>
        ) : (
          <section
            className="tasks-view-panel"
            role="tabpanel"
            id="tasks-panel-done"
            aria-labelledby="tasks-tab-done"
          >
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
            />
          </section>
        )}
      </div>

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
        fieldColors={Object.fromEntries(fields.map((field) => [field.id, field.color]))}
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
      ) : null}
    </PageContainer>
  );
};

export default TasksPage;
