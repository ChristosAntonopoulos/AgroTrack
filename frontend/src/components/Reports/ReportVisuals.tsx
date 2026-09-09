import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { ReportInsight } from '../../data/mockReportData';

export const InsightList: React.FC<{ insights: ReportInsight[] }> = ({ insights }) => {
  const { t } = useTranslation('reports');
  if (!insights.length) return null;
  return (
    <section className="report-section">
      <h4 className="report-section-title">
        <Lightbulb size={16} /> {t('doc.insights')}
      </h4>
      <ul className="report-list report-list-recommendations">
        {insights.map((insight, index) => (
          <li key={`${insight.code}-${index}`}>
            <span className="report-list-icon">→</span>
            {t(`insights.${insight.code}`, {
              count: insight.count ?? 0,
              value: insight.value ?? 0,
            })}
          </li>
        ))}
      </ul>
    </section>
  );
};

export const VerticalBars: React.FC<{
  values: number[];
  labels: string[];
  color?: string;
}> = ({ values, labels, color = '#2E4A2E' }) => {
  const max = Math.max(...values.map((v) => Math.abs(v)), 0.01);
  return (
    <div className="report-spark-row" role="img">
      {values.map((value, i) => (
        <div key={labels[i] ?? i} className="report-spark-col">
          <div className="report-spark-track">
            <div
              className="report-spark-fill"
              style={{
                height: `${value === 0 ? 0 : Math.max(4, (Math.abs(value) / max) * 100)}%`,
                background: value < 0 ? '#dc2626' : color,
              }}
            />
          </div>
          <span className="report-spark-label">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
};

export const DualBars: React.FC<{
  first: number[];
  second: number[];
  labels: string[];
  firstColor?: string;
  secondColor?: string;
}> = ({ first, second, labels, firstColor = '#2E4A2E', secondColor = '#c5a35a' }) => {
  const max = Math.max(...first, ...second, 0.01);
  return (
    <div className="report-spark-row">
      {labels.map((label, i) => (
        <div key={label} className="report-spark-col">
          <div className="report-spark-track report-spark-track-dual">
            <div
              className="report-spark-fill"
              style={{ height: `${(first[i] ?? 0) === 0 ? 0 : Math.max(3, ((first[i] ?? 0) / max) * 100)}%`, background: firstColor }}
            />
            <div
              className="report-spark-fill"
              style={{ height: `${(second[i] ?? 0) === 0 ? 0 : Math.max(3, ((second[i] ?? 0) / max) * 100)}%`, background: secondColor }}
            />
          </div>
          <span className="report-spark-label">{label}</span>
        </div>
      ))}
    </div>
  );
};
