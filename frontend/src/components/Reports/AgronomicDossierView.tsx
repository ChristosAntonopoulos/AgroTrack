import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FieldSummaryData,
  FieldYearlyOperations,
  displayOrDash,
  formatHa,
  formatMm,
  formatNumber,
  formatPercent,
  formatTemp,
} from '../../data/mockReportData';
import { numberLocaleFor } from '../../utils/fieldDisplay';
import ReportDocumentShell from './ReportDocumentShell';
import { DossierSection, ReadingMark } from './FormalBits';
import { VerticalBars } from './ReportVisuals';
import { getChartPalette } from '../../styles/colorTokens';
import {
  readingDry,
  readingFrost,
  readingHeat,
  readingNdvi,
  readingOilYield,
  readingWater,
  sum,
  weatherObserved,
  weightedMean,
} from './dossierMath';

interface Props {
  summaries: FieldSummaryData[];
  yearly: FieldYearlyOperations[];
  season: string;
  id?: string;
}

const AgronomicDossierView: React.FC<Props> = ({ summaries, yearly, season, id }) => {
  const { t, i18n } = useTranslation('reports');
  const locale = numberLocaleFor(i18n.language);
  const monthLabels = Array.from({ length: 12 }, (_, index) =>
    new Date(2000, index, 1).toLocaleDateString(i18n.language, { month: 'short' }).replace('.', '')
  );

  const groves = useMemo(() => {
    const summaryById = new Map(summaries.map((field) => [field.fieldId, field]));
    const yearlyById = new Map(yearly.map((field) => [field.fieldId, field]));
    const ids = [...new Set([...summaries.map((field) => field.fieldId), ...yearly.map((field) => field.fieldId)])];
    return ids.map((fieldId) => ({
      summary: summaryById.get(fieldId),
      weather: yearlyById.get(fieldId),
      fieldId,
      name: summaryById.get(fieldId)?.fieldName ?? yearlyById.get(fieldId)?.fieldName ?? fieldId,
    }));
  }, [summaries, yearly]);

  const areaHa = sum(groves.map((grove) => grove.summary?.areaHa ?? grove.weather?.areaHa ?? 0));
  const trees = sum(groves.map((grove) => grove.summary?.treeCount ?? 0));
  const varieties = new Set(groves.map((grove) => grove.summary?.variety).filter(Boolean)).size;
  const observed = groves
    .map((grove) => grove.weather)
    .filter((field): field is FieldYearlyOperations => !!field && weatherObserved(field));
  const rainWeighted = weightedMean(observed.map((field) => ({ value: field.rainTotalMm, weight: field.areaHa || 1 })));
  const balanceWeighted = weightedMean(
    observed
      .filter((field) => field.waterBalanceMm != null)
      .map((field) => ({ value: field.waterBalanceMm as number, weight: field.areaHa || 1 }))
  );

  const operations = new Map<string, { completed: number; total: number }>();
  groves.forEach((grove) => {
    grove.weather?.tasksByType.forEach((row) => {
      const current = operations.get(row.type) ?? { completed: 0, total: 0 };
      operations.set(row.type, {
        completed: current.completed + row.completed,
        total: current.total + row.total,
      });
    });
  });
  const operationRows = [...operations.entries()].sort((a, b) => b[1].total - a[1].total);

  return (
    <ReportDocumentShell
      id={id}
      formal={{
        code: `ATD-${season}`,
        audience: t('dossier.audienceAgronomist'),
        classification: t('dossier.classTechnical'),
      }}
      title={t('dossier.agronomicTitle')}
      subtitle={t('dossier.agronomicSubtitle')}
      season={season}
    >
      {groves.length === 0 ? (
        <p className="report-empty-copy">{t('dossier.noGroves')}</p>
      ) : (
        <>
          <DossierSection index="1" title={t('dossier.scope')}>
            <p className="report-lead">{t('dossier.agronomicLead')}</p>
            <div className="report-metrics-row">
              <div className="report-metric">
                <div className="report-metric-value">{formatNumber(groves.length, 0, locale)}</div>
                <div className="report-metric-label">{t('fields')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">{formatHa(areaHa, locale)}</div>
                <div className="report-metric-label">{t('doc.area')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">{formatNumber(trees, 0, locale)}</div>
                <div className="report-metric-label">{t('doc.trees')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">{formatNumber(varieties, 0, locale)}</div>
                <div className="report-metric-label">{t('dossier.varieties')}</div>
              </div>
            </div>
          </DossierSection>

          <DossierSection index="2" title={t('dossier.register')}>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('fields')}</th>
                    <th className="num">{t('doc.area')}</th>
                    <th className="num">{t('doc.trees')}</th>
                    <th className="num">{t('dossier.density')}</th>
                    <th>{t('doc.variety')}</th>
                    <th className="num">{t('doc.treeAge')}</th>
                    <th>{t('doc.soilType')}</th>
                    <th>{t('doc.irrigation')}</th>
                    <th>{t('doc.lastPruning')}</th>
                  </tr>
                </thead>
                <tbody>
                  {groves.map((grove) => {
                    const area = grove.summary?.areaHa ?? grove.weather?.areaHa ?? 0;
                    const treeCount = grove.summary?.treeCount ?? 0;
                    const density = area > 0 && treeCount > 0 ? treeCount / area : null;
                    return (
                      <tr key={grove.fieldId}>
                        <td className="field-name-cell">
                          {grove.name}
                          {grove.summary?.location ? (
                            <div className="report-cell-sub">{grove.summary.location}</div>
                          ) : null}
                        </td>
                        <td className="num">{formatHa(area, locale)}</td>
                        <td className="num">{treeCount > 0 ? formatNumber(treeCount, 0, locale) : '—'}</td>
                        <td className="num">{density != null ? formatNumber(density, 0, locale) : '—'}</td>
                        <td>{displayOrDash(grove.summary?.variety)}</td>
                        <td className="num">
                          {grove.summary?.treeAge ? `${formatNumber(grove.summary.treeAge, 0, locale)}` : '—'}
                        </td>
                        <td>{displayOrDash(grove.summary?.soilType)}</td>
                        <td>{displayOrDash(grove.summary?.irrigationType)}</td>
                        <td>{displayOrDash(grove.summary?.lastPruningDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DossierSection>

          <DossierSection index="3" title={t('dossier.climate')}>
            <p className="report-lead">
              {t('dossier.climateLead', {
                rain: rainWeighted == null ? '—' : formatMm(rainWeighted, locale),
                balance: balanceWeighted == null ? '—' : formatMm(balanceWeighted, locale),
              })}
            </p>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('fields')}</th>
                    <th className="num">{t('doc.rain')}</th>
                    <th className="num">{t('doc.vsLastYear')}</th>
                    <th className="num">{t('doc.et0')}</th>
                    <th className="num">{t('doc.waterBalance')}</th>
                    <th>{t('dossier.reading')}</th>
                    <th>{t('dossier.wettest')}</th>
                  </tr>
                </thead>
                <tbody>
                  {groves.map((grove) => {
                    const weather = grove.weather;
                    const observedField = !!weather && weatherObserved(weather);
                    const wettest = weather?.wettestMonth
                      ? new Date(2000, weather.wettestMonth - 1, 1).toLocaleDateString(i18n.language, { month: 'long' })
                      : '—';
                    return (
                      <tr key={grove.fieldId}>
                        <td className="field-name-cell">{grove.name}</td>
                        <td className="num">{observedField ? formatMm(weather?.rainTotalMm, locale) : '—'}</td>
                        <td className="num">
                          {weather?.rainVsPreviousPercent == null
                            ? '—'
                            : `${weather.rainVsPreviousPercent > 0 ? '+' : ''}${formatNumber(weather.rainVsPreviousPercent, 0, locale)}%`}
                        </td>
                        <td className="num">{weather?.et0TotalMm ? formatMm(weather.et0TotalMm, locale) : '—'}</td>
                        <td className="num">
                          {weather?.waterBalanceMm == null ? '—' : formatMm(weather.waterBalanceMm, locale)}
                        </td>
                        <td><ReadingMark reading={readingWater(observedField ? weather?.waterBalanceMm : null)} /></td>
                        <td>{observedField ? wettest : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="report-table-wrap report-table-gap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('fields')}</th>
                    <th className="num">{t('doc.frost')}</th>
                    <th>{t('dossier.reading')}</th>
                    <th className="num">{t('doc.heat')}</th>
                    <th>{t('dossier.reading')}</th>
                    <th className="num">{t('doc.dryStreak')}</th>
                    <th>{t('dossier.reading')}</th>
                    <th className="num">{t('doc.minTemp')}</th>
                    <th className="num">{t('doc.maxTemp')}</th>
                  </tr>
                </thead>
                <tbody>
                  {groves.map((grove) => {
                    const weather = grove.weather;
                    const observedField = !!weather && weatherObserved(weather);
                    return (
                      <tr key={grove.fieldId}>
                        <td className="field-name-cell">{grove.name}</td>
                        <td className="num">{observedField ? formatNumber(weather?.frostNights, 0, locale) : '—'}</td>
                        <td><ReadingMark reading={readingFrost(weather?.frostNights ?? 0, observedField)} /></td>
                        <td className="num">{observedField ? formatNumber(weather?.heatDays, 0, locale) : '—'}</td>
                        <td><ReadingMark reading={readingHeat(weather?.heatDays ?? 0, observedField)} /></td>
                        <td className="num">{observedField ? formatNumber(weather?.longestDryStreakDays, 0, locale) : '—'}</td>
                        <td><ReadingMark reading={readingDry(weather?.longestDryStreakDays ?? 0, observedField)} /></td>
                        <td className="num">{formatTemp(weather?.minTemperatureC, locale)}</td>
                        <td className="num">{formatTemp(weather?.maxTemperatureC, locale)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {observed.some((field) => field.monthlyRainMm.some((value) => value > 0)) && (
              <div className="report-chart-grid">
                {observed.filter((field) => field.monthlyRainMm.some((value) => value > 0)).map((field) => (
                  <div key={field.fieldId} className="report-chart-area">
                    <h4>{field.fieldName} · {t('doc.monthlyRain')}</h4>
                    <VerticalBars values={field.monthlyRainMm} labels={monthLabels} color={getChartPalette().olive} />
                  </div>
                ))}
              </div>
            )}
          </DossierSection>

          <DossierSection index="4" title={t('dossier.canopy')}>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('fields')}</th>
                    <th className="num">{t('doc.ndvi')}</th>
                    <th>{t('dossier.reading')}</th>
                  </tr>
                </thead>
                <tbody>
                  {groves.map((grove) => (
                    <tr key={grove.fieldId}>
                      <td className="field-name-cell">{grove.name}</td>
                      <td className="num">
                        {grove.weather?.ndviMean == null ? '—' : formatNumber(grove.weather.ndviMean, 3, locale)}
                      </td>
                      <td><ReadingMark reading={readingNdvi(grove.weather?.ndviMean)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DossierSection>

          <DossierSection index="5" title={t('dossier.operations')}>
            {operationRows.length === 0 ? (
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
                    {operationRows.map(([type, row]) => {
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
            <div className="report-table-wrap report-table-gap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('fields')}</th>
                    <th className="num">{t('doc.completed')}</th>
                    <th className="num">{t('doc.pending')}</th>
                    <th className="num">{t('doc.overdue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {groves.map((grove) => {
                    const done = grove.summary?.tasksCompleted ?? grove.weather?.tasksCompleted ?? 0;
                    const open = grove.summary?.tasksPending ?? grove.weather?.tasksPending ?? 0;
                    const overdue = grove.summary?.tasksOverdue ?? grove.weather?.tasksOverdue ?? 0;
                    return (
                      <tr key={grove.fieldId}>
                        <td className="field-name-cell">{grove.name}</td>
                        <td className="num">{formatNumber(done, 0, locale)}</td>
                        <td className="num">{formatNumber(open, 0, locale)}</td>
                        <td className={`num ${overdue > 0 ? 'pressure-high' : ''}`}>{formatNumber(overdue, 0, locale)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DossierSection>

          <DossierSection index="6" title={t('dossier.productivity')}>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('fields')}</th>
                    <th className="num">{t('doc.olives')}</th>
                    <th className="num">{t('doc.perTree')}</th>
                    <th className="num">{t('doc.perHa')}</th>
                    <th className="num">{t('doc.oil')}</th>
                    <th className="num">{t('doc.oilYield')}</th>
                    <th>{t('dossier.reading')}</th>
                    <th>{t('doc.lastHarvest')}</th>
                  </tr>
                </thead>
                <tbody>
                  {groves.map((grove) => {
                    const summary = grove.summary;
                    return (
                      <tr key={grove.fieldId}>
                        <td className="field-name-cell">{grove.name}</td>
                        <td className="num">{summary ? `${formatNumber(summary.totalProductionKg, 0, locale)} kg` : '—'}</td>
                        <td className="num">{summary?.yieldPerTree ? `${formatNumber(summary.yieldPerTree, 1, locale)} kg` : '—'}</td>
                        <td className="num">{summary ? `${formatNumber(summary.yieldPerHa, 0, locale)} kg` : '—'}</td>
                        <td className="num">{summary?.oilProducedKg != null ? `${formatNumber(summary.oilProducedKg, 0, locale)} kg` : '—'}</td>
                        <td className="num">{formatPercent(summary?.oilYieldPercent, locale)}</td>
                        <td><ReadingMark reading={readingOilYield(summary?.oilYieldPercent)} /></td>
                        <td>{displayOrDash(summary?.lastHarvestDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DossierSection>

          <DossierSection index="7" title={t('dossier.notes')}>
            {groves.every((grove) => (grove.weather?.insights.length ?? 0) === 0 && (grove.summary?.issues.length ?? 0) === 0) ? (
              <p className="report-empty-copy">{t('dossier.noNotes')}</p>
            ) : (
              groves.map((grove) => {
                const insights = grove.weather?.insights ?? [];
                const issues = grove.summary?.issues ?? [];
                if (insights.length === 0 && issues.length === 0) return null;
                return (
                  <div key={grove.fieldId} className="report-note-block">
                    <h5>{grove.name}</h5>
                    <ul className="report-list">
                      {insights.map((insight, index) => (
                        <li key={`${insight.code}-${index}`}>
                          <span className="report-list-icon">→</span>
                          {t(`insights.${insight.code}`, { count: insight.count ?? 0, value: insight.value ?? 0 })}
                        </li>
                      ))}
                      {issues.map((issue) => (
                        <li key={issue}>
                          <span className="report-list-icon">→</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </DossierSection>

          <p className="report-method">{t('dossier.agronomicMethod')}</p>
        </>
      )}
    </ReportDocumentShell>
  );
};

export default AgronomicDossierView;
