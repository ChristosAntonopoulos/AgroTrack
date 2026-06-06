import React from 'react';
import { Wheat, Info } from 'lucide-react';
import {
  HarvestRecord,
  HARVEST_INSIGHT,
  formatNumber,
  formatPercent,
} from '../../data/mockReportData';
import ReportDocumentShell from './ReportDocumentShell';
import './ReportDocument.css';

interface Props {
  data: HarvestRecord[];
  id?: string;
}

const ProductionHarvestReportView: React.FC<Props> = ({ data, id }) => (
  <ReportDocumentShell
    id={id}
    title="Production & Harvest Report"
    subtitle="Yield, quality, and mill delivery analysis"
    season="2025"
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
              <th>Oil Kg</th>
              <th>Oil Yield %</th>
              <th>Kg/Tree</th>
              <th>Kg/Ha</th>
              <th>Mill</th>
              <th>Quality</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.fieldId}>
                <td className="field-name-cell">{row.fieldName}</td>
                <td>{row.harvestDate}</td>
                <td className="highlight-cell">{formatNumber(row.oliveKg)}</td>
                <td className="highlight-cell">{formatNumber(row.oilKg)}</td>
                <td>{formatPercent(row.oilYieldPercent)}</td>
                <td>{row.kgPerTree}</td>
                <td>{row.kgPerHa}</td>
                <td>{row.millName}</td>
                <td>{row.qualityGrade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    {data.map(record => (
      <section key={record.fieldId} className="report-section">
        <h4 className="report-section-title">{record.fieldName} — Details</h4>
        <div className="report-info-grid">
          <div className="report-info-item">
            <label>Harvest Method</label>
            <span>{record.harvestMethod}</span>
          </div>
          <div className="report-info-item">
            <label>Workers</label>
            <span>{record.workersUsed}</span>
          </div>
          <div className="report-info-item">
            <label>Mill Delivery</label>
            <span>{record.deliveryTime}</span>
          </div>
          <div className="report-info-item">
            <label>Rejected / Damaged</label>
            <span>{formatNumber(record.rejectedKg)} kg</span>
          </div>
          {record.oilAcidity != null && (
            <div className="report-info-item">
              <label>Oil Acidity</label>
              <span>{record.oilAcidity}%</span>
            </div>
          )}
        </div>
        {record.notes && (
          <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0.65rem 0 0' }}>
            {record.notes}
          </p>
        )}
      </section>
    ))}

    <div className="report-insight-box">
      <Info size={18} />
      <div>
        <strong>Key Insight</strong>
        <p style={{ margin: '0.25rem 0 0' }}>{HARVEST_INSIGHT}</p>
      </div>
    </div>
  </ReportDocumentShell>
);

export default ProductionHarvestReportView;
