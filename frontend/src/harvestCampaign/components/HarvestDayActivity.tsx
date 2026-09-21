import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { oilAmountToKg } from '../totals';
import type {
  HarvestCampaign,
  HarvestMillWeightEntry,
  HarvestOilEntry,
  HarvestPeopleEntry,
  HarvestSackEntry,
} from '../types';

export type DayActivityKind = 'sack' | 'mill' | 'oil' | 'people';

export type DayActivityEditTarget =
  | { kind: 'sack'; entry: HarvestSackEntry }
  | { kind: 'mill'; entry: HarvestMillWeightEntry }
  | { kind: 'oil'; entry: HarvestOilEntry }
  | { kind: 'people'; entry: HarvestPeopleEntry };

type Props = {
  campaign: HarvestCampaign;
  date: string;
  locale: string;
  labelOf: (fieldId: string) => string;
  closed?: boolean;
  onEdit: (target: DayActivityEditTarget) => void;
  onRemove: (target: DayActivityEditTarget) => void;
  onAdd: (kind: DayActivityKind) => void;
};

export const HarvestDayActivity: React.FC<Props> = ({
  campaign,
  date,
  locale,
  labelOf,
  closed,
  onEdit,
  onRemove,
  onAdd,
}) => {
  const { t } = useTranslation('fields');

  const day = useMemo(() => {
    const sacks = campaign.sacks.filter((row) => row.date === date);
    const mills = campaign.millWeights.filter((row) => row.date === date);
    const oils = campaign.oils.filter((row) => row.date === date);
    const people = campaign.peopleLogs.filter((row) => row.date === date);
    return { sacks, mills, oils, people };
  }, [campaign, date]);

  const empty =
    day.sacks.length === 0 &&
    day.mills.length === 0 &&
    day.oils.length === 0 &&
    day.people.length === 0;

  const confirmRemove = (target: DayActivityEditTarget) => {
    const ok = window.confirm(t('harvestCampaign.dayActivity.removeConfirm'));
    if (ok) onRemove(target);
  };

  return (
    <section className="hc-day-activity" aria-label={t('harvestCampaign.dayActivity.title')}>
      <header className="hc-day-activity-head">
        <div>
          <p className="hc-kicker">{t('harvestCampaign.dayActivity.kicker')}</p>
          <h3>{t('harvestCampaign.dayActivity.title')}</h3>
        </div>
        {!closed ? (
          <div className="hc-day-activity-add">
            <button type="button" className="hc-ghost" onClick={() => onAdd('sack')}>
              + {t('harvestCampaign.actions.sacks')}
            </button>
            <button type="button" className="hc-ghost" onClick={() => onAdd('mill')}>
              + {t('harvestCampaign.actions.mill')}
            </button>
            <button type="button" className="hc-ghost" onClick={() => onAdd('oil')}>
              + {t('harvestCampaign.actions.oil')}
            </button>
            <button type="button" className="hc-ghost" onClick={() => onAdd('people')}>
              + {t('harvestCampaign.actions.people')}
            </button>
          </div>
        ) : null}
      </header>

      {empty ? (
        <p className="hc-help">{t('harvestCampaign.dayActivity.empty')}</p>
      ) : (
        <ul className="hc-day-activity-list">
          {day.sacks.map((entry) => (
            <li key={entry.id} className="hc-day-activity-item">
              <div className="hc-day-activity-main">
                <span className="hc-day-activity-kind">{t('harvestCampaign.actions.sacks')}</span>
                <strong>
                  {entry.sacks} {t('harvestCampaign.sacks.unit')}
                </strong>
                <span>
                  {friendlyFieldLabel(labelOf(entry.fieldId))}
                  {entry.kgPerSack
                    ? ` · ${t('harvestCampaign.sacks.kgPerSack')}: ${entry.kgPerSack}`
                    : ''}
                  {entry.millWeightId
                    ? ` · ${t('harvestCampaign.dayActivity.weighed')}`
                    : ` · ${t('harvestCampaign.dayActivity.open')}`}
                </span>
              </div>
              {!closed ? (
                <div className="hc-day-activity-actions">
                  <button type="button" className="hc-ghost" onClick={() => onEdit({ kind: 'sack', entry })}>
                    {t('harvestCampaign.dayActivity.edit')}
                  </button>
                  <button
                    type="button"
                    className="hc-ghost is-danger"
                    onClick={() => confirmRemove({ kind: 'sack', entry })}
                  >
                    {t('harvestCampaign.dayActivity.remove')}
                  </button>
                </div>
              ) : null}
            </li>
          ))}

          {day.mills.map((entry) => (
            <li key={entry.id} className="hc-day-activity-item">
              <div className="hc-day-activity-main">
                <span className="hc-day-activity-kind">{t('harvestCampaign.actions.mill')}</span>
                <strong>{formatGroveMassKg(entry.kg, locale)} kg</strong>
                <span>
                  {entry.fieldIds.map((id) => friendlyFieldLabel(labelOf(id))).join(' · ') ||
                    t('harvestCampaign.shared.badge')}
                  {entry.sackIds.length > 0
                    ? ` · ${t('harvestCampaign.flow.fromSacks', { count: entry.sackIds.length })}`
                    : ''}
                  {entry.note ? ` · ${entry.note}` : ''}
                </span>
              </div>
              {!closed ? (
                <div className="hc-day-activity-actions">
                  <button type="button" className="hc-ghost" onClick={() => onEdit({ kind: 'mill', entry })}>
                    {t('harvestCampaign.dayActivity.edit')}
                  </button>
                  <button
                    type="button"
                    className="hc-ghost is-danger"
                    onClick={() => confirmRemove({ kind: 'mill', entry })}
                  >
                    {t('harvestCampaign.dayActivity.remove')}
                  </button>
                </div>
              ) : null}
            </li>
          ))}

          {day.oils.map((entry) => (
            <li key={entry.id} className="hc-day-activity-item">
              <div className="hc-day-activity-main">
                <span className="hc-day-activity-kind">{t('harvestCampaign.actions.oil')}</span>
                <strong>
                  {entry.unit === 'litres'
                    ? `${Math.round(entry.amount)} L`
                    : `${formatGroveMassKg(oilAmountToKg(entry), locale)} kg`}
                </strong>
                <span>
                  {entry.fieldIds.length
                    ? entry.fieldIds.map((id) => friendlyFieldLabel(labelOf(id))).join(' · ')
                    : t('harvestCampaign.dayActivity.fromMills', {
                        count: entry.millWeightIds.length,
                      })}
                  {entry.acidity != null
                    ? ` · ${t('harvestCampaign.oil.acidity')}: ${entry.acidity}`
                    : ''}
                  {entry.note ? ` · ${entry.note}` : ''}
                </span>
              </div>
              {!closed ? (
                <div className="hc-day-activity-actions">
                  <button type="button" className="hc-ghost" onClick={() => onEdit({ kind: 'oil', entry })}>
                    {t('harvestCampaign.dayActivity.edit')}
                  </button>
                  <button
                    type="button"
                    className="hc-ghost is-danger"
                    onClick={() => confirmRemove({ kind: 'oil', entry })}
                  >
                    {t('harvestCampaign.dayActivity.remove')}
                  </button>
                </div>
              ) : null}
            </li>
          ))}

          {day.people.map((entry) => (
            <li key={entry.id} className="hc-day-activity-item">
              <div className="hc-day-activity-main">
                <span className="hc-day-activity-kind">{t('harvestCampaign.actions.people')}</span>
                <strong>{t('harvestCampaign.today.people', { count: entry.people })}</strong>
                <span>
                  {entry.hours === 'half'
                    ? t('harvestCampaign.people.hours.half')
                    : entry.hours === 'full'
                      ? t('harvestCampaign.people.hours.full')
                      : entry.hours === 'other'
                        ? `${t('harvestCampaign.people.otherHours')}: ${entry.otherHours ?? '—'}`
                        : t('harvestCampaign.people.hours.skip')}
                </span>
              </div>
              {!closed ? (
                <div className="hc-day-activity-actions">
                  <button
                    type="button"
                    className="hc-ghost"
                    onClick={() => onEdit({ kind: 'people', entry })}
                  >
                    {t('harvestCampaign.dayActivity.edit')}
                  </button>
                  <button
                    type="button"
                    className="hc-ghost is-danger"
                    onClick={() => confirmRemove({ kind: 'people', entry })}
                  >
                    {t('harvestCampaign.dayActivity.remove')}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
