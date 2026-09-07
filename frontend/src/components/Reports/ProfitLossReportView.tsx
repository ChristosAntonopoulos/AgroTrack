import React from 'react';
import { DollarSign, PieChart } from 'lucide-react';
import {
  ProfitLossData,
  formatCurrency,
} from '../../data/mockReportData';
import ReportDocumentShell from './ReportDocumentShell';
import './ReportDocument.css';

interface Props {
  data: ProfitLossData;
  id?: string;
}

const ProfitLossReportView: React.FC<Props> = ({ data, id }) => {
  const incomeLines = [
    { label: 'Money in', value: data.totalIncome },
  ].filter((line) => line.value !== 0);

  const expenseLines = [
    { label: 'Labor', value: data.expenses.labor },
    { label: 'Fertilizers', value: data.expenses.fertilizers },
    { label: 'Pesticides / treatments', value: data.expenses.treatments },
    { label: 'Irrigation water', value: data.expenses.irrigationWater },
    { label: 'Electricity / fuel', value: data.expenses.electricityFuel },
    { label: 'Equipment', value: data.expenses.equipment },
    { label: 'Repairs', value: data.expenses.repairs },
    { label: 'Pruning', value: data.expenses.pruning },
    { label: 'Harvest workers', value: data.expenses.harvestWorkers },
    { label: 'Mill cost', value: data.expenses.millCost },
    { label: 'Transport', value: data.expenses.transport },
    { label: 'Packaging', value: data.expenses.packaging },
    { label: 'Storage', value: data.expenses.storage },
    { label: 'Agronomist services', value: data.expenses.agronomist },
    { label: 'Other costs', value: data.expenses.other },
  ].filter((line) => line.value !== 0);

  const kpis = [
    { label: 'Cost / kg olives', value: data.costPerKgOlives, suffix: '' },
    { label: 'Cost / kg oil', value: data.costPerKgOil, suffix: '' },
    { label: 'Revenue / kg oil', value: data.revenuePerKgOil, suffix: '' },
    { label: 'Break-even price', value: data.breakEvenPrice, suffix: '/kg' },
    { label: 'Profit / hectare', value: data.profitPerHa, suffix: '' },
    { label: 'Profit / tree', value: data.profitPerTree, suffix: '' },
  ].filter((kpi) => kpi.value !== 0);

  const expenseTotal = expenseLines.reduce((sum, line) => sum + line.value, 0);
  const expenseBars = expenseLines.map((line) => ({
    key: line.label,
    label: line.label,
    pct: expenseTotal > 0 ? Math.round((line.value / expenseTotal) * 100) : 0,
  }));

  return (
    <ReportDocumentShell
      id={id}
      title="Profit & Loss Report"
      subtitle="Financial performance for the season"
      season={data.season}
    >
      <div className="report-pl-summary">
        <div className="report-pl-card income">
          <div className="report-pl-card-value">{formatCurrency(data.totalIncome)}</div>
          <div className="report-pl-card-label">Total Income</div>
        </div>
        <div className="report-pl-card expense">
          <div className="report-pl-card-value">{formatCurrency(data.totalExpenses)}</div>
          <div className="report-pl-card-label">Total Expenses</div>
        </div>
        <div className="report-pl-card profit">
          <div className="report-pl-card-value">{formatCurrency(data.netProfit)}</div>
          <div className="report-pl-card-label">Net Profit</div>
        </div>
      </div>

      <section className="report-section">
        <h4 className="report-section-title">
          <DollarSign size={16} /> Income & Expenses
        </h4>
        <div className="report-pl-columns">
          <div className="report-pl-column">
            <h4>Income</h4>
            {incomeLines.map(line => (
              <div key={line.label} className="report-pl-line">
                <span>{line.label}</span>
                <span>{formatCurrency(line.value)}</span>
              </div>
            ))}
            <div className="report-pl-line total">
              <span>Total income</span>
              <span>{formatCurrency(data.totalIncome)}</span>
            </div>
          </div>
          <div className="report-pl-column">
            <h4>Expenses</h4>
            {expenseLines.map(line => (
              <div key={line.label} className="report-pl-line">
                <span>{line.label}</span>
                <span>{formatCurrency(line.value)}</span>
              </div>
            ))}
            <div className="report-pl-line total">
              <span>Total expenses</span>
              <span>{formatCurrency(data.totalExpenses)}</span>
            </div>
          </div>
        </div>
      </section>

      {kpis.length > 0 && (
      <section className="report-section">
        <h4 className="report-section-title">Key Metrics</h4>
        <div className="report-pl-kpis">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="report-info-item">
              <label>{kpi.label}</label>
              <span>€{kpi.value.toFixed(2)}{kpi.suffix}</span>
            </div>
          ))}
        </div>
      </section>
      )}

      <section className="report-section">
        <h4 className="report-section-title">Profit by Field</h4>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {data.profitByField.map(row => (
                <tr key={row.fieldId}>
                  <td className="field-name-cell">{row.fieldName}</td>
                  <td className="highlight-cell">{formatCurrency(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {expenseBars.length > 0 && (
      <div className="report-chart-area">
        <h4>
          <PieChart size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          Cost Breakdown
        </h4>
        <div className="report-bar-chart">
          {expenseBars.map(item => (
            <div key={item.key} className="report-bar-row">
              <span className="report-bar-label">{item.label}</span>
              <div className="report-bar-track">
                <div
                  className="report-bar-fill other"
                  style={{ width: `${item.pct}%` }}
                >
                  {item.pct}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </ReportDocumentShell>
  );
};

export default ProfitLossReportView;
