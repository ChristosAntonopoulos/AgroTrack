import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../../services/fieldService';
import type { FieldWeather } from '../../../services/geospatialService';
import type { TaskProposal } from '../../../services/fieldWorkService';
import { TASK_FORM_TYPES, type TaskFormTypeId, templateFromType } from '../../../utils/taskFormTypes';
import {
  addDaysToIso,
  athensTodayIso,
  toEndIso,
  toStartIso,
  weekSundayIso,
  formatLongTaskDate,
} from '../../../utils/taskFormDates';
import { deriveResultYear } from '../../../utils/taskResultYear';
import type { DatePreset } from './TaskDateSelector';
import type { TimeWindowId } from './TaskAdvancedDetails';
import TaskTypeSelector from './TaskTypeSelector';
import FieldSelector from './FieldSelector';
import TaskDateSelector from './TaskDateSelector';
import AssigneeSelector, { type AssigneeOption } from './AssigneeSelector';
import TaskWeatherSummary from './TaskWeatherSummary';
import TaskFormActions from './TaskFormActions';
import ProposalFormSummary from './ProposalFormSummary';
import Button from '../../Common/Button';
import './TaskForm.css';

export type TaskFormSubmitPayload = {
  fieldId: string;
  title: string;
  templateCode?: string;
  plannedStart?: string;
  plannedEnd?: string;
  preferredTimeWindow?: string;
  assignedUserId?: string;
  assignedCollaboratorId?: string;
  notes?: string;
  estimatedCost?: number;
  resultYear: number;
};

type WizardStep = 'what' | 'where' | 'when' | 'who' | 'review';

interface TaskFormProps {
  mode: 'manual' | 'proposal';
  fields: Field[];
  proposal?: TaskProposal | null;
  weather?: FieldWeather | null;
  assigneeOptions: AssigneeOption[];
  initialTitle: string;
  initialFieldId: string;
  initialType?: TaskFormTypeId | '';
  initialStart?: string;
  initialEnd?: string;
  initialAssigneeKey?: string;
  saving: boolean;
  error?: string | null;
  onFieldChange?: (fieldId: string) => void;
  onCancel: () => void;
  onSubmit: (payload: TaskFormSubmitPayload) => void;
}

const STEPS: WizardStep[] = ['what', 'where', 'when', 'who', 'review'];

const timeWindowValue = (id: TimeWindowId | '', specific: string, language: string): string | undefined => {
  const greek = language.toLowerCase().startsWith('el');
  if (id === 'specific' && specific) return specific;
  if (id === 'morning') return greek ? 'Πρωί' : 'Morning';
  if (id === 'midday') return greek ? 'Μεσημέρι' : 'Midday';
  if (id === 'afternoon') return greek ? 'Απόγευμα' : 'Afternoon';
  if (id === 'anytime') return greek ? 'Οποιαδήποτε ώρα' : 'Any time';
  return undefined;
};

