import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FieldSummaryData,
  FieldYearlyOperations,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../../data/mockReportData';
import { numberLocaleFor } from '../../utils/fieldDisplay';
import ReportDocumentShell from './ReportDocumentShell';
import { DossierSection } from './FormalBits';
import { VerticalBars } from './ReportVisuals';
import { getChartPalette } from '../../styles/colorTokens';
import { sum } from './dossierMath';

interface Props {
  summaries: FieldSummaryData[];
  yearly: FieldYearlyOperations[];
  season: string;
  id?: string;
}

const WorkRegisterView: React.FC<Props> = ({ summaries, yearly, season, id }) => {
  const { t, i18n } = useTranslation('reports');
  const locale = numberLocaleFor(i18n.language);
  const monthLabels = Array.from({ length: 12 }, (_, index) =>
    new Date(2000, index, 1).toLocaleDateString(i18n.language, { month: 'short' }).replace('.', '')
  );

  const ledger = useMemo(() => {
    const summaryById = new Map(summaries.map((field) => [field.fieldId, field]));
    const yearlyById = new Map(yearly.map((field) => [field.fieldId, field]));
    const ids = [...new Set([...summaries.map((field) => field.fieldId), ...yearly.map((field) => field.fieldId)])];
    return ids.map((fieldId) => {
      const summary = summaryById.get(fieldId);
      const weather = yearlyById.get(fieldId);
      return {
        fieldId,
        name: summary?.fieldName ?? weather?.fieldName ?? fieldId,
        done: summary?.tasksCompleted ?? weather?.tasksCompleted ?? 0,
        open: summary?.tasksPending ?? weather?.tasksPending ?? 0,
        overdue: summary?.tasksOverdue ?? weather?.tasksOverdue ?? 0,
        cost: summary?.totalCost ?? weather?.totalCost ?? 0,
      };
    });
  }, [summaries, yearly]);

  const monthly = useMemo(() => {
    const totals = Array(12).fill(0);
    yearly.forEach((field) => {
      field.monthlyTasksCompleted.forEach((count, index) => {
        if (index < totals.length) totals[index] += count;
      });
    });
    return totals;
  }, [yearly]);

  const byType = useMemo(() => {
    const groups = new Map<string, { completed: number; total: number }>();
    yearly.forEach((field) => {
      field.tasksByType.forEach((row) => {
        const current = groups.get(row.type) ?? { completed: 0, total: 0 };
        groups.set(row.type, {
          completed: current.completed + row.completed,
          total: current.total + row.total,
        });
      });
    });
    return [...groups.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [yearly]);

  const done = sum(ledger.map((row) => row.done));
  const open = sum(ledger.map((row) => row.open));
  const overdue = sum(ledger.map((row) => row.overdue));
  const cost = sum(ledger.map((row) => row.cost));
  const planned = done + open;

  return (
    <ReportDocumentShell
      id={id}
      formal={{
        code: `SWR-${season}`,
        audience: t('brief.audienceCrew'),
        classification: t('brief.classWork'),
      }}
      title={t('brief.workTitle')}
      subtitle={t('brief.workSubtitle')}
      season={season}
    >
      {ledger.length === 0 ? (
        <p className="report-empty-copy">{t('dossier.noGroves')}</p>
      ) : (
        <>
          <DossierSection index="1" title={t('brief.workScope')}>
            <p className="report-lead">{t('brief.workLead')}</p>
            <div className="report-metrics-row">
              <div className="report-metric">
                <div className="report-metric-value">{formatNumber(done, 0, locale)}</div>
                <div className="report-metric-label">{t('doc.completed')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">{formatNumber(open, 0, locale)}</div>
                <div className="report-metric-label">{t('doc.pending')}</div>
              </div>
              <div className="report-metric">
                <div className={`report-metric-value ${overdue > 0 ? 'negative' : ''}`}>
                  {formatNumber(overdue, 0, locale)}
                </div>
                <div className="report-metric-label">{t('doc.overdue')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">{formatPercent(planned > 0 ? (done / planned) * 100 : undefined, locale)}</div>
                <div className="report-metric-label">{t('dossier.completion')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">{formatCurrency(cost, locale)}</div>
                <div className="report-metric-label">{t('brief.postedCost')}</div>
              </div>
            </div>
          </DossierSection>

          <DossierSection index="2" title={t('brief.byMonth')}>
            {monthly.every((value) => value === 0) ? (
              <p className="report-empty-copy">{t('dossier.noOperations')}</p>
            ) : (
              <div className="report-chart-area">
                <h4>{t('doc.monthlyTasks')}</h4>
                <VerticalBars values={monthly} labels={monthLabels} color={getChartPalette().olive} />
              </div>
            )}
          </DossierSection>

          <DossierSection index="3" title={t('brief.byKind')}>
            {byType.length === 0 ? (
              <p className="report-empty-copy">{t('dossier.noOperations')}</p>
            ) : (
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{t('doc.type')}</th>
                      <th className="num">{t('doc.completed')}</th>
                      <th className="num">{t('dossier.planned')}</th>
                      <th>{t('dossier.completion')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byType.map(([type, row]) => {
                      const rate = row.total > 0 ? (row.completed / row.total) * 100 : 0;
                      return (
                        <tr key={type}>
                          <td className="field-name-cell">{type}</td>
                          <td className="num">{formatNumber(row.completed, 0, locale)}</td>
                          <td className="num">{formatNumber(row.total, 0, locale)}</td>
                          <td>
                            <div className="report-completion">
                              <div className="report-completion-fill" style={{ width: `${rate}%` }} />
                              <span>{formatPercent(rate, locale)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </DossierSection>

          <DossierSection index="4" title={t('brief.groveLedger')}>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('fields')}</th>
                    <th className="num">{t('doc.completed')}</th>
                    <th className="num">{t('doc.pending')}</th>
                    <th className="num">{t('doc.overdue')}</th>
                    <th className="num">{t('brief.postedCost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row) => (
                    <tr key={row.fieldId}>
                      <td className="field-name-cell">{row.name}</td>
                      <td className="num">{formatNumber(row.done, 0, locale)}</td>
                      <td className="num">{formatNumber(row.open, 0, locale)}</td>
                      <td className={`num ${row.overdue > 0 ? 'pressure-high' : ''}`}>
                        {formatNumber(row.overdue, 0, locale)}
                      </td>
                      <td className="num">{formatCurrency(row.cost, locale)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>{t('dossier.holding')}</td>
                    <td className="num">{formatNumber(done, 0, locale)}</td>
                    <td className="num">{formatNumber(open, 0, locale)}</td>
                    <td className="num">{formatNumber(overdue, 0, locale)}</td>
                    <td className="num">{formatCurrency(cost, locale)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </DossierSection>

          <p className="report-method">{t('brief.workMethod')}</p>
        </>
      )}
    </ReportDocumentShell>
  );
};

export default WorkRegisterView;
