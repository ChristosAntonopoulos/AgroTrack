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

const EXPENSE_CHART = [
  { key: 'labor', label: 'Labor', pct: 35 },
  { key: 'fertilizer', label: 'Fertilizer', pct: 18 },
  { key: 'harvest', label: 'Harvest', pct: 22 },
  { key: 'irrigation', label: 'Irrigation', pct: 10 },
  { key: 'treatments', label: 'Treatments', pct: 8 },
  { key: 'other', label: 'Other', pct: 7 },
];

const ProfitLossReportView: React.FC<Props> = ({ data, id }) => {
  const incomeLines = [
    { label: 'Olive oil sales', value: data.income.oliveOilSales },
    { label: 'Table olive sales', value: data.income.tableOliveSales },
    { label: 'Bulk olive sales', value: data.income.bulkOliveSales },
    { label: 'Subsidies', value: data.income.subsidies },
    { label: 'Other income', value: data.income.other },
  ];

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
  ];

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

      <section className="report-section">
        <h4 className="report-section-title">Key Metrics</h4>
        <div className="report-pl-kpis">
          <div className="report-info-item">
            <label>Cost / kg olives</label>
            <span>€{data.costPerKgOlives.toFixed(2)}</span>
          </div>
          <div className="report-info-item">
            <label>Cost / kg oil</label>
            <span>€{data.costPerKgOil.toFixed(2)}</span>
          </div>
          <div className="report-info-item">
            <label>Revenue / kg oil</label>
            <span>€{data.revenuePerKgOil.toFixed(2)}</span>
          </div>
          <div className="report-info-item">
            <label>Break-even price</label>
            <span>€{data.breakEvenPrice.toFixed(2)}/kg</span>
          </div>
          <div className="report-info-item">
            <label>Profit / hectare</label>
            <span>{formatCurrency(data.profitPerHa)}</span>
          </div>
          <div className="report-info-item">
            <label>Profit / tree</label>
            <span>€{data.profitPerTree.toFixed(2)}</span>
          </div>
        </div>
      </section>

      <section className="report-section">
        <h4 className="report-section-title">Profit by Field</h4>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Net Profit</th>
                <th>Profit / Ha</th>
              </tr>
            </thead>
            <tbody>
              {data.profitByField.map(row => (
                <tr key={row.fieldId}>
                  <td className="field-name-cell">{row.fieldName}</td>
                  <td className="highlight-cell">{formatCurrency(row.profit)}</td>
                  <td>{formatCurrency(row.profitPerHa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="report-chart-area">
        <h4>
          <PieChart size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          Cost Breakdown
        </h4>
        <div className="report-bar-chart">
          {EXPENSE_CHART.map(item => (
            <div key={item.key} className="report-bar-row">
              <span className="report-bar-label">{item.label}</span>
              <div className="report-bar-track">
                <div
                  className={`report-bar-fill ${item.key}`}
                  style={{ width: `${item.pct}%` }}
                >
                  {item.pct}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ReportDocumentShell>
  );
};

export default ProfitLossReportView;
