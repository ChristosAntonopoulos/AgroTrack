import React from 'react';
import { BarChart3, Trophy, AlertTriangle } from 'lucide-react';
import {
  FieldComparisonRow,
  ComparisonInsights,
  formatNumber,
  formatCurrency,
  formatPercent,
} from '../../data/mockReportData';
import ReportDocumentShell from './ReportDocumentShell';
import './ReportDocument.css';

interface Props {
  data: FieldComparisonRow[];
  insights: ComparisonInsights;
  id?: string;
  season?: string;
}

const FieldComparisonReportView: React.FC<Props> = ({ data, insights, id, season }) => {
  const showOil = data.some((row) => row.oilKg != null && row.oilKg !== 0);
  const showOilPct = data.some((row) => row.oilYieldPercent != null && row.oilYieldPercent !== 0);
  const showKgTree = data.some((row) => row.kgPerTree != null && row.kgPerTree !== 0);
  const showPest = data.some((row) => row.pestPressure);
  const showWater = data.some((row) => row.waterUsageM3 != null && row.waterUsageM3 !== 0);

  return (
    <ReportDocumentShell
      id={id}
      title="Field Performance Comparison"
      subtitle="Side-by-side field analysis"
      season={season}
    >
      <section className="report-section">
        <h4 className="report-section-title">
          <BarChart3 size={16} /> Comparison Table
        </h4>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Olive Kg</th>
                {showOil && <th>Oil Kg</th>}
                {showOilPct && <th>Oil %</th>}
                {showKgTree && <th>Kg/Tree</th>}
                <th>Kg/Ha</th>
                <th>Cost/Ha</th>
                <th>Profit/Ha</th>
                <th>Tasks</th>
                {showPest && <th>Pest</th>}
                {showWater && <th>Water m³</th>}
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.fieldId}>
                  <td className="field-name-cell">{row.fieldName}</td>
                  <td className="highlight-cell">{formatNumber(row.oliveKg)}</td>
                  {showOil && <td>{formatNumber(row.oilKg)}</td>}
                  {showOilPct && <td>{formatPercent(row.oilYieldPercent)}</td>}
                  {showKgTree && <td>{formatNumber(row.kgPerTree)}</td>}
                  <td>{formatNumber(row.kgPerHa)}</td>
                  <td>{formatCurrency(row.costPerHa)}</td>
                  <td className="highlight-cell">{formatCurrency(row.profitPerHa ?? 0)}</td>
                  <td>{row.tasksCompleted}</td>
                  {showPest && <td>{row.pestPressure || '—'}</td>}
                  {showWater && <td>{formatNumber(row.waterUsageM3)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-section">
        <h4 className="report-section-title">
          <Trophy size={16} /> Key Insights
        </h4>
        <div className="report-insights-grid">
          {insights.bestYieldField && (
            <div className="report-insight-item">
              <Trophy size={16} />
              <div>
                <strong>Best yield field</strong>
                <span>{insights.bestYieldField}</span>
              </div>
            </div>
          )}
          {showOilPct && insights.bestOilYieldField && (
            <div className="report-insight-item">
              <Trophy size={16} />
              <div>
                <strong>Best oil yield</strong>
                <span>{insights.bestOilYieldField}</span>
              </div>
            </div>
          )}
          {insights.mostProfitableField && (
            <div className="report-insight-item">
              <Trophy size={16} />
              <div>
                <strong>Most profitable</strong>
                <span>{insights.mostProfitableField}</span>
              </div>
            </div>
          )}
          {insights.mostExpensiveField && (
            <div className="report-insight-item">
              <AlertTriangle size={16} />
              <div>
                <strong>Most expensive</strong>
                <span>{insights.mostExpensiveField}</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </ReportDocumentShell>
  );
};

export default FieldComparisonReportView;
