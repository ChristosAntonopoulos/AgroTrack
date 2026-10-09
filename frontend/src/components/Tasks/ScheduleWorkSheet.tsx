import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Grid2X2, Pencil } from 'lucide-react';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import type { Field } from '../../services/fieldService';
import type { CreateTaskInput, TaskSuggestion } from '../../services/taskService';
import type { AssigneeOption } from './form/AssigneeSelector';
import AssigneeSelector from './form/AssigneeSelector';
import TemplatePicker, { type TemplatePickerSelection } from './TemplatePicker';
import { resolveFieldColor } from '../../utils/fieldColors';
import TaskCategoryMark from './TaskCategoryMark';
import {
  getMinimalTemplate,
  minimalTemplateChecklistLines,
  minimalTemplateDescription,
  minimalTemplateTitle,
} from '../../data/minimalTaskTemplates';
import '../Tasks/form/TaskForm.css';
import './ScheduleWorkSheet.css';

export type RecurrenceChip = 'once' | 'weekly' | 'monthly';
type FormStep = 'what' | 'field' | 'who' | 'ready';

export type ScheduleWorkPrefill = {
  fieldId?: string;
  title?: string;
  templateCode?: string;
  note?: string;
  description?: string;
};

interface ScheduleWorkSheetProps {
  open: boolean;
  fields: Field[];
  assigneeOptions: AssigneeOption[];
  suggestions?: TaskSuggestion[];
  prefill?: ScheduleWorkPrefill | null;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => void | Promise<void>;
}

const FORM_STEPS: FormStep[] = ['what', 'field', 'who', 'ready'];

const RECURRENCE_CHIPS: Array<{ id: RecurrenceChip; labelKey: string }> = [
  { id: 'once', labelKey: 'schedule.repeatOnce' },
  { id: 'weekly', labelKey: 'schedule.repeatWeekly' },
  { id: 'monthly', labelKey: 'schedule.repeatMonthly' },
];

