import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug, Check, ChevronDown, ChevronLeft, Droplets, Leaf, PenLine, Scissors, Sprout, Wheat } from 'lucide-react';
import type { Field } from '../../../services/fieldService';
import { friendlyFieldLabel } from '../../../utils/fieldLabels';
import { resolveFieldColor } from '../../../utils/fieldColors';
import type { TaskProposal } from '../../../services/fieldWorkService';
import { templateTitle } from '../../../data/fieldWorkCatalogueLabels';
import { TASK_FORM_TYPES, templateFromType, typeFromTemplate, type TaskFormTypeId } from '../../../utils/taskFormTypes';
import {
  addDaysToIso,
  athensTodayIso,
  toEndIso,
  toStartIso,
  weekSundayIso,
} from '../../../utils/taskFormDates';
import { formatTaskDateRange } from '../../../utils/taskDateRange';
import TaskDateSelector, { type DatePreset } from './TaskDateSelector';
import AssigneeSelector, { type AssigneeOption } from './AssigneeSelector';
import './TaskForm.css';

const KIND_ICON: Record<TaskFormTypeId, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  irrigation: Droplets,
  fly: Bug,
  fertilisation: Sprout,
  pruning: Scissors,
  weeds: Leaf,
  harvest: Wheat,
  other: PenLine,
};

export type ComposerPayload = {
  fieldIds: string[];
  title: string;
  templateCode?: string;
  plannedStart?: string;
  plannedEnd?: string;
  assignedUserId?: string;
  assignedCollaboratorId?: string;
  notes?: string;
  estimatedCost?: number;
  description?: string;
};

interface TaskComposerProps {
  mode: 'manual' | 'proposal';
  fields: Field[];
  proposal?: TaskProposal | null;
  assigneeOptions: AssigneeOption[];
  initialFieldId: string;
  initialAssigneeKey: string;
  initialTemplateCode?: string;
  saving: boolean;
  error: string | null;
  onFieldChange?: (fieldId: string) => void;
  onCancel: () => void;
  onSubmit: (payload: ComposerPayload) => void;
}

type TaskStep = 'what' | 'where' | 'when' | 'who';

const futureOrToday = (iso?: string): string => {
  const today = athensTodayIso();
  const day = iso?.slice(0, 10) || '';
  if (day && day >= today) return day;
  return today;
};

