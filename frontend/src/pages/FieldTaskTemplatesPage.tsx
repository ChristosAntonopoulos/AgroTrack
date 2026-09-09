import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFieldService, getTaskService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { OLIVE_TASK_TEMPLATES } from '../data/oliveTaskTemplates';
import { OliveTaskTemplate, TaskTemplateFilters as FiltersState } from '../types/oliveTaskTemplate';
import {
  buildCreateTaskUrl,
  filterTemplates,
  isRecommendedNow,
  sortTemplates,
} from '../utils/taskTemplateUtils';
import { useLocalizedTemplates } from '../hooks/useLocalizedTaskTemplate';
import { useBreakpoint } from '../hooks/useBreakpoint';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import EmptyState from '../components/Common/EmptyState';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import TaskTemplateFilters from '../components/TaskTemplate/TaskTemplateFilters';
import TaskTemplateCalendar from '../components/TaskTemplate/TaskTemplateCalendar';
import TaskTemplateCard from '../components/TaskTemplate/TaskTemplateCard';
import TaskTemplateDetailPanel from '../components/TaskTemplate/TaskTemplateDetailPanel';
import './FieldTaskTemplatesPage.css';

const DEFAULT_FILTERS: FiltersState = {
  search: '',
  category: 'All',
  season: 'All year',
  priority: 'All',
  recommendedOnly: false,
  fieldSuitableOnly: false,
};

