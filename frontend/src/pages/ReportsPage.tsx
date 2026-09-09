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
  formatHa,
  formatNumber,
} from '../data/mockReportData';
import MonthlyWeatherReportView from '../components/Reports/MonthlyWeatherReportView';
import YearlyWeatherReportView from '../components/Reports/YearlyWeatherReportView';
import YearOverviewReportView from '../components/Reports/YearOverviewReportView';
import {
  CloudRain,
  CloudSun,
  Leaf,
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
    icon: <CloudRain size={22} />,
    descriptionKey: 'weatherMonthDesc',
    labelKey: 'weatherMonth',
  },
  'weather-year': {
    icon: <CloudSun size={22} />,
    descriptionKey: 'weatherYearDesc',
    labelKey: 'weatherYear',
  },
  'year-overview': {
    icon: <Leaf size={22} />,
    descriptionKey: 'yearOverviewDesc',
    labelKey: 'yearOverview',
  },
};

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

  const filteredSummaries = useMemo(
    () => filterByFields(sourceSummaries, selectedFields),
    [sourceSummaries, selectedFields]
  );
  const filteredHarvest = useMemo(
    () => filterByFields(sourceHarvest, selectedFields),
    [sourceHarvest, selectedFields]
  );
  const filteredMonthly = useMemo(
    () => filterByFields(sourceMonthly?.fields ?? [], selectedFields),
    [sourceMonthly, selectedFields]
  );
  const filteredYearly = useMemo(
    () => filterByFields(sourceYearly?.fields ?? [], selectedFields),
    [sourceYearly, selectedFields]
  );

  const filteredProfitLoss = useMemo(() => {
    if (isMockMode()) {
      const pl = { ...MOCK_PROFIT_LOSS };
      pl.profitByField = filterByFields(MOCK_PROFIT_LOSS.profitByField, selectedFields);
      return pl;
    }
    if (!apiProfitLoss) return null;
    const pl = { ...apiProfitLoss };
    pl.profitByField = filterByFields(apiProfitLoss.profitByField, selectedFields);
    return pl;
  }, [apiProfitLoss, selectedFields]);

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

  const exportCsv = useCallback(() => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (reportType === 'weather-month') {
      headers = ['Field', 'Day', 'Min °C', 'Max °C', 'Rain mm', 'ET0 mm'];
      rows = filteredMonthly.flatMap((field) =>
        field.days.map((d) => [
          field.fieldName,
          d.day,
          d.minTemperatureC ?? '',
          d.maxTemperatureC ?? '',
          d.rainTotalMm,
          d.et0Mm ?? '',
        ])
      );
    } else if (reportType === 'weather-year') {
      headers = ['Field', 'Rain mm', 'Cost', 'Revenue', 'Profit', 'Tasks done', 'Overdue'];
      rows = filteredYearly.map((f) => [
        f.fieldName,
        f.rainTotalMm,
        f.totalCost,
        f.revenue,
        f.profit,
        f.tasksCompleted,
        f.tasksOverdue,
      ]);
    } else {
      headers = ['Field', 'Area ha', 'Olives kg', 'Kg/ha', 'Cost', 'Revenue', 'Profit', 'Tasks done'];
      rows = filteredSummaries.map((f) => [
        f.fieldName,
        f.areaHa,
        f.totalProductionKg,
        f.yieldPerHa,
        f.totalCost,
        f.revenue,
        f.profit,
        f.tasksCompleted,
      ]);
    }

    exportService.exportToCSV({ headers, rows, title: reportTitle }, filename);
  }, [reportType, filteredMonthly, filteredYearly, filteredSummaries, reportTitle, filename]);

  const exportExcel = useCallback(() => {
    if (reportType === 'year-overview') {
      const headers = ['Field', 'Area ha', 'Olives kg', 'Kg/ha', 'Cost', 'Revenue', 'Profit', 'Tasks done'];
      const rows = filteredSummaries.map((f) => [
        f.fieldName, f.areaHa, f.totalProductionKg, f.yieldPerHa, f.totalCost, f.revenue, f.profit, f.tasksCompleted,
      ]);
      exportService.exportToExcel({ headers, rows, title: reportTitle }, filename);
      return;
    }
    if (reportType === 'weather-year') {
      const headers = ['Field', 'Rain mm', 'Cost', 'Revenue', 'Profit', 'Tasks done', 'Overdue'];
      const rows = filteredYearly.map((f) => [
        f.fieldName, f.rainTotalMm, f.totalCost, f.revenue, f.profit, f.tasksCompleted, f.tasksOverdue,
      ]);
      exportService.exportToExcel({ headers, rows, title: reportTitle }, filename);
      return;
    }
    const headers = ['Field', 'Day', 'Min C', 'Max C', 'Rain mm', 'ET0 mm'];
    const rows = filteredMonthly.flatMap((field) =>
      field.days.map((d) => [field.fieldName, d.day, d.minTemperatureC ?? '', d.maxTemperatureC ?? '', d.rainTotalMm, d.et0Mm ?? ''])
    );
    exportService.exportToExcel({ headers, rows, title: reportTitle }, filename);
  }, [reportType, filteredSummaries, filteredYearly, filteredMonthly, reportTitle, filename]);

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
            <div className="report-type-list">
              {(Object.keys(REPORT_META) as ReportTypeId[]).map((type) => {
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
                        <span className="field-area">{formatHa(field.area, locale)}</span>
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
