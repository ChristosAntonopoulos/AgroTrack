import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  CloudRain,
  ExternalLink,
  Pencil,
  Pin,
  Trash2,
} from 'lucide-react';
import Button from '../Common/Button';
import ChronologioDetailShell from './ChronologioDetailShell';
import ChronologioCategoryIcon from './ChronologioCategoryIcon';
import ChronologioEventDetail from './ChronologioEventDetail';
import ChronologioDayWeatherDetail from './ChronologioDayWeatherDetail';
import ChronologioTodayWeatherDetail from './ChronologioTodayWeatherDetail';
import type { TodayWeatherField } from './ChronologioTodayWeatherDetail';
import type { FieldWeather } from '../../services/geospatialService';
import WeatherMonthSnapshot from './WeatherMonthSnapshot';
import NoteSheet from '../Dashboard/NoteSheet';
import { useCaptureOptional } from '../../context/CaptureContext';
import { useAuth } from '../../context/AuthContext';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { taskFormPath, taskPeekPath } from '../../navigation/intents';
import {
  getFieldWorkService,
  getFinancialTransactionService,
  getHarvestService,
  getNoteService,
  getPhotoService,
} from '../../services/serviceFactory';
import type { Note } from '../../services/noteService';
import { CAPTURE_SAVED_EVENT } from '../../capture/types';
import type {
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../../services/chronologioService';
import type { DayWeatherInput } from '../../chronologio/dayWeather';
import { dayWeatherDateKey } from '../../chronologio/dayWeather';
import {
  majorMonthsForYear,
  monthChapterFacts,
  periodEventCount,
  weatherFactBits,
  yearFixedMetrics,
} from '../../chronologio/summaryFacts';
import { resolveFieldColor, resolveWeatherMood, WEATHER_MOOD_COLORS } from '../../utils/fieldColors';
import { presentCategory, presentChronologioEvent } from '../../chronologio/eventPresentation';
import { chronologioDetailKind, detailAccentToken } from '../../chronologio/detailKind';
import {
  chronologioEntryCapabilities,
  chronologioHarvestId,
  chronologioMoneyTxId,
  chronologioNoteId,
  chronologioPhotoId,
  chronologioTaskId,
  chronologioWebDestination,
} from '../../chronologio/entryDestination';
import {
  chronologioScrollKey,
  readChronologioFocus,
  readChronologioJournalScroll,
  type ChronologioReturnState,
} from '../../chronologio/chronologioViewState';
import { harvestHasResult } from '../../chronologio/monthPresentation';
import { agriculturalYearRangeLabel } from '../../chronologio/agriculturalYear';
import {
  harvestYearCopyKey,
  yearComparison,
  yearComparisonCopyKey,
} from '../../chronologio/yearPresentation';
import { isMeaningfulHighlight } from '../../chronologio/monthPresentation';
import { formatGroveMassKg } from '../../utils/groveTotals';
import type { EventAccentToken } from '../../chronologio/eventCardLayout';

export type ChronologioPeekTarget =
  | { mode: 'event'; entry: ChronologioEntry }
  | {
      mode: 'month';
      summary: ChronologioMonthSummary;
      recent: ChronologioEntry[];
      loadingRecent?: boolean;
    }
  | {
      mode: 'year';
      summary: ChronologioPeriodSummary;
      previous?: ChronologioPeriodSummary;
      months: ChronologioMonthSummary[];
      previousMonths?: ChronologioMonthSummary[];
    }
  | {
      mode: 'monthWeather';
      year: number;
      month: number;
      reviews: ChronologioEntry[];
      loading?: boolean;
    }
  | {
      mode: 'dayWeather';
      dateKey: string;
      year: number;
      month: number;
      weather: DayWeatherInput | null;
      fieldId?: string;
      fieldName?: string;
      fieldColor?: string | null;
      events: ChronologioEntry[];
      sharedWeatherGrid?: boolean;
      relatedFieldNames?: string[];
    }
  | {
      mode: 'todayWeather';
      fields: TodayWeatherField[];
      primaryFieldId?: string;
      seed?: { fieldId: string; weather: FieldWeather };
    };

type FieldOption = { id: string; name: string };

type Props = {
  peek: ChronologioPeekTarget | null;
  numberLocale: string;
  weatherByDate?: Record<string, DayWeatherInput>;
  fieldOptions?: FieldOption[];
  onClose: () => void;
  onMutated?: () => void;
  onDrillToMonths?: (periodYear: number) => void;
  onDrillToDays?: (year: number, month: number) => void;
  onSelectRecent?: (entry: ChronologioEntry) => void;
};

const ChronologioPeekDrawer: React.FC<Props> = ({
  peek,
  numberLocale,
  weatherByDate,
  fieldOptions = [],
  onClose,
  onMutated,
  onDrillToMonths,
  onDrillToDays,
  onSelectRecent,
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'common', 'money', 'fields']);
  const { formatDate, formatTime } = useLocaleFormatters();
  const navigate = useNavigate();
  const location = useLocation();
  const capture = useCaptureOptional();
  const { user } = useAuth();
  const tt = (key: string, opts?: Record<string, string | number>) =>
    t(key, opts as Record<string, unknown>);

  const peekKey =
    peek?.mode === 'event'
      ? `event:${peek.entry.id}`
      : peek?.mode === 'month'
        ? `month:${peek.summary.key}`
        : peek?.mode === 'year'
          ? `year:${peek.summary.key}`
          : peek?.mode === 'monthWeather'
            ? `weather:${peek.year}-${peek.month}`
            : peek?.mode === 'dayWeather'
              ? `day:${peek.dateKey}`
              : peek?.mode === 'todayWeather'
                ? `today:${peek.primaryFieldId || peek.fields.map((f) => f.id).join(',')}`
                : '';

  const entry = peek?.mode === 'event' ? peek.entry : null;
  const kind = entry ? chronologioDetailKind(entry) : null;
  const caps = entry
    ? chronologioEntryCapabilities(entry, { userId: user?.userId, role: user?.role })
    : { canEdit: false, removeAction: null };
  const [notePinned, setNotePinned] = useState(Boolean(entry?.details.note?.pinned));
  const [pinBusy, setPinBusy] = useState(false);
  const [mutateBusy, setMutateBusy] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    setNotePinned(Boolean(entry?.details.note?.pinned));
  }, [entry?.details.note?.pinned, entry?.id]);

  const monthTitle = (m: ChronologioMonthSummary) =>
    new Date(Date.UTC(m.year, m.month - 1, 1)).toLocaleDateString(i18n.language, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

  const weatherMonthTitle =
    peek?.mode === 'monthWeather'
      ? new Date(Date.UTC(peek.year, peek.month - 1, 1)).toLocaleDateString(i18n.language, {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : '';

  const eventPresentation = entry ? presentChronologioEvent(entry, i18n.language) : null;
  const eventWhen = entry
    ? `${formatDate(entry.occurredAt)} · ${formatTime(entry.occurredAt)}`
    : '';

  const dayTitle =
    peek?.mode === 'dayWeather'
      ? (() => {
          const when = new Date(`${peek.dateKey}T12:00:00`);
          const weekday = when.toLocaleDateString(i18n.language, { weekday: 'long' });
          return `${weekday}, ${formatDate(when)}`;
        })()
      : '';

  const headerTitle =
    peek?.mode === 'event'
      ? eventPresentation?.label || peek.entry.title
      : peek?.mode === 'month'
        ? monthTitle(peek.summary)
        : peek?.mode === 'year'
          ? t('drawer.agriYear', { year: peek.summary.periodYear })
          : peek?.mode === 'monthWeather'
            ? weatherMonthTitle
            : peek?.mode === 'dayWeather'
              ? dayTitle
              : peek?.mode === 'todayWeather'
                ? t('weatherPeek.title')
                : '';

  const categoryLabel =
    peek?.mode === 'event'
      ? kind === 'warning'
        ? t('drawer.warning')
        : presentCategory(peek.entry.category, i18n.language)
      : peek?.mode === 'month'
        ? t('living.peekMonth')
        : peek?.mode === 'year'
          ? t('living.peekYear')
          : peek?.mode === 'monthWeather'
            ? t('living.peekMonthWeather')
            : peek?.mode === 'dayWeather'
              ? t('drawer.dailyWeather')
              : peek?.mode === 'todayWeather'
                ? t('weatherPeek.kicker')
                : '';

  const accent: EventAccentToken =
    peek?.mode === 'event'
      ? detailAccentToken(peek.entry)
      : peek?.mode === 'monthWeather' || peek?.mode === 'dayWeather' || peek?.mode === 'todayWeather'
        ? 'weather'
        : 'field_change';

  const categoryIcon =
    peek?.mode === 'event' ? (
      <ChronologioCategoryIcon category={kind === 'warning' ? 'warning' : peek.entry.category} size={18} />
    ) : peek?.mode === 'monthWeather' || peek?.mode === 'dayWeather' || peek?.mode === 'todayWeather' ? (
      <CloudRain size={18} />
    ) : (
      <CalendarDays size={18} />
    );

  const fieldName =
    peek?.mode === 'event'
      ? peek.entry.field?.name
      : peek?.mode === 'dayWeather'
        ? peek.fieldName
        : undefined;
  const fieldColor =
    peek?.mode === 'event'
      ? resolveFieldColor(peek.entry.field?.color, peek.entry.fieldId)
      : peek?.mode === 'dayWeather'
        ? peek.fieldColor || undefined
        : undefined;

  const notifyMutated = () => {
    window.dispatchEvent(new CustomEvent(CAPTURE_SAVED_EVENT));
    onMutated?.();
  };

  const openDestination = () => {
    if (!entry) return;
    const dest = chronologioWebDestination(entry);
    if (dest.kind === 'path') {
      const focus = readChronologioFocus();
      const scrollKey = focus
        ? chronologioScrollKey({
            zoom: focus.zoom,
            focusDate: focus.focusDate,
            fieldId: focus.fieldId,
          })
        : null;
      const returnState: ChronologioReturnState = {
        search: location.search,
        scrollTop: scrollKey ? readChronologioJournalScroll(scrollKey) ?? undefined : undefined,
        focusDate: focus?.focusDate,
        zoom: focus?.zoom,
      };
      navigate(dest.path, { state: { chronologioReturn: returnState } });
      return;
    }
    if (dest.kind === 'noteEdit') {
      void openNoteEditor(dest.noteId, dest.fieldId);
    }
  };

  const openNoteEditor = async (noteId: string, fieldId: string) => {
    try {
      const notes = await getNoteService().getNotes({ fieldId: fieldId || undefined });
      const note = notes.find((n) => n.id === noteId);
      if (note) setEditingNote(note);
    } catch {
      // keep peek open
    }
  };

  const addNote = () => {
    if (!entry) return;
    capture?.openCapture({
      preferredType: 'observation',
      fieldId: entry.fieldId,
      taskId: entry.details.task?.taskId,
    });
  };

  const createTaskFromNote = () => {
    if (!entry) return;
    navigate(taskFormPath({ fieldId: entry.fieldId }));
  };

  const togglePin = async () => {
    if (!entry) return;
    const id = chronologioNoteId(entry);
    if (!id) return;
    setPinBusy(true);
    try {
      const notes = await getNoteService().getNotes({ fieldId: entry.fieldId || undefined });
      const note = notes.find((n) => n.id === id);
      if (!note?.body) return;
      const next = await getNoteService().updateNote(id, {
        body: note.body,
        fieldId: note.fieldId,
        pinned: !notePinned,
      });
      setNotePinned(next.pinned);
      notifyMutated();
    } catch {
      // keep current pin state
    } finally {
      setPinBusy(false);
    }
  };

  const removeEntry = async () => {
    if (!entry || !caps.removeAction) return;
    const action = caps.removeAction;
    const confirmKey =
      action === 'cancel'
        ? 'drawer.cancelConfirm'
        : action === 'void'
          ? 'drawer.voidConfirm'
          : 'drawer.deleteConfirm';
    if (!window.confirm(t(confirmKey, { defaultValue: t('common:delete') }))) return;

    setMutateBusy(true);
    try {
      if (action === 'delete' && (entry.sourceType === 'Note' || entry.category === 'note')) {
        const id = chronologioNoteId(entry);
        if (id) await getNoteService().deleteNote(id);
      } else if (action === 'delete' && (entry.sourceType === 'Photo' || entry.category === 'photo')) {
        const id = chronologioPhotoId(entry);
        if (id) await getPhotoService().delete(id);
      } else if (action === 'void' && kind === 'money') {
        const id = chronologioMoneyTxId(entry);
        if (id) {
          const tx = await getFinancialTransactionService().getById(id);
          if (tx.status === 'draft') await getFinancialTransactionService().deleteDraft(id);
          else if (tx.status === 'posted') {
            await getFinancialTransactionService().void(id, t('money:voidReasonPrompt'));
          }
        }
      } else if (action === 'void' && kind === 'harvest') {
        const id = chronologioHarvestId(entry);
        if (id) await getHarvestService().void(id, t('drawer.voidConfirm'));
      } else if (action === 'cancel' && kind === 'task') {
        const id = chronologioTaskId(entry);
        if (id) await getFieldWorkService().cancelFieldTask(id);
      }
      notifyMutated();
      onClose();
    } catch {
      window.alert(t('drawer.mutateFailed', { defaultValue: 'Could not update that record.' }));
    } finally {
      setMutateBusy(false);
    }
  };

  const removeLabel =
    caps.removeAction === 'cancel'
      ? t('drawer.cancelTask', { defaultValue: t('common:cancel') })
      : caps.removeAction === 'void'
        ? t('drawer.voidEntry', { defaultValue: t('drawer.void', { defaultValue: 'Void entry' }) })
        : t('common:delete');

  const taskCompleted =
    kind === 'task' &&
    (entry?.details.task?.status === 'Completed' ||
      entry?.details.task?.status === 'completed' ||
      entry?.details.task?.status === 'Done');

  const mutateButtons =
    entry && (caps.canEdit || caps.removeAction) ? (
      <>
        {caps.canEdit && kind !== 'task' && kind !== 'observation' ? (
          <Button
            variant="outline"
            icon={<Pencil size={14} />}
            disabled={mutateBusy}
            onClick={openDestination}
          >
            {t('common:edit')}
          </Button>
        ) : null}
        {caps.removeAction && kind !== 'observation' && !(kind === 'task' && taskCompleted) ? (
          <Button
            variant="ghost"
            icon={<Trash2 size={14} />}
            disabled={mutateBusy}
            onClick={() => void removeEntry()}
          >
            {removeLabel}
          </Button>
        ) : null}
      </>
    ) : null;

  const footer = (() => {
    if (peek?.mode === 'event' && kind === 'task') {
      return (
        <>
          <Button variant="primary" icon={<ExternalLink size={14} />} onClick={openDestination}>
            {t('drawer.viewFullTask', { defaultValue: t('living.openTask') })}
          </Button>
          {caps.canEdit ? (
            <Button variant="outline" icon={<Pencil size={14} />} disabled={mutateBusy} onClick={openDestination}>
              {t('drawer.correctRecord', { defaultValue: t('common:edit') })}
            </Button>
          ) : null}
          {capture ? (
            <Button variant="outline" onClick={addNote}>
              {t('drawer.addNote')}
            </Button>
          ) : null}
          {caps.removeAction && !taskCompleted ? (
            <Button
              variant="ghost"
              icon={<Trash2 size={14} />}
              disabled={mutateBusy}
              onClick={() => void removeEntry()}
            >
              {removeLabel}
            </Button>
          ) : null}
        </>
      );
    }
    if (peek?.mode === 'event' && entry?.sourceType === 'Photo') {
      return (
        <>
          <Button variant="primary" icon={<ExternalLink size={14} />} onClick={openDestination}>
            {t('drawer.openPhoto', { defaultValue: 'Open photo' })}
          </Button>
          {mutateButtons}
        </>
      );
    }
    if (peek?.mode === 'event' && kind === 'observation') {
      return (
        <>
          <Button variant="primary" onClick={createTaskFromNote}>
            {t('drawer.createTask')}
          </Button>
          {caps.canEdit ? (
            <Button variant="outline" icon={<Pencil size={14} />} disabled={mutateBusy} onClick={openDestination}>
              {t('common:edit')}
            </Button>
          ) : null}
          {caps.canEdit ? (
            <Button variant="outline" icon={<Pin size={14} />} onClick={() => void togglePin()} disabled={pinBusy}>
              {notePinned ? t('drawer.unpin') : t('drawer.pin')}
            </Button>
          ) : null}
          {caps.removeAction ? (
            <details className="chrono-drawer-advanced">
              <summary>{t('drawer.advanced', { defaultValue: 'Advanced' })}</summary>
              <Button
                variant="ghost"
                icon={<Trash2 size={14} />}
                disabled={mutateBusy}
                onClick={() => void removeEntry()}
              >
                {removeLabel}
              </Button>
            </details>
          ) : null}
        </>
      );
    }
    if (peek?.mode === 'event' && kind === 'money') {
      return (
        <>
          <Button variant="primary" icon={<ExternalLink size={14} />} onClick={openDestination}>
            {t('drawer.openMoney')}
          </Button>
          {mutateButtons}
        </>
      );
    }
    if (peek?.mode === 'event' && kind === 'harvest') {
      return (
        <>
          <Button variant="primary" icon={<ExternalLink size={14} />} onClick={openDestination}>
            {t('living.openHarvest')}
          </Button>
          {mutateButtons}
        </>
      );
    }
    if (peek?.mode === 'event' && kind === 'weatherPeriod') {
      return (
        <Button variant="outline" icon={<ExternalLink size={14} />} onClick={openDestination}>
          {t('weatherReview.openMap')}
        </Button>
      );
    }
    if (peek?.mode === 'event' && kind === 'warning' && entry?.details.intelligence?.relatedSourceIds?.[0]) {
      const related = entry.details.intelligence.relatedSourceIds[0];
      return (
        <Button variant="primary" onClick={() => navigate(taskPeekPath(related))}>
          {t('living.openTask')}
        </Button>
      );
    }
    if (peek?.mode === 'dayWeather' && peek.fieldId) {
      return (
        <Button variant="outline" icon={<ExternalLink size={14} />} onClick={() => navigate(`/fields/${peek.fieldId}/weather`)}>
          {t('weatherReview.openCharts')}
        </Button>
      );
    }
    if (peek?.mode === 'todayWeather' && (peek.primaryFieldId || peek.fields[0]?.id)) {
      const fieldId = peek.primaryFieldId || peek.fields[0].id;
      return (
        <Button variant="outline" icon={<ExternalLink size={14} />} onClick={() => navigate(`/fields/${fieldId}/weather`)}>
          {t('weatherReview.openCharts')}
        </Button>
      );
    }
    if (peek?.mode === 'month') {
      return (
        <Button
          variant="primary"
          icon={<ChevronRight size={14} />}
          onClick={() => onDrillToDays?.(peek.summary.year, peek.summary.month)}
        >
          {t('living.drillToDays', { month: monthTitle(peek.summary) })}
        </Button>
      );
    }
    if (peek?.mode === 'year') {
      return (
        <Button
          variant="primary"
          icon={<ChevronRight size={14} />}
          onClick={() => onDrillToMonths?.(peek.summary.periodYear)}
        >
          {t('living.drillToMonths', { year: peek.summary.periodYear })}
        </Button>
      );
    }
    return null;
  })();

  const eventDayWeather =
    entry && weatherByDate ? weatherByDate[dayWeatherDateKey(entry.occurredAt)] || null : null;

  return (
    <>
    <ChronologioDetailShell
      open={Boolean(peek)}
      onClose={onClose}
      resetKey={peekKey}
      title={headerTitle}
      categoryLabel={categoryLabel}
      categoryIcon={categoryIcon}
      accent={accent}
      when={
        peek?.mode === 'event'
          ? eventWhen
          : peek?.mode === 'month'
            ? `${peek.summary.from} – ${peek.summary.to}`
            : peek?.mode === 'year'
              ? agriculturalYearRangeLabel(peek.summary.periodYear, i18n.language)
              : peek?.mode === 'monthWeather'
                ? weatherMonthTitle
                : peek?.mode === 'dayWeather'
                  ? dayTitle
                  : peek?.mode === 'todayWeather'
                    ? (() => {
                        const when = new Date();
                        const weekday = when.toLocaleDateString(i18n.language, { weekday: 'long' });
                        return `${weekday}, ${formatDate(when)}`;
                      })()
                    : undefined
      }
      fieldName={fieldName}
      fieldColor={fieldColor}
      footer={footer}
    >
      {peek?.mode === 'event' ? (
        <ChronologioEventDetail
          entry={peek.entry}
          numberLocale={numberLocale}
          dayWeather={eventDayWeather}
        />
      ) : null}

      {peek?.mode === 'dayWeather' ? (
        <ChronologioDayWeatherDetail
          dateKey={peek.dateKey}
          weather={peek.weather}
          events={peek.events}
          numberLocale={numberLocale}
          sharedWeatherGrid={peek.sharedWeatherGrid}
          relatedFieldNames={peek.relatedFieldNames}
          onSelectEvent={onSelectRecent}
        />
      ) : null}

      {peek?.mode === 'todayWeather' ? (
        <ChronologioTodayWeatherDetail
          fields={peek.fields}
          primaryFieldId={peek.primaryFieldId}
          seed={peek.seed}
        />
      ) : null}

      {peek?.mode === 'month' ? (
        <>
          <ul className="chrono-year-metrics chrono-peek-metrics">
            {yearFixedMetrics(peek.summary, numberLocale, tt).map((m) => (
              <li key={m.label}>
                <span className="chrono-metric-value">{m.value}</span>
                <span className="chrono-metric-label">{m.label}</span>
              </li>
            ))}
          </ul>
          <section className="chrono-peek-section">
            <h3>{t('monthView.harvest')}</h3>
            {harvestHasResult(peek.summary) ? (
              <p>
                {`${formatGroveMassKg(peek.summary.oliveKg, numberLocale)} ${t('olivesUnit')}`}
                {peek.summary.oilKg > 0
                  ? ` · ${formatGroveMassKg(peek.summary.oilKg, numberLocale)} ${t('oilUnit')}`
                  : ''}
              </p>
            ) : (
              <p className="chrono-peek-sub">
                {peek.summary.harvestCount > 0 ? t('monthView.harvestNoResult') : t('monthView.harvestNotStarted')}
              </p>
            )}
          </section>
          {monthChapterFacts(peek.summary, numberLocale, tt).length > 0 ? (
            <p className="chrono-peek-facts">
              {monthChapterFacts(peek.summary, numberLocale, tt).join(' · ')}
            </p>
          ) : (
            <p className="chrono-year-empty-hint">{t('living.emptyPeriod')}</p>
          )}
          {weatherFactBits(peek.summary, tt).length > 0 ? (
            <section className="chrono-peek-section">
              <h3>{t('living.peekWeather')}</h3>
              <p>{weatherFactBits(peek.summary, tt).join(' · ')}</p>
              {peek.summary.temperatureMax != null || peek.summary.temperatureMin != null ? (
                <p className="chrono-peek-sub">
                  {peek.summary.temperatureMin != null
                    ? `${Math.round(peek.summary.temperatureMin)}°`
                    : '—'}
                  {' – '}
                  {peek.summary.temperatureMax != null
                    ? `${Math.round(peek.summary.temperatureMax)}°`
                    : '—'}
                </p>
              ) : null}
            </section>
          ) : null}
          {(peek.summary.highlightTitles?.length || peek.summary.observationHighlight) && (
            <section className="chrono-peek-section">
              <h3>{t('living.peekHighlights')}</h3>
              <p>
                {(peek.summary.highlightTitles || []).filter(Boolean).slice(0, 2).join(' · ') ||
                  peek.summary.observationHighlight}
              </p>
              {peek.summary.observationHighlight && peek.summary.highlightTitles?.length ? (
                <p className="chrono-peek-sub">{peek.summary.observationHighlight}</p>
              ) : null}
            </section>
          )}
          <section className="chrono-peek-section">
            <h3>{t('living.peekRecent')}</h3>
            {peek.loadingRecent ? (
              <p className="chrono-peek-sub">{t('living.loadingOlder')}</p>
            ) : peek.recent.length === 0 ? (
              <p className="chrono-peek-sub">{t('living.emptyPeriod')}</p>
            ) : (
              <ul className="chrono-peek-recent">
                {peek.recent.slice(0, 5).map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className="chrono-peek-recent-btn"
                      onClick={() => onSelectRecent?.(e)}
                    >
                      <span className="chrono-peek-recent-title">{e.title}</span>
                      <span className="chrono-peek-recent-when">
                        {formatDate(e.occurredAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {peek?.mode === 'year' ? (
        <>
          {(() => {
            const comparison = yearComparison(peek.summary, peek.previous, {
              currentMonths: peek.months,
              previousMonths: peek.previousMonths,
            });
            const harvestKey = harvestYearCopyKey(peek.summary);
            return (
              <section className="chrono-drawer-hero">
                <h3>
                  {comparison
                    ? t(yearComparisonCopyKey(comparison), {
                        context: comparison.scope === 'ytd' ? 'ytd' : undefined,
                        pct: Math.abs(comparison.percent).toLocaleString(numberLocale),
                        year: comparison.previousYear,
                      })
                    : harvestKey === 'result'
                      ? t('yearView.mainResult')
                      : harvestKey === 'noResult'
                        ? t('monthView.harvestNoResult')
                        : t('yearView.harvestNotStarted')}
                </h3>
              </section>
            );
          })()}
          <ul className="chrono-year-metrics chrono-peek-metrics">
            {yearFixedMetrics(peek.summary, numberLocale, tt).map((m) => (
              <li key={m.label}>
                <span className="chrono-metric-value">{m.value}</span>
                <span className="chrono-metric-label">{m.label}</span>
              </li>
            ))}
          </ul>
          <section className="chrono-peek-section">
            <h3>{t('monthView.harvest')}</h3>
            {harvestYearCopyKey(peek.summary) === 'result' && harvestHasResult(peek.summary) ? (
              <p>
                {`${formatGroveMassKg(peek.summary.oliveKg, numberLocale)} ${t('olivesUnit')}`}
                {peek.summary.oilKg > 0
                  ? ` · ${formatGroveMassKg(peek.summary.oilKg, numberLocale)} ${t('oilUnit')}`
                  : ''}
              </p>
            ) : (
              <p className="chrono-peek-sub">
                {harvestYearCopyKey(peek.summary) === 'noResult'
                  ? t('monthView.harvestNoResult')
                  : t('yearView.harvestNotStarted')}
              </p>
            )}
          </section>
          {weatherFactBits(peek.summary, tt).length > 0 ? (
            <section className="chrono-peek-section">
              <h3>{t('living.peekWeather')}</h3>
              <p>{weatherFactBits(peek.summary, tt).join(' · ')}</p>
            </section>
          ) : null}
          {(peek.summary.highlightTitles || []).filter(isMeaningfulHighlight).length > 0 ? (
            <section className="chrono-peek-section">
              <h3>{t('living.peekHighlights')}</h3>
              <p>{(peek.summary.highlightTitles || []).filter(isMeaningfulHighlight).slice(0, 3).join(' · ')}</p>
            </section>
          ) : null}
          <section className="chrono-peek-section">
            <h3>{t('living.peekMajorMonths')}</h3>
            {majorMonthsForYear(peek.months).length === 0 ? (
              <p className="chrono-peek-sub">{t('living.emptyPeriod')}</p>
            ) : (
              <ul className="chrono-peek-recent">
                {majorMonthsForYear(peek.months).map((m) => (
                  <li key={m.key}>
                    <button
                      type="button"
                      className="chrono-peek-recent-btn"
                      onClick={() => onDrillToDays?.(m.year, m.month)}
                    >
                      <span className="chrono-peek-recent-title">{monthTitle(m)}</span>
                      <span className="chrono-peek-recent-when">
                        {t('living.monthWorks', { count: periodEventCount(m) })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {peek?.mode === 'monthWeather' ? (
        <div className="chrono-month-weather-list">
          {peek.loading ? (
            <p className="chrono-peek-sub">{t('living.loadingOlder')}</p>
          ) : peek.reviews.length === 0 ? (
            <p className="chrono-peek-sub">{t('living.emptyMonthWeather')}</p>
          ) : (
            peek.reviews.map((review) => {
              const w = review.details.weather;
              if (!w) return null;
              const fieldAccent = resolveFieldColor(review.field?.color, review.fieldId);
              const mood = resolveWeatherMood(w);
              return (
                <article
                  key={review.id}
                  className="chrono-month-weather-block"
                  style={
                    {
                      ['--accent-color' as string]: fieldAccent,
                      ['--accent-secondary' as string]: WEATHER_MOOD_COLORS[mood],
                    } as React.CSSProperties
                  }
                  onClick={() => onSelectRecent?.(review)}
                >
                  {review.field?.name ? (
                    <p className="chrono-drawer-field">
                      <span
                        className="chrono-drawer-field-dot"
                        style={fieldAccent ? { background: fieldAccent } : undefined}
                        aria-hidden
                      />
                      <span>{review.field.name}</span>
                    </p>
                  ) : null}
                  <WeatherMonthSnapshot
                    weather={w}
                    eventType={review.eventType}
                    numberLocale={numberLocale}
                    locale={i18n.language}
                    fieldId={review.fieldId}
                    variant="hero"
                  />
                </article>
              );
            })
          )}
        </div>
      ) : null}
    </ChronologioDetailShell>
    <NoteSheet
      open={Boolean(editingNote)}
      note={editingNote || undefined}
      fields={fieldOptions}
      onClose={() => setEditingNote(null)}
      onChanged={async () => {
        setEditingNote(null);
        notifyMutated();
        onClose();
      }}
    />
    </>
  );
};

export default ChronologioPeekDrawer;
