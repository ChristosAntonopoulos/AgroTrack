import React from 'react';
import { useTranslation } from 'react-i18next';
import { CloudSun, ClipboardList, DollarSign, CloudRain } from 'lucide-react';
import {
  FieldYearlyOperations,
  formatCurrency,
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
  data: FieldYearlyOperations[];
  season: string;
  id?: string;
}

const YearlyWeatherReportView: React.FC<Props> = ({ data, season, id }) => {
  const { t, i18n } = useTranslation('reports');
  const locale = numberLocaleFor(i18n.language);
  const monthLabels = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleDateString(i18n.language, { month: 'short' }).replace('.', '')
  );

  return (
    <ReportDocumentShell
      id={id}
      title={t('doc.yearlyTitle')}
      subtitle={t('doc.yearlySubtitle')}
      season={season}
    >
      {data.length === 0 ? (
        <p className="report-empty-copy">{t('noWeather')}</p>
      ) : (
        data.map((field) => (
          <article key={field.fieldId} className="report-field-card">
            <div className="report-field-card-header">
              <div>
                <h3>{field.fieldName}</h3>
                <p className="report-field-location">
                  {field.location ? `${field.location} · ` : ''}
                  {formatHa(field.areaHa, locale)}
                </p>
              </div>
            </div>

            <section className="report-section">
              <h4 className="report-section-title">
                <DollarSign size={16} /> {t('doc.costs')}
              </h4>
              <div className="report-metrics-row">
                <div className="report-metric">
                  <div className="report-metric-value">{formatCurrency(field.totalCost, locale)}</div>
                  <div className="report-metric-label">{t('doc.totalCost')}</div>
                </div>
                <div className="report-metric">
                  <div className="report-metric-value">{formatCurrency(field.costPerHa, locale)}</div>
                  <div className="report-metric-label">{t('doc.costHa')}</div>
                </div>
                <div className="report-metric">
                  <div className="report-metric-value">{formatCurrency(field.revenue, locale)}</div>
                  <div className="report-metric-label">{t('doc.revenue')}</div>
                </div>
                <div className="report-metric">
                  <div className={`report-metric-value ${field.profit >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(field.profit, locale)}
                  </div>
                  <div className="report-metric-label">{t('doc.profit')}</div>
                </div>
              </div>
            </section>

            <section className="report-section">
              <h4 className="report-section-title">
                <ClipboardList size={16} /> {t('doc.taskActivity')}
              </h4>
              <div className="report-metrics-row">
                <div className="report-metric">
                  <div className="report-metric-value">{formatNumber(field.tasksCompleted, 0, locale)}</div>
                  <div className="report-metric-label">{t('doc.completed')}</div>
                </div>
                <div className="report-metric">
                  <div className="report-metric-value">{formatNumber(field.tasksPending, 0, locale)}</div>
                  <div className="report-metric-label">{t('doc.pending')}</div>
                </div>
                <div className="report-metric">
                  <div className={`report-metric-value ${field.tasksOverdue > 0 ? 'negative' : ''}`}>
                    {formatNumber(field.tasksOverdue, 0, locale)}
                  </div>
                  <div className="report-metric-label">{t('doc.overdue')}</div>
                </div>
              </div>
              {field.tasksByType.length > 0 && (
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>{t('doc.type')}</th>
                        <th>{t('doc.completed')}</th>
                        <th>{t('doc.pending')}</th>
                        <th>{t('doc.cost')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {field.tasksByType.map((row) => (
                        <tr key={row.type}>
                          <td className="field-name-cell">{row.type}</td>
                          <td>{formatNumber(row.completed, 0, locale)}</td>
                          <td>{formatNumber(Math.max(0, row.total - row.completed), 0, locale)}</td>
                          <td>{formatCurrency(row.cost, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="report-section">
              <h4 className="report-section-title">
                <CloudSun size={16} /> {t('doc.weather')}
              </h4>
              <div className="report-metrics-row">
                <div className="report-metric">
                  <div className="report-metric-value">{formatMm(field.rainTotalMm, locale)}</div>
                  <div className="report-metric-label">{t('doc.rain')}</div>
                </div>
                <div className="report-metric">
                  <div className="report-metric-value">{formatTemp(field.minTemperatureC, locale)}</div>
                  <div className="report-metric-label">{t('doc.minTemp')}</div>
                </div>
                <div className="report-metric">
                  <div className="report-metric-value">{formatTemp(field.maxTemperatureC, locale)}</div>
                  <div className="report-metric-label">{t('doc.maxTemp')}</div>
                </div>
                <div className="report-metric">
                  <div className="report-metric-value">
                    {field.wettestMonth
                      ? monthLabels[field.wettestMonth - 1]
                      : '—'}
                  </div>
                  <div className="report-metric-label">{t('doc.wettestMonth')}</div>
                </div>
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
                  <div className="report-metric-value">{formatNumber(field.longestDryStreakDays, 0, locale)}</div>
                  <div className="report-metric-label">{t('doc.dryStreak')}</div>
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
                <CloudRain size={16} /> {t('doc.monthlyRain')}
              </h4>
              <VerticalBars values={field.monthlyRainMm} labels={monthLabels} color="#3b6ea5" />
            </section>

            <section className="report-section">
              <h4 className="report-section-title">
                <DollarSign size={16} /> {t('doc.monthlyMoney')}
              </h4>
              <DualBars
                first={field.monthlyCost.map(Number)}
                second={field.monthlyRevenue.map(Number)}
                labels={monthLabels}
                firstColor="#dc2626"
                secondColor="#16a34a"
              />
            </section>

            <section className="report-section">
              <h4 className="report-section-title">
                <ClipboardList size={16} /> {t('doc.monthlyTasks')}
              </h4>
              <VerticalBars values={field.monthlyTasksCompleted} labels={monthLabels} color="#2E4A2E" />
            </section>

            <InsightList insights={field.insights} />
          </article>
        ))
      )}
    </ReportDocumentShell>
  );
};

export default YearlyWeatherReportView;
