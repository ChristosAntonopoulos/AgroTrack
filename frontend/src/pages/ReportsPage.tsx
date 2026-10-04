import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getFieldService, getReportsService, isMockMode } from '../services/serviceFactory';
import { exportService } from '../services/exportService';
import { exportReportToPDF } from '../services/reportPdfService';
import { Field } from '../services/fieldService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import {
  ReportTypeId,
  FieldSummaryData,
  HarvestRecord,
  ProfitLossData,
  MonthlyWeatherReport,
  YearlyWeatherReport,
  MOCK_FIELD_SUMMARIES,
  MOCK_HARVEST_RECORDS,
  MOCK_PROFIT_LOSS,
  MOCK_MONTHLY_WEATHER,
  MOCK_YEARLY_WEATHER,
  filterByFields,
  formatNumber,
} from '../data/mockReportData';
import { formatFieldArea } from '../utils/fieldGeo';
import MonthlyWeatherReportView from '../components/Reports/MonthlyWeatherReportView';
import YearlyWeatherReportView from '../components/Reports/YearlyWeatherReportView';
import YearOverviewReportView from '../components/Reports/YearOverviewReportView';
import AgronomicDossierView from '../components/Reports/AgronomicDossierView';
import FarmAccountStatementView from '../components/Reports/FarmAccountStatementView';
import HarvestTraceabilityView from '../components/Reports/HarvestTraceabilityView';
import GroveComparisonView from '../components/Reports/GroveComparisonView';
import WorkRegisterView from '../components/Reports/WorkRegisterView';
import {
  CloudRain,
  CloudSun,
  Leaf,
  Sprout,
  Landmark,
  ShieldCheck,
  Scale,
  ClipboardList,
  Download,
  FileText,
  FileSpreadsheet,
  Calendar,
  CheckSquare,
  Square,
  Eye,
  Sparkles,
} from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { numberLocaleFor } from '../utils/fieldDisplay';
import './ReportsPage.css';

const REPORT_PREVIEW_ID = 'report-preview-document';
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const SEASON_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map(String);

const REPORT_META: Record<ReportTypeId, { icon: React.ReactNode; descriptionKey: string; labelKey: string }> = {
  'weather-month': {
    icon: <CloudRain size={18} />,
    descriptionKey: 'weatherMonthDesc',
    labelKey: 'weatherMonth',
  },
  'weather-year': {
    icon: <CloudSun size={18} />,
    descriptionKey: 'weatherYearDesc',
    labelKey: 'weatherYear',
  },
  'year-overview': {
    icon: <Leaf size={18} />,
    descriptionKey: 'yearOverviewDesc',
    labelKey: 'yearOverview',
  },
  agronomic: {
    icon: <Sprout size={18} />,
    descriptionKey: 'agronomicDesc',
    labelKey: 'agronomic',
  },
  'farm-account': {
    icon: <Landmark size={18} />,
    descriptionKey: 'farmAccountDesc',
    labelKey: 'farmAccount',
  },
  traceability: {
    icon: <ShieldCheck size={18} />,
    descriptionKey: 'traceabilityDesc',
    labelKey: 'traceability',
  },
  comparison: {
    icon: <Scale size={18} />,
    descriptionKey: 'comparisonDesc',
    labelKey: 'comparison',
  },
  'work-register': {
    icon: <ClipboardList size={18} />,
    descriptionKey: 'workRegisterDesc',
    labelKey: 'workRegister',
  },
};

const WORKING_REPORTS: ReportTypeId[] = ['weather-month', 'weather-year', 'year-overview'];
const FORMAL_DOSSIERS: ReportTypeId[] = ['agronomic', 'farm-account', 'traceability', 'comparison', 'work-register'];

/** Sample report rows use their own ids. In demo mode, show them against the groves on screen. */
function presentRows<T extends { fieldId: string; fieldName?: string }>(
  rows: T[],
  selectedIds: string[],
  groves: { id: string; name: string }[],
): T[] {
  const matched = filterByFields(rows, selectedIds);
  if (!isMockMode() || matched.length > 0 || selectedIds.length === 0 || rows.length === 0) {
    return matched;
  }
  const chosen = groves.filter((grove) => selectedIds.includes(grove.id));
  if (chosen.length === 0) return matched;
  return chosen.map((grove, index) => {
    const next = {
      ...rows[index % rows.length],
      fieldId: grove.id,
      fieldName: grove.name,
    };
    if ('location' in next) {
      (next as { location: string }).location = '';
    }
    if ('issues' in next) {
      (next as { issues: string[] }).issues = [];
    }
    if ('notes' in next) {
      (next as { notes?: string }).notes = undefined;
    }
    return next;
  });
}

const ReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation('reports');
  const locale = numberLocaleFor(i18n.language);
  const { user } = useAuth();
  const [reportType, setReportType] = useState<ReportTypeId>('weather-month');
  const [season, setSeason] = useState(String(CURRENT_YEAR));
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [apiSummaries, setApiSummaries] = useState<FieldSummaryData[]>([]);
  const [apiHarvest, setApiHarvest] = useState<HarvestRecord[]>([]);
  const [apiProfitLoss, setApiProfitLoss] = useState<ProfitLossData | null>(null);
  const [apiMonthly, setApiMonthly] = useState<MonthlyWeatherReport | null>(null);
  const [apiYearly, setApiYearly] = useState<YearlyWeatherReport | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    loadFields();
  }, []);

  useEffect(() => {
    if (!isMockMode()) {
      loadReportData();
    }
  }, [season, month]);

  const loadReportData = async () => {
    try {
      setReportsLoading(true);
      const reports = getReportsService();
      const [summaries, harvest, profitLoss, monthly, yearly] = await Promise.all([
        reports.getFieldSummaries(season),
        reports.getHarvestRecords(season),
        reports.getProfitLoss(season),
        reports.getMonthlyWeather(season, month).catch(() => ({ season, month, fields: [] })),
        reports.getYearlyWeather(season).catch(() => ({ season, fields: [] })),
      ]);
      setApiSummaries(summaries);
      setApiHarvest(harvest);
      setApiProfitLoss(profitLoss);
      setApiMonthly(monthly);
      setApiYearly(yearly);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (fields.length > 0) {
      setSelectedFields(fields.map(f => f.id));
    }
  }, [fields]);

  const loadFields = async () => {
    try {
      const fieldService = getFieldService();
      const fieldsData = await fieldService.getFields();
      setFields(fieldsData);
    } catch (error) {
      console.error('Error loading fields:', error);
    }
  };

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };

  const selectAllFields = () => setSelectedFields(fields.map(f => f.id));
  const clearFields = () => setSelectedFields([]);

  const sourceSummaries = isMockMode() ? MOCK_FIELD_SUMMARIES : apiSummaries;
  const sourceHarvest = isMockMode() ? MOCK_HARVEST_RECORDS : apiHarvest;
  const sourceMonthly = isMockMode() ? { ...MOCK_MONTHLY_WEATHER, season, month } : apiMonthly;
  const sourceYearly = isMockMode() ? { ...MOCK_YEARLY_WEATHER, season } : apiYearly;

  const groveNames = useMemo(
    () => fields.map((field) => ({ id: field.id, name: field.name })),
    [fields]
  );
  const filteredSummaries = useMemo(
    () => presentRows(sourceSummaries, selectedFields, groveNames),
    [sourceSummaries, selectedFields, groveNames]
  );
  const filteredHarvest = useMemo(
    () => presentRows(sourceHarvest, selectedFields, groveNames),
    [sourceHarvest, selectedFields, groveNames]
  );
  const filteredMonthly = useMemo(
    () => presentRows(sourceMonthly?.fields ?? [], selectedFields, groveNames),
    [sourceMonthly, selectedFields, groveNames]
  );
  const filteredYearly = useMemo(
    () => presentRows(sourceYearly?.fields ?? [], selectedFields, groveNames),
    [sourceYearly, selectedFields, groveNames]
  );

  const filteredProfitLoss = useMemo(() => {
    if (isMockMode()) {
      const pl = { ...MOCK_PROFIT_LOSS };
      pl.profitByField = presentRows(MOCK_PROFIT_LOSS.profitByField, selectedFields, groveNames);
      return pl;
    }
    if (!apiProfitLoss) return null;
    const pl = { ...apiProfitLoss };
    pl.profitByField = filterByFields(apiProfitLoss.profitByField, selectedFields);
    return pl;
  }, [apiProfitLoss, selectedFields, groveNames]);

  const reportTitle = t(REPORT_META[reportType].labelKey);
  const filename = `${reportType}-${season}${reportType === 'weather-month' ? `-${String(month).padStart(2, '0')}` : ''}-${formatDate(new Date(), 'yyyy-MM-dd')}`;

  const exportPdf = useCallback(async () => {
    try {
      setGenerating(true);
      await exportReportToPDF(REPORT_PREVIEW_ID, filename);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setGenerating(false);
    }
  }, [filename]);

  const tabular = useCallback((): { headers: string[]; rows: (string | number)[][] } => {
    if (reportType === 'weather-month') {
      return {
        headers: [t('csv.field'), t('csv.day'), t('csv.minC'), t('csv.maxC'), t('csv.rainMm'), t('csv.et0Mm')],
        rows: filteredMonthly.flatMap((field) =>
          field.days.map((d) => [
            field.fieldName,
            d.day,
            d.minTemperatureC ?? '',
            d.maxTemperatureC ?? '',
            d.rainTotalMm,
            d.et0Mm ?? '',
          ])
        ),
      };
    }
    if (reportType === 'weather-year') {
      return {
        headers: [t('csv.field'), t('csv.rainMm'), t('csv.cost'), t('csv.revenue'), t('csv.profit'), t('csv.tasksDone'), t('csv.overdue')],
        rows: filteredYearly.map((f) => [
          f.fieldName, f.rainTotalMm, f.totalCost, f.revenue, f.profit, f.tasksCompleted, f.tasksOverdue,
        ]),
      };
    }
    if (reportType === 'agronomic') {
      return {
        headers: [t('csv.field'), t('csv.areaStremmata'), t('csv.olivesKg'), t('csv.rainMm'), t('doc.frost'), t('doc.heat'), t('doc.ndvi'), t('csv.tasksDone')],
        rows: filteredSummaries.map((field) => {
          const weather = filteredYearly.find((item) => item.fieldId === field.fieldId);
          return [
            field.fieldName,
            Math.round((field.areaHa || 0) * 10 * 100) / 100,
            field.totalProductionKg,
            weather?.rainTotalMm ?? '',
            weather?.frostNights ?? '',
            weather?.heatDays ?? '',
            weather?.ndviMean ?? '',
            field.tasksCompleted,
          ];
        }),
      };
    }
    if (reportType === 'farm-account') {
      return {
        headers: [t('csv.field'), t('csv.cost'), t('csv.revenue'), t('csv.profit'), t('csv.margin')],
        rows: (filteredProfitLoss?.profitByField ?? []).map((field) => {
          const revenue = field.revenue ?? 0;
          return [
            field.fieldName,
            field.cost ?? 0,
            revenue,
            field.profit,
            revenue > 0 ? Math.round((field.profit / revenue) * 1000) / 10 : '',
          ];
        }),
      };
    }
    if (reportType === 'traceability') {
      return {
        headers: [t('csv.field'), t('doc.harvestDate'), t('csv.method'), t('csv.olivesKg'), t('csv.oilKg'), t('csv.litres'), t('csv.yield'), t('csv.quality'), t('csv.mill')],
        rows: filteredHarvest.map((lot) => [
          lot.fieldName,
          lot.harvestDate,
          lot.harvestMethod ?? '',
          lot.oliveKg,
          lot.oilKg ?? '',
          lot.oilLitres ?? '',
          lot.oilYieldPercent ?? '',
          lot.qualityGrade ?? '',
          lot.millName ?? '',
        ]),
      };
    }
    if (reportType === 'comparison') {
      return {
        headers: [t('csv.field'), t('csv.kgPerHa'), t('csv.yield'), t('csv.cost'), t('brief.resultHa'), t('csv.margin'), t('doc.frost'), t('doc.heat')],
        rows: filteredSummaries.map((field) => {
          const weather = filteredYearly.find((item) => item.fieldId === field.fieldId);
          const area = field.areaHa || 0;
          const revenue = field.revenue || 0;
          return [
            field.fieldName,
            field.yieldPerHa,
            field.oilYieldPercent ?? '',
            field.costPerHa,
            area > 0 ? Math.round(field.profit / area) : field.profit,
            revenue > 0 ? Math.round((field.profit / revenue) * 1000) / 10 : '',
            weather?.frostNights ?? '',
            weather?.heatDays ?? '',
          ];
        }),
      };
    }
    if (reportType === 'work-register') {
      return {
        headers: [t('csv.field'), t('csv.tasksDone'), t('doc.pending'), t('csv.overdue'), t('csv.cost')],
        rows: filteredSummaries.map((field) => [
          field.fieldName,
          field.tasksCompleted,
          field.tasksPending,
          field.tasksOverdue,
          field.totalCost,
        ]),
      };
    }
    return {
      headers: [t('csv.field'), t('csv.areaStremmata'), t('csv.olivesKg'), t('csv.kgPerHa'), t('csv.cost'), t('csv.revenue'), t('csv.profit'), t('csv.tasksDone')],
      rows: filteredSummaries.map((f) => [
        f.fieldName,
        Math.round((f.areaHa || 0) * 10 * 100) / 100,
        f.totalProductionKg,
        f.yieldPerHa,
        f.totalCost,
        f.revenue,
        f.profit,
        f.tasksCompleted,
      ]),
    };
  }, [reportType, filteredMonthly, filteredYearly, filteredSummaries, filteredHarvest, filteredProfitLoss, t]);

  const exportCsv = useCallback(() => {
    const { headers, rows } = tabular();
    exportService.exportToCSV({ headers, rows, title: reportTitle }, filename);
  }, [tabular, reportTitle, filename]);

  const exportExcel = useCallback(() => {
    const { headers, rows } = tabular();
    exportService.exportToExcel({ headers, rows, title: reportTitle }, filename);
  }, [tabular, reportTitle, filename]);

  const renderPreview = () => {
    if (selectedFields.length === 0) {
      return (
        <div className="report-empty-state">
          <Leaf size={40} strokeWidth={1.5} />
          <h3>{t('selectFieldsPrompt')}</h3>
          <p>{t('selectFieldsHint')}</p>
        </div>
      );
    }

    if (reportType === 'weather-month') {
      return (
        <MonthlyWeatherReportView
          id={REPORT_PREVIEW_ID}
          data={filteredMonthly}
          season={season}
          month={month}
        />
      );
    }
    if (reportType === 'weather-year') {
      return (
        <YearlyWeatherReportView
          id={REPORT_PREVIEW_ID}
          data={filteredYearly}
          season={season}
        />
      );
    }
    if (reportType === 'agronomic') {
      return (
        <AgronomicDossierView
          id={REPORT_PREVIEW_ID}
          summaries={filteredSummaries}
          yearly={filteredYearly}
          season={season}
        />
      );
    }
    if (reportType === 'farm-account') {
      return (
        <FarmAccountStatementView
          id={REPORT_PREVIEW_ID}
          summaries={filteredSummaries}
          profitLoss={filteredProfitLoss}
          season={season}
        />
      );
    }
    if (reportType === 'traceability') {
      return (
        <HarvestTraceabilityView
          id={REPORT_PREVIEW_ID}
          summaries={filteredSummaries}
          harvest={filteredHarvest}
          season={season}
        />
      );
    }
    if (reportType === 'comparison') {
      return (
        <GroveComparisonView
          id={REPORT_PREVIEW_ID}
          summaries={filteredSummaries}
          yearly={filteredYearly}
          season={season}
        />
      );
    }
    if (reportType === 'work-register') {
      return (
        <WorkRegisterView
          id={REPORT_PREVIEW_ID}
          summaries={filteredSummaries}
          yearly={filteredYearly}
          season={season}
        />
      );
    }
    return (
      <YearOverviewReportView
        id={REPORT_PREVIEW_ID}
        summaries={filteredSummaries}
        harvest={filteredHarvest}
        profitLoss={filteredProfitLoss}
        season={season}
      />
    );
  };

  if (user?.role !== 'FieldOwner' && user?.role !== 'Administrator') {
    return (
      <PageContainer>
        <div className="reports-page">
          <Breadcrumbs />
          <div className="reports-error">{t('noPermission')}</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="reports-page">
        <Breadcrumbs />

        <header className="reports-hero">
          <div>
            <h1>{t('title')}</h1>
            <p className="reports-subtitle">{t('subtitle')}</p>
          </div>
          {isMockMode() ? (
            <div className="reports-hero-badge">
              <Sparkles size={14} />
              <span>{t('demoData')}</span>
            </div>
          ) : null}
        </header>

        <div className="reports-layout">
          <aside className="reports-sidebar">
            <h2 className="reports-sidebar-title">{t('reportType')}</h2>
            {([
              { label: t('opsGroup'), types: WORKING_REPORTS },
              { label: t('dossierGroup'), types: FORMAL_DOSSIERS },
            ] as const).map((group) => (
              <div key={group.label} className="report-type-group">
                <h3 className="reports-sidebar-title">{group.label}</h3>
                <div className="report-type-list">
                  {group.types.map((type) => {
                    const meta = REPORT_META[type];
                    const isActive = reportType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        className={`report-type-card ${isActive ? 'active' : ''}`}
                        onClick={() => setReportType(type)}
                      >
                        <div className="report-type-icon">{meta.icon}</div>
                        <div className="report-type-text">
                          <span className="report-type-name">{t(meta.labelKey)}</span>
                          <span className="report-type-desc">{t(meta.descriptionKey)}</span>
                        </div>
                        {type === 'weather-month' && (
                          <span className="report-type-default">{t('default')}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="reports-filters">
              <div className="filter-group">
                <label>
                  <Calendar size={14} />
                  {t('season')}
                </label>
                <select value={season} onChange={(e) => setSeason(e.target.value)}>
                  {SEASON_OPTIONS.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {reportType === 'weather-month' && (
                <div className="filter-group">
                  <label>{t('month')}</label>
                  <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1, 1).toLocaleDateString(i18n.language, { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="filter-group">
                <div className="filter-group-header">
                  <label>{t('fields')}</label>
                  <div className="field-select-actions">
                    <button type="button" onClick={selectAllFields}>{t('selectAll')}</button>
                    <button type="button" onClick={clearFields}>{t('clearAll')}</button>
                  </div>
                </div>
                <div className="field-select-list">
                  {fields.map((field) => {
                    const checked = selectedFields.includes(field.id);
                    return (
                      <button
                        key={field.id}
                        type="button"
                        className={`field-select-item ${checked ? 'selected' : ''}`}
                        onClick={() => handleFieldToggle(field.id)}
                      >
                        {checked ? <CheckSquare size={16} /> : <Square size={16} />}
                        <span>{field.name}</span>
                        <span className="field-area">{formatFieldArea(field)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          <main className="reports-main">
            <div className="reports-toolbar">
              <div className="reports-toolbar-left">
                <h2>{reportTitle}</h2>
                <span className="reports-toolbar-meta">
                  {formatNumber(selectedFields.length, 0, locale)} {t('fieldsSelected')} · {t('season')} {season}
                  {reportType === 'weather-month'
                    ? ` · ${new Date(Number(season), month - 1, 1).toLocaleDateString(i18n.language, { month: 'long' })}`
                    : ''}
                  {reportsLoading ? ' · …' : ''}
                </span>
              </div>
              <div className="reports-toolbar-actions">
                <Button variant="ghost" size="sm" icon={<Eye size={16} />} onClick={() => setShowPreview((v) => !v)}>
                  {showPreview ? t('hidePreview') : t('showPreview')}
                </Button>
                <Button
                  variant="primary"
                  icon={<Download size={16} />}
                  onClick={exportPdf}
                  disabled={generating || selectedFields.length === 0}
                  loading={generating}
                >
                  {t('exportPdf')}
                </Button>
                <Button
                  variant="outline"
                  icon={<FileSpreadsheet size={16} />}
                  onClick={exportExcel}
                  disabled={generating || selectedFields.length === 0}
                >
                  {t('exportExcel')}
                </Button>
                <Button
                  variant="secondary"
                  icon={<FileText size={16} />}
                  onClick={exportCsv}
                  disabled={generating || selectedFields.length === 0}
                >
                  CSV
                </Button>
              </div>
            </div>

            {showPreview && (
              <Card className="report-preview-card" padding="none">
                <div className="report-preview-scroll">
                  {renderPreview()}
                </div>
              </Card>
            )}
          </main>
        </div>
      </div>
    </PageContainer>
  );
};

export default ReportsPage;
