import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FieldSummaryData,
  HarvestRecord,
  displayOrDash,
  formatHa,
  formatNumber,
  formatPercent,
} from '../../data/mockReportData';
import { numberLocaleFor } from '../../utils/fieldDisplay';
import ReportDocumentShell from './ReportDocumentShell';
import { DossierSection, ReadingMark } from './FormalBits';
import { readingOilYield, sum } from './dossierMath';

interface Props {
  summaries: FieldSummaryData[];
  harvest: HarvestRecord[];
  season: string;
  id?: string;
}

const HarvestTraceabilityView: React.FC<Props> = ({ summaries, harvest, season, id }) => {
  const { t, i18n } = useTranslation('reports');
  const locale = numberLocaleFor(i18n.language);

  const lots = useMemo(
    () => [...harvest].sort((a, b) => a.harvestDate.localeCompare(b.harvestDate)),
    [harvest]
  );

  const milled = lots.filter((lot) => lot.oilKg != null);
  const oliveKg = sum(lots.map((lot) => lot.oliveKg));
  const milledOliveKg = sum(milled.map((lot) => lot.oliveKg));
  const oilKg = sum(milled.map((lot) => lot.oilKg ?? 0));
  const litres = sum(lots.filter((lot) => lot.oilLitres != null).map((lot) => lot.oilLitres ?? 0));
  const hasLitres = lots.some((lot) => lot.oilLitres != null);
  const extraction = milledOliveKg > 0 ? (oilKg / milledOliveKg) * 100 : null;
  const workers = sum(lots.map((lot) => lot.workersUsed ?? 0));

  const byField = useMemo(() => {
    const ids = [...new Set(lots.map((lot) => lot.fieldId))];
    return ids.map((fieldId) => {
      const rows = lots.filter((lot) => lot.fieldId === fieldId);
      const summary = summaries.find((field) => field.fieldId === fieldId);
      const fieldMilled = rows.filter((lot) => lot.oilKg != null);
      const fieldOlives = sum(fieldMilled.map((lot) => lot.oliveKg));
      const fieldOil = sum(fieldMilled.map((lot) => lot.oilKg ?? 0));
      return {
        fieldId,
        name: rows[0]?.fieldName ?? summary?.fieldName ?? fieldId,
        location: summary?.location,
        areaHa: summary?.areaHa ?? 0,
        variety: summary?.variety,
        oliveKg: sum(rows.map((lot) => lot.oliveKg)),
        oilKg: fieldOil,
        litres: sum(rows.filter((lot) => lot.oilLitres != null).map((lot) => lot.oilLitres ?? 0)),
        yieldPct: fieldOlives > 0 ? (fieldOil / fieldOlives) * 100 : null,
        lots: rows.length,
      };
    });
  }, [lots, summaries]);

  const mills = useMemo(() => {
    const groups = new Map<string, { lots: number; oliveKg: number; oilKg: number }>();
    lots.forEach((lot) => {
      const name = lot.millName?.trim() || t('dossier.millUnnamed');
      const current = groups.get(name) ?? { lots: 0, oliveKg: 0, oilKg: 0 };
      groups.set(name, {
        lots: current.lots + 1,
        oliveKg: current.oliveKg + lot.oliveKg,
        oilKg: current.oilKg + (lot.oilKg ?? 0),
      });
    });
    return [...groups.entries()].sort((a, b) => b[1].oliveKg - a[1].oliveKg);
  }, [lots, t]);

  const grades = useMemo(() => {
    const groups = new Map<string, { lots: number; oilKg: number }>();
    lots.forEach((lot) => {
      const name = lot.qualityGrade?.trim() || t('dossier.gradeUnrecorded');
      const current = groups.get(name) ?? { lots: 0, oilKg: 0 };
      groups.set(name, { lots: current.lots + 1, oilKg: current.oilKg + (lot.oilKg ?? 0) });
    });
    return [...groups.entries()].sort((a, b) => b[1].lots - a[1].lots);
  }, [lots, t]);

  const notes = lots.filter((lot) => lot.notes?.trim());

  const yieldOf = (lot: HarvestRecord): number | null => {
    if (lot.oilYieldPercent != null && lot.oilYieldPercent > 0) return lot.oilYieldPercent;
    if (lot.oilKg != null && lot.oliveKg > 0) return (lot.oilKg / lot.oliveKg) * 100;
    return null;
  };

  return (
    <ReportDocumentShell
      id={id}
      formal={{
        code: `HTR-${season}`,
        audience: t('dossier.audienceBuyer'),
        classification: t('dossier.classTrace'),
      }}
      title={t('dossier.traceTitle')}
      subtitle={t('dossier.traceSubtitle')}
      season={season}
    >
      {lots.length === 0 ? (
        <p className="report-empty-copy">{t('dossier.noLots')}</p>
      ) : (
        <>
          <DossierSection index="1" title={t('dossier.campaign')}>
            <p className="report-lead">{t('dossier.traceLead')}</p>
            <div className="report-metrics-row">
              <div className="report-metric">
                <div className="report-metric-value">{formatNumber(lots.length, 0, locale)}</div>
                <div className="report-metric-label">{t('dossier.lots')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">{formatNumber(oliveKg, 0, locale)} kg</div>
                <div className="report-metric-label">{t('doc.olives')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">{oilKg > 0 ? `${formatNumber(oilKg, 0, locale)} kg` : '—'}</div>
                <div className="report-metric-label">{t('doc.oil')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">{hasLitres ? `${formatNumber(litres, 0, locale)} L` : '—'}</div>
                <div className="report-metric-label">{t('dossier.litres')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">{formatPercent(extraction ?? undefined, locale)}</div>
                <div className="report-metric-label">{t('dossier.extraction')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">{workers > 0 ? formatNumber(workers, 0, locale) : '—'}</div>
                <div className="report-metric-label">{t('dossier.workers')}</div>
              </div>
            </div>
            {milled.length < lots.length && (
              <p className="report-lead">
                {t('dossier.unmilled', { count: lots.length - milled.length })}
              </p>
            )}
          </DossierSection>

          <DossierSection index="2" title={t('dossier.origin')}>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('fields')}</th>
                    <th>{t('doc.variety')}</th>
                    <th className="num">{t('doc.area')}</th>
                    <th className="num">{t('dossier.lots')}</th>
                    <th className="num">{t('doc.olives')}</th>
                    <th className="num">{t('doc.oil')}</th>
                    <th className="num">{t('dossier.extraction')}</th>
                    <th>{t('dossier.reading')}</th>
                  </tr>
                </thead>
                <tbody>
                  {byField.map((field) => (
                    <tr key={field.fieldId}>
                      <td className="field-name-cell">
                        {field.name}
                        {field.location ? <div className="report-cell-sub">{field.location}</div> : null}
                      </td>
                      <td>{displayOrDash(field.variety)}</td>
                      <td className="num">{field.areaHa > 0 ? formatHa(field.areaHa, locale) : '—'}</td>
                      <td className="num">{formatNumber(field.lots, 0, locale)}</td>
                      <td className="num">{formatNumber(field.oliveKg, 0, locale)} kg</td>
                      <td className="num">{field.oilKg > 0 ? `${formatNumber(field.oilKg, 0, locale)} kg` : '—'}</td>
                      <td className="num">{formatPercent(field.yieldPct ?? undefined, locale)}</td>
                      <td><ReadingMark reading={readingOilYield(field.yieldPct)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DossierSection>

          <DossierSection index="3" title={t('dossier.lotRegister')}>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('doc.harvestDate')}</th>
                    <th>{t('fields')}</th>
                    <th>{t('dossier.method')}</th>
                    <th className="num">{t('dossier.workers')}</th>
                    <th className="num">{t('doc.olives')}</th>
                    <th>{t('doc.mill')}</th>
                    <th className="num">{t('doc.oil')}</th>
                    <th className="num">{t('dossier.litres')}</th>
                    <th className="num">{t('dossier.extraction')}</th>
                    <th>{t('doc.quality')}</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot, index) => {
                    const yieldPct = yieldOf(lot);
                    return (
                      <tr key={`${lot.id ?? lot.fieldId}-${lot.harvestDate}-${index}`}>
                        <td>
                          {lot.harvestDate
                            ? new Date(lot.harvestDate).toLocaleDateString(i18n.language)
                            : '—'}
                        </td>
                        <td className="field-name-cell">{lot.fieldName}</td>
                        <td>{displayOrDash(lot.harvestMethod)}</td>
                        <td className="num">{lot.workersUsed ? formatNumber(lot.workersUsed, 0, locale) : '—'}</td>
                        <td className="num">{formatNumber(lot.oliveKg, 0, locale)} kg</td>
                        <td>{displayOrDash(lot.millName)}</td>
                        <td className="num">{lot.oilKg != null ? `${formatNumber(lot.oilKg, 1, locale)} kg` : '—'}</td>
                        <td className="num">{lot.oilLitres != null ? formatNumber(lot.oilLitres, 1, locale) : '—'}</td>
                        <td className="num">{formatPercent(yieldPct ?? undefined, locale)}</td>
                        <td>{displayOrDash(lot.qualityGrade)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DossierSection>

          <DossierSection index="4" title={t('dossier.mills')}>
            <div className="report-split">
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{t('doc.mill')}</th>
                      <th className="num">{t('dossier.lots')}</th>
                      <th className="num">{t('doc.olives')}</th>
                      <th className="num">{t('doc.oil')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mills.map(([name, row]) => (
                      <tr key={name}>
                        <td className="field-name-cell">{name}</td>
                        <td className="num">{formatNumber(row.lots, 0, locale)}</td>
                        <td className="num">{formatNumber(row.oliveKg, 0, locale)} kg</td>
                        <td className="num">{row.oilKg > 0 ? `${formatNumber(row.oilKg, 0, locale)} kg` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>{t('doc.quality')}</th>
                      <th className="num">{t('dossier.lots')}</th>
                      <th className="num">{t('doc.oil')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map(([name, row]) => (
                      <tr key={name}>
                        <td className="field-name-cell">{name}</td>
                        <td className="num">{formatNumber(row.lots, 0, locale)}</td>
                        <td className="num">{row.oilKg > 0 ? `${formatNumber(row.oilKg, 0, locale)} kg` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DossierSection>

          {notes.length > 0 && (
            <DossierSection index="5" title={t('dossier.lotNotes')}>
              <ul className="report-list">
                {notes.map((lot, index) => (
                  <li key={`${lot.fieldId}-${index}`}>
                    <span className="report-list-icon">→</span>
                    <span>
                      <strong>{lot.fieldName}</strong>
                      {lot.harvestDate ? ` · ${new Date(lot.harvestDate).toLocaleDateString(i18n.language)}` : ''}
                      {' — '}
                      {lot.notes}
                    </span>
                  </li>
                ))}
              </ul>
            </DossierSection>
          )}

          <p className="report-method">{t('dossier.traceMethod')}</p>
        </>
      )}
    </ReportDocumentShell>
  );
};

export default HarvestTraceabilityView;
