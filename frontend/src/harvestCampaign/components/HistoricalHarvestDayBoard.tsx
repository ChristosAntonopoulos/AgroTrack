import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import type { HarvestRecord } from '../../services/harvestService';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { summarizeHistoricalDay } from '../historicalDay';

type Props = {
  day: string;
  fieldName: string;
  records: HarvestRecord[];
  locale: string;
  loading?: boolean;
  notFound?: boolean;
  onOpenRecord?: (record: HarvestRecord) => void;
};

export const HistoricalHarvestDayBoard: React.FC<Props> = ({
  day,
  fieldName,
  records,
  locale,
  loading,
  notFound,
  onOpenRecord,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const dayLabel = new Date(`${day}T12:00:00`).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const totals = summarizeHistoricalDay(records);

  return (
    <section className="hc-historical-day" aria-labelledby="hc-historical-title">
      <header className="hc-hero">
        <p className="hc-kicker">{t('harvestCampaign.historical.kicker')}</p>
        <h1 id="hc-historical-title">{t('harvestCampaign.historical.title')}</h1>
        <p className="hc-lead">
          {fieldName} · {dayLabel}
        </p>
        <Link to="/chronologio" className="hc-link">
          <BookOpen size={16} aria-hidden /> {t('thisHarvest.openChronologio')}
        </Link>
      </header>

      {loading ? (
        <p className="hc-help" role="status">
          {t('common:loading')}
        </p>
      ) : null}

      {!loading && (notFound || records.length === 0) ? (
        <div className="hc-setup-card" role="status">
          <p className="hc-lead">{t('harvestCampaign.historical.missing')}</p>
          <div className="hc-hero-actions">
            <Link to="/chronologio" className="hc-start">
              {t('thisHarvest.openChronologio')}
            </Link>
          </div>
        </div>
      ) : null}

      {!loading && records.length > 0 ? (
        <>
          <div className="hc-day-metrics" aria-label={t('harvestCampaign.historical.summary')}>
            {totals.sacks > 0 ? (
              <div className="hc-day-metric">
                <span>{t('harvestCampaign.sacks.unit')}</span>
                <strong>{totals.sacks}</strong>
              </div>
            ) : null}
            {totals.oliveKg > 0 ? (
              <div className="hc-day-metric">
                <span>{t('harvestCampaign.record.olives')}</span>
                <strong>{formatGroveMassKg(totals.oliveKg, locale)}</strong>
              </div>
            ) : null}
            {totals.oilKg > 0 ? (
              <div className="hc-day-metric">
                <span>{t('harvestCampaign.record.oil')}</span>
                <strong>{formatGroveMassKg(totals.oilKg, locale)}</strong>
              </div>
            ) : null}
            {totals.workers > 0 ? (
              <div className="hc-day-metric">
                <span>{t('harvestCampaign.record.people')}</span>
                <strong>{totals.workers}</strong>
              </div>
            ) : null}
          </div>

          <ul className="hc-historical-list">
            {records.map((record) => (
              <li key={record.id}>
                <button
                  type="button"
                  className="hc-historical-row"
                  onClick={() => onOpenRecord?.(record)}
                >
                  <strong>
                    {record.sackCount && record.sackCount > 0
                      ? t('harvestCampaign.historical.sacksRow', { count: record.sackCount })
                      : record.oliveKg > 0
                        ? formatGroveMassKg(record.oliveKg, locale)
                        : t('harvestCampaign.record.title')}
                  </strong>
                  <span>
                    {[
                      record.millName,
                      record.oilKg && record.oilKg > 0
                        ? formatGroveMassKg(record.oilKg, locale)
                        : null,
                      record.harvestMethod,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
};
