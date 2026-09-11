import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Check, ChevronRight, Circle, Plus, Wallet } from 'lucide-react';
import PageContainer from '../components/Common/PageContainer';
import PageHeader from '../components/Common/PageHeader';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Button from '../components/Common/Button';
import {
  getReportsService,
  getFieldWorkService,
  getNoteService,
  getFieldService,
  getFinancialSummaryService,
} from '../services/serviceFactory';
import type { FieldTask } from '../services/fieldWorkService';
import { Note, notePreviewTitle } from '../services/noteService';
import {
  formatSeasonLabel,
  formatSeasonRange,
  getSeasonBounds,
  getSeasonStartYear,
} from '../utils/harvestSeason';
import {
  buildSeasonMilestones,
  computeRodProgress,
  noteInSeasonBounds,
  ROD_PHASE_ORDER,
  type RodMilestone,
  type RodPhaseId,
} from '../ravdos/progressModel';
import {
  buildSeasonFinance,
  filterHarvestsForSeason,
  overlappingCalendarYears,
} from '../ravdos/seasonFinance';
import { calendarRodPhase, nextCalendarRodPhase, seasonStoryState } from '../ravdos/seasonStory';
import type { HarvestRecord } from '../data/mockReportData';
import { useLocale } from '../context/LocaleProvider';
import { useExperienceMode } from '../context/ExperienceModeContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { formatOfficialAmount } from '../finance/format';
import { athensCalendarYear } from '../utils/athensDate';
import type { YearFinancialSummary } from '../services/financialSummaryService';
import { formatDate, formatNumber } from '../utils/localeFormatters';
import { normalizeTaskCategory, taskStatusI18nKey } from '../utils/categoryNormalize';
import './ThisHarvestPage.css';

const formatKg = (kg: number, locale: string) =>
  formatNumber(kg, {
    locale: locale.startsWith('el') ? 'el' : locale.startsWith('it') ? 'it' : 'en',
    maximumFractionDigits: kg >= 100 ? 0 : 1,
  });

const numberLocale = (locale: string) =>
  locale.startsWith('el') ? 'el-GR' : locale.startsWith('it') ? 'it-IT' : 'en-US';

