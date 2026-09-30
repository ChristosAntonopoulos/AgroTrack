import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FieldSummaryData,
  ProfitLossData,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../../data/mockReportData';
import { numberLocaleFor } from '../../utils/fieldDisplay';
import ReportDocumentShell from './ReportDocumentShell';
import { DossierSection, ShareBar, ledgerLabel } from './FormalBits';
import { expenseGroups, incomeLines, marginPercent, sum } from './dossierMath';

interface Props {
  summaries: FieldSummaryData[];
  profitLoss: ProfitLossData | null;
  season: string;
  id?: string;
}

const FarmAccountStatementView: React.FC<Props> = ({ summaries, profitLoss, season, id }) => {
  const { t, i18n } = useTranslation('reports');
  const locale = numberLocaleFor(i18n.language);

  const statement = useMemo(() => {
    if (!profitLoss) return null;
    const receipts = incomeLines(profitLoss);
    const costs = expenseGroups(profitLoss);
    const olives = sum(summaries.map((field) => field.totalProductionKg));
    const oil = sum(summaries.map((field) => field.oilProducedKg ?? 0));
    const area = sum(summaries.map((field) => field.areaHa));
    const trees = sum(summaries.map((field) => field.treeCount));
    const rows = profitLoss.profitByField
      .map((field) => {
        const summary = summaries.find((item) => item.fieldId === field.fieldId);
        const revenue = field.revenue ?? summary?.revenue ?? 0;
        const cost = field.cost ?? summary?.totalCost ?? 0;
        const profit = field.revenue != null || field.cost != null ? field.profit : (summary?.profit ?? field.profit);
        return {
          fieldId: field.fieldId,
          fieldName: field.fieldName,
          area: summary?.areaHa ?? 0,
          trees: summary?.treeCount ?? 0,
          revenue,
          cost,
          profit,
          margin: marginPercent(profit, revenue),
        };
      })
      .sort((a, b) => b.profit - a.profit);
    return { receipts, costs, olives, oil, area, trees, rows };
  }, [profitLoss, summaries]);

  const income = profitLoss?.totalIncome ?? 0;
  const expenses = profitLoss?.totalExpenses ?? 0;
  const net = profitLoss?.netProfit ?? 0;
  const margin = marginPercent(net, income);

  return (
    <ReportDocumentShell
      id={id}
      formal={{
        code: `FAS-${season}`,
        audience: t('dossier.audienceOwner'),
        classification: t('dossier.classAccount'),
      }}
      title={t('dossier.accountTitle')}
      subtitle={t('dossier.accountSubtitle')}
      season={season}
    >
      {!profitLoss || !statement ? (
        <p className="report-empty-copy">{t('dossier.noAccount')}</p>
      ) : (
        <>
          <DossierSection index="1" title={t('dossier.result')}>
            <p className="report-lead">{t('dossier.accountLead')}</p>
            <div className="report-pl-summary">
              <div className="report-pl-card income">
                <div className="report-pl-card-value">{formatCurrency(income, locale)}</div>
                <div className="report-pl-card-label">{t('dossier.grossOutput')}</div>
              </div>
              <div className="report-pl-card expense">
                <div className="report-pl-card-value">{formatCurrency(expenses, locale)}</div>
                <div className="report-pl-card-label">{t('dossier.totalCosts')}</div>
              </div>
              <div className="report-pl-card profit">
                <div className={`report-pl-card-value ${net >= 0 ? '' : 'negative'}`}>{formatCurrency(net, locale)}</div>
                <div className="report-pl-card-label">{t('dossier.netResult')}</div>
              </div>
            </div>
            <div className="report-metrics-row">
              <div className="report-metric">
                <div className="report-metric-value">{margin == null ? '—' : formatPercent(margin, locale)}</div>
                <div className="report-metric-label">{t('dossier.netMargin')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">
                  {statement.area > 0 ? formatCurrency(net / statement.area, locale) : '—'}
                </div>
                <div className="report-metric-label">{t('dossier.perHa')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">
                  {statement.trees > 0 ? formatCurrency(net / statement.trees, locale) : '—'}
                </div>
                <div className="report-metric-label">{t('dossier.perTree')}</div>
              </div>
            </div>
          </DossierSection>

          <DossierSection index="2" title={t('dossier.receipts')}>
            {statement.receipts.length === 0 ? (
              <p className="report-empty-copy">{t('dossier.noReceipts')}</p>
            ) : (
              <div className="report-statement">
                {statement.receipts.map((line) => (
                  <ShareBar
                    key={line.key}
                    label={ledgerLabel(t, line.key)}
                    amount={formatCurrency(line.amount, locale)}
                    share={income > 0 ? (line.amount / income) * 100 : 0}
                  />
                ))}
                <div className="report-pl-line total">
                  <span>{t('dossier.grossOutput')}</span>
                  <span>{formatCurrency(income, locale)}</span>
                </div>
              </div>
            )}
          </DossierSection>

          <DossierSection index="3" title={t('dossier.costs')}>
            {statement.costs.length === 0 ? (
              <p className="report-empty-copy">{t('dossier.noCosts')}</p>
            ) : (
              statement.costs.map((group) => (
                <div key={group.group} className="report-cost-group">
                  <div className="report-pl-line total">
                    <span>{t(`dossier.groups.${group.group}`)}</span>
                    <span>
                      {formatCurrency(group.amount, locale)}
                      {expenses > 0 ? ` · ${formatPercent((group.amount / expenses) * 100, locale)}` : ''}
                    </span>
                  </div>
                  {group.lines.map((line) => (
                    <ShareBar
                      key={line.key}
                      label={ledgerLabel(t, line.key)}
                      amount={formatCurrency(line.amount, locale)}
                      share={group.amount > 0 ? (line.amount / group.amount) * 100 : 0}
                    />
                  ))}
                </div>
              ))
            )}
            <div className="report-pl-line total">
              <span>{t('dossier.totalCosts')}</span>
              <span>{formatCurrency(expenses, locale)}</span>
            </div>
          </DossierSection>

          <DossierSection index="4" title={t('dossier.contribution')}>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('fields')}</th>
                    <th className="num">{t('doc.area')}</th>
                    <th className="num">{t('dossier.receipts')}</th>
                    <th className="num">{t('dossier.costs')}</th>
                    <th className="num">{t('dossier.netResult')}</th>
                    <th className="num">{t('dossier.netMargin')}</th>
                    <th className="num">{t('dossier.perHa')}</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.rows.map((row) => (
                    <tr key={row.fieldId}>
                      <td className="field-name-cell">{row.fieldName}</td>
                      <td className="num">{row.area > 0 ? `${formatNumber(row.area, 2, locale)} ha` : '—'}</td>
                      <td className="num">{formatCurrency(row.revenue, locale)}</td>
                      <td className="num">{formatCurrency(row.cost, locale)}</td>
                      <td className={`num ${row.profit >= 0 ? 'pressure-low' : 'pressure-high'}`}>
                        {formatCurrency(row.profit, locale)}
                      </td>
                      <td className="num">{formatPercent(row.margin ?? undefined, locale)}</td>
                      <td className="num">{row.area > 0 ? formatCurrency(row.profit / row.area, locale) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>{t('dossier.holding')}</td>
                    <td className="num">{statement.area > 0 ? `${formatNumber(statement.area, 2, locale)} ha` : '—'}</td>
                    <td className="num">{formatCurrency(income, locale)}</td>
                    <td className="num">{formatCurrency(expenses, locale)}</td>
                    <td className="num">{formatCurrency(net, locale)}</td>
                    <td className="num">{margin == null ? '—' : formatPercent(margin, locale)}</td>
                    <td className="num">{statement.area > 0 ? formatCurrency(net / statement.area, locale) : '—'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </DossierSection>

          <DossierSection index="5" title={t('dossier.unitResults')}>
            <div className="report-metrics-row">
              <div className="report-metric">
                <div className="report-metric-value">
                  {statement.olives > 0 ? formatCurrency(expenses / statement.olives, locale, 2) : '—'}
                </div>
                <div className="report-metric-label">{t('dossier.costPerOlive')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">
                  {statement.oil > 0 ? formatCurrency(expenses / statement.oil, locale, 2) : '—'}
                </div>
                <div className="report-metric-label">{t('dossier.costPerOil')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">
                  {statement.oil > 0 ? formatCurrency(income / statement.oil, locale, 2) : '—'}
                </div>
                <div className="report-metric-label">{t('dossier.receiptsPerOil')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">{formatNumber(statement.olives, 0, locale)} kg</div>
                <div className="report-metric-label">{t('doc.olives')}</div>
              </div>
              <div className="report-metric">
                <div className="report-metric-value">
                  {statement.oil > 0 ? `${formatNumber(statement.oil, 0, locale)} kg` : '—'}
                </div>
                <div className="report-metric-label">{t('doc.oil')}</div>
              </div>
            </div>
          </DossierSection>

          <p className="report-method">{t('dossier.accountMethod')}</p>
        </>
      )}
    </ReportDocumentShell>
  );
};

export default FarmAccountStatementView;
