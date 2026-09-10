import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  ClipboardList,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Lightbulb,
  TreePine,
} from 'lucide-react';
import {
  FieldSummaryData,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../../data/mockReportData';
import { formatAreaFromSqm, sqmFromHectares } from '../../utils/area';
import ReportDocumentShell from './ReportDocumentShell';
import './ReportDocument.css';

interface Props {
  data: FieldSummaryData[];
  id?: string;
  season?: string;
}

const FieldSummaryReportView: React.FC<Props> = ({ data, id, season }) => {
  const { t, i18n } = useTranslation('reports');
  const locale = i18n.language.startsWith('el') ? 'el' : i18n.language.startsWith('it') ? 'it' : 'en';

  return (
  <ReportDocumentShell
    id={id}
    title={t('doc.yearTitle')}
    subtitle={t('doc.yearSubtitle')}
    season={season}
  >
    {data.map(field => (
      <article key={field.fieldId} className="report-field-card">
        <div className="report-field-card-header">
          <div>
            <h3>{field.fieldName}</h3>
            <p className="report-field-location">
              <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              {field.location}
            </p>
          </div>
          <div className="report-field-badges">
            <span className="report-badge">{field.variety}</span>
            <span className="report-badge report-badge-oil">{field.productionType}</span>
            <span className="report-badge">{field.irrigationType}</span>
          </div>
        </div>

        <section className="report-section">
          <h4 className="report-section-title">
            <TreePine size={16} /> {t('doc.fieldInfo')}
          </h4>
          <div className="report-info-grid">
            <div className="report-info-item">
              <label>{t('doc.area')}</label>
              <span>
                {formatAreaFromSqm(sqmFromHectares(field.areaHa || 0), { locale, style: 'withConversions' })}
              </span>
            </div>
            <div className="report-info-item">
              <label>Trees</label>
              <span>{formatNumber(field.treeCount)}</span>
            </div>
            <div className="report-info-item">
              <label>Tree Age</label>
              <span>{field.treeAge} years</span>
            </div>
            <div className="report-info-item">
              <label>Soil Type</label>
              <span>{field.soilType}</span>
            </div>
            <div className="report-info-item">
              <label>Last Pruning</label>
              <span>{field.lastPruningDate}</span>
            </div>
            <div className="report-info-item">
              <label>Last Soil Analysis</label>
              <span>{field.lastSoilAnalysis}</span>
            </div>
            <div className="report-info-item">
              <label>Last Harvest</label>
              <span>{field.lastHarvestDate}</span>
            </div>
          </div>
        </section>

        <section className="report-section">
          <h4 className="report-section-title">
            <ClipboardList size={16} /> {t('doc.taskActivity')}
          </h4>
          <div className="report-metrics-row">
            <div className="report-metric">
              <div className="report-metric-value">{field.tasksCompleted}</div>
              <div className="report-metric-label">{t('doc.completed')}</div>
            </div>
            <div className="report-metric">
              <div className="report-metric-value">{field.tasksPending}</div>
              <div className="report-metric-label">{t('doc.pending')}</div>
            </div>
            <div className="report-metric">
              <div className="report-metric-value negative">{field.tasksOverdue}</div>
              <div className="report-metric-label">{t('doc.overdue')}</div>
            </div>
          </div>
        </section>

        <section className="report-section">
          <h4 className="report-section-title">
            <TrendingUp size={16} /> Production Summary
          </h4>
          <div className="report-metrics-row">
            <div className="report-metric">
              <div className="report-metric-value">{formatNumber(field.totalProductionKg)} kg</div>
              <div className="report-metric-label">Olives</div>
            </div>
            {field.oilProducedKg != null && (
              <div className="report-metric">
                <div className="report-metric-value">{formatNumber(field.oilProducedKg)} kg</div>
                <div className="report-metric-label">Oil Produced</div>
              </div>
            )}
            {field.oilYieldPercent != null && (
              <div className="report-metric">
                <div className="report-metric-value">{formatPercent(field.oilYieldPercent)}</div>
                <div className="report-metric-label">Oil Yield</div>
              </div>
            )}
            <div className="report-metric">
              <div className="report-metric-value">{field.yieldPerTree} kg</div>
              <div className="report-metric-label">Per Tree</div>
            </div>
            <div className="report-metric">
              <div className="report-metric-value">{field.yieldPerHa} kg</div>
              <div className="report-metric-label">Per Hectare</div>
            </div>
          </div>
        </section>

        <section className="report-section">
          <h4 className="report-section-title">
            <DollarSign size={16} /> Cost Summary
          </h4>
          <div className="report-metrics-row">
            <div className="report-metric">
              <div className="report-metric-value">{formatCurrency(field.totalCost)}</div>
              <div className="report-metric-label">Total Cost</div>
            </div>
            <div className="report-metric">
              <div className="report-metric-value">{formatCurrency(field.costPerHa)}</div>
              <div className="report-metric-label">Cost / Ha</div>
            </div>
            <div className="report-metric">
              <div className="report-metric-value">{formatCurrency(field.revenue)}</div>
              <div className="report-metric-label">Revenue</div>
            </div>
            <div className="report-metric">
              <div className="report-metric-value positive">{formatCurrency(field.profit)}</div>
              <div className="report-metric-label">Profit</div>
            </div>
          </div>
        </section>

        {field.issues.length > 0 && (
          <section className="report-section">
            <h4 className="report-section-title">
              <AlertTriangle size={16} /> Problems Detected
            </h4>
            <ul className="report-list report-list-issues">
              {field.issues.map((issue, i) => (
                <li key={i}>
                  <span className="report-list-icon">•</span>
                  {issue}
                </li>
              ))}
            </ul>
          </section>
        )}

        {field.recommendations.length > 0 && (
          <section className="report-section">
            <h4 className="report-section-title">
              <Lightbulb size={16} /> Recommendations
            </h4>
            <ul className="report-list report-list-recommendations">
              {field.recommendations.map((rec, i) => (
                <li key={i}>
                  <span className="report-list-icon">→</span>
                  {rec}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    ))}
  </ReportDocumentShell>
  );
};

export default FieldSummaryReportView;