const TaskForm: React.FC<TaskFormProps> = ({
  mode,
  fields,
  proposal,
  weather,
  assigneeOptions,
  initialTitle,
  initialFieldId,
  initialType = '',
  initialStart = '',
  initialEnd = '',
  initialAssigneeKey = '',
  saving,
  error,
  onFieldChange,
  onCancel,
  onSubmit,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const selfKey = assigneeOptions.find((option) => option.group === 'self')?.key || assigneeOptions[0]?.key || 'later';
  const [step, setStep] = useState<WizardStep>(mode === 'proposal' ? 'when' : 'what');
  const [entryMode, setEntryMode] = useState<'template' | 'custom' | null>(
    mode === 'proposal' ? 'template' : null
  );
  const [title, setTitle] = useState(initialTitle);
  const [fieldId, setFieldId] = useState(initialFieldId);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>(
    initialFieldId ? [initialFieldId] : []
  );
  const [multiFieldMode, setMultiFieldMode] = useState<'common' | 'separate'>('separate');
  const [typeId, setTypeId] = useState<TaskFormTypeId | ''>(initialType);
  const [preset, setPreset] = useState<DatePreset | ''>(initialStart ? 'pick' : '');
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [multiDay, setMultiDay] = useState(Boolean(initialStart && initialEnd && initialStart !== initialEnd));
  const [assigneeKey, setAssigneeKey] = useState(initialAssigneeKey || selfKey);
  const [timeWindow] = useState<TimeWindowId | ''>('');
  const [specificTime] = useState('');
  const [notes] = useState('');
  const [estimatedCost] = useState('');
  const [resultYear] = useState<number | undefined>(undefined);

  const templateCode = mode === 'proposal' ? proposal?.templateCode : templateFromType(typeId);
  const stepIndex = STEPS.indexOf(step);

  const applyPreset = (next: DatePreset) => {
    const today = athensTodayIso();
    setPreset(next);
    if (next === 'today') {
      setStart(today);
      setEnd(multiDay ? end || today : '');
    } else if (next === 'tomorrow') {
      const tomorrow = addDaysToIso(today, 1);
      setStart(tomorrow);
      setEnd(multiDay ? end || tomorrow : '');
    } else if (next === 'thisWeek') {
      setStart(today);
      setEnd(weekSundayIso(today));
      setMultiDay(true);
    } else if (next === 'undecided') {
      setStart('');
      setEnd('');
      setMultiDay(false);
    } else if (next === 'pick' && !start) {
      setStart(today);
    }
  };

  const toggleMultiDay = () => {
    setMultiDay((value) => {
      const next = !value;
      if (next && start && !end) setEnd(start);
      if (!next) setEnd('');
      return next;
    });
  };

  const handleType = (next: TaskFormTypeId) => {
    setTypeId(next);
    setEntryMode('template');
    const option = TASK_FORM_TYPES.find((item) => item.id === next);
    const labels = option ? (t(option.suggestionsKey, { returnObjects: true }) as unknown) : [];
    const first = Array.isArray(labels) ? String(labels[0] || '') : '';
    if (first) setTitle(first);
  };

  const canAdvance = (): boolean => {
    if (step === 'what') {
      if (entryMode === 'custom') return Boolean(title.trim());
      return Boolean(typeId && title.trim());
    }
    if (step === 'where') return selectedFieldIds.length > 0 || Boolean(fieldId);
    if (step === 'when') {
      if (!preset) return false;
      if (preset === 'pick') return Boolean(start);
      return true;
    }
    if (step === 'who') return Boolean(assigneeKey);
    return true;
  };

  const goNext = () => {
    if (!canAdvance()) return;
    if (step === 'where' && selectedFieldIds.length === 1) {
      setFieldId(selectedFieldIds[0]);
      onFieldChange?.(selectedFieldIds[0]);
    }
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
    else onCancel();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (step !== 'review') {
      goNext();
      return;
    }
    const primaryField = fieldId || selectedFieldIds[0];
    if (!primaryField || !title.trim()) return;
    const plannedStart = preset === 'undecided' ? undefined : toStartIso(start);
    const plannedEnd = preset === 'undecided' || !multiDay ? undefined : toEndIso(end || start);
    const selected = assigneeOptions.find((option) => option.key === assigneeKey);
    onSubmit({
      fieldId: primaryField,
      title: title.trim(),
      templateCode,
      plannedStart,
      plannedEnd,
      preferredTimeWindow: timeWindowValue(timeWindow, specificTime, i18n.language),
      assignedUserId: selected?.key.startsWith('user:') ? selected.key.slice(5) : undefined,
      assignedCollaboratorId: selected?.key.startsWith('contact:') ? selected.key.slice(8) : undefined,
      notes: notes.trim() || undefined,
      estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
      resultYear: resultYear ?? deriveResultYear(start || undefined),
    });
  };

  const fieldName = useMemo(
    () => fields.find((field) => field.id === (fieldId || selectedFieldIds[0]))?.name || '',
    [fields, fieldId, selectedFieldIds]
  );
  const personName = assigneeOptions.find((option) => option.key === assigneeKey)?.label || '';

  return (
    <form className="task-form-card task-form-wizard" onSubmit={handleSubmit} noValidate>
      <div className="task-form-steps" aria-label={t('form.stepsAria')}>
        {STEPS.map((id, index) => (
          <span
            key={id}
            className={`task-form-step-dot${index === stepIndex ? ' is-active' : ''}${index < stepIndex ? ' is-done' : ''}`}
          >
            {index + 1}
          </span>
        ))}
      </div>

      {error ? (
        <div className="task-form-error" role="alert">
          {error}
        </div>
      ) : null}
      {mode === 'proposal' && proposal ? (
        <ProposalFormSummary proposal={proposal} weather={weather} />
      ) : null}

      {step === 'what' ? (
        <div className="task-form-step">
          <h2 className="task-form-step-title">{t('fieldWork.form.whatQuestion')}</h2>
          <div className="task-form-entry-modes">
            <Button
              type="button"
              variant={entryMode === 'template' ? 'primary' : 'outline'}
              size="lg"
              onClick={() => setEntryMode('template')}
            >
              {t('fieldWork.form.pickTemplate', { defaultValue: 'Επιλογή έτοιμης εργασίας' })}
            </Button>
            <Button
              type="button"
              variant={entryMode === 'custom' ? 'primary' : 'outline'}
              size="lg"
              onClick={() => setEntryMode('custom')}
            >
              {t('fieldWork.form.writeOwn', { defaultValue: 'Γράψε δική σου εργασία' })}
            </Button>
          </div>
          {entryMode === 'template' ? (
            <TaskTypeSelector value={typeId} onChange={handleType} />
          ) : null}
          {entryMode === 'custom' || (entryMode === 'template' && typeId) ? (
            <div className="task-form-field">
              <label className="task-form-label" htmlFor="task-title">
                {t('fieldWork.form.title')}
              </label>
              <textarea
                id="task-title"
                className="task-form-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('fieldWork.form.titlePlaceholder')}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 'where' ? (
        <div className="task-form-step">
          <h2 className="task-form-step-title">{t('fieldWork.form.fieldQuestion')}</h2>
          <FieldSelector
            fields={fields}
            value={fieldId}
            onChange={(next) => {
              setFieldId(next);
              setSelectedFieldIds(next ? [next] : []);
              onFieldChange?.(next);
            }}
          />
          {selectedFieldIds.length > 1 ? (
            <div className="task-form-entry-modes">
              <p>{t('fieldWork.form.multiFieldQuestion', {
                defaultValue: 'Θέλεις μία κοινή εργασία ή ξεχωριστή εργασία για κάθε χωράφι;',
              })}</p>
              <Button
                type="button"
                variant={multiFieldMode === 'common' ? 'primary' : 'outline'}
                size="lg"
                onClick={() => setMultiFieldMode('common')}
              >
                {t('fieldWork.form.commonTask', { defaultValue: 'Κοινή εργασία' })}
              </Button>
              <Button
                type="button"
                variant={multiFieldMode === 'separate' ? 'primary' : 'outline'}
                size="lg"
                onClick={() => setMultiFieldMode('separate')}
              >
                {t('fieldWork.form.separateTasks', { defaultValue: 'Ξεχωριστές εργασίες' })}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 'when' ? (
        <div className="task-form-step">
          <h2 className="task-form-step-title">{t('fieldWork.form.whenQuestion')}</h2>
          <TaskDateSelector
            preset={preset}
            start={start}
            end={end}
            multiDay={multiDay}
            recommendedStart={proposal?.recommendedWindowStart}
            recommendedEnd={proposal?.recommendedWindowEnd}
            onPreset={applyPreset}
            onStartChange={(iso) => {
              setStart(iso);
              setPreset('pick');
            }}
            onEndChange={setEnd}
            onToggleMultiDay={toggleMultiDay}
          />
          {preset && preset !== 'undecided' && start ? (
            <TaskWeatherSummary templateCode={templateCode} weather={weather} />
          ) : null}
        </div>
      ) : null}

      {step === 'who' ? (
        <div className="task-form-step">
          <h2 className="task-form-step-title">{t('fieldWork.form.whoQuestion')}</h2>
          <AssigneeSelector options={assigneeOptions} value={assigneeKey} onChange={setAssigneeKey} />
        </div>
      ) : null}

      {step === 'review' ? (
        <div className="task-form-step">
          <h2 className="task-form-step-title">{t('form.steps.review')}</h2>
          <ul className="task-form-review-list">
            <li>
              <strong>{title}</strong>
            </li>
            <li>{fieldName}</li>
            <li>
              {preset === 'undecided'
                ? t('fieldWork.form.when.undecided', { defaultValue: 'Χωρίς ημερομηνία' })
                : formatLongTaskDate(start, i18n.language)}
            </li>
            <li>
              {t('fieldWork.person')}: {personName}
            </li>
          </ul>
        </div>
      ) : null}

      <div className="task-form-wizard-actions">
        <Button type="button" variant="outline" size="lg" onClick={goBack}>
          {t('form.back')}
        </Button>
        {step === 'review' ? (
          <TaskFormActions
            primaryLabel={
              mode === 'proposal'
                ? t('fieldWork.form.scheduleSubmit')
                : t('fieldWork.form.createSubmit')
            }
            disabledReason={!canAdvance() ? t('fieldWork.form.needTitle') : undefined}
            saving={saving}
            onCancel={onCancel}
          />
        ) : (
          <Button type="button" variant="primary" size="lg" onClick={goNext} disabled={!canAdvance()}>
            {t('form.next')}
          </Button>
        )}
      </div>
    </form>
  );
};

export default TaskForm;
