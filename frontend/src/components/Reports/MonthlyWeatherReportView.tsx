import React from 'react';
import { useTranslation } from 'react-i18next';
import { CloudRain, Thermometer, Droplets, Leaf } from 'lucide-react';
import {
  FieldMonthlyWeather,
  formatHa,
  formatMm,
  formatNumber,
  formatPercent,
  formatTemp,
} from '../../data/mockReportData';
import { numberLocaleFor } from '../../utils/fieldDisplay';
import ReportDocumentShell from './ReportDocumentShell';
import { DualBars, InsightList, VerticalBars } from './ReportVisuals';
import './ReportDocument.css';

interface Props {
  data: FieldMonthlyWeather[];
  season: string;
  month: number;
  id?: string;
}

const MonthlyWeatherReportView: React.FC<Props> = ({ data, season, month, id }) => {
  const { t, i18n } = useTranslation('reports');
  const locale = numberLocaleFor(i18n.language);
  const monthName = new Date(Number(season), month - 1, 1).toLocaleDateString(i18n.language, {
    month: 'long',
  });

  return (
    <ReportDocumentShell
      id={id}
      title={t('doc.monthlyTitle')}
      subtitle={t('doc.monthlySubtitle')}
      periodLabel={t('monthTitle', { month: monthName, year: season })}
    >
      {data.length === 0 ? (
        <p className="report-empty-copy">{t('noWeather')}</p>
      ) : (
        data.map((field) => {
          const rainValues = field.days.map((d) => d.rainTotalMm);
          const minTemps = field.days.map((d) => d.minTemperatureC ?? 0);
          const maxTemps = field.days.map((d) => d.maxTemperatureC ?? 0);
          const dayLabels = field.days.map((d) => String(d.day));
          return (
            <article key={field.fieldId} className="report-field-card">
              <div className="report-field-card-header">
                <div>
                  <h3>{field.fieldName}</h3>
                  <p className="report-field-location">
                    {field.location ? `${field.location} · ` : ''}
                    {formatHa(field.areaHa, locale)} · {t('doc.daysObserved')}: {formatNumber(field.dayCount, 0, locale)}
                  </p>
                </div>
              </div>

              <section className="report-section">
                <h4 className="report-section-title">
                  <CloudRain size={16} /> {t('doc.weather')}
                </h4>
                <div className="report-metrics-row">
                  <div className="report-metric">
                    <div className="report-metric-value">{formatMm(field.rainTotalMm, locale)}</div>
                    <div className="report-metric-label">{t('doc.rain')}</div>
                  </div>
                  <div className="report-metric">
                    <div className="report-metric-value">{formatMm(field.et0TotalMm, locale)}</div>
                    <div className="report-metric-label">{t('doc.et0')}</div>
                  </div>
                  <div className="report-metric">
                    <div className={`report-metric-value ${field.waterBalanceMm < 0 ? 'negative' : 'positive'}`}>
                      {formatMm(field.waterBalanceMm, locale)}
                    </div>
                    <div className="report-metric-label">{t('doc.waterBalance')}</div>
                  </div>
                  <div className="report-metric">
                    <div className="report-metric-value">
                      {field.rainVsPreviousPercent == null ? '—' : formatPercent(field.rainVsPreviousPercent, locale)}
                    </div>
                    <div className="report-metric-label">{t('doc.vsLastYear')}</div>
                  </div>
                </div>
              </section>

              <section className="report-section">
                <h4 className="report-section-title">
                  <Thermometer size={16} /> {t('doc.dailyTemps')}
                </h4>
                <div className="report-metrics-row">
                  <div className="report-metric">
                    <div className="report-metric-value">{formatTemp(field.minTemperatureC, locale)}</div>
                    <div className="report-metric-label">{t('doc.minTemp')}</div>
                  </div>
                  <div className="report-metric">
                    <div className="report-metric-value">{formatTemp(field.maxTemperatureC, locale)}</div>
                    <div className="report-metric-label">{t('doc.maxTemp')}</div>
                  </div>
                  <div className="report-metric">
                    <div className="report-metric-value">{formatTemp(field.avgMinTemperatureC, locale)}</div>
                    <div className="report-metric-label">{t('doc.avgMin')}</div>
                  </div>
                  <div className="report-metric">
                    <div className="report-metric-value">{formatTemp(field.avgMaxTemperatureC, locale)}</div>
                    <div className="report-metric-label">{t('doc.avgMax')}</div>
                  </div>
                </div>
                <div className="report-metrics-row">
                  <div className="report-metric">
                    <div className={`report-metric-value ${field.frostNights > 0 ? 'negative' : ''}`}>
                      {formatNumber(field.frostNights, 0, locale)}
                    </div>
                    <div className="report-metric-label">{t('doc.frost')}</div>
                  </div>
                  <div className="report-metric">
                    <div className={`report-metric-value ${field.heatDays > 0 ? 'negative' : ''}`}>
                      {formatNumber(field.heatDays, 0, locale)}
                    </div>
                    <div className="report-metric-label">{t('doc.heat')}</div>
                  </div>
                  <div className="report-metric">
                    <div className="report-metric-value">{formatNumber(field.heavyRainDays, 0, locale)}</div>
                    <div className="report-metric-label">{t('doc.heavyRain')}</div>
                  </div>
                  <div className="report-metric">
                    <div className="report-metric-value">{formatNumber(field.longestDryStreakDays, 0, locale)}</div>
                    <div className="report-metric-label">{t('doc.dryStreak')}</div>
                  </div>
                  <div className="report-metric">
                    <div className="report-metric-value">{formatNumber(field.rainyDays, 0, locale)}</div>
                    <div className="report-metric-label">{t('doc.rainyDays')}</div>
                  </div>
                  <div className="report-metric">
                    <div className="report-metric-value">{formatNumber(field.dryDays, 0, locale)}</div>
                    <div className="report-metric-label">{t('doc.dryDays')}</div>
                  </div>
                </div>
              </section>

              {field.ndviMean != null && (
                <section className="report-section">
                  <h4 className="report-section-title">
                    <Leaf size={16} /> {t('doc.ndvi')}
                  </h4>
                  <div className="report-metrics-row">
                    <div className="report-metric">
                      <div className="report-metric-value">{formatNumber(field.ndviMean, 3, locale)}</div>
                      <div className="report-metric-label">{t('doc.ndvi')}</div>
                    </div>
                    {field.ndviDeltaPercent != null && (
                      <div className="report-metric">
                        <div className={`report-metric-value ${field.ndviDeltaPercent >= 0 ? 'positive' : 'negative'}`}>
                          {formatPercent(field.ndviDeltaPercent, locale)}
                        </div>
                        <div className="report-metric-label">{t('doc.vsLastYear')}</div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              <section className="report-section">
                <h4 className="report-section-title">
                  <Droplets size={16} /> {t('doc.dailyRain')}
                </h4>
                <VerticalBars values={rainValues} labels={dayLabels} color="#3b6ea5" />
              </section>

              <section className="report-section">
                <h4 className="report-section-title">
                  <Thermometer size={16} /> {t('doc.dailyTemps')}
                </h4>
                <DualBars first={maxTemps} second={minTemps} labels={dayLabels} firstColor="#c45c26" secondColor="#3b6ea5" />
              </section>

              <section className="report-section">
                <h4 className="report-section-title">{t('doc.dailyTable')}</h4>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>{t('doc.day')}</th>
                        <th>{t('doc.minTemp')}</th>
                        <th>{t('doc.maxTemp')}</th>
                        <th>{t('doc.rain')}</th>
                        <th>{t('doc.et0')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {field.days.map((day) => (
                        <tr key={day.day}>
                          <td>{day.day}</td>
                          <td>{formatTemp(day.minTemperatureC, locale)}</td>
                          <td>{formatTemp(day.maxTemperatureC, locale)}</td>
                          <td>{formatMm(day.rainTotalMm, locale)}</td>
                          <td>{formatMm(day.et0Mm, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <InsightList insights={field.insights} />
            </article>
          );
        })
      )}
    </ReportDocumentShell>
  );
};

export default MonthlyWeatherReportView;
