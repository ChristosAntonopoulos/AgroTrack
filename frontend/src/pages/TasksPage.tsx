import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useExperienceMode } from '../context/ExperienceModeContext';
import { useOfflineMode } from '../context/OfflineContext';
import { isDeviceOnline } from '../utils/networkStatus';
import { getFieldService, getTaskService } from '../services/serviceFactory';
import { Task } from '../services/taskService';
import { Field } from '../services/fieldService';
import { getApiErrorMessage } from '../utils/translateApiError';
import TaskCard from '../components/Task/TaskCard';
import {
  filterTasks,
  getTaskSummary,
  groupOpenTasks,
  sortTasks,
  TaskFocusFilter,
  TaskSort,
} from '../utils/taskListUtils';
import {
  filterTemplates,
  sortTemplates,
} from '../utils/taskTemplateUtils';
import { useAllLocalizedTemplates, useTaskTemplateLabels } from '../hooks/useLocalizedTaskTemplate';
import { TaskTemplateFilters as TemplateFiltersState } from '../types/oliveTaskTemplate';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import TasksBoardView from '../components/Task/TasksBoardView';
import TasksCategoryBrowse from '../components/Task/TasksCategoryBrowse';
import {
  AlertCircle,
  CalendarClock,
  CheckSquare,
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import './TasksPage.css';

type ViewMode = 'list' | 'board';

const TasksPage: React.FC = () => {
  const { t } = useTranslation(['tasks', 'common', 'errors', 'taskTemplates']);
  const { user } = useAuth();
  const { showWidget, isEveryday } = useExperienceMode();
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();
  const labels = useTaskTemplateLabels();
  const localizedTemplates = useAllLocalizedTemplates();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [focus, setFocus] = useState<TaskFocusFilter>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fieldFilter, setFieldFilter] = useState('');
  const [sort, setSort] = useState<TaskSort>('due');
  const [searchTerm, setSearchTerm] = useState('');
  const [templateFieldId, setTemplateFieldId] = useState('');

  const isOwner = user?.role === 'FieldOwner';
  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    if (isEveryday || !showWidget('taskBoardView')) {
      setViewMode('list');
    }
  }, [isEveryday, showWidget]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.userId, refreshGeneration]);

  const loadData = async () => {
    try {
      if (tasks.length === 0) setLoading(true);
      const taskService = getTaskService();
      const userId = user?.role === 'Producer' ? user.userId : undefined;
      const [tasksData, fieldsData] = await Promise.all([
        taskService.getTasks(undefined, userId),
        getFieldService().getFields().catch(() => [] as Field[]),
      ]);
      setTasks(tasksData);
      setFields(fieldsData);
      setShowingCachedData(!isDeviceOnline());
      if (fieldsData.length > 0 && !templateFieldId) {
        setTemplateFieldId(fieldsData[0].id);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('tasks:failedLoad'));
    } finally {
      setLoading(false);
    }
  };

  const fieldNames = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.id, f.name])),
    [fields]
  );

  const fieldColors = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.id, f.color ?? null])),
    [fields]
  );

  const summary = useMemo(() => getTaskSummary(tasks), [tasks]);

  const filteredTasks = useMemo(() => {
    const filtered = filterTasks(tasks, {
      search: searchTerm,
      focus,
      fieldId: fieldFilter,
      status: statusFilter,
    });
    return sortTasks(filtered, sort, fieldNames);
  }, [tasks, searchTerm, focus, fieldFilter, statusFilter, sort, fieldNames]);

  const templateField = fields.find((f) => f.id === templateFieldId) ?? null;

  const recommendedTemplates = useMemo(() => {
    if (!isOwner || !templateField) return [];
    const filters: TemplateFiltersState = {
      search: '',
      category: 'All',
      season: 'All year',
      priority: 'All',
      recommendedOnly: true,
      fieldSuitableOnly: true,
    };
    const filtered = filterTemplates(
      localizedTemplates,
      filters,
      currentMonth,
      templateField,
      tasks,
      templateFieldId
    );
    return sortTemplates(filtered, currentMonth, templateField, tasks, templateFieldId).slice(0, 4);
  }, [isOwner, templateField, templateFieldId, localizedTemplates, tasks, currentMonth]);

  const subtitle =
    user?.role === 'Producer' ? t('tasks:subtitleProducer') : t('tasks:subtitleDefault');

  return (
    <PageContainer>
      <div className="tasks-page">
        <Breadcrumbs />

        <header className="tasks-page-header">
          <div className="tasks-page-header-text">
            <h1>{t('tasks:title')}</h1>
            <p className="tasks-subtitle">{subtitle}</p>
          </div>
          {isOwner && (
            <div className="tasks-page-header-actions">
              <Button to="/tasks/new" icon={<Plus />} variant="primary">
                {t('tasks:addTask')}
              </Button>
            </div>
          )}
        </header>

        {loading ? (
          <LoadingSpinner className="page-inline-loading" />
        ) : (
          <>
        {error && <div className="tasks-error">{error}</div>}

        <div className="tasks-summary-strip">
          <div className="tasks-summary-item">
            <strong>{summary.active}</strong> {t('tasks:summary.active')}
          </div>
          {summary.overdue > 0 && (
            <div className="tasks-summary-item tasks-summary-item--warn">
              <strong>{summary.overdue}</strong> {t('tasks:summary.overdue')}
            </div>
          )}
          {summary.dueToday > 0 && (
            <div className="tasks-summary-item tasks-summary-item--today">
              <strong>{summary.dueToday}</strong> {t('tasks:summary.dueToday')}
            </div>
          )}
        </div>

        {!isEveryday && isOwner && fields.length > 0 && (
          <section className="tasks-recommended-section">
            <div className="tasks-recommended-header">
              <div>
                <h2>{t('tasks:recommended.title')}</h2>
                <p>{t('tasks:recommended.subtitle')}</p>
              </div>
              <div className="tasks-recommended-field">
                <label htmlFor="template-field">{t('tasks:recommended.fieldLabel')}</label>
                <select
                  id="template-field"
                  value={templateFieldId}
                  onChange={(e) => setTemplateFieldId(e.target.value)}
                >
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {recommendedTemplates.length === 0 ? (
              <p className="tasks-recommended-empty">{t('tasks:recommended.empty')}</p>
            ) : (
              <div className="tasks-recommended-grid">
                {recommendedTemplates.map((tpl) => (
                  <article key={tpl.id} className="tasks-recommended-card">
                    <div className="tasks-recommended-card-top">
                      <span className="tasks-recommended-badge">{labels.categoryLabel(tpl.category)}</span>
                      <span className="tasks-recommended-now">{t('taskTemplates:card.recommendedNow')}</span>
                    </div>
                    <h3>{tpl.title}</h3>
                    <p>{tpl.shortDescription}</p>
                    <div className="tasks-recommended-card-actions">
                      <Button
                        to={`/tasks/new?templateId=${tpl.id}&fieldId=${templateFieldId}`}
                        size="sm"
                        variant="primary"
                        icon={<Plus />}
                      >
                        {t('tasks:recommended.schedule')}
                      </Button>
                      <Button
                        to={`/fields/${templateFieldId}/task-templates`}
                        size="sm"
                        variant="outline"
                      >
                        {t('tasks:recommended.browseAll')}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare size={64} />}
            title={t('tasks:emptyTitle')}
            description={
              isOwner ? t('tasks:emptyDescriptionOwner') : t('tasks:emptyDescriptionFilter')
            }
            action={
              isOwner ? (
                <Button to="/tasks/new" icon={<Sparkles />}>
                  {t('tasks:addFromTemplate')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="tasks-toolbar">
              <div className="tasks-search">
                <Search size={18} />
                <input
                  type="search"
                  placeholder={t('tasks:searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label={t('tasks:searchPlaceholder')}
                />
              </div>

              <div className="tasks-toolbar-row">
                <div className="tasks-focus-pills" role="group" aria-label={t('tasks:focusLabel')}>
                  {(isEveryday
                    ? (['all', 'completed'] as TaskFocusFilter[])
                    : (['all', 'action', 'active', 'completed'] as TaskFocusFilter[])
                  ).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={focus === key ? 'active' : ''}
                      onClick={() => setFocus(key === 'all' && isEveryday ? 'all' : key)}
                    >
                      {key === 'action' && <AlertCircle size={14} />}
                      {isEveryday && key === 'all' ? t('tasks:focus.open') : t(`tasks:focus.${key}`)}
                    </button>
                  ))}
                </div>

                <div className="tasks-toolbar-controls">
                  {isOwner && fields.length > 0 && (
                    <select
                      value={fieldFilter}
                      onChange={(e) => setFieldFilter(e.target.value)}
                      aria-label={t('tasks:fieldFilterLabel')}
                    >
                      <option value="">{t('tasks:allFields')}</option>
                      {fields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <select value={sort} onChange={(e) => setSort(e.target.value as TaskSort)} aria-label={t('tasks:sortLabel')}>
                    <option value="due">{t('tasks:sortDue')}</option>
                    <option value="priority">{t('tasks:sortPriority')}</option>
                    {isOwner && <option value="field">{t('tasks:sortField')}</option>}
                    <option value="recent">{t('tasks:sortRecent')}</option>
                  </select>

                  {!isEveryday && showWidget('taskBoardView') ? (
                  <div className="tasks-view-toggle" role="group" aria-label={t('tasks:viewModeAria')}>
                    <button
                      type="button"
                      className={viewMode === 'list' ? 'active' : ''}
                      onClick={() => setViewMode('list')}
                    >
                      <List size={16} />
                      <span>{t('tasks:viewList')}</span>
                    </button>
                    {showWidget('taskBoardView') ? (
                      <button
                        type="button"
                        className={viewMode === 'board' ? 'active' : ''}
                        onClick={() => setViewMode('board')}
                      >
                        <LayoutGrid size={16} />
                        <span>{t('tasks:viewBoard')}</span>
                      </button>
                    ) : null}
                  </div>
                  ) : null}
                </div>
              </div>

              {!isEveryday && (statusFilter !== 'all' || focus !== 'all') ? null : !isEveryday ? (
                <div className="tasks-status-pills">
                  {['all', 'pending', 'in_progress', 'completed'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={statusFilter === s ? 'active' : ''}
                      onClick={() => setStatusFilter(s)}
                    >
                      {t(s === 'all' ? 'tasks:filters.all' : `tasks:filters.${s}`)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {filteredTasks.length === 0 ? (
              <EmptyState
                icon={<CalendarClock size={48} />}
                title={t('tasks:emptySearchTitle')}
                description={t('tasks:emptySearchDescription')}
              />
            ) : !isEveryday && viewMode === 'board' ? (
              <TasksBoardView
                tasks={filteredTasks}
                fieldNames={fieldNames}
                fieldColors={fieldColors}
              />
            ) : isEveryday && focus !== 'completed' ? (
              <div className="tasks-simple-groups">
                {(['overdue', 'today', 'upcoming'] as const).map((group) => {
                  const grouped = groupOpenTasks(filteredTasks);
                  const list = grouped[group];
                  if (list.length === 0) return null;
                  return (
                    <section key={group} className="tasks-simple-group">
                      <h2>
                        {t(`tasks:groups.${group}`)}
                        <span>{list.length}</span>
                      </h2>
                      <div className="tasks-simple-list">
                        {list.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            fieldName={fieldNames[task.fieldId]}
                            fieldColor={fieldColors[task.fieldId]}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <TasksCategoryBrowse
                tasks={filteredTasks}
                fieldNames={fieldNames}
                fieldColors={fieldColors}
              />
            )}
          </>
        )}
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default TasksPage;
