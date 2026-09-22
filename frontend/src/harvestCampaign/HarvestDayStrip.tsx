import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftAthensDateKey } from '../utils/athensDate';
import { useLocaleFormatters } from '../hooks/useLocaleFormatters';
import type { HarvestDaySummary } from './totals';
import { harvestWorkingDayHasActivity } from './workingDay';

type Props = {
  selectedDay: string;
  today: string;
  dayNumber: number;
  closed: boolean;
  stripRows: HarvestDaySummary[];
  canPrev: boolean;
  canNext: boolean;
  locale: string;
  onSelectDay: (day: string) => void;
  onShift: (delta: -1 | 1) => void;
};

const HarvestDayStrip: React.FC<Props> = ({
  selectedDay,
  today,
  dayNumber,
  closed,
  stripRows,
  canPrev,
  canNext,
  locale,
  onSelectDay,
  onShift,
}) => {
  const { t } = useTranslation('fields');
  const { formatDate } = useLocaleFormatters();
  const yesterday = shiftAthensDateKey(today, -1);

  const when = new Date(`${selectedDay}T12:00:00`);
  const title = `${when.toLocaleDateString(locale, { weekday: 'long' })}, ${formatDate(when)}`;

  const relative =
    selectedDay === today
      ? t('harvestCampaign.dayNav.today')
      : selectedDay === yesterday
        ? t('harvestCampaign.dayNav.yesterday')
        : null;

  return (
    <section className="hc-day-nav" aria-label={t('harvestCampaign.dayNav.label')}>
      <div className="hc-day-masthead">
        <button
          type="button"
          className="hc-day-chevron"
          onClick={() => onShift(-1)}
          disabled={!canPrev}
          aria-label={t('harvestCampaign.dayNav.prev')}
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <div className="hc-day-masthead-copy">
          <h2 className="hc-day-title">{title}</h2>
          <p className="hc-day-sub">
            <span>{t('harvestCampaign.home.day', { day: dayNumber })}</span>
            {relative ? (
              <>
                <span aria-hidden> · </span>
                <span>{relative}</span>
              </>
            ) : null}
            {closed ? (
              <>
                <span aria-hidden> · </span>
                <span className="hc-day-closed">{t('harvestCampaign.dayNav.closed')}</span>
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className="hc-day-chevron"
          onClick={() => onShift(1)}
          disabled={!canNext}
          aria-label={t('harvestCampaign.dayNav.next')}
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

      {stripRows.length > 1 ? (
        <ul className="hc-day-strip" role="list">
          {stripRows.map((row) => {
            const selected = row.date === selectedDay;
            const active = harvestWorkingDayHasActivity(row);
            const dayNum = Number(row.date.slice(-2));
            return (
              <li key={row.date}>
                <button
                  type="button"
                  className={`hc-day-chip${selected ? ' is-selected' : ''}${row.closed ? ' is-closed' : ''}${active ? ' is-active' : ''}${row.date === today ? ' is-today' : ''}`}
                  onClick={() => onSelectDay(row.date)}
                  aria-current={selected ? 'date' : undefined}
                  title={row.date}
                >
                  <span className="hc-day-chip-num">{dayNum}</span>
                  <span className="hc-day-chip-dot" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
};

export default HarvestDayStrip;
