import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Circle, ChevronRight, Wallet, StickyNote, BookOpen } from 'lucide-react';
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
  getSeasonBounds,
  getSeasonStartYear,
} from '../utils/harvestSeason';
import {
  buildSeasonMilestones,
  computeRodProgress,
  noteInSeasonBounds,
  isTaskCompleted,
  ROD_PHASE_ORDER,
  type RodPhaseId,
} from '../ravdos/progressModel';
import {
  buildSeasonFinance,
  overlappingCalendarYears,
  type SoftPnl,
} from '../ravdos/seasonFinance';
import type { HarvestRecord, FieldSummaryData } from '../data/mockReportData';
import { useLocale } from '../context/LocaleProvider';
import { useExperienceMode } from '../context/ExperienceModeContext';
import { formatDate } from '../utils/localeFormatters';
import './ThisHarvestPage.css';

const formatMoney = (amount: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(amount);

const formatKg = (kg: number) => kg.toLocaleString(undefined, { maximumFractionDigits: 1 });

const ThisHarvestPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common']);
  const { locale } = useLocale();
  const { isEveryday } = useExperienceMode();
  const seasonStartYear = useMemo(() => getSeasonStartYear(), []);
  const bounds = useMemo(() => getSeasonBounds(seasonStartYear), [seasonStartYear]);

  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [anyIrrigated, setAnyIrrigated] = useState(false);
  const [finance, setFinance] = useState(() =>
    buildSeasonFinance([], null, [], bounds)
  );
  const [showAllMilestones, setShowAllMilestones] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const reports = getReportsService();
      const years = overlappingCalendarYears(seasonStartYear);
      const [allTasks, allNotes, fields, harvestChunks, pnlChunks, summaryChunks] =
        await Promise.all([
          getTaskService().getTasks().catch(() => [] as Task[]),
          getNoteService().getNotes({ limit: 100 }).catch(() => [] as Note[]),
          getFieldService().getFields().catch(() => []),
          Promise.all(years.map((y) => reports.getHarvestRecords(y).catch(() => [] as HarvestRecord[]))),
          Promise.all(years.map((y) => reports.getProfitLoss(y).catch(() => null))),
          Promise.all(years.map((y) => reports.getFieldSummaries(y).catch(() => [] as FieldSummaryData[]))),
        ]);

      const harvests = harvestChunks.flat();
      const summariesMap = new Map<string, FieldSummaryData>();
      summaryChunks.flat().forEach((s) => summariesMap.set(s.fieldId, s));
      const summaries = Array.from(summariesMap.values());

      // Merge PnL softly: sum expenses/income across overlapping calendar years (approximate live pulse).
      let spent = 0;
      let received = 0;
      const profitByField = new Map<string, { fieldId: string; fieldName: string; cost: number; revenue: number }>();
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

      setTasks(allTasks);
      setAnyIrrigated(fields.some((f) => Boolean(f.irrigationStatus)));
      setFinance(buildSeasonFinance(harvests, mergedPnl, summaries, bounds));
      setNotes(
        allNotes
          .filter((n) => noteInSeasonBounds(n, bounds))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          })
          .slice(0, isEveryday ? 4 : 12)
      );
    } finally {
      setLoading(false);
    }
  }, [bounds, isEveryday, seasonStartYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const milestones = useMemo(
    () => buildSeasonMilestones(tasks, { anyIrrigatedField: anyIrrigated, seasonStartYear }),
    [tasks, anyIrrigated, seasonStartYear]
  );
  const progress = useMemo(() => computeRodProgress(milestones), [milestones]);

  const visibleMilestones = useMemo(() => {
    if (showAllMilestones || !isEveryday) return progress.milestones;
    const open = progress.milestones.filter((m) => !m.done);
    return open.slice(0, 5);
  }, [progress.milestones, showAllMilestones, isEveryday]);

  const toggleMilestone = async (taskId: string | undefined, currentlyDone: boolean) => {
    if (!taskId || togglingId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextStatus = currentlyDone ? 'pending' : 'completed';
    setTogglingId(taskId);
    setTasks((prev) => prev.map((row) => (row.id === taskId ? { ...row, status: nextStatus } : row)));
    try {
      await getTaskService().updateTaskStatus(taskId, nextStatus);
    } catch {
      setTasks((prev) => prev.map((row) => (row.id === taskId ? { ...row, status: task.status } : row)));
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return <LoadingSpinner className="page-inline-loading" />;

  const phaseLabel = (id: RodPhaseId) => t(`fields:thisHarvest.phases.${id}`);
  const empty =
    progress.milestones.length === 0 &&
    notes.length === 0 &&
    finance.oliveKg === 0 &&
    finance.spent === 0;

  return (
    <PageContainer>
      <div className="ravdos-page">
        <Breadcrumbs />
        <PageHeader
          title={t('fields:thisHarvest.title')}
          subtitle={t('fields:thisHarvest.subtitle')}
        />
        <p className="ravdos-season-label">
          {t('fields:thisHarvest.season', { year: formatSeasonLabel(seasonStartYear) })}
        </p>

        {empty ? (
          <EmptyState
            title={t('fields:thisHarvest.emptyTitle')}
            description={t('fields:thisHarvest.emptyHint')}
          />
        ) : null}

        <section className="ravdos-section ravdos-hero" aria-labelledby="ravdos-progress">
          <div className="ravdos-hero-top">
            <div>
              <p className="ravdos-eyebrow">{t('fields:thisHarvest.progressLabel')}</p>
              <h2 id="ravdos-progress" className="ravdos-percent">
                {progress.percent}%
              </h2>
              <p className="ravdos-status">
                {t('fields:thisHarvest.inProgress')} ·{' '}
                {t('fields:thisHarvest.phaseFocus', {
                  phase: phaseLabel(progress.activePhaseId),
                })}
              </p>
            </div>
            <div
              className="ravdos-ring"
              style={{ ['--ravdos-pct' as string]: `${progress.percent}` }}
              aria-hidden
            />
          </div>

          {!isEveryday ? (
            <div className="ravdos-phases" role="list">
              {ROD_PHASE_ORDER.map((id) => {
                const phase = progress.phases.find((p) => p.id === id);
                const active = progress.activePhaseId === id;
                return (
                  <div
                    key={id}
                    role="listitem"
                    className={`ravdos-phase ${active ? 'is-active' : ''} ${
                      (phase?.percent ?? 0) >= 100 ? 'is-done' : ''
                    }`}
                  >
                    <span className="ravdos-phase-name">{phaseLabel(id)}</span>
                    <span className="ravdos-phase-pct">{phase?.percent ?? 0}%</span>
                    <div className="ravdos-phase-bar">
                      <i style={{ width: `${phase?.percent ?? 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="ravdos-section" aria-labelledby="ravdos-milestones">
          <div className="ravdos-section-head">
            <h2 id="ravdos-milestones">{t('fields:thisHarvest.milestonesTitle')}</h2>
          </div>
          {visibleMilestones.length === 0 ? (
            <p className="ravdos-empty-line">{t('fields:thisHarvest.milestonesEmpty')}</p>
          ) : (
            <ul className="ravdos-checklist">
              {visibleMilestones.map((m) => (
                <li key={m.id} className={`ravdos-check-item ${m.done ? 'is-done' : ''}`}>
                  <button
                    type="button"
                    className="ravdos-check-toggle"
                    disabled={!m.taskId || togglingId === m.taskId}
                    onClick={() => void toggleMilestone(m.taskId, m.done)}
                    aria-pressed={m.done}
                    aria-label={m.done ? t('fields:thisHarvest.markOpen') : t('fields:thisHarvest.markDone')}
                  >
                    {m.done || isTaskCompleted(m.status) ? <Check size={18} /> : <Circle size={18} />}
                  </button>
                  {m.taskId ? (
                    <Link to={`/tasks/${m.taskId}`} className="ravdos-check-body">
                      <span className="ravdos-check-title">{m.title}</span>
                      <span className="ravdos-check-meta">
                        {phaseLabel(m.phase)} · {m.weight}
                      </span>
                    </Link>
                  ) : (
                    <div className="ravdos-check-body">
                      <span className="ravdos-check-title">{m.title}</span>
                      <span className="ravdos-check-meta">
                        {phaseLabel(m.phase)} · {m.weight}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {isEveryday && progress.milestones.filter((m) => !m.done).length > 5 ? (
            <button
              type="button"
              className="ravdos-section-link ravdos-text-btn"
              onClick={() => setShowAllMilestones((v) => !v)}
            >
              {showAllMilestones
                ? t('fields:thisHarvest.milestonesLess')
                : t('fields:thisHarvest.milestonesMore', {
                    count: progress.milestones.filter((m) => !m.done).length,
                  })}
            </button>
          ) : null}
          <Link to="/tasks" className="ravdos-section-link">
            {t('fields:thisHarvest.seeAllTasks')} <ChevronRight size={16} aria-hidden />
          </Link>
        </section>

        <section className="ravdos-section" aria-labelledby="ravdos-notes">
          <div className="ravdos-section-head">
            <h2 id="ravdos-notes">
              <StickyNote size={18} aria-hidden /> {t('fields:thisHarvest.notesTitle')}
            </h2>
          </div>
          {notes.length === 0 ? (
            <p className="ravdos-empty-line">{t('fields:thisHarvest.notesEmpty')}</p>
          ) : (
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
                      {formatDate(note.occurredAt || note.createdAt, { locale })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/chronologio" className="ravdos-section-link">
            <BookOpen size={16} aria-hidden /> {t('fields:thisHarvest.seeChronologio')}
          </Link>
        </section>

        <section className="ravdos-section" aria-labelledby="ravdos-live">
          <div className="ravdos-section-head">
            <h2 id="ravdos-live">{t('fields:thisHarvest.liveTitle')}</h2>
          </div>
          <p className="ravdos-help">{t('fields:thisHarvest.liveHint')}</p>
          <div className="ravdos-money-grid ravdos-live-grid">
            <div className="ravdos-money-stat">
              <span>{t('fields:thisHarvest.olivesSoFar')}</span>
              <strong>{formatKg(finance.oliveKg)} kg</strong>
            </div>
            <div className="ravdos-money-stat">
              <span>{t('fields:thisHarvest.spentSoFar')}</span>
              <strong>{formatMoney(finance.spent)}</strong>
            </div>
          </div>
          <div className="ravdos-money-actions">
            <Button to="/money" variant="outline" icon={<Wallet size={16} />}>
              {t('fields:thisHarvest.openMoney')}
            </Button>
          </div>
          {!isEveryday && finance.fieldCards.length > 0 ? (
            <>
              <p className="ravdos-help">{t('fields:thisHarvest.fieldsSoft')}</p>
              <ul className="ravdos-fields">
                {finance.fieldCards.map((card) => (
                  <li key={card.fieldId}>
                    <Link to={`/fields/${card.fieldId}`} className="ravdos-field-link">
                      <span className="ravdos-field-name">{card.fieldName}</span>
                      <span className="ravdos-field-meta">
                        {formatKg(card.oliveKg)} kg
                        {card.spent > 0 ? ` · ${formatMoney(card.spent)}` : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <div className="ravdos-footer-link">
          <Link to="/this-harvest/review" className="ravdos-section-link">
            {t('fields:thisHarvest.reviewLink')} <ChevronRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </PageContainer>
  );
};

export default ThisHarvestPage;