const newIdempotencyKey = () =>
  `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const ScheduleWorkSheet: React.FC<ScheduleWorkSheetProps> = ({
  open,
  fields,
  assigneeOptions,
  suggestions = [],
  prefill,
  busy,
  error,
  onClose,
  onSubmit,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const [pickingTemplate, setPickingTemplate] = useState(false);
  const [step, setStep] = useState<FormStep>('what');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateCode, setTemplateCode] = useState<string | undefined>();
  const [fieldId, setFieldId] = useState('');
  const [assigneeKey, setAssigneeKey] = useState('later');
  const [note, setNote] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceChip>('once');
  const [repeatStart, setRepeatStart] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const idempotencyKeyRef = useRef(newIdempotencyKey());
  const titleRef = useRef<HTMLInputElement>(null);

  const selfKey = useMemo(
    () => assigneeOptions.find((option) => option.group === 'self')?.key || 'later',
    [assigneeOptions]
  );

  const usableFields = useMemo(
    () => fields.filter((field) => (field.status || 'Active') !== 'Draft'),
    [fields]
  );

  const selectedField = usableFields.find((field) => field.id === fieldId);
  const selectedAssignee = assigneeOptions.find((option) => option.key === assigneeKey);

  useEffect(() => {
    if (!open) return;
    idempotencyKeyRef.current = newIdempotencyKey();
    const nextField = prefill?.fieldId || usableFields[0]?.id || fields[0]?.id || '';
    setFieldId(nextField);
    const code = prefill?.templateCode;
    const meta = getMinimalTemplate(code);
    const lang = i18n.language.startsWith('en') ? 'en' : 'el';
    setTemplateCode(code);
    setTitle(prefill?.title || (code ? minimalTemplateTitle(code, i18n.language) : ''));
    setDescription(
      prefill?.description ||
        (code ? meta?.description[lang] || minimalTemplateDescription(code, i18n.language) : '')
    );
    setChecklistText(code ? minimalTemplateChecklistLines(code, i18n.language).join('\n') : '');
    setAssigneeKey(selfKey);
    setNote(prefill?.note || '');
    setRecurrence('once');
    setRepeatStart('');
    setStep('what');
    setDirection(1);
    setPickingTemplate(!prefill?.title && !prefill?.templateCode);
  }, [open, prefill, fields, usableFields, selfKey, i18n.language]);

  useEffect(() => {
    if (!open || pickingTemplate || step !== 'what') return;
    const timer = window.setTimeout(() => titleRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open, pickingTemplate, step]);

  const stepIndex = FORM_STEPS.indexOf(step);
  const titleMissing = !title.trim();
  const fieldMissing = !fieldId;
  const recurrenceNeedsDate = recurrence !== 'once' && !repeatStart;
  const canContinue =
    step === 'what'
      ? Boolean(title.trim())
      : step === 'field'
        ? Boolean(fieldId)
        : step === 'who'
          ? true
          : Boolean(title.trim() && fieldId && !busy && !recurrenceNeedsDate);

  const goTo = (next: FormStep) => {
    const nextIndex = FORM_STEPS.indexOf(next);
    setDirection(nextIndex >= stepIndex ? 1 : -1);
    setStep(next);
  };

  const goNext = () => {
    if (!canContinue) return;
    const next = FORM_STEPS[stepIndex + 1];
    if (next) goTo(next);
  };

  const goBack = () => {
    if (stepIndex <= 0) {
      setPickingTemplate(true);
      return;
    }
    goTo(FORM_STEPS[stepIndex - 1]);
  };

  const applyTemplate = (selection: TemplatePickerSelection) => {
    if (selection.kind === 'custom') {
      setTemplateCode(undefined);
      setTitle('');
      setDescription('');
      setChecklistText('');
    } else {
      setTemplateCode(selection.templateCode);
      setTitle(selection.title);
      setDescription(selection.description);
      setChecklistText(selection.checklistLines.join('\n'));
    }
    setStep('what');
    setDirection(1);
    setPickingTemplate(false);
  };

  const parseAssignee = (
    key: string
  ): Pick<CreateTaskInput, 'assigneeId' | 'assignedUserId' | 'assignedCollaboratorId'> => {
    if (!key || key === 'later') return {};
    if (key.startsWith('user:')) {
      const id = key.slice(5);
      return { assigneeId: id, assignedUserId: id };
    }
    if (key.startsWith('contact:')) {
      const id = key.slice(8);
      return { assignedCollaboratorId: id };
    }
    return { assigneeId: key, assignedUserId: key };
  };

  const handleSubmit = () => {
    if (!canContinue || step !== 'ready') return;
    const checklist = checklistText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({ key: `c${index + 1}`, label: line }));
    const withRepeat = recurrence !== 'once' && repeatStart;

    void onSubmit({
      fieldId,
      title: title.trim(),
      description: description.trim() || undefined,
      templateCode,
      timingBucket: 'later',
      scheduledFor: withRepeat ? repeatStart : undefined,
      plannedStart: withRepeat ? repeatStart : undefined,
      note: note.trim() || undefined,
      notes: note.trim() || undefined,
      recurrence: withRepeat ? recurrence : undefined,
      checklist: checklist.length > 0 ? checklist : undefined,
      idempotencyKey: idempotencyKeyRef.current,
      ...parseAssignee(assigneeKey),
    });
  };

  const stepTitle =
    step === 'what'
      ? t('schedule.stepWhat')
      : step === 'field'
        ? t('schedule.stepField')
        : step === 'who'
          ? t('schedule.stepWho')
          : t('schedule.stepReady');

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      size="md"
      className="schedule-work-sheet"
      title={pickingTemplate ? t('schedule.templates.title') : t('schedule.title')}
      subtitle={pickingTemplate ? t('schedule.templates.subtitle') : t('schedule.formHint')}
      footer={
        pickingTemplate ? null : (
          <div className="schedule-work-footer">
            {step === 'ready' ? (
              <Button variant="primary" size="lg" disabled={!canContinue} onClick={handleSubmit}>
                {t('schedule.submit')}
              </Button>
            ) : (
              <Button variant="primary" size="lg" disabled={!canContinue || busy} onClick={goNext}>
                {t('schedule.continue')}
                <ChevronRight size={18} aria-hidden />
              </Button>
            )}
          </div>
        )
      }
    >
      {pickingTemplate ? (
        <TemplatePicker
          suggestions={suggestions}
          language={i18n.language}
          onSelect={applyTemplate}
          onCancel={() => {
            if (title.trim() || templateCode) {
              setPickingTemplate(false);
              setStep('what');
            } else onClose();
          }}
        />
      ) : (
        <div className="schedule-work-form">
          {error ? <p className="task-form-error" role="alert">{error}</p> : null}

          <div className="schedule-step-bar">
            <button
              type="button"
              className="schedule-step-back"
              onClick={goBack}
              aria-label={t('schedule.back')}
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <span className="schedule-step-progress">
              {t('schedule.stepProgress', { current: stepIndex + 1, total: FORM_STEPS.length })}
            </span>
            <div className="schedule-step-dots" aria-hidden>
              {FORM_STEPS.map((id, index) => (
                <span
                  key={id}
                  className={
                    index === stepIndex ? 'is-current' : index < stepIndex ? 'is-done' : undefined
                  }
                />
              ))}
            </div>
          </div>

          <div key={step} className="schedule-step-panel" data-dir={direction}>
            <h3 className="schedule-step-title" id="schedule-step-title">
              {stepTitle}
            </h3>

            {step === 'what' ? (
              <section className="schedule-section" aria-labelledby="schedule-step-title">
                <div className="schedule-title-card">
                  {templateCode ? (
                    <TaskCategoryMark templateCode={templateCode} size={22} />
                  ) : (
                    <span className="schedule-title-icon" aria-hidden>
                      <Pencil size={20} />
                    </span>
                  )}
                  <input
                    ref={titleRef}
                    className="schedule-title-input"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t('schedule.whatPlaceholder')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        goNext();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="schedule-pick-template"
                    onClick={() => setPickingTemplate(true)}
                  >
                    <Grid2X2 size={16} aria-hidden />
                    {t('schedule.pickTemplate')}
                  </button>
                </div>
                {titleMissing ? <p className="schedule-help">{t('schedule.needTitle')}</p> : null}
                {description ? <p className="schedule-help">{description}</p> : null}
              </section>
            ) : null}

            {step === 'field' ? (
              <section className="schedule-section" aria-labelledby="schedule-step-title">
                <div className="schedule-when-chips" role="radiogroup">
                  {usableFields.length === 0 ? (
                    <span className="schedule-empty-fields">{t('schedule.noFields')}</span>
                  ) : (
                    usableFields.map((field) => (
                      <button
                        key={field.id}
                        type="button"
                        role="radio"
                        aria-checked={fieldId === field.id}
                        className={`task-type-chip${fieldId === field.id ? ' is-selected' : ''}`}
                        onClick={() => setFieldId(field.id)}
                      >
                        <span
                          className="schedule-field-dot"
                          style={{ background: resolveFieldColor(field.color, field.id) }}
                          aria-hidden
                        />
                        {field.name}
                      </button>
                    ))
                  )}
                </div>
                {fieldMissing ? <p className="schedule-help">{t('schedule.needField')}</p> : null}
              </section>
            ) : null}

            {step === 'who' ? (
              <section className="schedule-section" aria-labelledby="schedule-step-title">
                <AssigneeSelector
                  options={assigneeOptions}
                  value={assigneeKey}
                  onChange={setAssigneeKey}
                  hideLabel
                />
              </section>
            ) : null}

            {step === 'ready' ? (
              <section className="schedule-section" aria-labelledby="schedule-step-title">
                <div className="schedule-summary">
                  <p>
                    <strong>{title.trim()}</strong>
                  </p>
                  <p className="schedule-help">
                    {[selectedField?.name, selectedAssignee?.label || t('schedule.decideLater')]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                <label className="task-form-field">
                  <span className="task-form-label">{t('schedule.checklist')}</span>
                  <span className="schedule-help">{t('schedule.checklistHint')}</span>
                  <textarea
                    className="task-form-input"
                    rows={3}
                    value={checklistText}
                    onChange={(event) => setChecklistText(event.target.value)}
                    placeholder={t('schedule.checklistPlaceholder')}
                  />
                </label>

                <label className="task-form-field">
                  <span className="task-form-label">{t('schedule.note')}</span>
                  <textarea
                    className="task-form-input"
                    rows={2}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={t('schedule.notePlaceholder')}
                  />
                </label>

                <div className="task-form-field">
                  <span className="task-form-label" id="schedule-repeat-label">
                    {t('schedule.repeat')}
                  </span>
                  <div
                    className="schedule-when-chips"
                    role="radiogroup"
                    aria-labelledby="schedule-repeat-label"
                  >
                    {RECURRENCE_CHIPS.map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        role="radio"
                        aria-checked={recurrence === chip.id}
                        className={`task-type-chip${recurrence === chip.id ? ' is-selected' : ''}`}
                        onClick={() => setRecurrence(chip.id)}
                      >
                        {t(chip.labelKey)}
                      </button>
                    ))}
                  </div>
                  {recurrence !== 'once' ? (
                    <>
                      <label className="task-form-field">
                        <span className="task-form-label">{t('schedule.repeatStart')}</span>
                        <input
                          type="date"
                          className="task-form-input"
                          value={repeatStart}
                          onChange={(event) => setRepeatStart(event.target.value)}
                        />
                      </label>
                      {recurrenceNeedsDate ? (
                        <p className="schedule-help">{t('schedule.repeatStartRequired')}</p>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <p className="schedule-photo-hint">{t('schedule.photoHint')}</p>
              </section>
            ) : null}
          </div>
        </div>
      )}
    </RightDrawer>
  );
};

export default ScheduleWorkSheet;
