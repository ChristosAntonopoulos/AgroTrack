import React from 'react';
import { Wheat } from 'lucide-react';
import {
  HarvestRecord,
  formatNumber,
  formatPercent,
} from '../../data/mockReportData';
import ReportDocumentShell from './ReportDocumentShell';
import './ReportDocument.css';

interface Props {
  data: HarvestRecord[];
  id?: string;
  season?: string;
}

const hasValue = (value: string | number | undefined | null) =>
  value !== undefined && value !== null && value !== '';

const ProductionHarvestReportView: React.FC<Props> = ({ data, id, season }) => {
  const showOil = data.some((row) => hasValue(row.oilKg));
  const showOilPct = data.some((row) => hasValue(row.oilYieldPercent));
  const showKgTree = data.some((row) => hasValue(row.kgPerTree));
  const showQuality = data.some((row) => hasValue(row.qualityGrade));

  return (
    <ReportDocumentShell
      id={id}
      title="Production & Harvest Report"
      subtitle="Yield and mill records you entered"
      season={season}
    >
      <section className="report-section">
        <h4 className="report-section-title">
          <Wheat size={16} /> Harvest Records
        </h4>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Harvest Date</th>
                <th>Olive Kg</th>
                {showOil && <th>Oil Kg</th>}
                {showOilPct && <th>Oil Yield %</th>}
                {showKgTree && <th>Kg/Tree</th>}
                <th>Kg/Ha</th>
                <th>Mill</th>
                {showQuality && <th>Quality</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={`${row.fieldId}-${row.harvestDate}-${index}`}>
                  <td className="field-name-cell">{row.fieldName}</td>
                  <td>{row.harvestDate}</td>
                  <td className="highlight-cell">{formatNumber(row.oliveKg)}</td>
                  {showOil && <td className="highlight-cell">{formatNumber(row.oilKg)}</td>}
                  {showOilPct && <td>{formatPercent(row.oilYieldPercent)}</td>}
                  {showKgTree && <td>{formatNumber(row.kgPerTree)}</td>}
                  <td>{formatNumber(row.kgPerHa)}</td>
                  <td>{row.millName || '—'}</td>
                  {showQuality && <td>{row.qualityGrade || '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.map((record, index) => {
        const method = record.harvestMethod;
        const workers = record.workersUsed;
        const delivery = record.deliveryTime;
        const rejected = record.rejectedKg;
        const acidity = record.oilAcidity;
        const hasDetails =
          hasValue(method) ||
          hasValue(workers) ||
          hasValue(delivery) ||
          hasValue(rejected) ||
          hasValue(acidity) ||
          hasValue(record.notes);
        if (!hasDetails) return null;
        return (
          <section key={`${record.fieldId}-details-${index}`} className="report-section">
            <h4 className="report-section-title">{record.fieldName} — Details</h4>
            <div className="report-info-grid">
              {hasValue(method) && (
                <div className="report-info-item">
                  <label>Harvest Method</label>
                  <span>{method}</span>
                </div>
              )}
              {hasValue(workers) && (
                <div className="report-info-item">
                  <label>Workers</label>
                  <span>{workers}</span>
                </div>
              )}
              {hasValue(delivery) && (
                <div className="report-info-item">
                  <label>Mill Delivery</label>
                  <span>{delivery}</span>
                </div>
              )}
              {hasValue(rejected) && (
                <div className="report-info-item">
                  <label>Rejected / Damaged</label>
                  <span>{formatNumber(rejected)} kg</span>
                </div>
              )}
              {hasValue(acidity) && (
                <div className="report-info-item">
                  <label>Oil Acidity</label>
                  <span>{acidity}%</span>
                </div>
              )}
            </div>
            {record.notes && (
              <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0.65rem 0 0' }}>
                {record.notes}
              </p>
            )}
          </section>
        );
      })}
    </ReportDocumentShell>
  );
};

export default ProductionHarvestReportView;
