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
import { DossierSection, ReadingMark, ShareBar } from './FormalBits';
import { marginPercent, readingOilYield } from './dossierMath';

interface Props {
  summaries: FieldSummaryData[];
  yearly: FieldYearlyOperations[];
  season: string;
  id?: string;
}

interface RankedGrove {
  fieldId: string;
  name: string;
  areaHa: number;
  olivesPerHa: number;
  oilYield?: number;
  costPerHa: number;
  resultPerHa: number;
  margin: number | null;
  frost: number | null;
  heat: number | null;
  dry: number | null;
}

function leader(rows: RankedGrove[], pick: (row: RankedGrove) => number): string {
  if (rows.length === 0) return '—';
  return rows.reduce((best, row) => (pick(row) > pick(best) ? row : best)).name;
}

const GroveComparisonView: React.FC<Props> = ({ summaries, yearly, season, id }) => {
  const { t, i18n } = useTranslation('reports');
  const locale = numberLocaleFor(i18n.language);

  const ranked = useMemo(() => {
    const weather = new Map(yearly.map((field) => [field.fieldId, field]));
    return summaries
      .map((field): RankedGrove => {
        const climate = weather.get(field.fieldId);
        const area = field.areaHa || 0;
        return {
          fieldId: field.fieldId,
          name: field.fieldName,
          areaHa: area,
          olivesPerHa: field.yieldPerHa || (area > 0 ? field.totalProductionKg / area : 0),
          oilYield: field.oilYieldPercent,
          costPerHa: field.costPerHa || (area > 0 ? field.totalCost / area : 0),
          resultPerHa: area > 0 ? field.profit / area : field.profit,
          margin: marginPercent(field.profit, field.revenue),
          frost: climate ? climate.frostNights : null,
          heat: climate ? climate.heatDays : null,
          dry: climate ? climate.longestDryStreakDays : null,
        };
      })
      .sort((a, b) => b.resultPerHa - a.resultPerHa);
  }, [summaries, yearly]);

  const maxYield = Math.max(...ranked.map((row) => row.olivesPerHa), 0.01);

  return (
    <ReportDocumentShell
      id={id}
      formal={{
        code: `CPB-${season}`,
        audience: t('dossier.audienceOwner'),
        classification: t('brief.classCompare'),
      }}
      title={t('brief.compareTitle')}
      subtitle={t('brief.compareSubtitle')}
      season={season}
    >
      {ranked.length === 0 ? (
        <p className="report-empty-copy">{t('dossier.noGroves')}</p>
      ) : (
        <>
          <DossierSection index="1" title={t('brief.standing')}>
            <p className="report-lead">{t('brief.compareLead')}</p>
            <div className="report-insights-grid">
              <div className="report-insight-item">
                <div>
                  <strong>{leader(ranked, (row) => row.resultPerHa)}</strong>
                  <span>{t('brief.bestResult')}</span>
                </div>
              </div>
              <div className="report-insight-item">
                <div>
                  <strong>{leader(ranked, (row) => row.olivesPerHa)}</strong>
                  <span>{t('brief.bestYield')}</span>
                </div>
              </div>
              <div className="report-insight-item">
                <div>
                  <strong>{leader(ranked, (row) => row.oilYield ?? -1)}</strong>
                  <span>{t('brief.bestOil')}</span>
                </div>
              </div>
              <div className="report-insight-item">
                <div>
                  <strong>{leader(ranked, (row) => row.costPerHa)}</strong>
                  <span>{t('brief.highestCost')}</span>
                </div>
              </div>
            </div>
          </DossierSection>

          <DossierSection index="2" title={t('brief.rankTable')}>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th className="num">{t('brief.rank')}</th>
                    <th>{t('fields')}</th>
                    <th className="num">{t('doc.perHa')}</th>
                    <th className="num">{t('doc.oilYield')}</th>
                    <th>{t('dossier.reading')}</th>
                    <th className="num">{t('doc.costHa')}</th>
                    <th className="num">{t('brief.resultHa')}</th>
                    <th className="num">{t('dossier.netMargin')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((row, index) => (
                    <tr key={row.fieldId}>
                      <td className="num">{formatNumber(index + 1, 0, locale)}</td>
                      <td className="field-name-cell">{row.name}</td>
                      <td className="num">{formatNumber(row.olivesPerHa, 0, locale)} kg</td>
                      <td className="num">{formatPercent(row.oilYield, locale)}</td>
                      <td><ReadingMark reading={readingOilYield(row.oilYield)} /></td>
                      <td className="num">{formatCurrency(row.costPerHa, locale)}</td>
                      <td className={`num ${row.resultPerHa >= 0 ? 'pressure-low' : 'pressure-high'}`}>
                        {formatCurrency(row.resultPerHa, locale)}
                      </td>
                      <td className="num">{formatPercent(row.margin ?? undefined, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DossierSection>

          <DossierSection index="3" title={t('brief.yieldBars')}>
            <div className="report-statement">
              {ranked.map((row) => (
                <ShareBar
                  key={row.fieldId}
                  label={row.name}
                  amount={`${formatNumber(row.olivesPerHa, 0, locale)} kg/ha`}
                  share={(row.olivesPerHa / maxYield) * 100}
                />
              ))}
            </div>
          </DossierSection>

          <DossierSection index="4" title={t('brief.climateBeside')}>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('fields')}</th>
                    <th className="num">{t('doc.frost')}</th>
                    <th className="num">{t('doc.heat')}</th>
                    <th className="num">{t('doc.dryStreak')}</th>
                    <th className="num">{t('doc.area')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((row) => (
                    <tr key={row.fieldId}>
                      <td className="field-name-cell">{row.name}</td>
                      <td className="num">{row.frost == null ? '—' : formatNumber(row.frost, 0, locale)}</td>
                      <td className="num">{row.heat == null ? '—' : formatNumber(row.heat, 0, locale)}</td>
                      <td className="num">{row.dry == null ? '—' : formatNumber(row.dry, 0, locale)}</td>
                      <td className="num">{row.areaHa > 0 ? `${formatNumber(row.areaHa, 2, locale)} ha` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DossierSection>

          <p className="report-method">{t('brief.compareMethod')}</p>
        </>
      )}
    </ReportDocumentShell>
  );
};

export default GroveComparisonView;
