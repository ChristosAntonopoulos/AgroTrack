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
  FieldComparisonRow,
  ComparisonInsights,
  MOCK_FIELD_SUMMARIES,
  MOCK_HARVEST_RECORDS,
  MOCK_PROFIT_LOSS,
  MOCK_FIELD_COMPARISON,
  MOCK_COMPARISON_INSIGHTS,
  filterByFields,
} from '../data/mockReportData';
import FieldSummaryReportView from '../components/Reports/FieldSummaryReportView';
import ProductionHarvestReportView from '../components/Reports/ProductionHarvestReportView';
import ProfitLossReportView from '../components/Reports/ProfitLossReportView';
import FieldComparisonReportView from '../components/Reports/FieldComparisonReportView';
import {
  Leaf,
  Wheat,
  Euro,
  BarChart3,
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
import './ReportsPage.css';

const REPORT_PREVIEW_ID = 'report-preview-document';
const CURRENT_YEAR = new Date().getFullYear();
const SEASON_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map(String);

const REPORT_META: Record<
  ReportTypeId,
  { icon: React.ReactNode; descriptionKey: string }
> = {
  'field-summary': {
    icon: <Leaf size={22} />,
    descriptionKey: 'fieldSummaryDesc',
  },
  'production-harvest': {
    icon: <Wheat size={22} />,
    descriptionKey: 'productionHarvestDesc',
  },
  'profit-loss': {
    icon: <Euro size={22} />,
    descriptionKey: 'profitLossDesc',
  },
  'field-comparison': {
    icon: <BarChart3 size={22} />,
    descriptionKey: 'fieldComparisonDesc',
  },
};

const ReportsPage: React.FC = () => {
  const { t } = useTranslation('reports');
  const { user } = useAuth();
  const [reportType, setReportType] = useState<ReportTypeId>('field-summary');
  const [season, setSeason] = useState(String(CURRENT_YEAR));
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [apiSummaries, setApiSummaries] = useState<FieldSummaryData[]>([]);
  const [apiHarvest, setApiHarvest] = useState<HarvestRecord[]>([]);
  const [apiProfitLoss, setApiProfitLoss] = useState<ProfitLossData | null>(null);
  const [apiComparison, setApiComparison] = useState<FieldComparisonRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    loadFields();
  }, []);

  useEffect(() => {
    if (!isMockMode()) {
      loadReportData();
    }
  }, [season]);

  const loadReportData = async () => {
    try {
      setReportsLoading(true);
      const reports = getReportsService();
      const [summaries, harvest, profitLoss, comparison] = await Promise.all([
        reports.getFieldSummaries(season),
        reports.getHarvestRecords(season),
        reports.getProfitLoss(season),
        reports.getFieldComparison(season),
      ]);
      setApiSummaries(summaries);
      setApiHarvest(harvest);
      setApiProfitLoss(profitLoss);
      setApiComparison(comparison);
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
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const selectAllFields = () => setSelectedFields(fields.map(f => f.id));
  const clearFields = () => setSelectedFields([]);

  const sourceSummaries = isMockMode() ? MOCK_FIELD_SUMMARIES : apiSummaries;
  const sourceHarvest = isMockMode() ? MOCK_HARVEST_RECORDS : apiHarvest;
  const sourceComparison = isMockMode() ? MOCK_FIELD_COMPARISON : apiComparison;

  const filteredSummaries = useMemo(
    () => filterByFields(sourceSummaries, selectedFields),
    [sourceSummaries, selectedFields]
  );

  const filteredHarvest = useMemo(
    () => filterByFields(sourceHarvest, selectedFields),
    [sourceHarvest, selectedFields]
  );

  const filteredComparison = useMemo(
    () => filterByFields(sourceComparison, selectedFields),
    [sourceComparison, selectedFields]
  );

  const filteredProfitLoss = useMemo(() => {
    if (isMockMode()) {
      const pl = { ...MOCK_PROFIT_LOSS };
      pl.profitByField = filterByFields(MOCK_PROFIT_LOSS.profitByField, selectedFields);
      return pl;
    }
    if (!apiProfitLoss) {
      return null;
    }
    const pl = { ...apiProfitLoss };
    pl.profitByField = filterByFields(apiProfitLoss.profitByField, selectedFields);
    return pl;
  }, [apiProfitLoss, selectedFields]);

  const comparisonInsights = useMemo((): ComparisonInsights => {
    if (isMockMode()) {
      return MOCK_COMPARISON_INSIGHTS;
    }
    if (filteredComparison.length === 0) {
      return {
        bestYieldField: '',
        bestOilYieldField: '',
        mostProfitableField: '',
        mostExpensiveField: '',
        mostOverdueTasksField: '',
        highestPestField: '',
      };
    }
    const bestYield = filteredComparison.reduce((a, b) => ((a.kgPerHa ?? 0) >= (b.kgPerHa ?? 0) ? a : b));
    const bestOil = filteredComparison.reduce((a, b) => ((a.oilYieldPercent ?? 0) >= (b.oilYieldPercent ?? 0) ? a : b));
    const mostProfitable = filteredComparison.reduce((a, b) => ((a.profitPerHa ?? 0) >= (b.profitPerHa ?? 0) ? a : b));
    const mostExpensive = filteredComparison.reduce((a, b) => (a.costPerHa >= b.costPerHa ? a : b));
    return {
      bestYieldField: bestYield.fieldName,
      bestOilYieldField: bestOil.fieldName,
      mostProfitableField: mostProfitable.fieldName,
      mostExpensiveField: mostExpensive.fieldName,
      mostOverdueTasksField: filteredComparison[0]?.fieldName ?? '',
      highestPestField: filteredComparison[0]?.fieldName ?? '',
    };
  }, [filteredComparison]);

  const reportTitle = t(
    reportType === 'field-summary'
      ? 'fieldSummary'
      : reportType === 'production-harvest'
        ? 'productionHarvest'
        : reportType === 'profit-loss'
          ? 'profitLoss'
          : 'fieldComparison'
  );

  const filename = `${reportType}-${season}-${formatDate(new Date(), 'yyyy-MM-dd')}`;

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

    switch (reportType) {
      case 'field-summary':
        headers = ['Field', 'Area (ha)', 'Trees', 'Olives (kg)', 'Oil (kg)', 'Oil Yield %', 'Cost', 'Revenue', 'Profit'];
        rows = filteredSummaries.map(f => [
          f.fieldName, f.areaHa, f.treeCount, f.totalProductionKg,
          f.oilProducedKg ?? '', f.oilYieldPercent ?? '', f.totalCost, f.revenue, f.profit,
        ]);
        break;
      case 'production-harvest':
        headers = ['Field', 'Date', 'Olive Kg', 'Oil Kg', 'Oil Yield %', 'Kg/Tree', 'Kg/Ha', 'Mill', 'Quality'];
        rows = filteredHarvest.map(r => [
          r.fieldName, r.harvestDate, r.oliveKg, r.oilKg ?? '', r.oilYieldPercent ?? '',
          r.kgPerTree ?? '', r.kgPerHa ?? '', r.millName ?? '', r.qualityGrade ?? '',
        ]);
        break;
      case 'profit-loss':
        headers = ['Category', 'Amount (€)'];
        rows = filteredProfitLoss
          ? [
              ['Total Income', filteredProfitLoss.totalIncome],
              ['Total Expenses', filteredProfitLoss.totalExpenses],
              ['Net Profit', filteredProfitLoss.netProfit],
            ]
          : [];
        break;
      case 'field-comparison':
        headers = ['Field', 'Olive Kg', 'Kg/Ha', 'Cost/Ha'];
        rows = filteredComparison.map(r => [
          r.fieldName, r.oliveKg, r.kgPerHa ?? '', r.costPerHa,
        ]);
        break;
    }

    exportService.exportToCSV({ headers, rows, title: reportTitle }, filename);
  }, [reportType, filteredSummaries, filteredHarvest, filteredProfitLoss, filteredComparison, reportTitle, filename]);

  const exportExcel = useCallback(() => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    switch (reportType) {
      case 'field-summary':
        headers = ['Field', 'Area (ha)', 'Trees', 'Olives (kg)', 'Oil (kg)', 'Oil Yield %', 'Cost', 'Revenue', 'Profit'];
        rows = filteredSummaries.map(f => [
          f.fieldName, f.areaHa, f.treeCount, f.totalProductionKg,
          f.oilProducedKg ?? '', f.oilYieldPercent ?? '', f.totalCost, f.revenue, f.profit,
        ]);
        break;
      case 'production-harvest':
        headers = ['Field', 'Date', 'Olive Kg', 'Oil Kg', 'Oil Yield %', 'Kg/Tree', 'Kg/Ha', 'Mill', 'Quality'];
        rows = filteredHarvest.map(r => [
          r.fieldName, r.harvestDate, r.oliveKg, r.oilKg ?? '', r.oilYieldPercent ?? '',
          r.kgPerTree ?? '', r.kgPerHa ?? '', r.millName ?? '', r.qualityGrade ?? '',
        ]);
        break;
      case 'profit-loss':
        headers = ['Category', 'Amount (€)'];
        rows = filteredProfitLoss
          ? [
              ['Total Income', filteredProfitLoss.totalIncome],
              ['Total Expenses', filteredProfitLoss.totalExpenses],
              ['Net Profit', filteredProfitLoss.netProfit],
              ...filteredProfitLoss.profitByField.map(f => [`Profit — ${f.fieldName}`, f.profit]),
            ]
          : [];
        break;
      case 'field-comparison':
        headers = ['Field', 'Olive Kg', 'Kg/Ha', 'Cost/Ha'];
        rows = filteredComparison.map(r => [
          r.fieldName, r.oliveKg, r.kgPerHa ?? '', r.costPerHa,
        ]);
        break;
    }

    exportService.exportToExcel({ headers, rows, title: reportTitle }, filename);
  }, [reportType, filteredSummaries, filteredHarvest, filteredProfitLoss, filteredComparison, reportTitle, filename]);

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

    switch (reportType) {
      case 'field-summary':
        return <FieldSummaryReportView id={REPORT_PREVIEW_ID} data={filteredSummaries} />;
      case 'production-harvest':
        return <ProductionHarvestReportView id={REPORT_PREVIEW_ID} data={filteredHarvest} season={season} />;
      case 'profit-loss':
        return filteredProfitLoss
          ? <ProfitLossReportView id={REPORT_PREVIEW_ID} data={filteredProfitLoss} />
          : (
            <div className="report-empty-state">
              <Euro size={40} strokeWidth={1.5} />
              <h3>{t('selectFieldsPrompt')}</h3>
            </div>
          );
      case 'field-comparison':
        return (
          <FieldComparisonReportView
            id={REPORT_PREVIEW_ID}
            data={filteredComparison}
            insights={comparisonInsights}
            season={season}
          />
        );
      default:
        return null;
    }
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
          {/* Sidebar — report type picker */}
          <aside className="reports-sidebar">
            <h2 className="reports-sidebar-title">{t('reportType')}</h2>
            <div className="report-type-list">
              {(Object.keys(REPORT_META) as ReportTypeId[]).map(type => {
                const meta = REPORT_META[type];
                const isActive = reportType === type;
                const labelKey =
                  type === 'field-summary'
                    ? 'fieldSummary'
                    : type === 'production-harvest'
                      ? 'productionHarvest'
                      : type === 'profit-loss'
                        ? 'profitLoss'
                        : 'fieldComparison';

                return (
                  <button
                    key={type}
                    type="button"
                    className={`report-type-card ${isActive ? 'active' : ''}`}
                    onClick={() => setReportType(type)}
                  >
                    <div className="report-type-icon">{meta.icon}</div>
                    <div className="report-type-text">
                      <span className="report-type-name">{t(labelKey)}</span>
                      <span className="report-type-desc">{t(meta.descriptionKey)}</span>
                    </div>
                    {type === 'field-summary' && (
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
                <select value={season} onChange={e => setSeason(e.target.value)}>
                  {SEASON_OPTIONS.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <div className="filter-group-header">
                  <label>{t('fields')}</label>
                  <div className="field-select-actions">
                    <button type="button" onClick={selectAllFields}>{t('selectAll')}</button>
                    <button type="button" onClick={clearFields}>{t('clearAll')}</button>
                  </div>
                </div>
                <div className="field-select-list">
                  {fields.map(field => {
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
                        <span className="field-area">{field.area} ha</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Main — preview + actions */}
          <main className="reports-main">
            <div className="reports-toolbar">
              <div className="reports-toolbar-left">
                <h2>{reportTitle}</h2>
                <span className="reports-toolbar-meta">
                  {selectedFields.length} {t('fieldsSelected')} · {t('season')} {season}
                </span>
              </div>
              <div className="reports-toolbar-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Eye size={16} />}
                  onClick={() => setShowPreview(v => !v)}
                >
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
