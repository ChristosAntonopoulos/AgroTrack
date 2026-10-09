import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useOfflineMode } from '../context/OfflineContext';
import { isDeviceOnline } from '../utils/networkStatus';
import { getFieldService, getPartnerService, getTaskService } from '../services/serviceFactory';
import { fieldPeopleService } from '../services/fieldPeopleService';
import type {
  CreateTaskInput,
  Task,
  TaskSuggestion,
} from '../services/taskService';
import type { Field } from '../services/fieldService';
import { getApiErrorMessage } from '../utils/translateApiError';
import { athensCalendarYear } from '../utils/athensDate';
import { useModulePageGuard } from '../hooks/useModulePageGuard';
import { useActiveFieldAccess } from '../hooks/useActiveFieldAccess';
import {
  buildTaskSearchParams,
  parseTaskFieldId,
  parseTaskView,
  readTaskListScroll,
  saveTaskListScroll,
  type TaskPageView,
} from '../utils/taskViewState';
import { readFieldId } from '../navigation/intents';
import { useRegisterCapturePage } from '../context/CapturePageContext';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import TasksPageHeader from '../components/Tasks/TasksPageHeader';
import TaskViewTabs from '../components/Tasks/TaskViewTabs';
import HistoryTaskView from '../components/Tasks/HistoryTaskView';
import TodoNotebook from '../components/Tasks/TodoNotebook';
import type { NotebookMenuAction } from '../components/Tasks/TaskNotebookCard';
import CreatedTaskBanner from '../components/Tasks/CreatedTaskBanner';
import RescheduleTaskSheet from '../components/Tasks/RescheduleTaskSheet';
import RepeatTaskSheet from '../components/Tasks/RepeatTaskSheet';
import ScheduleWorkSheet, {
  type ScheduleWorkPrefill,
} from '../components/Tasks/ScheduleWorkSheet';
import CompletionFollowUpSheet from '../components/Tasks/CompletionFollowUpSheet';
import type { AssigneeOption } from '../components/Tasks/form/AssigneeSelector';
import { formatLongTaskDate } from '../utils/taskFormDates';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import '../components/Tasks/TasksShell.css';
import '../components/Tasks/TaskNotebookCard.css';

