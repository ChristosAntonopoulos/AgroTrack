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
} from '../../../utils/taskFormDates';
import { deriveResultYear } from '../../../utils/taskResultYear';
import type { DatePreset } from './TaskDateSelector';
import type { TimeWindowId } from './TaskAdvancedDetails';
import TaskTypeSelector from './TaskTypeSelector';
import FieldSelector from './FieldSelector';
import TaskDateSelector from './TaskDateSelector';
import AssigneeSelector, { type AssigneeOption } from './AssigneeSelector';
import TaskWeatherSummary from './TaskWeatherSummary';
import TaskAdvancedDetails from './TaskAdvancedDetails';
import TaskFormActions from './TaskFormActions';
import ProposalFormSummary from './ProposalFormSummary';
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
  const [title, setTitle] = useState(initialTitle);
  const [fieldId, setFieldId] = useState(initialFieldId);
  const [typeId, setTypeId] = useState<TaskFormTypeId | ''>(initialType);
  const [preset, setPreset] = useState<DatePreset | ''>(initialStart ? 'pick' : '');
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [multiDay, setMultiDay] = useState(Boolean(initialStart && initialEnd && initialStart !== initialEnd));
  const [assigneeKey, setAssigneeKey] = useState(initialAssigneeKey || selfKey);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timeWindow, setTimeWindow] = useState<TimeWindowId | ''>('');
  const [specificTime, setSpecificTime] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [notes, setNotes] = useState('');
  const [resultYear, setResultYear] = useState<number | undefined>(undefined);

  const templateCode = mode === 'proposal' ? proposal?.templateCode : templateFromType(typeId);
  const suggestions = useMemo(() => {
    const option = TASK_FORM_TYPES.find((item) => item.id === typeId);
    if (!option) return [];
    const raw = t(option.suggestionsKey, { returnObjects: true });
    return Array.isArray(raw) ? (raw as string[]) : [];
  }, [typeId, t]);

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

  const disabledReason = !title.trim()
    ? t('fieldWork.form.needTitle')
    : !fieldId
      ? t('fieldWork.form.needField')
      : !preset
        ? t('fieldWork.form.needDate')
        : preset === 'pick' && !start
          ? t('fieldWork.form.needDate')
          : undefined;

  const handleType = (next: TaskFormTypeId) => {
    setTypeId(next);
    const option = TASK_FORM_TYPES.find((item) => item.id === next);
    const labels = option ? (t(option.suggestionsKey, { returnObjects: true }) as unknown) : [];
    const first = Array.isArray(labels) ? String(labels[0] || '') : '';
    if (!title.trim() && first) setTitle(first);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (disabledReason) return;
    const plannedStart = preset === 'undecided' ? undefined : toStartIso(start);
    const plannedEnd = preset === 'undecided' || !multiDay ? undefined : toEndIso(end || start);
    const selected = assigneeOptions.find((option) => option.key === assigneeKey);
    onSubmit({
      fieldId,
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

  return (
    <form className="task-form-card" onSubmit={handleSubmit} noValidate>
      <div className="tasks-sr-only" aria-live="polite">
        {showAdvanced ? t('fieldWork.a11y.advancedOpened') : ''}
      </div>
      {error ? (
        <div className="task-form-error" role="alert" id="task-form-error">
          {error}
        </div>
      ) : null}
      {mode === 'proposal' && proposal ? (
        <ProposalFormSummary proposal={proposal} weather={weather} />
      ) : null}

      <div className="task-form-field">
        <label className="task-form-label" htmlFor="task-title">
          {t('fieldWork.form.whatQuestion')}
        </label>
        <textarea
          id="task-title"
          className="task-form-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t('fieldWork.form.titlePlaceholder')}
          aria-invalid={!title.trim()}
          aria-describedby={error ? 'task-form-error' : undefined}
        />
        {mode === 'manual' && suggestions.length > 0 ? (
          <div className="task-form-suggestions">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="task-form-suggestion"
                onClick={() => setTitle(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {mode === 'manual' ? <TaskTypeSelector value={typeId} onChange={handleType} /> : null}

      <FieldSelector
        fields={fields}
        value={fieldId}
        onChange={(next) => {
          setFieldId(next);
          onFieldChange?.(next);
        }}
      />

      <div className="task-form-field">
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

      <AssigneeSelector options={assigneeOptions} value={assigneeKey} onChange={setAssigneeKey} />

      <TaskAdvancedDetails
        open={showAdvanced}
        onToggle={() => setShowAdvanced((value) => !value)}
        templateCode={templateCode}
        plannedStart={start || undefined}
        timeWindow={timeWindow}
        specificTime={specificTime}
        estimatedCost={estimatedCost}
        notes={notes}
        resultYear={resultYear}
        onTimeWindow={setTimeWindow}
        onSpecificTime={setSpecificTime}
        onEstimatedCost={setEstimatedCost}
        onNotes={setNotes}
        onResultYear={setResultYear}
      />

      <TaskFormActions
        primaryLabel={
          mode === 'proposal' ? t('fieldWork.form.scheduleSubmit') : t('fieldWork.form.createSubmit')
        }
        disabledReason={disabledReason}
        saving={saving}
        onCancel={onCancel}
      />
    </form>
  );
};

export default TaskForm;
