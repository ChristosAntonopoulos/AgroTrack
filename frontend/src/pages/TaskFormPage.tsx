import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTaskService, getFieldService, getUserService } from '../services/serviceFactory';
import { demoStore } from '../services/demo/demoStore';
import { CreateTaskDto } from '../services/taskService';
import { Field } from '../services/fieldService';
import { User } from '../services/userService';
import { OLIVE_TASK_TEMPLATES } from '../data/oliveTaskTemplates';
import { OliveTaskTemplate } from '../types/oliveTaskTemplate';
import {
  getSuggestedEndDate,
  getSuggestedStartDate,
  filterTemplates,
  sortTemplates,
  CATEGORY_STYLES,
  PRIORITY_VARIANT,
  isRecommendedNow,
} from '../utils/taskTemplateUtils';
import {
  useAllLocalizedTemplates,
  useLocalizedTemplate,
  useTaskTemplateLabels,
} from '../hooks/useLocalizedTaskTemplate';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import Badge from '../components/Common/Badge';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ClipboardList,
  MapPin,
  Sparkles,
} from 'lucide-react';
import './TaskFormPage.css';

type FormStep = 'field' | 'template' | 'schedule' | 'review';

const STEPS: FormStep[] = ['field', 'template', 'schedule', 'review'];

const STEP_ICONS: Record<FormStep, React.ReactNode> = {
  field: <MapPin size={16} />,
  template: <Sparkles size={16} />,
  schedule: <Calendar size={16} />,
  review: <Check size={16} />,
};