const TasksPage: React.FC = () => {
  const { t, i18n } = useTranslation(['tasks', 'common', 'errors']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();
  const pageGuard = useModulePageGuard({ module: 'tasks' });
  const { capabilities, accessLevel, isAdminOnActive, isCollaboratorOnActive } =
    useActiveFieldAccess();
  const canCreateTasks =
    isAdminOnActive ||
    !isCollaboratorOnActive ||
    Boolean(capabilities?.canManageTasks && accessLevel === 'work');

  const view = parseTaskView(searchParams.get('view'));
  const fieldFilter = parseTaskFieldId(readFieldId(searchParams));
  const createdId = searchParams.get('created') || '';
  const selectedTaskId = searchParams.get('task') || '';
  const scheduleOpen = searchParams.get('schedule') === '1';
  const templateCodeParam = searchParams.get('templateCode') || '';
  const year = athensCalendarYear(new Date());

  useRegisterCapturePage({
    sourcePage: 'tasks',
    fieldId: fieldFilter || undefined,
  });

  const [bannerTaskId, setBannerTaskId] = useState<string | null>(null);
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
  const [repeatTask, setRepeatTask] = useState<Task | null>(null);
  const [schedulePrefill, setSchedulePrefill] = useState<ScheduleWorkPrefill | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([]);

  const fieldNames = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.id, field.name])),
    [fields]
  );

  const writeParams = useCallback(
    (next: {
      view?: TaskPageView;
      fieldId?: string;
      taskId?: string | null;
      schedule?: boolean | null;
      templateCode?: string | null;
      created?: string | null;
    }) => {
      const params = buildTaskSearchParams({
        view: next.view ?? view,
        fieldId: next.fieldId !== undefined ? next.fieldId : fieldFilter,
        taskId:
          next.taskId === null
            ? undefined
            : next.taskId !== undefined
              ? next.taskId
              : selectedTaskId || undefined,
        schedule:
          next.schedule === null
            ? false
            : next.schedule !== undefined
              ? next.schedule
              : scheduleOpen,
        templateCode:
          next.templateCode === null
            ? undefined
            : next.templateCode !== undefined
              ? next.templateCode
              : templateCodeParam || undefined,
        created:
          next.created === null
            ? undefined
            : next.created !== undefined
              ? next.created
              : createdId || undefined,
      });
      setSearchParams(params, { replace: false });
    },
    [
      createdId,
      fieldFilter,
      scheduleOpen,
      selectedTaskId,
      setSearchParams,
      templateCodeParam,
      view,
    ]
  );

  const closeSchedule = useCallback(() => {
    writeParams({ schedule: null, templateCode: null });
    setSchedulePrefill(null);
    setScheduleError(null);
  }, [writeParams]);

  const openSchedule = useCallback(
    (prefill?: ScheduleWorkPrefill) => {
      setSchedulePrefill(prefill || { fieldId: fieldFilter || undefined });
      setScheduleError(null);
      writeParams({
        schedule: true,
        fieldId: prefill?.fieldId ?? fieldFilter,
        templateCode: prefill?.templateCode || null,
      });
    },
    [fieldFilter, writeParams]
  );

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const tasksApi = getTaskService();
      const listOpts = { fieldId: fieldFilter || undefined };
      const [fieldsData, todayData, upcomingData, doneData] = await Promise.all([
        getFieldService().getFields('tasks').catch(() => [] as Field[]),
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
      setTasks(view === 'done' ? doneData : view === 'upcoming' ? upcomingData : todayData);

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

      setShowingCachedData(!isDeviceOnline());
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('tasks:failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [view, fieldFilter, setShowingCachedData, t]);

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

  useEffect(() => {
    if (scheduleOpen && !schedulePrefill) {
      setSchedulePrefill({
        fieldId: fieldFilter || undefined,
        templateCode: templateCodeParam || undefined,
        title: templateCodeParam
          ? taskDisplayTitle('', templateCodeParam, i18n.language)
          : undefined,
      });
    }
  }, [scheduleOpen, schedulePrefill, fieldFilter, templateCodeParam, i18n.language]);

  // Capture created= once into local banner state, then strip it from the URL
  // so a refresh does not keep showing “Η εργασία προγραμματίστηκε”.
  useEffect(() => {
    if (!createdId) return;
    setBannerTaskId(createdId);
    const params = buildTaskSearchParams({
      view,
      fieldId: fieldFilter || undefined,
      taskId: selectedTaskId || undefined,
      schedule: scheduleOpen,
      templateCode: templateCodeParam || undefined,
      created: undefined,
    });
    setSearchParams(params, { replace: true });
  }, [
    createdId,
    fieldFilter,
    scheduleOpen,
    selectedTaskId,
    setSearchParams,
    templateCodeParam,
    view,
  ]);

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

  useEffect(() => {
    const targetField = fieldFilter || fields[0]?.id;
    if (!targetField) {
      setAssigneeOptions([
        {
          key: user?.userId ? `user:${user.userId}` : 'later',
          label: t('schedule.assigneeMe'),
          group: 'self',
        },
        { key: 'later', label: t('schedule.decideLater'), group: 'later' },
      ]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      Promise.resolve(fieldPeopleService.getPeople(targetField)).catch(() => []),
      Promise.resolve(
        getPartnerService().getContacts({ fieldId: targetField, includeUnassigned: true })
      ).catch(() => []),
    ]).then(([people, contacts]) => {
      if (cancelled) return;
      const options: AssigneeOption[] = [
        {
          key: user?.userId ? `user:${user.userId}` : 'later',
          label: t('schedule.assigneeMe'),
          group: 'self',
        },
      ];
      (Array.isArray(people) ? people : []).forEach((person) => {
        if (person.userId === user?.userId || person.role === 'Admin') return;
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
  }, [fieldFilter, fields, user?.userId, t]);

  useEffect(() => {
    if (!selectedTaskId) return;
    navigate(`/tasks/${selectedTaskId}`, { replace: true });
  }, [navigate, selectedTaskId]);

  const openTask = (task: Task) => {
    saveTaskListScroll(view, window.scrollY);
    navigate(`/tasks/${task.id}`);
  };

  const handleComplete = async (task: Task) => {
    try {
      setBusyId(task.id);
      const updated = await getTaskService().completeTask(task.id);
      setUndoCompleteId(task.id);
      setFollowUpTask(updated);
      setFollowUpError(null);
      window.setTimeout(
        () => setUndoCompleteId((current) => (current === task.id ? null : current)),
        8000
      );
      await loadData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('tasks:complete.failed'));
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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('tasks:complete.undoFailed'));
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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.reschedule'));
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
      setBannerTaskId(created.id);
      writeParams({
        view: 'today',
        fieldId: created.fieldId,
        created: null,
        schedule: null,
        templateCode: null,
      });
      await loadData();
    } catch (err: unknown) {
      setScheduleError(getApiErrorMessage(err, t) || t('schedule.failedSave'));
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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('suggestions.dismissFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const handleMenu = async (task: Task, action: NotebookMenuAction) => {
    if (action === 'reschedule') {
      setRescheduleTask(task);
      return;
    }
    if (action === 'repeat') {
      setRepeatTask(task);
      return;
    }
    if (action === 'edit' || action === 'assign') {
      navigate(`/tasks/${task.id}`);
      return;
    }
    if (action === 'complete') {
      await handleComplete(task);
    }
  };

  const handleRepeat = async (input: { recurrence: string; scheduledFor: string }) => {
    if (!repeatTask) return;
    try {
      setBusyId(repeatTask.id);
      await getTaskService().patchTask(repeatTask.id, {
        recurrence: input.recurrence,
        scheduledFor: input.scheduledFor,
        plannedStart: input.scheduledFor,
        plannedEnd: input.scheduledFor,
      });
      setRepeatTask(null);
      await loadData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.reschedule'));
    } finally {
      setBusyId(null);
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
    } catch (err: unknown) {
      setFollowUpError(getApiErrorMessage(err, t) || t('complete.saveFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const createdTask = useMemo(
    () => (bannerTaskId ? tasks.find((task) => task.id === bannerTaskId) : undefined),
    [tasks, bannerTaskId]
  );

  const clearCreated = () => {
    setBannerTaskId(null);
    writeParams({ created: null });
  };

  const handleUndoCreated = async () => {
    if (!bannerTaskId) return;
    try {
      setBusyId(bannerTaskId);
      await getTaskService().skipTask(bannerTaskId, 'undo_create');
      clearCreated();
      await loadData();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('schedule.failedSave'));
    } finally {
      setBusyId(null);
    }
  };

  const showSkeleton = pageGuard.loading || loading;

  return (
    <PageContainer className="tasks-page-container">
      <Breadcrumbs />
      <div className="tasks-page" aria-busy={showSkeleton || undefined}>
        <TasksPageHeader
          title={t('page.title')}
          newTaskLabel={t('page.scheduleCta')}
          canCreateTasks={canCreateTasks && !showSkeleton}
          onNewTask={() => openSchedule({ fieldId: fieldFilter || undefined })}
          fieldLabel={t('page.fieldFilter')}
          allFieldsLabel={t('page.allFields')}
          fieldId={fieldFilter}
          fields={fields}
          onFieldChange={(fieldId) => writeParams({ fieldId })}
        />

        <TaskViewTabs
          ariaLabel={t('page.viewsAria')}
          activeView={view}
          onChange={(next) => writeParams({ view: next, taskId: null })}
          views={[
            { id: 'today', label: t('page.tabs.today'), count: showSkeleton ? 0 : taskCounts.today },
            { id: 'upcoming', label: t('page.tabs.upcoming'), count: showSkeleton ? 0 : taskCounts.upcoming },
            { id: 'done', label: t('page.tabs.done'), count: showSkeleton ? 0 : taskCounts.done },
          ]}
        />

        {showSkeleton ? (
          <div className="tasks-page-skeleton" aria-hidden>
            <div className="tasks-skeleton-section" />
            <div className="tasks-skeleton-card" />
            <div className="tasks-skeleton-card" />
            <div className="tasks-skeleton-card" />
          </div>
        ) : null}

        {!showSkeleton && error ? <div className="tasks-error">{error}</div> : null}

        {!showSkeleton && undoCompleteId ? (
          <div className="tasks-undo-toast" role="status">
            <span>{t('complete.undoMessage')}</span>
            <button type="button" onClick={() => void handleUndoComplete()}>
              {t('complete.undo')}
            </button>
          </div>
        ) : null}

        {!showSkeleton && createdTask ? (
          <CreatedTaskBanner
            title={taskDisplayTitle(createdTask.title, createdTask.templateCode, i18n.language)}
            fieldName={fieldNames[createdTask.fieldId] || t('fieldWork.unknownField')}
            dateLabel={formatLongTaskDate(
              createdTask.scheduledFor || createdTask.plannedStart,
              i18n.language
            )}
            onView={() => {
              clearCreated();
              openTask(createdTask);
            }}
            onCreateAnother={() => {
              clearCreated();
              openSchedule({ fieldId: createdTask.fieldId });
            }}
            onUndo={() => void handleUndoCreated()}
          />
        ) : null}

        {!showSkeleton && view === 'done' ? (
          <section
            className="tasks-view-panel"
            role="tabpanel"
            id="tasks-panel-done"
            aria-labelledby="tasks-tab-done"
          >
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
            />
          </section>
        ) : null}

        {!showSkeleton && view !== 'done' ? (
          <section
            className="tasks-view-panel"
            role="tabpanel"
            id={`tasks-panel-${view}`}
            aria-labelledby={`tasks-tab-${view}`}
          >
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
          </section>
        ) : null}
      </div>

      <RescheduleTaskSheet
        task={rescheduleTask}
        open={Boolean(rescheduleTask)}
        busy={Boolean(rescheduleTask && busyId === rescheduleTask.id)}
        onClose={() => setRescheduleTask(null)}
        onConfirm={(start, end) => void handleReschedule(start, end)}
      />

      <RepeatTaskSheet
        task={repeatTask}
        open={Boolean(repeatTask)}
        busy={Boolean(repeatTask && busyId === repeatTask.id)}
        onClose={() => setRepeatTask(null)}
        onConfirm={(payload) => void handleRepeat(payload)}
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
    </PageContainer>
  );
};

export default TasksPage;
