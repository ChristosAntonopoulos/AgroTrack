import React from 'react';
import { useTranslation } from 'react-i18next';
import { crossesHarvestYear, deriveResultYear, resultYearChoices } from '../../../utils/taskResultYear';
import TaskChecklistPreview from './TaskChecklistPreview';

export type TimeWindowId = 'morning' | 'midday' | 'afternoon' | 'anytime' | 'specific';

interface TaskAdvancedDetailsProps {
  open: boolean;
  onToggle: () => void;
  templateCode?: string;
  plannedStart?: string;
  timeWindow: TimeWindowId | '';
  specificTime: string;
  estimatedCost: string;
  notes: string;
  resultYear?: number;
  onTimeWindow: (value: TimeWindowId) => void;
  onSpecificTime: (value: string) => void;
  onEstimatedCost: (value: string) => void;
  onNotes: (value: string) => void;
  onResultYear: (value: number) => void;
}

const TIME_OPTIONS: TimeWindowId[] = ['morning', 'midday', 'afternoon', 'anytime', 'specific'];

const TaskAdvancedDetails: React.FC<TaskAdvancedDetailsProps> = ({
  open,
  onToggle,
  templateCode,
  plannedStart,
  timeWindow,
  specificTime,
  estimatedCost,
  notes,
  resultYear,
  onTimeWindow,
  onSpecificTime,
  onEstimatedCost,
  onNotes,
  onResultYear,
}) => {
  const { t } = useTranslation('tasks');
  const derived = deriveResultYear(plannedStart);
  const showYear = crossesHarvestYear(plannedStart);
  const years = resultYearChoices(plannedStart);

  return (
    <div className="task-form-field">
      <button
        type="button"
        className="task-advanced-toggle"
        aria-expanded={open}
        onClick={onToggle}
      >
        {open ? t('fieldWork.form.hideMore') : t('fieldWork.form.moreDetails')}
      </button>
      {open ? (
        <div className="task-advanced">
          <div>
            <p className="task-form-label" id="task-time-label">
              {t('fieldWork.form.preferredTime')}
            </p>
            <div className="task-date-choices" role="group" aria-labelledby="task-time-label">
              {TIME_OPTIONS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`task-form-choice${timeWindow === id ? ' is-selected' : ''}`}
                  aria-pressed={timeWindow === id}
                  onClick={() => onTimeWindow(id)}
                >
                  {t(`fieldWork.form.time.${id}`)}
                </button>
              ))}
            </div>
            {timeWindow === 'specific' ? (
              <input
                className="task-form-input"
                type="time"
                value={specificTime}
                onChange={(event) => onSpecificTime(event.target.value)}
                aria-label={t('fieldWork.form.time.specific')}
              />
            ) : null}
          </div>

          <TaskChecklistPreview templateCode={templateCode} />

          <div>
            <label className="task-form-label" htmlFor="task-cost">
              {t('fieldWork.form.estimatedCost')}
            </label>
            <div className="task-cost-wrap">
              <input
                id="task-cost"
                className="task-form-input"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={estimatedCost}
                onChange={(event) => onEstimatedCost(event.target.value)}
              />
              <span className="task-cost-suffix">€</span>
            </div>
            <p className="task-form-help">{t('fieldWork.form.costHint')}</p>
          </div>

          <div>
            <label className="task-form-label" htmlFor="task-notes">
              {t('fieldWork.form.notesForPerson')}
            </label>
            <textarea
              id="task-notes"
              className="task-form-title"
              rows={3}
              value={notes}
              onChange={(event) => onNotes(event.target.value)}
            />
          </div>

          {showYear ? (
            <div>
              <label className="task-form-label" htmlFor="task-result-year">
                {t('fieldWork.form.resultYear')}
              </label>
              <p className="task-form-help">{t('fieldWork.form.resultYearHint')}</p>
              <select
                id="task-result-year"
                className="task-form-input"
                value={resultYear ?? derived}
                onChange={(event) => onResultYear(Number(event.target.value))}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default TaskAdvancedDetails;
