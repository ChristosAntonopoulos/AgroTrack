import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { HarvestDaySummary } from '../../harvestCampaign/totals';
import { harvestPath } from '../../navigation/intents';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { formatGroveMassKg } from '../../utils/groveTotals';

type FieldRef = { id: string; name: string };

type Props = {
  days: HarvestDaySummary[];
  fields: FieldRef[];
};

const HarvestDayLedger: React.FC<Props> = ({ days, fields }) => {
  const { t, i18n } = useTranslation('chronologio');
  const navigate = useNavigate();
  const locale = i18n.language || 'el';
  if (days.length === 0) return null;

  const nameFor = (id: string) => friendlyFieldLabel(fields.find((field) => field.id === id)?.name || id);

  return (
    <ol className="chrono-harvest-days">
      {days.map((day) => {
        const when = new Date(`${day.date}T12:00:00`);
        const weekday = when.toLocaleDateString(locale, { weekday: 'short' });
        const dayNum = when.toLocaleDateString(locale, { day: 'numeric' });
        const month = when.toLocaleDateString(locale, { month: 'short' });
        const olives = day.officialKg > 0 ? day.officialKg : day.estimatedKg;
        const names = [...new Set(day.fieldIds)].map(nameFor).filter(Boolean);
        const bits = [
          day.sacks > 0 ? `${day.sacks} ${t('sacksUnit')}` : null,
          olives > 0 ? `${formatGroveMassKg(olives, locale)} ${t('olivesUnit')}` : null,
          day.oilKg > 0 ? `${formatGroveMassKg(day.oilKg, locale)} ${t('oilUnit')}` : null,
          day.people > 0 ? `${day.people} ${t('workers')}` : null,
        ].filter(Boolean);
        return (
          <li key={day.date}>
            <button
              type="button"
              className={`chrono-harvest-day${day.closed ? '' : ' is-open'}`}
              onClick={() => navigate(harvestPath({ day: day.date }))}
            >
              <time dateTime={day.date}>
                <strong>
                  {dayNum} {month.replace(/\.$/, '')}
                </strong>
                <span>{weekday.replace(/\.$/, '')}</span>
              </time>
              <span className="chrono-harvest-day-body">
                <span className="chrono-harvest-day-line">
                  {bits.map((bit) => (
                    <span key={bit}>{bit}</span>
                  ))}
                  {day.closed ? null : <em>{t('living.harvestDayOpen')}</em>}
                </span>
                {names.length > 0 ? (
                  <span className="chrono-harvest-day-fields">{names.join(' · ')}</span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
};

export default HarvestDayLedger;