const FieldTaskTemplatesPage: React.FC = () => {
  const { t } = useTranslation(['taskTemplates', 'common']);
  const { id: fieldId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [field, setField] = useState<Field | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>();
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const isMobile = useBreakpoint('lg');

  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    if (fieldId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [fieldId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const fieldService = getFieldService();
      const taskService = getTaskService();
      const [fieldData, tasksData] = await Promise.all([
        fieldService.getField(fieldId!),
        taskService.getTasks(fieldId),
      ]);
      setField(fieldData);
      setTasks(tasksData);
    } catch (err: any) {
      setError(err.message || t('taskTemplates:page.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const filteredRaw = useMemo(() => {
    const filtered = filterTemplates(
      OLIVE_TASK_TEMPLATES,
      filters,
      currentMonth,
      field,
      tasks,
      fieldId
    );
    return sortTemplates(filtered, currentMonth, field, tasks, fieldId);
  }, [filters, currentMonth, field, tasks, fieldId]);

  const filteredTemplates = useLocalizedTemplates(filteredRaw);
  const allLocalized = useLocalizedTemplates(OLIVE_TASK_TEMPLATES);

  const selectedTemplate = useMemo(
    () => filteredTemplates.find((tpl) => tpl.id === selectedTemplateId) ?? null,
    [filteredTemplates, selectedTemplateId]
  );

  const recommendedCount = useMemo(
    () =>
      OLIVE_TASK_TEMPLATES.filter((tpl) =>
        isRecommendedNow(tpl, currentMonth, field, tasks, fieldId)
      ).length,
    [currentMonth, field, tasks, fieldId]
  );

  const highlightedIds = useMemo(() => {
    if (!filters.recommendedOnly && !filters.search && filters.category === 'All') {
      return new Set<string>();
    }
    return new Set(filteredRaw.map((tpl) => tpl.id));
  }, [filteredRaw, filters]);

  const handleSelectTemplate = (template: OliveTaskTemplate, month?: number) => {
    setSelectedTemplateId(template.id);
    setSelectedMonth(month);
    if (isMobile) setMobileDetailOpen(true);
  };

  const handleCreateTask = (template?: OliveTaskTemplate, month?: number) => {
    const tpl = template || selectedTemplate;
    if (!tpl) return;
    const m = month ?? selectedMonth;
    navigate(buildCreateTaskUrl(tpl.id, fieldId, m));
  };

  if (user?.role !== 'FieldOwner' && user?.role !== 'Administrator') {
    return (
      <PageContainer>
        <div className="field-task-templates-page">
          <Breadcrumbs />
          <EmptyState
            title={t('taskTemplates:page.accessRestrictedTitle')}
            description={t('taskTemplates:page.accessRestrictedDescription')}
          />
          <Button to={fieldId ? `/fields/${fieldId}` : '/fields'} variant="outline" icon={<ArrowLeft />}>
            {t('common:back')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="field-task-templates-page">
          <Breadcrumbs />
          <div className="tt-error">{error}</div>
          <Button to={fieldId ? `/fields/${fieldId}` : '/fields'} variant="outline" icon={<ArrowLeft />}>
            {t('common:back')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="field-task-templates-page">
        <Breadcrumbs />

        <header className="tt-page-header">
          <div className="tt-page-header-top">
            <Button
              to={fieldId ? `/fields/${fieldId}` : '/fields'}
              variant="outline"
              size="sm"
              icon={<ArrowLeft />}
            >
              {t('taskTemplates:page.backToField')}
            </Button>
          </div>
          <div className="tt-page-header-content">
            <div className="tt-page-title-row">
              <CalendarDays className="tt-page-icon" />
              <div>
                <h1>{t('taskTemplates:page.title')}</h1>
                <p className="tt-page-desc">{t('taskTemplates:page.description')}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="tt-field-context">
          {field ? (
            <div className="tt-field-context-grid">
              <div className="tt-field-context-item">
                <Leaf size={16} />
                <span>
                  <strong>{t('taskTemplates:fieldContext.field')}:</strong> {field.name}
                </span>
              </div>
              <div className="tt-field-context-item">
                <span>
                  <strong>{t('taskTemplates:fieldContext.treeType')}:</strong>{' '}
                  {t('taskTemplates:fieldContext.treeTypeValue')}
                </span>
              </div>
              <div className="tt-field-context-item">
                <span>
                  <strong>{t('taskTemplates:fieldContext.variety')}:</strong> {field.variety || '—'}
                </span>
              </div>
              <div className="tt-field-context-item">
                <span>
                  <strong>{t('taskTemplates:fieldContext.production')}:</strong>{' '}
                  {t('taskTemplates:fieldContext.productionValue')}
                </span>
              </div>
              <div className="tt-field-context-item">
                <span>
                  <strong>{t('taskTemplates:fieldContext.irrigation')}:</strong>{' '}
                  {field.irrigationStatus
                    ? t('taskTemplates:fieldContext.irrigationDrip')
                    : t('taskTemplates:fieldContext.irrigationRainFed')}
                </span>
              </div>
              <div className="tt-field-context-item">
                <span>
                  <strong>{t('taskTemplates:fieldContext.region')}:</strong>{' '}
                  {t('taskTemplates:fieldContext.regionValue')}
                </span>
              </div>
            </div>
          ) : (
            <p className="tt-field-context-empty">{t('taskTemplates:page.noFieldHint')}</p>
          )}
        </section>

        <TaskTemplateFilters
          filters={filters}
          onChange={setFilters}
          recommendedCount={recommendedCount}
        />

        <section className="tt-calendar-section">
          <h2 className="tt-section-title">{t('taskTemplates:page.yearCalendar')}</h2>
          <TaskTemplateCalendar
            templates={filteredTemplates.length > 0 ? filteredTemplates : allLocalized}
            selectedId={selectedTemplateId}
            currentMonth={currentMonth}
            field={field}
            tasks={tasks}
            fieldId={fieldId}
            highlightedIds={highlightedIds}
            onSelect={handleSelectTemplate}
          />
        </section>

        <section className="tt-main-content">
          <div className="tt-cards-column">
            <h2 className="tt-section-title">
              {t('taskTemplates:page.taskTemplates')}
              <span className="tt-count">{filteredTemplates.length}</span>
            </h2>

            {filteredTemplates.length === 0 ? (
              <EmptyState
                title={t('taskTemplates:page.emptyFiltersTitle')}
                description={t('taskTemplates:page.emptyFiltersDescription')}
              />
            ) : (
              <div className="tt-card-list">
                {filteredTemplates.map((template) => (
                  <TaskTemplateCard
                    key={template.id}
                    template={template}
                    selected={selectedTemplateId === template.id}
                    currentMonth={currentMonth}
                    field={field}
                    tasks={tasks}
                    fieldId={fieldId}
                    onSelect={() => handleSelectTemplate(template)}
                    onPreview={() => handleSelectTemplate(template)}
                    onCreate={() => handleCreateTask(template)}
                  />
                ))}
              </div>
            )}
          </div>

          {!isMobile && (
            <aside className="tt-detail-column">
              <TaskTemplateDetailPanel
                template={selectedTemplate}
                currentMonth={currentMonth}
                field={field}
                tasks={tasks}
                fieldId={fieldId}
                selectedMonth={selectedMonth}
                onCreate={() => handleCreateTask()}
              />
            </aside>
          )}
        </section>

        {isMobile && mobileDetailOpen && selectedTemplate && (
          <>
            <div
              className="tt-mobile-backdrop"
              onClick={() => setMobileDetailOpen(false)}
              aria-hidden
            />
            <TaskTemplateDetailPanel
              template={selectedTemplate}
              currentMonth={currentMonth}
              field={field}
              tasks={tasks}
              fieldId={fieldId}
              selectedMonth={selectedMonth}
              mobile
              onClose={() => setMobileDetailOpen(false)}
              onCreate={() => handleCreateTask()}
            />
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default FieldTaskTemplatesPage;
