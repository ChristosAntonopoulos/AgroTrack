import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
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
import { scheduleProposalPath, stashProposalForSchedule } from '../utils/proposalPresentation';
import type { ProposalDismissDecision } from '../components/Tasks/ProposalActionsMenu';
import LearningPromptSheet from '../components/FieldWork/LearningPromptSheet';
import { useDrawerPresence } from '../hooks/useDrawerPresence';
import {
  buildTaskSearchParams,
  parseTaskFieldId,
  parseTaskView,
  parseTaskYear,
  type TaskPageView,
} from '../utils/taskViewState';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import TasksPageHeader from '../components/Tasks/TasksPageHeader';
import TaskViewTabs from '../components/Tasks/TaskViewTabs';
import TaskContextBar from '../components/Tasks/TaskContextBar';
import TaskProposalList from '../components/Tasks/TaskProposalList';
import PlannedTaskList from '../components/Tasks/PlannedTaskList';
import InProgressTaskList from '../components/Tasks/InProgressTaskList';
import CreatedTaskBanner from '../components/Tasks/CreatedTaskBanner';
import { formatLongTaskDate } from '../utils/taskFormDates';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import '../components/Tasks/TasksShell.css';

const PLANNED_STATUSES = new Set(['planned', 'ready', 'blocked']);
const IN_PROGRESS_STATUSES = new Set(['in_progress']);
const FUTURE_WORK_STATUSES = new Set([...PLANNED_STATUSES, ...IN_PROGRESS_STATUSES]);

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

  const defaultYear = athensCalendarYear(new Date());
  const view = parseTaskView(searchParams.get('view'));
  const yearFilter = parseTaskYear(searchParams.get('year'), defaultYear);
  const fieldFilter = parseTaskFieldId(searchParams.get('field'));
  const createdId = searchParams.get('created') || '';

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

  const fieldNames = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.id, field.name])),
    [fields]
  );

  const writeParams = useCallback(
    (next: { view?: TaskPageView; year?: number; fieldId?: string }) => {
      setSearchParams(
        buildTaskSearchParams({
          view: next.view ?? view,
          year: next.year ?? yearFilter,
          defaultYear,
          fieldId: next.fieldId !== undefined ? next.fieldId : fieldFilter,
        }),
        { replace: false }
      );
    },
    [defaultYear, fieldFilter, setSearchParams, view, yearFilter]
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
    if (view !== 'proposals' || !weatherFieldKey) {
      return;
    }
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
    () =>
      futureTasks.filter((task) => IN_PROGRESS_STATUSES.has(String(task.status).toLowerCase())),
    [futureTasks]
  );

  const peopleFieldKey = useMemo(
    () =>
      [...new Set(futureTasks.map((task) => task.fieldId).filter(Boolean))]
        .sort()
        .join(','),
    [futureTasks]
  );

  useEffect(() => {
    if ((view !== 'planned' && view !== 'active') || !peopleFieldKey) return;
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
  }, [view, peopleFieldKey]);

  const handleSchedule = (proposal: TaskProposal) => {
    stashProposalForSchedule(proposal);
    navigate(scheduleProposalPath(proposal));
  };

  const handleLater = async (proposal: TaskProposal) => {
    try {
      setBusyId(proposal.id);
      await getFieldWorkService().snoozeProposal(proposal.id);
      await loadData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.snooze'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (proposal: TaskProposal, decision: ProposalDismissDecision) => {
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
        // Learning prompt is optional — dismiss already succeeded.
      }
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
    () => planned.find((task) => task.id === createdId),
    [planned, createdId]
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

  const handleStart = async (task: FieldTask) => {
    try {
      setBusyId(task.id);
      await getFieldWorkService().startFieldTask(task.id);
      await loadData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.start'));
    } finally {
      setBusyId(null);
    }
  };

  const years = useMemo(() => {
    const current = defaultYear;
    return [current - 1, current, current + 1];
  }, [defaultYear]);

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
          onChange={(next) => writeParams({ view: next })}
          views={[
            {
              id: 'proposals',
              label: t('fieldWork.views.proposals'),
              count: visibleProposals.length,
            },
            {
              id: 'planned',
              label: t('fieldWork.views.planned'),
              count: planned.length,
            },
            {
              id: 'active',
              label: t('fieldWork.views.active'),
              count: inProgress.length,
            },
          ]}
        />

        <TaskContextBar
          yearLabel={t('fieldWork.year')}
          year={yearFilter}
          years={years}
          defaultYear={defaultYear}
          fieldLabel={t('fieldFilterLabel')}
          allFieldsLabel={t('fieldWork.allFields')}
          fieldId={fieldFilter}
          fields={fields}
          onYearChange={(year) => writeParams({ year })}
          onFieldChange={(fieldId) => writeParams({ fieldId })}
          clearYearLabel={t('fieldWork.context.clearYear')}
          clearFieldLabel={t('fieldWork.context.clearField')}
        />

        {error && <div className="tasks-error">{error}</div>}

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
              needsDecisionLabel={t('fieldWork.proposalGroups.needsDecision')}
              canWaitLabel={t('fieldWork.proposalGroups.canWait')}
              weatherByField={weatherByField}
              busyId={busyId}
              onSchedule={handleSchedule}
              onSnooze={(proposal) => void handleLater(proposal)}
              onDismiss={(proposal, decision) => void handleDismiss(proposal, decision)}
            />
          </section>
        ) : null}

        {view === 'planned' ? (
          <section
            className="tasks-view-panel"
            role="tabpanel"
            id="tasks-panel-planned"
            aria-labelledby="tasks-tab-planned"
          >
            {createdTask ? (
              <CreatedTaskBanner
                title={taskDisplayTitle(createdTask.title, createdTask.templateCode, i18n.language)}
                fieldName={fieldNames[createdTask.fieldId] || t('fieldWork.unknownField')}
                dateLabel={formatLongTaskDate(createdTask.plannedStart, i18n.language)}
                onView={() => navigate(`/tasks/${createdTask.id}`)}
                onCreateAnother={() => navigate('/tasks/new')}
                onUndo={() => void handleUndoCreated()}
              />
            ) : null}
            <PlannedTaskList
              tasks={planned}
              fieldNames={fieldNames}
              personNames={personNames}
              unknownField={t('fieldWork.unknownField')}
              highlightedId={createdId}
              title={t('fieldWork.views.planned')}
              groupLabels={{
                today: t('fieldWork.plannedGroups.today'),
                thisWeek: t('fieldWork.plannedGroups.thisWeek'),
                later: t('fieldWork.plannedGroups.later'),
              }}
              emptyTitle={t('fieldWork.empty.plannedTitle')}
              emptyDescription={t('fieldWork.empty.plannedDescription')}
              emptyAction={
                <Button to="/tasks/new" icon={<Plus />} variant="primary" size="lg">
                  {t('fieldWork.addTask')}
                </Button>
              }
              completedLinkLabel={t('fieldWork.seeCompletedInChronologio')}
              year={yearFilter}
              busyId={busyId}
              onStart={(task) => void handleStart(task)}
              onOpen={(task) => navigate(`/tasks/${task.id}`)}
            />
          </section>
        ) : null}

        {view === 'active' ? (
          <section
            className="tasks-view-panel"
            role="tabpanel"
            id="tasks-panel-active"
            aria-labelledby="tasks-tab-active"
          >
            <InProgressTaskList
              tasks={inProgress}
              fieldNames={fieldNames}
              personNames={personNames}
              unknownField={t('fieldWork.unknownField')}
              emptyTitle={t('fieldWork.empty.activeTitle')}
              emptyDescription={t('fieldWork.empty.activeDescription')}
              completedLinkLabel={t('fieldWork.seeCompletedInChronologio')}
              year={yearFilter}
              busyId={busyId}
              onContinue={(task) => navigate(`/tasks/${task.id}`)}
            />
          </section>
        ) : null}
      </div>

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
