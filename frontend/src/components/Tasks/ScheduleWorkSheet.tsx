import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import type { Field } from '../../services/fieldService';
import type { CreateTaskInput, TaskSuggestion, TaskTimingBucket } from '../../services/taskService';
import type { AssigneeOption } from './form/AssigneeSelector';
import AssigneeSelector from './form/AssigneeSelector';
import TemplatePicker, { type TemplatePickerSelection } from './TemplatePicker';
import '../Tasks/form/TaskForm.css';
import './ScheduleWorkSheet.css';

export type TimingChip = TaskTimingBucket | 'pickDate';

export type ScheduleWorkPrefill = {
  fieldId?: string;
  title?: string;
  templateCode?: string;
  timingBucket?: TaskTimingBucket;
  scheduledFor?: string;
  note?: string;
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

const TIMING_CHIPS: Array<{ id: TimingChip; labelKey: string }> = [
  { id: 'today', labelKey: 'schedule.when.today' },
  { id: 'tomorrow', labelKey: 'schedule.when.tomorrow' },
  { id: 'thisWeek', labelKey: 'schedule.when.thisWeek' },
  { id: 'pickDate', labelKey: 'schedule.when.otherDay' },
  { id: 'later', labelKey: 'schedule.when.sometime' },
];

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
  const [title, setTitle] = useState('');
  const [templateCode, setTemplateCode] = useState<string | undefined>();
  const [fieldId, setFieldId] = useState('');
  const [timing, setTiming] = useState<TimingChip>('today');
  const [scheduledFor, setScheduledFor] = useState('');
  const [assigneeKey, setAssigneeKey] = useState('later');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [note, setNote] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [checklistText, setChecklistText] = useState('');

  const selfKey = useMemo(
    () => assigneeOptions.find((option) => option.group === 'self')?.key || 'later',
    [assigneeOptions]
  );

  useEffect(() => {
    if (!open) return;
    const nextField = prefill?.fieldId || fields[0]?.id || '';
    setFieldId(nextField);
    setTitle(prefill?.title || '');
    setTemplateCode(prefill?.templateCode);
    setTiming(prefill?.timingBucket || 'today');
    setScheduledFor(prefill?.scheduledFor || '');
    setAssigneeKey(selfKey);
    setNote(prefill?.note || '');
    setRecurrence('');
    setChecklistText('');
    setDetailsOpen(false);
    setPickingTemplate(!prefill?.title && !prefill?.templateCode);
  }, [open, prefill, fields, selfKey]);

  const canSubmit = Boolean(title.trim() && fieldId && !busy);

  const applyTemplate = (selection: TemplatePickerSelection) => {
    if (selection.kind === 'custom') {
      setTemplateCode(undefined);
      if (!title.trim()) setTitle('');
    } else {
      setTemplateCode(selection.templateCode);
      setTitle(selection.title);
    }
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
      return { assigneeId: id, assignedCollaboratorId: id };
    }
    return { assigneeId: key, assignedUserId: key };
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const timingBucket: TaskTimingBucket =
      timing === 'pickDate' ? 'later' : timing === 'later' ? 'later' : timing;
    const checklist = checklistText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({ key: `c${index + 1}`, textValue: line, isAnswered: false }));

    void onSubmit({
      fieldId,
      title: title.trim(),
      templateCode,
      timingBucket,
      scheduledFor: timing === 'pickDate' && scheduledFor ? scheduledFor : undefined,
      note: note.trim() || undefined,
      notes: note.trim() || undefined,
      recurrence: recurrence.trim() || undefined,
      checklist: checklist.length > 0 ? checklist : undefined,
      ...parseAssignee(assigneeKey),
    });
  };

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      size="md"
      className="schedule-work-sheet"
      title={
        pickingTemplate ? t('schedule.templates.title') : t('schedule.title')
      }
      subtitle={pickingTemplate ? t('schedule.templates.subtitle') : undefined}
      footer={
        pickingTemplate ? null : (
          <div className="schedule-work-footer">
            <Button variant="outline" size="lg" onClick={onClose} disabled={busy}>
              {t('schedule.cancel')}
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {t('schedule.submit')}
            </Button>
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
            if (title.trim() || templateCode) setPickingTemplate(false);
            else onClose();
          }}
        />
      ) : (
        <div className="schedule-work-form">
          {error ? <p className="task-form-error" role="alert">{error}</p> : null}

          <label className="task-form-field">
            <span className="task-form-label">{t('schedule.what')}</span>
            <div className="schedule-title-row">
              <input
                className="task-form-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('schedule.whatPlaceholder')}
                autoFocus
              />
              <button
                type="button"
                className="schedule-pick-template"
                onClick={() => setPickingTemplate(true)}
              >
                {t('schedule.pickTemplate')}
              </button>
            </div>
          </label>

          <label className="task-form-field">
            <span className="task-form-label">{t('schedule.field')}</span>
            <select
              className="task-form-input"
              value={fieldId}
              onChange={(event) => setFieldId(event.target.value)}
            >
              {fields.length === 0 ? (
                <option value="">{t('schedule.noFields')}</option>
              ) : null}
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
          </label>

          <div className="task-form-field">
            <span className="task-form-label" id="schedule-when-label">
              {t('schedule.when.label')}
            </span>
            <div className="schedule-when-chips" role="radiogroup" aria-labelledby="schedule-when-label">
              {TIMING_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  role="radio"
                  aria-checked={timing === chip.id}
                  className={`task-type-chip${timing === chip.id ? ' is-selected' : ''}`}
                  onClick={() => setTiming(chip.id)}
                >
                  {t(chip.labelKey)}
                </button>
              ))}
            </div>
            {timing === 'pickDate' ? (
              <input
                type="date"
                className="task-form-input"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
              />
            ) : null}
          </div>

          <div className="task-form-field">
            <span className="task-form-label" id="schedule-who-label">
              {t('schedule.who')}
            </span>
            <AssigneeSelector
              options={assigneeOptions}
              value={assigneeKey}
              onChange={setAssigneeKey}
              hideLabel
              labelId="schedule-who-label"
            />
          </div>

          <div className="schedule-more">
            <button
              type="button"
              className="schedule-more-toggle"
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((openNow) => !openNow)}
            >
              {detailsOpen ? t('schedule.lessDetails') : t('schedule.moreDetails')}
            </button>
            {detailsOpen ? (
              <div className="schedule-more-body">
                <label className="task-form-field">
                  <span className="task-form-label">{t('schedule.note')}</span>
                  <textarea
                    className="task-form-input"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={t('schedule.notePlaceholder')}
                  />
                </label>
                <label className="task-form-field">
                  <span className="task-form-label">{t('schedule.repeat')}</span>
                  <input
                    className="task-form-input"
                    value={recurrence}
                    onChange={(event) => setRecurrence(event.target.value)}
                    placeholder={t('schedule.repeatPlaceholder')}
                  />
                </label>
                <label className="task-form-field">
                  <span className="task-form-label">{t('schedule.checklist')}</span>
                  <textarea
                    className="task-form-input"
                    rows={3}
                    value={checklistText}
                    onChange={(event) => setChecklistText(event.target.value)}
                    placeholder={t('schedule.checklistPlaceholder')}
                  />
                </label>
                <p className="schedule-photo-hint">{t('schedule.photoHint')}</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </RightDrawer>
  );
};

export default ScheduleWorkSheet;
