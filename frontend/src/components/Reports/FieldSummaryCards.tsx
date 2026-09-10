import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, ClipboardList, TrendingUp, DollarSign } from 'lucide-react';
import {
  FieldSummaryData,
  formatCurrency,
  formatNumber,
  formatPercent,
  displayOrDash,
} from '../../data/mockReportData';
import { formatAreaFromSqm, sqmFromHectares } from '../../utils/area';
import { numberLocaleFor } from '../../utils/fieldDisplay';
import './ReportDocument.css';

interface Props {
  data: FieldSummaryData[];
  locale?: string;
}

const FieldSummaryCards: React.FC<Props> = ({ data, locale: localeProp }) => {
  const { t, i18n } = useTranslation('reports');
  const locale = localeProp ?? numberLocaleFor(i18n.language);

  return (
    <>
      {data.map((field) => (
        <article key={field.fieldId} className="report-field-card">
          <div className="report-field-card-header">
            <div>
              <h3>{field.fieldName}</h3>
              {field.location ? (
                <p className="report-field-location">
                  <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  {field.location}
                </p>
              ) : null}
            </div>
            <div className="report-field-badges">
              {field.variety ? <span className="report-badge">{field.variety}</span> : null}
              {field.irrigationType ? <span className="report-badge">{field.irrigationType}</span> : null}
            </div>
          </div>

          <section className="report-section">
            <h4 className="report-section-title">
              {t('doc.fieldInfo')}
            </h4>
            <div className="report-info-grid">
              <div className="report-info-item">
                <label>{t('doc.area')}</label>
                <span>
                  {formatAreaFromSqm(sqmFromHectares(field.areaHa || 0), {
                    locale: i18n.language.startsWith('el') ? 'el' : i18n.language.startsWith('it') ? 'it' : 'en',
                    style: 'withConversions',
                  })}
                </span>
              </div>
              <div className="report-info-item">
                <label>{t('doc.trees')}</label>
                <span>{field.treeCount ? formatNumber(field.treeCount, 0, locale) : '—'}</span>
              </div>
              <div className="report-info-item">
                <label>{t('doc.treeAge')}</label>
                <span>{field.treeAge ? `${formatNumber(field.treeAge, 0, locale)} ${t('doc.years')}` : '—'}</span>
              </div>
              <div className="report-info-item">
                <label>{t('doc.soilType')}</label>
                <span>{displayOrDash(field.soilType)}</span>
              </div>
              <div className="report-info-item">
                <label>{t('doc.lastPruning')}</label>
                <span>{displayOrDash(field.lastPruningDate)}</span>
              </div>
              <div className="report-info-item">
                <label>{t('doc.lastHarvest')}</label>
                <span>{displayOrDash(field.lastHarvestDate)}</span>
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
          </section>

          <section className="report-section">
            <h4 className="report-section-title">
              <TrendingUp size={16} /> {t('doc.production')}
            </h4>
            <div className="report-metrics-row">
              <div className="report-metric">
                <div className="report-metric-value">{formatNumber(field.totalProductionKg, 0, locale)} kg</div>
                <div className="report-metric-label">{t('doc.olives')}</div>
              </div>
              {field.oilProducedKg != null && (
                <div className="report-metric">
                  <div className="report-metric-value">{formatNumber(field.oilProducedKg, 0, locale)} kg</div>
                  <div className="report-metric-label">{t('doc.oil')}</div>
                </div>
              )}
              {field.oilYieldPercent != null && (
                <div className="report-metric">
                  <div className="report-metric-value">{formatPercent(field.oilYieldPercent, locale)}</div>
                  <div className="report-metric-label">{t('doc.oilYield')}</div>
                </div>
              )}
              <div className="report-metric">
                <div className="report-metric-value">{formatNumber(field.yieldPerTree, 1, locale)} kg</div>
                <div className="report-metric-label">{t('doc.perTree')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">{formatNumber(field.yieldPerHa, 0, locale)} kg</div>
                <div className="report-metric-label">{t('doc.perHa')}</div>
              </div>
            </div>
          </section>

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
        </article>
      ))}
    </>
  );
};

export default FieldSummaryCards;