const TaskFormPage: React.FC = () => {
  const { t } = useTranslation(['tasks', 'common', 'taskTemplates']);
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const labels = useTaskTemplateLabels();
  const localizedTemplates = useAllLocalizedTemplates();

  const isEditMode = !!id;
  const templateIdParam = searchParams.get('templateId');
  const fieldIdParam = searchParams.get('fieldId');
  const monthParam = searchParams.get('month');

  const getInitialStep = (): FormStep => {
    if (templateIdParam && fieldIdParam) return 'schedule';
    if (fieldIdParam) return 'template';
    return 'field';
  };

  const [step, setStep] = useState<FormStep>(getInitialStep);
  const [fields, setFields] = useState<Field[]>([]);
  const [producers, setProducers] = useState<User[]>([]);
  const [existingTasks, setExistingTasks] = useState<import('../services/taskService').Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [recommendedOnly, setRecommendedOnly] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templateIdParam);
  const [manualMode, setManualMode] = useState(false);
  const [initialTemplateApplied, setInitialTemplateApplied] = useState(false);

  const [formData, setFormData] = useState<CreateTaskDto>({
    fieldId: fieldIdParam || '',
    type: '',
    title: '',
    description: '',
    lifecycleYear: 'low',
    assignedTo: '',
    scheduledStart: '',
    scheduledEnd: '',
    priority: 'Medium',
    checklist: [],
    repetition: '',
    completionFields: [],
    notes: '',
  });

  const [checklistText, setChecklistText] = useState('');

  const rawSelectedTemplate = useMemo(
    () => (selectedTemplateId ? OLIVE_TASK_TEMPLATES.find((x) => x.id === selectedTemplateId) : undefined),
    [selectedTemplateId]
  );
  const selectedTemplate = useLocalizedTemplate(rawSelectedTemplate ?? null);
  const currentMonth = new Date().getMonth() + 1;
  const selectedField = fields.find((f) => f.id === formData.fieldId) ?? null;

  useEffect(() => {
    if (user?.role === 'FieldOwner') {
      loadInitialData();
    } else {
      setPageLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isEditMode && user?.userId && user.role === 'FieldOwner') {
      demoStore.markDemoStep(user.userId, user.role, 'owner_schedule_template');
    }
  }, [isEditMode, user?.userId, user?.role]);

  const loadInitialData = async () => {
    try {
      setPageLoading(true);
      const [fieldsData, producersData] = await Promise.all([
        getFieldService().getFields(),
        getUserService().getUsers('Producer'),
      ]);
      setFields(fieldsData);
      setProducers(producersData);

      if (formData.fieldId) {
        const tasks = await getTaskService().getTasks(formData.fieldId);
        setExistingTasks(tasks);
      }
    } catch {
      setError(t('tasks:form.failedLoadFields'));
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (!formData.fieldId) return;
    getTaskService()
      .getTasks(formData.fieldId)
      .then(setExistingTasks)
      .catch(() => undefined);
  }, [formData.fieldId]);

  const applyTemplate = (template: OliveTaskTemplate, month?: number) => {
    const localized = localizedTemplates.find((x) => x.id === template.id) ?? template;
    const startDate = getSuggestedStartDate(template, month);
    const endDate = getSuggestedEndDate(template, startDate);

    setFormData((prev) => ({
      ...prev,
      templateId: template.id,
      type: template.category,
      title: localized.title,
      description: localized.shortDescription,
      lifecycleYear: selectedField?.currentLifecycleYear || 'low',
      scheduledStart: startDate,
      scheduledEnd: endDate || '',
      priority: template.priority,
      checklist: localized.checklist,
      repetition: localized.repetition,
      completionFields: localized.completionFields,
      notes: localized.timingExplanation,
    }));
    setChecklistText(localized.checklist.join('\n'));
    setManualMode(false);
  };

  useEffect(() => {
    if (initialTemplateApplied || !templateIdParam || fields.length === 0 || manualMode) return;
    const tpl = OLIVE_TASK_TEMPLATES.find((x) => x.id === templateIdParam);
    if (tpl) {
      const month = monthParam ? parseInt(monthParam, 10) : undefined;
      applyTemplate(tpl, month);
      setInitialTemplateApplied(true);
    }
  }, [templateIdParam, fields.length, monthParam, manualMode, initialTemplateApplied]);

  const visibleTemplates = useMemo(() => {
    const filtered = filterTemplates(
      localizedTemplates,
      {
        search: templateSearch,
        category: 'All',
        season: 'All year',
        priority: 'All',
        recommendedOnly,
        fieldSuitableOnly: true,
      },
      currentMonth,
      selectedField,
      existingTasks,
      formData.fieldId
    );
    return sortTemplates(filtered, currentMonth, selectedField, existingTasks, formData.fieldId);
  }, [
    localizedTemplates,
    templateSearch,
    recommendedOnly,
    currentMonth,
    selectedField,
    existingTasks,
    formData.fieldId,
  ]);

  const stepIndex = STEPS.indexOf(step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const validateStep = (s: FormStep): string | null => {
    if (s === 'field' && !formData.fieldId) return t('tasks:form.errors.fieldRequired');
    if (s === 'template' && !manualMode && !selectedTemplateId) {
      return t('tasks:form.errors.templateRequired');
    }
    if (s === 'schedule') {
      if (!formData.title.trim()) return t('tasks:form.errors.titleRequired');
      if (!formData.type.trim()) return t('tasks:form.errors.typeRequired');
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step === 'field' && templateIdParam) {
      setStep('schedule');
      return;
    }
    if (!isLast) setStep(STEPS[stepIndex + 1]);
  };

  const goBack = () => {
    setError(null);
    if (!isFirst) setStep(STEPS[stepIndex - 1]);
  };

  const handleFieldSelect = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    setFormData((prev) => ({
      ...prev,
      fieldId,
      lifecycleYear: field?.currentLifecycleYear || 'low',
    }));
    setSelectedTemplateId(null);
    setManualMode(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = OLIVE_TASK_TEMPLATES.find((x) => x.id === templateId);
    if (tpl) applyTemplate(tpl);
  };

  const handleManualMode = () => {
    setManualMode(true);
    setSelectedTemplateId(null);
    setFormData((prev) => ({
      ...prev,
      templateId: undefined,
      type: '',
      title: '',
      description: '',
      checklist: [],
      repetition: '',
      completionFields: [],
      notes: '',
      priority: 'Medium',
    }));
    setChecklistText('');
    setStep('schedule');
  };

  const handleSubmit = async () => {
    const err = validateStep('schedule');
    if (err) {
      setError(err);
      setStep('schedule');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const checklist = checklistText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const submitData: CreateTaskDto = {
        ...formData,
        checklist: checklist.length > 0 ? checklist : undefined,
        assignedTo: formData.assignedTo || undefined,
        scheduledStart: formData.scheduledStart || undefined,
        scheduledEnd: formData.scheduledEnd || undefined,
        templateId: formData.templateId || undefined,
        repetition: formData.repetition || undefined,
        completionFields: formData.completionFields?.length ? formData.completionFields : undefined,
        notes: formData.notes || undefined,
      };

      if (isEditMode) {
        setError(t('tasks:form.editNotImplemented'));
        return;
      }

      await getTaskService().createTask(submitData);
      navigate(formData.fieldId ? `/fields/${formData.fieldId}` : '/tasks');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || t('tasks:form.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const backLink = fieldIdParam
    ? `/fields/${fieldIdParam}/task-templates`
    : '/tasks';

  if (user?.role !== 'FieldOwner') {
    return (
      <PageContainer>
        <div className="task-form-page">
          <Breadcrumbs />
          <div className="task-form-error">{t('tasks:form.permissionDenied')}</div>
          <Button to="/tasks" icon={<ArrowLeft />} variant="outline">
            {t('tasks:form.backToTasks')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (pageLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <PageContainer>
      <div className="task-form-page">
        <Breadcrumbs />

        <header className="task-form-header">
          <Button to={backLink} icon={<ArrowLeft />} variant="outline" size="sm">
            {selectedTemplate ? t('tasks:form.backToTemplates') : t('tasks:form.backToTasks')}
          </Button>
          <div>
            <h1>{isEditMode ? t('tasks:form.editTitle') : t('tasks:form.newTitle')}</h1>
            <p className="task-form-subtitle">{t('tasks:form.subtitle')}</p>
          </div>
        </header>

        <nav className="task-form-steps" aria-label={t('tasks:form.stepsAria')}>
          {STEPS.map((s, idx) => (
            <button
              key={s}
              type="button"
              className={[
                'task-form-step',
                step === s && 'active',
                idx < stepIndex && 'done',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => idx <= stepIndex && setStep(s)}
              disabled={idx > stepIndex}
            >
              <span className="task-form-step-icon">{STEP_ICONS[s]}</span>
              <span>{t(`tasks:form.steps.${s}`)}</span>
            </button>
          ))}
        </nav>

        {error && <div className="task-form-error">{error}</div>}

        <Card className="task-form-card">
          {step === 'field' && (
            <div className="task-form-panel">
              <h2>{t('tasks:form.steps.field')}</h2>
              <p className="task-form-panel-desc">{t('tasks:form.fieldDesc')}</p>

              {fields.length === 0 ? (
                <p className="task-form-hint">{t('tasks:form.noFields')}</p>
              ) : (
                <div className="task-field-grid">
                  {fields.map((field) => (
                    <button
                      key={field.id}
                      type="button"
                      className={`task-field-option${formData.fieldId === field.id ? ' selected' : ''}`}
                      onClick={() => handleFieldSelect(field.id)}
                    >
                      <strong>{field.name}</strong>
                      <span>
                        {field.area} {t('tasks:form.hectares')} · {t(`common:lifecycleYear.${field.currentLifecycleYear}`)}
                      </span>
                      {field.variety && <span className="task-field-variety">{field.variety}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'template' && (
            <div className="task-form-panel">
              <h2>{t('tasks:form.steps.template')}</h2>
              <p className="task-form-panel-desc">{t('tasks:form.templateDesc')}</p>

              <div className="task-template-toolbar">
                <input
                  type="search"
                  placeholder={t('tasks:form.templateSearch')}
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                />
                <label className="task-template-toggle">
                  <input
                    type="checkbox"
                    checked={recommendedOnly}
                    onChange={(e) => setRecommendedOnly(e.target.checked)}
                  />
                  {t('tasks:form.recommendedOnly')}
                </label>
              </div>

              <div className="task-template-grid">
                {visibleTemplates.map((tpl) => {
                  const style = CATEGORY_STYLES[tpl.category];
                  const recommended = isRecommendedNow(
                    tpl,
                    currentMonth,
                    selectedField,
                    existingTasks,
                    formData.fieldId
                  );
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      className={`task-template-option${selectedTemplateId === tpl.id ? ' selected' : ''}${recommended ? ' recommended' : ''}`}
                      onClick={() => handleTemplateSelect(tpl.id)}
                    >
                      <div className="task-template-option-top">
                        <span
                          className="task-template-cat"
                          style={{ background: style.chipBg, color: style.text }}
                        >
                          {labels.categoryLabel(tpl.category)}
                        </span>
                        <Badge variant={PRIORITY_VARIANT[tpl.priority]} size="sm">
                          {labels.priorityLabel(tpl.priority)}
                        </Badge>
                      </div>
                      <strong>{tpl.title}</strong>
                      <p>{tpl.shortDescription}</p>
                      {recommended && (
                        <span className="task-template-rec">{t('taskTemplates:card.recommendedNow')}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button type="button" className="task-manual-link" onClick={handleManualMode}>
                <ClipboardList size={16} />
                {t('tasks:form.manualTask')}
              </button>
            </div>
          )}

          {step === 'schedule' && (
            <div className="task-form-panel">
              <h2>{t('tasks:form.steps.schedule')}</h2>
              <p className="task-form-panel-desc">{t('tasks:form.scheduleDesc')}</p>

              {selectedTemplate && !manualMode && (
                <div className="task-form-template-banner">
                  <Sparkles size={18} />
                  <div>
                    <strong>{t('tasks:form.templateBannerTitle', { name: selectedTemplate.title })}</strong>
                    <p>{selectedTemplate.shortDescription}</p>
                  </div>
                </div>
              )}

              <div className="task-form-row">
                <div className="task-form-group">
                  <label htmlFor="type">{t('tasks:form.taskType')} *</label>
                  <input
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    placeholder={t('tasks:form.taskTypePlaceholder')}
                    required
                  />
                </div>
                <div className="task-form-group">
                  <label htmlFor="priority">{t('tasks:form.priority')}</label>
                  <select id="priority" name="priority" value={formData.priority || 'Medium'} onChange={handleChange}>
                    {(['Low', 'Medium', 'High', 'Critical'] as const).map((p) => (
                      <option key={p} value={p}>
                        {t(`tasks:form.priorities.${p}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="task-form-group">
                <label htmlFor="title">{t('tasks:form.title')} *</label>
                <input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={t('tasks:form.titlePlaceholder')}
                  required
                />
              </div>

              <div className="task-form-group">
                <label htmlFor="description">{t('common:description')}</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder={t('tasks:form.descriptionPlaceholder')}
                />
              </div>

              <div className="task-form-row">
                <div className="task-form-group">
                  <label htmlFor="scheduledStart">{t('tasks:form.scheduledStart')}</label>
                  <input
                    type="datetime-local"
                    id="scheduledStart"
                    name="scheduledStart"
                    value={formData.scheduledStart}
                    onChange={handleChange}
                  />
                </div>
                <div className="task-form-group">
                  <label htmlFor="scheduledEnd">{t('tasks:form.scheduledEnd')}</label>
                  <input
                    type="datetime-local"
                    id="scheduledEnd"
                    name="scheduledEnd"
                    value={formData.scheduledEnd}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="task-form-group">
                <label htmlFor="assignedTo">{t('tasks:form.assignTo')}</label>
                <select id="assignedTo" name="assignedTo" value={formData.assignedTo} onChange={handleChange}>
                  <option value="">{t('tasks:form.notAssigned')}</option>
                  {producers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="task-form-group">
                <label htmlFor="checklist">{t('tasks:form.checklist')}</label>
                <textarea
                  id="checklist"
                  value={checklistText}
                  onChange={(e) => setChecklistText(e.target.value)}
                  rows={5}
                  placeholder={t('tasks:form.checklistPlaceholder')}
                />
              </div>

              <div className="task-form-group">
                <label htmlFor="notes">{t('tasks:form.notes')}</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder={t('tasks:form.notesPlaceholder')}
                />
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="task-form-panel">
              <h2>{t('tasks:form.steps.review')}</h2>
              <p className="task-form-panel-desc">{t('tasks:form.reviewDesc')}</p>

              <dl className="task-review-list">
                <div>
                  <dt>{t('tasks:form.field')}</dt>
                  <dd>{selectedField?.name || '—'}</dd>
                </div>
                <div>
                  <dt>{t('tasks:form.title')}</dt>
                  <dd>{formData.title}</dd>
                </div>
                <div>
                  <dt>{t('tasks:form.taskType')}</dt>
                  <dd>{formData.type}</dd>
                </div>
                <div>
                  <dt>{t('tasks:form.priority')}</dt>
                  <dd>{t(`tasks:form.priorities.${formData.priority || 'Medium'}`)}</dd>
                </div>
                {formData.scheduledStart && (
                  <div>
                    <dt>{t('tasks:form.scheduledStart')}</dt>
                    <dd>{formData.scheduledStart.replace('T', ' ')}</dd>
                  </div>
                )}
                {formData.scheduledEnd && (
                  <div>
                    <dt>{t('tasks:form.scheduledEnd')}</dt>
                    <dd>{formData.scheduledEnd.replace('T', ' ')}</dd>
                  </div>
                )}
                {checklistText.trim() && (
                  <div>
                    <dt>{t('tasks:form.checklist')}</dt>
                    <dd>
                      <ul>
                        {checklistText
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <div className="task-form-nav">
            {!isFirst && (
              <Button type="button" variant="outline" onClick={goBack} icon={<ArrowLeft />}>
                {t('tasks:form.back')}
              </Button>
            )}
            <div className="task-form-nav-spacer" />
            {!isLast ? (
              <Button type="button" variant="primary" onClick={goNext} icon={<ArrowRight />}>
                {t('tasks:form.next')}
              </Button>
            ) : (
              <Button type="button" variant="primary" onClick={handleSubmit} loading={loading} icon={<Check />}>
                {t('tasks:form.createTask')}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};

export default TaskFormPage;
