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
}

const pressureClass = (p: string) =>
  p === 'Low' ? 'pressure-low' : p === 'Medium' ? 'pressure-medium' : 'pressure-high';

const FieldComparisonReportView: React.FC<Props> = ({ data, insights, id }) => (
  <ReportDocumentShell
    id={id}
    title="Field Performance Comparison"
    subtitle="Side-by-side field analysis"
    season="2025"
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
              <th>Oil Kg</th>
              <th>Oil %</th>
              <th>Kg/Tree</th>
              <th>Kg/Ha</th>
              <th>Cost/Ha</th>
              <th>Profit/Ha</th>
              <th>Tasks</th>
              <th>Issues</th>
              <th>Pest</th>
              <th>Water m³</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.fieldId}>
                <td className="field-name-cell">{row.fieldName}</td>
                <td className="highlight-cell">{formatNumber(row.oliveKg)}</td>
                <td>{formatNumber(row.oilKg)}</td>
                <td>{formatPercent(row.oilYieldPercent)}</td>
                <td>{row.kgPerTree}</td>
                <td>{row.kgPerHa}</td>
                <td>{formatCurrency(row.costPerHa)}</td>
                <td className="highlight-cell">{formatCurrency(row.profitPerHa)}</td>
                <td>{row.tasksCompleted}</td>
                <td>{row.issueCount}</td>
                <td className={pressureClass(row.pestPressure)}>{row.pestPressure}</td>
                <td>{row.waterUsageM3}</td>
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
        <div className="report-insight-item">
          <Trophy size={16} />
          <div>
            <strong>Best yield field</strong>
            <span>{insights.bestYieldField}</span>
          </div>
        </div>
        <div className="report-insight-item">
          <Trophy size={16} />
          <div>
            <strong>Best oil yield</strong>
            <span>{insights.bestOilYieldField}</span>
          </div>
        </div>
        <div className="report-insight-item">
          <Trophy size={16} />
          <div>
            <strong>Most profitable</strong>
            <span>{insights.mostProfitableField}</span>
          </div>
        </div>
        <div className="report-insight-item">
          <AlertTriangle size={16} />
          <div>
            <strong>Most expensive</strong>
            <span>{insights.mostExpensiveField}</span>
          </div>
        </div>
        <div className="report-insight-item">
          <AlertTriangle size={16} />
          <div>
            <strong>Most overdue tasks</strong>
            <span>{insights.mostOverdueTasksField}</span>
          </div>
        </div>
        <div className="report-insight-item">
          <AlertTriangle size={16} />
          <div>
            <strong>Highest pest pressure</strong>
            <span>{insights.highestPestField}</span>
          </div>
        </div>
      </div>
    </section>
  </ReportDocumentShell>
);

export default FieldComparisonReportView;
