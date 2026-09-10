import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  addDaysToIso,
  athensTodayIso,
  daysInMonth,
  formatLongTaskDate,
  formatMonthHeading,
  greekWeekdayHeaders,
  parseIsoDateParts,
  toIsoDate,
  weekSundayIso,
  weekdayIndexMondayFirst,
} from '../../../utils/taskFormDates';
import { formatTaskDateRange } from '../../../utils/taskDateRange';

export type DatePreset = 'today' | 'tomorrow' | 'thisWeek' | 'pick' | 'undecided';

interface TaskDateSelectorProps {
  preset: DatePreset | '';
  start: string;
  end: string;
  multiDay: boolean;
  recommendedStart?: string;
  recommendedEnd?: string;
  onPreset: (preset: DatePreset) => void;
  onStartChange: (iso: string) => void;
  onEndChange: (iso: string) => void;
  onToggleMultiDay: () => void;
}

const TaskDateSelector: React.FC<TaskDateSelectorProps> = ({
  preset,
  start,
  end,
  multiDay,
  recommendedStart,
  recommendedEnd,
  onPreset,
  onStartChange,
  onEndChange,
  onToggleMultiDay,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const today = athensTodayIso();
  const startParts = parseIsoDateParts(start) || parseIsoDateParts(today)!;
  const [cursor, setCursor] = useState({ year: startParts.year, month: startParts.month });
  const pickingEnd = multiDay && Boolean(start) && preset === 'pick';

  const blanks = weekdayIndexMondayFirst(cursor.year, cursor.month, 1);
  const count = daysInMonth(cursor.year, cursor.month);
  const headers = greekWeekdayHeaders();
  const recommended = formatTaskDateRange(recommendedStart, recommendedEnd, i18n.language);

  const shiftMonth = (delta: number) => {
    const next = new Date(cursor.year, cursor.month - 1 + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() + 1 });
  };

  const display = useMemo(() => {
    if (preset === 'undecided') return '';
    if (multiDay && start && end) return formatTaskDateRange(start, end, i18n.language);
    return formatLongTaskDate(start, i18n.language);
  }, [preset, multiDay, start, end, i18n.language]);

  return (
    <div className="task-form-field">
      <p className="task-form-label" id="task-when-label">
        {t('fieldWork.form.whenQuestion')}
      </p>
      <div className="task-date-choices" role="group" aria-labelledby="task-when-label">
        {(
          [
            ['today', t('fieldWork.form.when.today')],
            ['tomorrow', t('fieldWork.form.when.tomorrow')],
            ['thisWeek', t('fieldWork.form.when.thisWeek')],
            ['pick', t('fieldWork.form.when.pick')],
            ['undecided', t('fieldWork.form.when.undecided')],
          ] as Array<[DatePreset, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`task-form-choice${preset === id ? ' is-selected' : ''}`}
            aria-pressed={preset === id}
            onClick={() => onPreset(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {display ? (
        <p className="task-date-display" aria-live="polite">
          {display}
        </p>
      ) : null}
      {recommended && preset !== 'undecided' ? (
        <p className="task-date-compare">
          {t('fieldWork.form.recommendedWindow')}: {recommended}
        </p>
      ) : null}

      {preset !== 'undecided' && preset !== '' ? (
        <button type="button" className="task-date-more" onClick={onToggleMultiDay}>
          {multiDay ? t('fieldWork.form.singleDay') : t('fieldWork.form.moreDays')}
        </button>
      ) : null}

      {preset === 'pick' ? (
        <div className="task-cal" role="group" aria-label={t('fieldWork.form.when.pick')}>
          <div className="task-cal-nav">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label={t('fieldWork.form.prevMonth')}>
              ‹
            </button>
            <strong>{formatMonthHeading(cursor.year, cursor.month, i18n.language)}</strong>
            <button type="button" onClick={() => shiftMonth(1)} aria-label={t('fieldWork.form.nextMonth')}>
              ›
            </button>
          </div>
          <div className="task-cal-grid">
            {headers.map((day) => (
              <span key={day} className="task-cal-dow">
                {day}
              </span>
            ))}
            {Array.from({ length: blanks }, (_, index) => (
              <span key={`e-${index}`} className="task-cal-day is-empty" />
            ))}
            {Array.from({ length: count }, (_, index) => {
              const day = index + 1;
              const iso = toIsoDate(cursor.year, cursor.month, day);
              const selected = pickingEnd ? iso === end : iso === start;
              return (
                <button
                  key={iso}
                  type="button"
                  className={`task-cal-day${selected ? ' is-selected' : ''}`}
                  aria-label={formatLongTaskDate(iso, i18n.language)}
                  aria-pressed={selected}
                  onClick={() => (pickingEnd ? onEndChange(iso) : onStartChange(iso))}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {multiDay && preset !== 'pick' && start ? (
        <p className="task-form-help">
          {t('fieldWork.form.periodEnds')} {formatLongTaskDate(end || weekSundayIso(start) || addDaysToIso(start, 1), i18n.language)}
        </p>
      ) : null}
    </div>
  );
};

export default TaskDateSelector;
