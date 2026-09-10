import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Wallet, BookOpen, ArrowLeft } from 'lucide-react';
import PageContainer from '../components/Common/PageContainer';
import PageHeader from '../components/Common/PageHeader';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import Button from '../components/Common/Button';
import {
  getReportsService,
  getTaskService,
  getNoteService,
  getFieldService,
} from '../services/serviceFactory';
import { Task } from '../services/taskService';
import { Note, notePreviewTitle } from '../services/noteService';
import {
  formatSeasonLabel,
  formatSeasonRange,
  getSeasonBounds,
  getSeasonStartYear,
  listRecentSeasonYears,
} from '../utils/harvestSeason';
import {
  buildSeasonMilestones,
  computeRodProgress,
  isSeasonClosedForReview,
  noteInSeasonBounds,
} from '../ravdos/progressModel';
import {
  buildSeasonFinance,
  overlappingCalendarYears,
  type SoftPnl,
} from '../ravdos/seasonFinance';
import type { HarvestRecord, FieldSummaryData } from '../data/mockReportData';
import { useLocale } from '../context/LocaleProvider';
import { useExperienceMode } from '../context/ExperienceModeContext';
import { formatEconomicsMoney } from '../utils/economics';
import { formatDate, formatNumber } from '../utils/localeFormatters';
import { useAllLocalizedTemplates } from '../hooks/useLocalizedTaskTemplate';
import './ThisHarvestPage.css';

const formatMoney = (amount: number, locale: string) => formatEconomicsMoney(amount, 'EUR', locale);
const formatKg = (kg: number, locale: string) =>
  formatNumber(kg, { locale: locale.startsWith('el') ? 'el' : locale.startsWith('it') ? 'it' : 'en', maximumFractionDigits: 1 });

const ThisHarvestReviewPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common']);
  const { locale } = useLocale();
  const { isEveryday } = useExperienceMode();
  const localizedTemplates = useAllLocalizedTemplates();
  const titleByTemplateId = useMemo(
    () => Object.fromEntries(localizedTemplates.map((tpl) => [tpl.id, tpl.title])),
    [localizedTemplates]
  );
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [closedYears, setClosedYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [anyIrrigated, setAnyIrrigated] = useState(false);
  const [finance, setFinance] = useState(() =>
    buildSeasonFinance([], null, [], getSeasonBounds(getSeasonStartYear() - 1))
  );
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [doneTitles, setDoneTitles] = useState<string[]>([]);

  const discoverClosed = useCallback(async () => {
    setLoading(true);
    try {
      const [tasks, fields] = await Promise.all([
        getTaskService().getTasks().catch(() => [] as Task[]),
        getFieldService().getFields().catch(() => []),
      ]);
      setAllTasks(tasks);
      setAnyIrrigated(fields.some((f) => Boolean(f.irrigationStatus)));

      const candidates = listRecentSeasonYears(8);
      const closed = candidates.filter((y) => isSeasonClosedForReview(y, tasks));
      setClosedYears(closed);
      const fromUrl = Number(searchParams.get('season'));
      setSelectedYear((prev) => {
        if (fromUrl && closed.includes(fromUrl)) return fromUrl;
        if (prev && closed.includes(prev)) return prev;
        return closed[0] ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void discoverClosed();
  }, [discoverClosed]);

  const loadYear = useCallback(
    async (year: number) => {
      const bounds = getSeasonBounds(year);
      const reports = getReportsService();
      const years = overlappingCalendarYears(year);
      const [allNotes, harvestChunks, pnlChunks, summaryChunks] = await Promise.all([
        getNoteService().getNotes({ limit: 100 }).catch(() => [] as Note[]),
        Promise.all(years.map((y) => reports.getHarvestRecords(y).catch(() => [] as HarvestRecord[]))),
        Promise.all(years.map((y) => reports.getProfitLoss(y).catch(() => null))),
        Promise.all(years.map((y) => reports.getFieldSummaries(y).catch(() => [] as FieldSummaryData[]))),
      ]);

      const harvests = harvestChunks.flat();
      const summariesMap = new Map<string, FieldSummaryData>();
      summaryChunks.flat().forEach((s) => summariesMap.set(s.fieldId, s));
      const summaries = Array.from(summariesMap.values());

      let spent = 0;
      let received = 0;
      const profitByField = new Map<
        string,
        { fieldId: string; fieldName: string; cost: number; revenue: number }
      >();
      for (const pnl of pnlChunks) {
        if (!pnl) continue;
        spent += Number(pnl.totalExpenses ?? 0);
        received += Number(pnl.totalIncome ?? 0);
        for (const row of pnl.profitByField ?? []) {
          const prev = profitByField.get(row.fieldId);
          profitByField.set(row.fieldId, {
            fieldId: row.fieldId,
            fieldName: row.fieldName,
            cost: (prev?.cost ?? 0) + Number(row.cost ?? 0),
            revenue: (prev?.revenue ?? 0) + Number(row.revenue ?? 0),
          });
        }
      }
      const mergedPnl: SoftPnl = {
        totalIncome: received,
        totalExpenses: spent,
        netProfit: received - spent,
        profitByField: Array.from(profitByField.values()),
      };

      const milestones = buildSeasonMilestones(allTasks, {
        anyIrrigatedField: anyIrrigated,
        seasonStartYear: year,
      });
      const progress = computeRodProgress(milestones);

      setFinance(buildSeasonFinance(harvests, mergedPnl, summaries, bounds));
      setProgressDone(progress.milestones.filter((m) => m.done).length);
      setProgressTotal(progress.milestones.length);
      setDoneTitles(
        progress.milestones
          .filter((m) => m.done)
          .map((m) => titleByTemplateId[m.templateId] || m.title)
      );
      setNotes(
        allNotes
          .filter((n) => noteInSeasonBounds(n, bounds))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, isEveryday ? 4 : 12)
      );
    },
    [allTasks, anyIrrigated, isEveryday, titleByTemplateId]
  );

  useEffect(() => {
    if (selectedYear == null) return;
    void loadYear(selectedYear);
  }, [selectedYear, loadYear]);

  if (loading) return <LoadingSpinner className="page-inline-loading" />;

  return (
    <PageContainer>
      <div className="ravdos-page">
        <Breadcrumbs />
        <PageHeader title={t('fields:apologismos.title')} subtitle={t('fields:apologismos.subtitle')} />

        <Link to="/this-harvest" className="ravdos-section-link ravdos-back">
          <ArrowLeft size={16} aria-hidden /> {t('fields:apologismos.backToProgress')}
        </Link>

        {closedYears.length === 0 ? (
          <EmptyState
            title={t('fields:apologismos.emptyYears')}
            description={t('fields:apologismos.emptyYearsHint')}
          />
        ) : (
          <>
            <div className="ravdos-year-picker">
              <label htmlFor="ravdos-year">{t('fields:apologismos.pickYear')}</label>
              <select
                id="ravdos-year"
                className="ravdos-select"
                value={selectedYear ?? ''}
                onChange={(e) => {
                  const year = Number(e.target.value);
                  setSelectedYear(year);
                  setSearchParams({ season: String(year) }, { replace: true });
                }}
              >
                {closedYears.map((y) => (
                  <option key={y} value={y}>
                    {formatSeasonLabel(y)}
                  </option>
                ))}
              </select>
            </div>

            <section className="ravdos-section" aria-labelledby="ravdos-result">
              <h2 id="ravdos-result">{t('fields:apologismos.resultTitle')}</h2>
              <p className="ravdos-help">
                {progressTotal > 0
                  ? t('fields:apologismos.progressDone', { done: progressDone, total: progressTotal })
                  : t('fields:apologismos.progressNone')}
                {selectedYear != null
                  ? ` · ${formatSeasonLabel(selectedYear)} · ${formatSeasonRange(selectedYear, locale === 'el' ? 'el-GR' : locale)}`
                  : ''}
              </p>
              <div className="ravdos-money-grid">
                <div className="ravdos-money-stat">
                  <span>{t('fields:apologismos.olives')}</span>
                  <strong>{formatKg(finance.oliveKg, locale)} kg</strong>
                </div>
                <div className="ravdos-money-stat">
                  <span>{t('fields:apologismos.oil')}</span>
                  <strong>{formatKg(finance.oilKg, locale)} kg</strong>
                </div>
                <div className="ravdos-money-stat">
                  <span>{t('fields:apologismos.spent')}</span>
                  <strong>{formatMoney(finance.spent, locale)}</strong>
                </div>
                <div className="ravdos-money-stat">
                  <span>{t('fields:apologismos.received')}</span>
                  <strong>{formatMoney(finance.received, locale)}</strong>
                </div>
                <div className="ravdos-money-stat ravdos-money-net">
                  <span>{t('fields:apologismos.net')}</span>
                  <strong>{formatMoney(finance.net, locale)}</strong>
                </div>
              </div>
              <div className="ravdos-money-actions">
                <Button
                  to={selectedYear ? `/money?year=${selectedYear}` : '/money'}
                  variant="outline"
                  icon={<Wallet size={16} />}
                >
                  {t('fields:apologismos.openMoney')}
                </Button>
              </div>
            </section>

            <section className="ravdos-section" aria-labelledby="ravdos-happened">
              <h2 id="ravdos-happened">{t('fields:apologismos.whatHappened')}</h2>
              {doneTitles.length === 0 ? (
                <p className="ravdos-empty-line">{t('fields:thisHarvest.milestonesEmpty')}</p>
              ) : (
                <ul className="ravdos-done-list">
                  {(isEveryday ? doneTitles.slice(0, 6) : doneTitles).map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="ravdos-section" aria-labelledby="ravdos-notes-review">
              <h2 id="ravdos-notes-review">{t('fields:apologismos.notesTitle')}</h2>
              {notes.length === 0 ? (
                <p className="ravdos-empty-line">{t('fields:apologismos.notesEmpty')}</p>
              ) : (
                <ul className="ravdos-notes">
                  {notes.map((note) => (
                    <li key={note.id}>
                      <Link
                        to={note.fieldId ? `/fields/${note.fieldId}` : '/chronologio'}
                        className="ravdos-note-link"
                      >
                        <span className="ravdos-note-title">
                          {notePreviewTitle(note.body) || t('fields:thisHarvest.untitledNote')}
                        </span>
                        <span className="ravdos-note-meta">
                          {formatDate(note.occurredAt || note.createdAt, { locale })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/chronologio" className="ravdos-section-link">
                <BookOpen size={16} aria-hidden /> {t('fields:apologismos.openChronologio')}{' '}
                <ChevronRight size={16} aria-hidden />
              </Link>
            </section>

            {!isEveryday && finance.fieldCards.length > 0 ? (
              <section className="ravdos-section" aria-labelledby="ravdos-fields-review">
                <h2 id="ravdos-fields-review">{t('fields:apologismos.fieldsTitle')}</h2>
                <ul className="ravdos-fields">
                  {finance.fieldCards.map((card) => (
                    <li key={card.fieldId}>
                      <Link to={`/fields/${card.fieldId}`} className="ravdos-field-link">
                        <span className="ravdos-field-name">{card.fieldName}</span>
                        <span className="ravdos-field-meta">
                          {formatKg(card.oliveKg, locale)} kg
                          {card.oilKg > 0 ? ` · ${formatKg(card.oilKg, locale)} kg` : ''}
                          {card.spent > 0 ? ` · ${formatMoney(card.spent, locale)}` : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default ThisHarvestReviewPage;