const TaskComposer: React.FC<TaskComposerProps> = ({
  mode,
  fields,
  proposal,
  assigneeOptions,
  initialFieldId,
  initialAssigneeKey,
  initialTemplateCode = '',
  saving,
  error,
  onFieldChange,
  onCancel,
  onSubmit,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const today = athensTodayIso();
  const seededTemplate = initialTemplateCode.trim();
  const proposalStart = futureOrToday(proposal?.recommendedWindowStart);
  const [typeId, setTypeId] = useState<TaskFormTypeId | ''>(
    seededTemplate ? typeFromTemplate(seededTemplate) || 'other' : ''
  );
  const [title, setTitle] = useState(
    mode === 'proposal' && proposal
      ? templateTitle(proposal.templateCode, i18n.language)
      : seededTemplate
        ? templateTitle(seededTemplate, i18n.language)
        : ''
  );
  const [fieldIds, setFieldIds] = useState<string[]>(initialFieldId ? [initialFieldId] : []);
  const [several, setSeveral] = useState(false);
  const [preset, setPreset] = useState<DatePreset | ''>(mode === 'proposal' ? 'pick' : 'today');
  const [start, setStart] = useState(mode === 'proposal' ? proposalStart : today);
  const [end, setEnd] = useState('');
  const [multiDay, setMultiDay] = useState(false);
  const [assigneeKey, setAssigneeKey] = useState(initialAssigneeKey);
  const steps = useMemo<TaskStep[]>(
    () =>
      mode === 'proposal'
        ? initialFieldId
          ? ['when', 'who']
          : ['where', 'when', 'who']
        : seededTemplate
          ? ['where', 'when', 'who']
          : ['what', 'where', 'when', 'who'],
    [initialFieldId, mode, seededTemplate]
  );
  const [step, setStep] = useState<TaskStep>(steps[0]);
  const [direction, setDirection] = useState(1);
  useEffect(() => {
    document.getElementById('task-step-title')?.scrollIntoView?.({ block: 'nearest' });
  }, [step]);
  const [more, setMore] = useState(false);
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');

  const templateCode =
    mode === 'proposal'
      ? proposal?.templateCode
      : seededTemplate || templateFromType(typeId);

  const applyPreset = (next: DatePreset) => {
    const day = athensTodayIso();
    setPreset(next);
    if (next === 'today') {
      setStart(day);
      setEnd('');
      setMultiDay(false);
    } else if (next === 'tomorrow') {
      const tomorrow = addDaysToIso(day, 1);
      setStart(tomorrow);
      setEnd('');
      setMultiDay(false);
    } else if (next === 'thisWeek') {
      setStart(day);
      setEnd(weekSundayIso(day));
      setMultiDay(true);
    } else if (next === 'undecided') {
      setStart('');
      setEnd('');
      setMultiDay(false);
    } else if (next === 'pick' && !start) {
      setStart(day);
    }
  };

  const selectedFields = several ? fieldIds : fieldIds.slice(0, 1);
  const missingTitle = !title.trim();
  const missingField = selectedFields.length === 0;
  const missingDate = !preset || (preset === 'pick' && !start);
  const disabledReason = missingTitle
    ? t('fieldWork.form.needTitle')
    : missingField
      ? t('fieldWork.form.needField')
      : missingDate
        ? t('fieldWork.form.needDate')
        : '';

  const recommended = useMemo(
    () =>
      formatTaskDateRange(
        proposal?.recommendedWindowStart,
        proposal?.recommendedWindowEnd,
        i18n.language
      ),
    [proposal?.recommendedWindowEnd, proposal?.recommendedWindowStart, i18n.language]
  );

  const toggleField = (id: string) => {
    setFieldIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      onFieldChange?.(next[0] || '');
      return next;
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (disabledReason || saving) return;
    const selected = assigneeOptions.find((option) => option.key === assigneeKey);
    const plannedStart = preset === 'undecided' ? undefined : toStartIso(start);
    const plannedEnd =
      preset === 'undecided' || !multiDay ? undefined : toEndIso(end || start);
    const amount = cost.trim() ? Number(cost.replace(',', '.')) : undefined;
    onSubmit({
      fieldIds: selectedFields,
      title: title.trim(),
      templateCode,
      plannedStart,
      plannedEnd,
      assignedUserId: selected?.key.startsWith('user:') ? selected.key.slice(5) : undefined,
      assignedCollaboratorId: selected?.key.startsWith('contact:')
        ? selected.key.slice(8)
        : undefined,
      notes: notes.trim() || undefined,
      description: description.trim() || undefined,
      estimatedCost: amount != null && !Number.isNaN(amount) ? amount : undefined,
    });
  };

  const summaryField = several
    ? t('notebook.fieldCount', { n: selectedFields.length })
    : friendlyFieldLabel(fields.find((field) => field.id === selectedFields[0])?.name || '');

  const stepIndex = Math.max(0, steps.indexOf(step));
  const isLast = stepIndex === steps.length - 1;
  const goTo = (next: TaskStep) => {
    setDirection(steps.indexOf(next) >= stepIndex ? 1 : -1);
    setStep(next);
  };
  const goNext = () => {
    const next = steps[stepIndex + 1];
    if (next) goTo(next);
  };
  const goBack = () => {
    const prev = steps[stepIndex - 1];
    if (prev) goTo(prev);
  };
  const stepReady =
    step === 'what'
      ? Boolean(title.trim())
      : step === 'where'
        ? selectedFields.length > 0
        : step === 'when'
          ? Boolean(preset) && (preset !== 'pick' || Boolean(start))
          : !disabledReason;

  const stepTitle =
    step === 'what'
      ? t('fieldWork.form.whatQuestion')
      : step === 'where'
        ? t('fieldWork.form.fieldQuestion')
        : step === 'when'
          ? t('fieldWork.form.whenQuestion')
          : t('fieldWork.form.whoQuestion');

  return (
    <form className="task-form" onSubmit={submit}>
      <div className="task-step-bar">
        {stepIndex > 0 ? (
          <button type="button" className="task-step-back" onClick={goBack} aria-label={t('form.back')}>
            <ChevronLeft size={18} aria-hidden />
          </button>
        ) : (
          <span className="task-step-back is-spacer" aria-hidden />
        )}
        <p className="tasks-sr-only">
          {t('form.stepsAria')} {stepIndex + 1}/{steps.length}
        </p>
        <div className="task-step-dots" aria-hidden>
          {steps.map((id, index) => (
            <span
              key={id}
              className={index === stepIndex ? 'is-current' : index < stepIndex ? 'is-done' : ''}
            />
          ))}
        </div>
      </div>
      <div className="task-form-body">
        <div key={step} className="task-step-panel" data-dir={direction}>
          <h2 className="task-step-title" id="task-step-title">
            {stepTitle}
          </h2>
      {step === 'when' && mode === 'proposal' && proposal ? (
        <div className="task-why">
          <p className="task-form-label">{t('fieldWork.form.whyProposed')}</p>
          <p>{proposal.greekExplanation || proposal.explanation}</p>
          {recommended ? (
            <p className="task-form-help">
              {t('fieldWork.form.recommendedWindow')}: {recommended}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 'what' ? (
        <>
          <div className="task-form-field">
            <p className="task-form-label" id="task-kind-label">
              {t('notebook.frequent')}
            </p>
            <div className="task-kind-list" role="group" aria-labelledby="task-kind-label">
              {TASK_FORM_TYPES.map((option) => {
                const Icon = KIND_ICON[option.id];
                const selected = typeId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`task-kind-row${selected ? ' is-selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => {
                      setTypeId(option.id);
                      if (option.id === 'other') return;
                      setTitle(t(option.labelKey));
                      goTo('where');
                    }}
                  >
                    <Icon size={18} aria-hidden />
                    <span>{t(option.labelKey)}</span>
                    {selected ? <Check size={18} aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="task-entry-title">
            <span className="tasks-sr-only">{t('fieldWork.form.whatQuestion')}</span>
            <input
              value={title}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'task-form-error' : undefined}
              placeholder={t('fieldWork.form.titlePlaceholder')}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
        </>
      ) : null}

      {step === 'where' ? (
      <div className="task-form-field">
        <div className="task-field-list" role={several ? 'group' : 'radiogroup'} aria-labelledby="task-step-title">
          {fields.map((field) => {
            const checked = selectedFields.includes(field.id);
            const color = resolveFieldColor(field.color, field.id);
            const name = friendlyFieldLabel(field.name);
            return (
              <button
                key={field.id}
                type="button"
                role={several ? 'checkbox' : 'radio'}
                aria-checked={checked}
                className={`task-field-choice${checked ? ' is-selected' : ''}`}
                style={{ ['--field-accent' as string]: color }}
                onClick={() => {
                  if (several) {
                    toggleField(field.id);
                    return;
                  }
                  setFieldIds([field.id]);
                  onFieldChange?.(field.id);
                  goTo('when');
                }}
              >
                <span className="task-field-swatch" style={{ background: color }} aria-hidden />
                <span className="task-field-choice-name">{name}</span>
                {checked ? <Check size={18} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
        {fields.length > 1 && mode === 'manual' ? (
          <button type="button" className="task-more-toggle" onClick={() => setSeveral((value) => !value)}>
            {several ? t('notebook.oneField') : t('notebook.severalFields')}
          </button>
        ) : null}
      </div>
      ) : null}

      {step === 'when' ? (
      <TaskDateSelector
        hideLabel
        labelId="task-step-title"
        preset={preset}
        start={start}
        end={end}
        multiDay={multiDay}
        recommendedStart={proposal?.recommendedWindowStart}
        recommendedEnd={proposal?.recommendedWindowEnd}
        onPreset={applyPreset}
        onStartChange={(iso) => {
          setPreset('pick');
          setStart(iso);
        }}
        onEndChange={setEnd}
        onToggleMultiDay={() => {
          setMultiDay((value) => {
            const next = !value;
            if (next && start && !end) setEnd(start);
            if (!next) setEnd('');
            return next;
          });
        }}
      />
      ) : null}

      {step === 'who' ? (
      <>
      <AssigneeSelector
        hideLabel
        labelId="task-step-title"
        options={assigneeOptions}
        value={assigneeKey}
        onChange={setAssigneeKey}
      />

      <button
        type="button"
        className={`task-more-toggle${more ? ' is-open' : ''}`}
        aria-expanded={more}
        onClick={() => setMore((value) => !value)}
      >
        <span>{more ? t('fieldWork.form.hideMore') : t('fieldWork.form.moreDetails')}</span>
        <ChevronDown size={18} aria-hidden />
      </button>
      {more ? (
        <div className="task-more-panel">
          <label className="task-form-field">
            <span className="task-form-label">{t('fieldWork.form.notes')}</span>
            <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <label className="task-form-field">
            <span className="task-form-label">{t('detail.description')}</span>
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="task-form-field">
            <span className="task-form-label">{t('fieldWork.form.estimatedCost')}</span>
            <span className="task-cost-wrap">
              <input
                aria-label={t('fieldWork.form.estimatedCost')}
                inputMode="decimal"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
              />
              <span className="task-cost-suffix">€</span>
            </span>
            <span className="task-form-help">{t('fieldWork.form.costHint')}</span>
          </label>
        </div>
      ) : null}
      </>
      ) : null}
        </div>

      {error ? (
        <p id="task-form-error" className="task-form-error" role="alert">
          {error}
        </p>
      ) : null}
      {disabledReason ? (
        <p id="task-form-disabled-reason" className="tasks-sr-only">
          {disabledReason}
        </p>
      ) : null}
      </div>

      <div className="task-form-actions">
        {isLast && title.trim() ? (
          <p className="task-form-summary">
            <strong>{title.trim()}</strong>
            {summaryField ? <span>{summaryField}</span> : null}
          </p>
        ) : null}
        {isLast ? (
          <button
            type="submit"
            className="task-form-save"
            disabled={!stepReady || saving}
            aria-describedby={
              error ? 'task-form-error' : disabledReason ? 'task-form-disabled-reason' : undefined
            }
          >
            {mode === 'proposal' ? t('fieldWork.form.scheduleSubmit') : t('fieldWork.form.createSubmit')}
          </button>
        ) : (
          <button type="button" className="task-form-save" disabled={!stepReady} onClick={goNext}>
            {t('form.next')}
          </button>
        )}
        <button type="button" className="task-form-cancel" onClick={onCancel}>
          {t('fieldWork.form.cancel')}
        </button>
      </div>
    </form>
  );
};

export default TaskComposer;
