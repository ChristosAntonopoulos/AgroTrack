import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wheat, DollarSign } from 'lucide-react';
import {
  FieldSummaryData,
  HarvestRecord,
  ProfitLossData,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../../data/mockReportData';
import { numberLocaleFor } from '../../utils/fieldDisplay';
import ReportDocumentShell from './ReportDocumentShell';
import FieldSummaryCards from './FieldSummaryCards';
import './ReportDocument.css';

interface Props {
  summaries: FieldSummaryData[];
  harvest: HarvestRecord[];
  profitLoss: ProfitLossData | null;
  season: string;
  id?: string;
}

const YearOverviewReportView: React.FC<Props> = ({ summaries, harvest, profitLoss, season, id }) => {
  const { t, i18n } = useTranslation('reports');
  const locale = numberLocaleFor(i18n.language);
  const totalOlives = summaries.reduce((sum, f) => sum + (f.totalProductionKg || 0), 0);
  const totalCost = summaries.reduce((sum, f) => sum + (f.totalCost || 0), 0);
  const totalRevenue = summaries.reduce((sum, f) => sum + (f.revenue || 0), 0);
  const net = profitLoss?.netProfit ?? totalRevenue - totalCost;
  const tasksDone = summaries.reduce((sum, f) => sum + f.tasksCompleted, 0);
  const tasksOpen = summaries.reduce((sum, f) => sum + f.tasksPending, 0);

  return (
    <ReportDocumentShell
      id={id}
      title={t('doc.yearTitle')}
      subtitle={t('doc.yearSubtitle')}
      season={season}
    >
      <section className="report-section">
        <h4 className="report-section-title">{t('doc.totals')}</h4>
        <div className="report-pl-summary">
          <div className="report-pl-card income">
            <div className="report-pl-card-value">{formatNumber(totalOlives, 0, locale)} kg</div>
            <div className="report-pl-card-label">{t('doc.olives')}</div>
          </div>
          <div className="report-pl-card expense">
            <div className="report-pl-card-value">{formatCurrency(totalCost, locale)}</div>
            <div className="report-pl-card-label">{t('doc.totalExpenses')}</div>
          </div>
          <div className="report-pl-card profit">
            <div className={`report-pl-card-value ${net >= 0 ? '' : 'negative'}`}>{formatCurrency(net, locale)}</div>
            <div className="report-pl-card-label">{t('doc.netProfit')}</div>
          </div>
        </div>
        <div className="report-metrics-row">
          <div className="report-metric">
            <div className="report-metric-value">{formatNumber(tasksDone, 0, locale)}</div>
            <div className="report-metric-label">{t('doc.completed')}</div>
          </div>
          <div className="report-metric">
            <div className="report-metric-value">{formatNumber(tasksOpen, 0, locale)}</div>
            <div className="report-metric-label">{t('doc.pending')}</div>
          </div>
          <div className="report-metric">
            <div className="report-metric-value">{formatCurrency(totalRevenue, locale)}</div>
            <div className="report-metric-label">{t('doc.totalIncome')}</div>
          </div>
        </div>
      </section>

      <FieldSummaryCards data={summaries} locale={locale} />

      {harvest.length > 0 && (
        <section className="report-section">
          <h4 className="report-section-title">
            <Wheat size={16} /> {t('doc.harvests')}
          </h4>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>{t('fields')}</th>
                  <th>{t('doc.harvestDate')}</th>
                  <th>{t('doc.olives')}</th>
                  <th>{t('doc.oil')}</th>
                  <th>{t('doc.oilYield')}</th>
                  <th>{t('doc.perHa')}</th>
                  <th>{t('doc.mill')}</th>
                </tr>
              </thead>
              <tbody>
                {harvest.map((row, i) => (
                  <tr key={`${row.fieldId}-${row.harvestDate}-${i}`}>
                    <td className="field-name-cell">{row.fieldName}</td>
                    <td>
                      {row.harvestDate
                        ? new Date(row.harvestDate).toLocaleDateString(i18n.language)
                        : '—'}
                    </td>
                    <td>{formatNumber(row.oliveKg, 0, locale)} kg</td>
                    <td>{row.oilKg != null ? `${formatNumber(row.oilKg, 0, locale)} kg` : '—'}</td>
                    <td>{formatPercent(row.oilYieldPercent, locale)}</td>
                    <td>{row.kgPerHa != null ? `${formatNumber(row.kgPerHa, 0, locale)} kg` : '—'}</td>
                    <td>{row.millName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {profitLoss && (
        <section className="report-section">
          <h4 className="report-section-title">
            <DollarSign size={16} /> {t('doc.incomeExpenses')}
          </h4>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>{t('fields')}</th>
                  <th>{t('doc.cost')}</th>
                  <th>{t('doc.revenue')}</th>
                  <th>{t('doc.profit')}</th>
                </tr>
              </thead>
              <tbody>
                {profitLoss.profitByField.map((row) => (
                  <tr key={row.fieldId}>
                    <td className="field-name-cell">{row.fieldName}</td>
                    <td>{formatCurrency(row.cost ?? 0, locale)}</td>
                    <td>{formatCurrency(row.revenue ?? 0, locale)}</td>
                    <td className={row.profit >= 0 ? 'pressure-low' : 'pressure-high'}>
                      {formatCurrency(row.profit, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </ReportDocumentShell>
  );
};

export default YearOverviewReportView;