const ThisHarvestPage: React.FC = () => {
  const { t, i18n } = useTranslation(['fields', 'common', 'money']);
  const { locale } = useLocale();
  const { isEveryday } = useExperienceMode();
  const capture = useCaptureOptional();
  const seasonStartYear = useMemo(() => getSeasonStartYear(), []);
  const bounds = useMemo(() => getSeasonBounds(seasonStartYear), [seasonStartYear]);
  const prevBounds = useMemo(() => getSeasonBounds(seasonStartYear - 1), [seasonStartYear]);

  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [anyIrrigated, setAnyIrrigated] = useState(false);
  const [yearMoney, setYearMoney] = useState<YearFinancialSummary | null>(null);
  const [showAllNext, setShowAllNext] = useState(false);
  const moneyYear = athensCalendarYear(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const reports = getReportsService();
      const years = Array.from(
        new Set([
          ...overlappingCalendarYears(seasonStartYear),
          ...overlappingCalendarYears(seasonStartYear - 1),
        ])
      );
      const [allTasks, allNotes, fields, harvestChunks, officialYear] = await Promise.all([
        getFieldWorkService().listFieldTasks().catch(() => [] as FieldTask[]),
        getNoteService().getNotes({ limit: 100 }).catch(() => [] as Note[]),
        getFieldService().getFields().catch(() => []),
        Promise.all(years.map((y) => reports.getHarvestRecords(y).catch(() => [] as HarvestRecord[]))),
        getFinancialSummaryService().getYear(moneyYear, undefined, i18n.language).catch(() => null),
      ]);

      setTasks(allTasks);
      setAnyIrrigated(fields.some((f) => Boolean(f.irrigationStatus)));
      setYearMoney(officialYear);
      setHarvests(harvestChunks.flat());
      setNotes(
        allNotes
          .filter((n) => noteInSeasonBounds(n, bounds))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          })
          .slice(0, isEveryday ? 3 : 8)
      );
    } finally {
      setLoading(false);
    }
  }, [bounds, isEveryday, seasonStartYear, moneyYear, i18n.language]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onSaved = () => void load();
    window.addEventListener(CAPTURE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(CAPTURE_SAVED_EVENT, onSaved);
  }, [load]);

  const finance = useMemo(
    () => buildSeasonFinance(harvests, null, [], bounds),
    [harvests, bounds]
  );
  const lastSeason = useMemo(
    () => buildSeasonFinance(harvests, null, [], prevBounds),
    [harvests, prevBounds]
  );
  const millVisits = useMemo(
    () =>
      filterHarvestsForSeason(harvests, bounds).sort(
        (a, b) => new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime()
      ),
    [harvests, bounds]
  );

  const milestones = useMemo(
    () => buildSeasonMilestones(tasks, { anyIrrigatedField: anyIrrigated, seasonStartYear }),
    [tasks, anyIrrigated, seasonStartYear]
  );
  const progress = useMemo(() => computeRodProgress(milestones), [milestones]);
  const nowPhase = calendarRodPhase();
  const nextPhase = nextCalendarRodPhase(nowPhase);
  const story = seasonStoryState({
    oliveKg: finance.oliveKg,
    oilKg: finance.oilKg,
    harvestClosed: progress.harvestClosed,
  });

  const nextItems = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{
      key: string;
      title: string;
      meta: string;
      taskId?: string;
      done: boolean;
    }> = [];

    const push = (key: string, title: string, meta: string, taskId?: string, done = false) => {
      if (seen.has(key) || (taskId && seen.has(taskId))) return;
      seen.add(key);
      if (taskId) seen.add(taskId);
      rows.push({ key, title, meta, taskId, done });
    };

    progress.milestones
      .filter((m: RodMilestone) => !m.done)
      .forEach((m) => push(m.id, m.title, t(`fields:thisHarvest.phases.${m.phase}`), m.taskId));

    tasks
      .filter((task) => {
        if (task.status === 'completed' || task.status === 'cancelled') return false;
        return normalizeTaskCategory(task.templateCode || task.title) === 'harvest';
      })
      .forEach((task) =>
        push(task.id, task.title, t(taskStatusI18nKey(task.status)), task.id)
      );

    return rows;
  }, [progress.milestones, tasks, t]);

  const visibleNext = useMemo(() => {
    const limit = isEveryday ? 4 : 8;
    return showAllNext ? nextItems : nextItems.slice(0, limit);
  }, [isEveryday, nextItems, showAllNext]);

  const oilYield =
    finance.oliveKg > 0 && finance.oilKg > 0 ? (finance.oilKg / finance.oliveKg) * 100 : null;
  const jobsDone = progress.milestones.filter((m) => m.done).length;
  const jobsTotal = progress.milestones.length;
  const groveCards = useMemo(() => {
    const byField = new Map<
      string,
      { fieldId: string; fieldName: string; oliveKg: number; oilKg: number }
    >();
    for (const visit of millVisits) {
      const current = byField.get(visit.fieldId) || {
        fieldId: visit.fieldId,
        fieldName: visit.fieldName,
        oliveKg: 0,
        oilKg: 0,
      };
      current.oliveKg += visit.oliveKg || 0;
      current.oilKg += visit.oilKg || 0;
      byField.set(visit.fieldId, current);
    }
    return Array.from(byField.values()).filter((card) => card.oliveKg > 0 || card.oilKg > 0);
  }, [millVisits]);
  const showMill = millVisits.length > 0 || nowPhase === 'harvest' || story !== 'growing';
  const harvestCta = nowPhase === 'harvest' || story !== 'growing';

  const toggleMilestone = async (taskId: string | undefined, currentlyDone: boolean) => {
    if (!taskId || togglingId) return;
    const task = tasks.find((row) => row.id === taskId);
    if (!task) return;
    const nextStatus = currentlyDone ? 'pending' : 'completed';
    setTogglingId(taskId);
    setTasks((prev) => prev.map((row) => (row.id === taskId ? { ...row, status: nextStatus } : row)));
    try {
      if (currentlyDone) {
        if (task.latestExecutionId) {
          await getFieldWorkService().undoCompletion(task.latestExecutionId);
        }
      } else {
        await getFieldWorkService().completeFieldTask(taskId, { outcome: 'done' });
      }
    } catch {
      setTasks((prev) => prev.map((row) => (row.id === taskId ? { ...row, status: task.status } : row)));
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return <LoadingSpinner className="page-inline-loading" />;

  const phaseLabel = (id: RodPhaseId) => t(`fields:thisHarvest.phases.${id}`);
  const kgLocale = numberLocale(locale);
  const heroKg =
    finance.oilKg > 0 ? finance.oilKg : finance.oliveKg > 0 ? finance.oliveKg : null;
  const heroUnit = finance.oilKg > 0 ? t('fields:thisHarvest.oilUnit') : t('fields:thisHarvest.olivesUnit');

  return (
    <PageContainer>
      <div className="ravdos-page">
        <Breadcrumbs />
        <PageHeader
          title={t('fields:thisHarvest.title')}
          subtitle={t('fields:thisHarvest.subtitle')}
        />

        <section className="ravdos-story" aria-labelledby="ravdos-story-title">
          <div className="ravdos-story-top">
            <p className="ravdos-eyebrow">{formatSeasonLabel(seasonStartYear)}</p>
            <span className={`ravdos-pill ravdos-pill-${story}`}>
              {t(`fields:thisHarvest.status.${story}`)}
            </span>
          </div>

          <h2 id="ravdos-story-title" className="ravdos-story-now">
            {t('fields:thisHarvest.nowPhase', { phase: phaseLabel(nowPhase) })}
          </h2>
          {nextPhase ? (
            <p className="ravdos-story-next">
              {t('fields:thisHarvest.nextPhase', { phase: phaseLabel(nextPhase) })}
            </p>
          ) : (
            <p className="ravdos-story-next">{t('fields:thisHarvest.harvestWindowNow')}</p>
          )}

          <ol className="ravdos-path" aria-label={t('fields:thisHarvest.progressLabel')}>
            {ROD_PHASE_ORDER.map((id, index) => {
              const currentIndex = ROD_PHASE_ORDER.indexOf(nowPhase);
              const state =
                index < currentIndex ? 'is-done' : index === currentIndex ? 'is-current' : '';
              return (
                <li key={id} className={state}>
                  <span className="ravdos-path-dot" aria-hidden />
                  <span className="ravdos-path-label">{phaseLabel(id)}</span>
                </li>
              );
            })}
          </ol>

          {heroKg != null ? (
            <div className="ravdos-story-result">
              <p className="ravdos-story-kilos">
                {formatKg(heroKg, locale)} <span>{heroUnit}</span>
              </p>
              <p className="ravdos-story-kicker">
                {finance.oilKg > 0 && finance.oliveKg > 0
                  ? t('fields:thisHarvest.heroOilSupport', {
                      olives: formatKg(finance.oliveKg, locale),
                      yield: oilYield != null ? formatKg(oilYield, locale) : '—',
                    })
                  : t('fields:thisHarvest.heroOliveSupport')}
              </p>
            </div>
          ) : (
            <div className="ravdos-story-result">
              <p className="ravdos-story-waiting">{t('fields:thisHarvest.waitingMill')}</p>
              <p className="ravdos-story-kicker">{t('fields:thisHarvest.waitingMillHint')}</p>
            </div>
          )}

          <p className="ravdos-story-jobs">
            {jobsTotal > 0
              ? t('fields:thisHarvest.jobsLine', { done: jobsDone, total: jobsTotal })
              : t('fields:thisHarvest.jobsNone')}
            <span>
              {' · '}
              {formatSeasonRange(seasonStartYear, kgLocale)}
            </span>
          </p>
        </section>

        <section className="ravdos-section" aria-labelledby="ravdos-pulse">
          <div className="ravdos-section-head">
            <h2 id="ravdos-pulse">{t('fields:thisHarvest.pulseTitle')}</h2>
            <p className="ravdos-section-aside">{t('fields:thisHarvest.liveHint')}</p>
          </div>
          <div className={`ravdos-pulse${oilYield == null ? ' ravdos-pulse-three' : ''}`}>
            <div className="ravdos-pulse-stat">
              <span>{t('fields:thisHarvest.olives')}</span>
              <strong>
                {finance.oliveKg > 0
                  ? `${formatKg(finance.oliveKg, locale)} kg`
                  : t('fields:thisHarvest.notYet')}
              </strong>
            </div>
            <div className="ravdos-pulse-stat">
              <span>{t('fields:thisHarvest.oil')}</span>
              <strong>
                {finance.oilKg > 0
                  ? `${formatKg(finance.oilKg, locale)} kg`
                  : t('fields:thisHarvest.notYet')}
              </strong>
            </div>
            {oilYield != null ? (
              <div className="ravdos-pulse-stat">
                <span>{t('fields:thisHarvest.oilYieldSoFar')}</span>
                <strong>{formatKg(oilYield, locale)}%</strong>
              </div>
            ) : null}
            <div className="ravdos-pulse-stat">
              <span>{t('fields:thisHarvest.spentSoFar')}</span>
              <strong>
                {formatOfficialAmount(
                  yearMoney?.totalExpenses,
                  yearMoney?.currency || 'EUR',
                  i18n.language,
                  t('fields:thisHarvest.notYet')
                )}
              </strong>
            </div>
          </div>
          {lastSeason.oliveKg > 0 || lastSeason.oilKg > 0 ? (
            <p className="ravdos-last-season">
              {t('fields:thisHarvest.lastSeason', {
                year: formatSeasonLabel(seasonStartYear - 1),
                olives: formatKg(lastSeason.oliveKg, locale),
              })}
              {lastSeason.oilKg > 0
                ? ` · ${t('fields:thisHarvest.lastSeasonOil', {
                    oil: formatKg(lastSeason.oilKg, locale),
                  })}`
                : ''}
            </p>
          ) : null}
        </section>

        {visibleNext.length > 0 ? (
          <section className="ravdos-section" aria-labelledby="ravdos-next">
            <div className="ravdos-section-head">
              <h2 id="ravdos-next">{t('fields:thisHarvest.nextTitle')}</h2>
            </div>
            <ul className="ravdos-checklist">
              {visibleNext.map((item) => (
                <li key={item.key} className={`ravdos-check-item ${item.done ? 'is-done' : ''}`}>
                  <button
                    type="button"
                    className="ravdos-check-toggle"
                    disabled={!item.taskId || togglingId === item.taskId}
                    onClick={() => void toggleMilestone(item.taskId, item.done)}
                    aria-pressed={item.done}
                    aria-label={item.done ? t('fields:thisHarvest.markOpen') : t('fields:thisHarvest.markDone')}
                  >
                    {item.done ? <Check size={18} /> : <Circle size={18} />}
                  </button>
                  {item.taskId ? (
                    <Link to={`/tasks/${item.taskId}`} className="ravdos-check-body">
                      <span className="ravdos-check-title">{item.title}</span>
                      <span className="ravdos-check-meta">{item.meta}</span>
                    </Link>
                  ) : (
                    <div className="ravdos-check-body">
                      <span className="ravdos-check-title">{item.title}</span>
                      <span className="ravdos-check-meta">{item.meta}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {nextItems.length > visibleNext.length ? (
              <button
                type="button"
                className="ravdos-section-link ravdos-text-btn"
                onClick={() => setShowAllNext(true)}
              >
                {t('fields:thisHarvest.milestonesMore', { count: nextItems.length })}
              </button>
            ) : null}
            <Link to="/tasks" className="ravdos-section-link">
              {t('fields:thisHarvest.seeAllTasks')} <ChevronRight size={16} aria-hidden />
            </Link>
          </section>
        ) : null}

        {showMill ? (
          <section className="ravdos-section" aria-labelledby="ravdos-mill">
            <div className="ravdos-section-head">
              <h2 id="ravdos-mill">{t('fields:thisHarvest.millTitle')}</h2>
              {millVisits.length > 0 ? (
                <p className="ravdos-section-aside">
                  {t('fields:thisHarvest.millCount', { count: millVisits.length })}
                </p>
              ) : null}
            </div>
            {millVisits.length === 0 ? (
              <p className="ravdos-empty-line">{t('fields:thisHarvest.millEmpty')}</p>
            ) : (
              <ul className="ravdos-mill">
                {millVisits.slice(0, isEveryday ? 5 : 12).map((visit, index) => (
                  <li key={visit.id || `${visit.fieldId}-${visit.harvestDate}-${index}`}>
                    <Link to={`/fields/${visit.fieldId}`} className="ravdos-mill-link">
                      <span className="ravdos-mill-when">
                        {formatDate(visit.harvestDate, { locale, dateFormat: 'medium' })}
                      </span>
                      <span className="ravdos-mill-where">
                        {visit.fieldName}
                        {visit.millName ? ` · ${visit.millName}` : ''}
                      </span>
                      <span className="ravdos-mill-kg">
                        {t('fields:thisHarvest.millOlives', { kg: formatKg(visit.oliveKg, locale) })}
                        {visit.oilKg
                          ? ` · ${t('fields:thisHarvest.millOil', { kg: formatKg(visit.oilKg, locale) })}`
                          : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {!isEveryday && groveCards.length > 0 ? (
          <section className="ravdos-section" aria-labelledby="ravdos-groves">
            <div className="ravdos-section-head">
              <h2 id="ravdos-groves">{t('fields:thisHarvest.fieldsSoft')}</h2>
            </div>
            <ul className="ravdos-fields">
              {groveCards.map((card) => (
                <li key={card.fieldId}>
                  <Link to={`/fields/${card.fieldId}`} className="ravdos-field-link">
                    <span className="ravdos-field-name">{card.fieldName}</span>
                    <span className="ravdos-field-meta">
                      {formatKg(card.oliveKg, locale)} kg
                      {card.oilKg > 0 ? ` · ${formatKg(card.oilKg, locale)} kg` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {notes.length > 0 ? (
          <section className="ravdos-section" aria-labelledby="ravdos-notes">
            <div className="ravdos-section-head">
              <h2 id="ravdos-notes">{t('fields:thisHarvest.notesTitle')}</h2>
            </div>
            <ul className="ravdos-notes">
              {notes.map((note) => (
                <li key={note.id}>
                  <Link
                    to={note.fieldId ? `/fields/${note.fieldId}` : '/chronologio'}
                    className="ravdos-note-link"
                  >
                    <span className="ravdos-note-title">
                      {note.pinned ? '★ ' : ''}
                      {notePreviewTitle(note.body) || t('fields:thisHarvest.untitledNote')}
                    </span>
                    <span className="ravdos-note-meta">
                      {formatDate(note.occurredAt || note.createdAt, { locale, dateFormat: 'medium' })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/chronologio" className="ravdos-section-link">
              <BookOpen size={16} aria-hidden /> {t('fields:thisHarvest.seeChronologio')}
            </Link>
          </section>
        ) : null}

        <div className="ravdos-actions">
          <Button
            variant={harvestCta ? 'primary' : 'outline'}
            icon={<Plus size={16} />}
            onClick={() => capture?.openCapture({ preferredType: 'harvest' })}
          >
            {t('fields:thisHarvest.recordHarvest')}
          </Button>
          <Button
            variant="outline"
            icon={<Wallet size={16} />}
            onClick={() => capture?.openCapture({ preferredType: 'income' })}
          >
            {t('fields:harvestMoney.addIncome')}
          </Button>
          <Button to={`/money?year=${moneyYear}`} variant="ghost" icon={<Wallet size={16} />}>
            {t('fields:thisHarvest.openMoney')}
          </Button>
        </div>

        <div className="ravdos-footer-link">
          {notes.length === 0 ? (
            <Link to="/chronologio" className="ravdos-section-link">
              <BookOpen size={16} aria-hidden /> {t('fields:thisHarvest.seeChronologio')}
            </Link>
          ) : null}
          <Link to="/this-harvest/review" className="ravdos-section-link">
            {t('fields:thisHarvest.reviewLink')} <ChevronRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </PageContainer>
  );
};

export default ThisHarvestPage;
