import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, BookOpen, Wallet } from 'lucide-react';
import PageContainer from '../components/Common/PageContainer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { useHarvestCampaign } from '../context/HarvestCampaignContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useLocale } from '../context/LocaleProvider';
import { useAuth } from '../context/AuthContext';
import { useModulePageGuard } from '../hooks/useModulePageGuard';
import {
  getFieldService,
  getHarvestService,
} from '../services/serviceFactory';
import type { Field } from '../services/fieldService';
import type { HarvestRecord } from '../services/harvestService';
import { CAPTURE_SAVED_EVENT, type CaptureSavedDetail } from '../capture/types';
import { formatSeasonLabel as seasonName } from '../utils/harvestSeason';
import { athensCalendarDateKey } from '../utils/athensDate';
import { formatGroveMassKg } from '../utils/groveTotals';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { formatFieldArea } from '../utils/fieldGeo';
import {
  addExpense,
  addMillWeight,
  addNote,
  addOil,
  addPeople,
  addSack,
  closeHarvestDay,
  linkSacksToMill,
  newHarvestEntryId,
  removeMillWeight,
  removeOil,
  removePeople,
  removeSack,
  unconfirmedSacks,
  updateMillWeight,
  updateOil,
  updatePeople,
  updateSack,
} from '../harvestCampaign/storage';
import {
  formatDaySpan,
  harvestChainStatus,
} from '../harvestCampaign/chain';
import {
  persistMillRecord,
  persistOilRecord,
  persistPeopleRecord,
  persistSackRecord,
} from '../harvestCampaign/persist';
import { allDaySummaries, campaignTotals, daySummary, harvestDayNumber, oilAmountToKg } from '../harvestCampaign/totals';
import type { HarvestCaptureKind, HarvestFieldShare, HarvestModeView } from '../harvestCampaign/types';
import { harvestEveningNudge } from '../harvestCampaign/eveningNudge';
import { harvestExpenseCaptureContext, harvestNoteCaptureContext, shouldMirrorHarvestExpense, shouldMirrorHarvestNote } from '../harvestCampaign/harvestMoneyCapture';
import {
  clampHarvestWorkingDay,
  campaignStartDay,
  harvestDayStripRows,
  shiftHarvestWorkingDay,
} from '../harvestCampaign/workingDay';
import HarvestDayStrip from '../harvestCampaign/HarvestDayStrip';
import {
  HarvestAddMenu,
  HarvestCompleteSheet,
  HarvestEveningSheet,
  HarvestMillLinkSheet,
  HarvestMillNextSheet,
  HarvestMillSheet,
  HarvestOilSheet,
  HarvestPeopleSheet,
  HarvestSacksSheet,
  HarvestSheetFrame,
  HarvestRecordSheet,
  type HarvestSheetKind,
} from '../harvestCampaign/HarvestSheets';
import { HARVEST_ACTION_ICONS } from '../harvestCampaign/harvestActions';
import { HarvestFlowView } from '../harvestCampaign/components/HarvestFlowView';
import {
  HarvestDayActivity,
  type DayActivityEditTarget,
  type DayActivityKind,
} from '../harvestCampaign/components/HarvestDayActivity';
import './HarvestCampaignPage.css';

const HarvestCampaignPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common', 'capture', 'chronologio']);
  const { locale } = useLocale();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageGuard = useModulePageGuard({ module: 'harvest' });
  const { campaign, seasonStartYear, isLive, isActive, start, stop, pause, resume, markGroveDone, patch } =
    useHarvestCampaign();
  const moneyCapture = useCaptureOptional();

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Field[]>([]);
  const [setupStep, setSetupStep] = useState<0 | 1 | 2>(0);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [view, setView] = useState<HarvestModeView>('today');
  const [sheet, setSheet] = useState<HarvestSheetKind>(null);
  const [saving, setSaving] = useState(false);
  const [doneBanner, setDoneBanner] = useState(false);
  const [openLogDate, setOpenLogDate] = useState<string | null>(null);
  const [reviewDate, setReviewDate] = useState<string | null>(null);
  const [linkMillId, setLinkMillId] = useState<string | null>(null);
  const [linkMillFieldIds, setLinkMillFieldIds] = useState<string[]>([]);
  const [prefillSackIds, setPrefillSackIds] = useState<string[]>([]);
  const [prefillMillIds, setPrefillMillIds] = useState<string[]>([]);
  const [postMillId, setPostMillId] = useState<string | null>(null);
  const [sackSavedHint, setSackSavedHint] = useState<string | null>(null);
  const [deepLinkRecord, setDeepLinkRecord] = useState<HarvestRecord | null>(null);
  const [voidBusy, setVoidBusy] = useState(false);
  const [editTarget, setEditTarget] = useState<DayActivityEditTarget | null>(null);
  const [selectedDay, setSelectedDayState] = useState(() => athensCalendarDateKey(new Date()));

  const today = athensCalendarDateKey(new Date());
  const areaLocale = locale.startsWith('el') ? 'el' : locale.startsWith('it') ? 'it' : 'en';
  const workingDay = clampHarvestWorkingDay(selectedDay, campaign, today);
  const startDay = campaignStartDay(campaign, today);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const groveList = await getFieldService().getFields().catch(() => [] as Field[]);
      setFields(groveList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const harvestableFields = useMemo(() => {
    const usable = fields.filter((field) => field.status !== 'Draft' && field.status !== 'Archived');
    return usable.length > 0 ? usable : fields.filter((field) => field.status !== 'Archived');
  }, [fields]);

  useEffect(() => {
    if (setupStep !== 1) return;
    const allowed = new Set(harvestableFields.map((field) => field.id));
    const previous = campaign.fieldOrder.filter((id) => allowed.has(id));
    setPickedIds(previous.length ? previous : harvestableFields.map((field) => field.id));
  }, [setupStep, harvestableFields, campaign.fieldOrder]);

  const selectedFields = useMemo(() => {
    const order = campaign.fieldOrder.length ? campaign.fieldOrder : harvestableFields.map((f) => f.id);
    return order.map((id) => harvestableFields.find((field) => field.id === id)).filter((field): field is Field => Boolean(field));
  }, [campaign.fieldOrder, harvestableFields]);

  const sheetFields = selectedFields.length ? selectedFields : harvestableFields;
  const totals = useMemo(() => campaignTotals(campaign), [campaign]);
  const activeRow = useMemo(() => daySummary(campaign, workingDay), [campaign, workingDay]);
  const days = harvestDayNumber(campaign, workingDay);
  const stripRows = useMemo(() => harvestDayStripRows(campaign, today), [campaign, today]);
  const canPrevDay = workingDay > startDay;
  const canNextDay = workingDay < today;
  const logs = useMemo(() => allDaySummaries(campaign), [campaign]);
  const eveningNudge = useMemo(() => harvestEveningNudge(campaign, today), [campaign, today]);
  const chainStatus = useMemo(() => harvestChainStatus(campaign), [campaign]);
  const reviewRow = useMemo(
    () => daySummary(campaign, reviewDate || eveningNudge?.date || workingDay),
    [campaign, reviewDate, eveningNudge, workingDay]
  );

  const setSelectedDay = useCallback(
    (next: string, syncUrl = true) => {
      const clamped = clampHarvestWorkingDay(next, campaign, today);
      setSelectedDayState(clamped);
      if (!syncUrl) return;
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (clamped === today) p.delete('day');
          else p.set('day', clamped);
          return p;
        },
        { replace: true }
      );
    },
    [campaign, setSearchParams, today]
  );

  useEffect(() => {
    const fromUrl = searchParams.get('day');
    if (!fromUrl) {
      setSelectedDayState((prev) => clampHarvestWorkingDay(prev, campaign, today));
      return;
    }
    const clamped = clampHarvestWorkingDay(fromUrl, campaign, today);
    setSelectedDayState(clamped);
    if (clamped !== fromUrl) {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (clamped === today) p.delete('day');
          else p.set('day', clamped);
          return p;
        },
        { replace: true }
      );
    }
  }, [campaign, searchParams, setSearchParams, today]);

  useEffect(() => {
    if (!isLive) return;
    const add = searchParams.get('add');
    const evening = searchParams.get('evening');
    if (!add && !evening) return;
    setView('today');
    if (add === '1') setSheet('add');
    if (evening) {
      const eveningDay =
        evening === '1' ? eveningNudge?.date || today : clampHarvestWorkingDay(evening, campaign, today);
      setSelectedDay(eveningDay);
      setReviewDate(eveningDay);
      setSheet('evening');
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('add');
        next.delete('evening');
        return next;
      },
      { replace: true }
    );
  }, [campaign, isLive, searchParams, setSearchParams, setSelectedDay, eveningNudge, today]);

  useEffect(() => {
    const harvestId = searchParams.get('harvestId');
    const fieldId = searchParams.get('fieldId');
    if (!harvestId || !fieldId) {
      setDeepLinkRecord(null);
      return;
    }
    let cancelled = false;
    void getHarvestService()
      .listByField(fieldId)
      .then((rows) => {
        if (cancelled) return;
        const hit = rows.find((row) => row.id === harvestId) || null;
        setDeepLinkRecord(hit);
      })
      .catch(() => {
        if (!cancelled) setDeepLinkRecord(null);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const labelOf = (id: string) => friendlyFieldLabel(harvestableFields.find((f) => f.id === id)?.name || id);

  const beginHarvest = () => {
    start({ fieldOrder: pickedIds });
    setSetupStep(0);
    setView('today');
  };

  const closeSheet = () => {
    setSheet(null);
    setLinkMillId(null);
    setLinkMillFieldIds([]);
    setPrefillSackIds([]);
    setPrefillMillIds([]);
    setPostMillId(null);
    setEditTarget(null);
  };

  const openMillCapture = (sackIds?: string[]) => {
    setPrefillMillIds([]);
    setPrefillSackIds(sackIds || []);
    setSheet('mill');
  };

  const openOilCapture = (millIds?: string[]) => {
    setPrefillSackIds([]);
    setPrefillMillIds(millIds || []);
    setSheet('oil');
  };

  const openHarvestExpense = () => {
    closeSheet();
    moneyCapture?.openCapture(
      harvestExpenseCaptureContext({
        campaign,
        fieldId: campaign.fieldOrder[0] || harvestableFields[0]?.id,
        today: workingDay,
        description: t('harvestCampaign.expense.moneyDescription'),
      })
    );
  };

  const openHarvestNote = () => {
    closeSheet();
    moneyCapture?.openCapture(
      harvestNoteCaptureContext({
        campaign,
        fieldId: campaign.fieldOrder[0] || harvestableFields[0]?.id,
        today: workingDay,
      })
    );
  };

  const openCapture = (kind: HarvestCaptureKind) => {
    setEditTarget(null);
    if (kind === 'expense') {
      openHarvestExpense();
      return;
    }
    if (kind === 'note') {
      openHarvestNote();
      return;
    }
    if (kind === 'mill') {
      openMillCapture();
      return;
    }
    if (kind === 'oil') {
      openOilCapture();
      return;
    }
    setPrefillSackIds([]);
    setPrefillMillIds([]);
    setSheet(kind);
  };

  const openDayAdd = (kind: DayActivityKind) => {
    if (kind === 'sack') openCapture('sacks');
    else if (kind === 'mill') openCapture('mill');
    else if (kind === 'oil') openCapture('oil');
    else openCapture('people');
  };

  const openDayEdit = (target: DayActivityEditTarget) => {
    setEditTarget(target);
    setPrefillSackIds([]);
    setPrefillMillIds([]);
    if (target.kind === 'sack') setSheet('sacks');
    else if (target.kind === 'mill') setSheet('mill');
    else if (target.kind === 'oil') setSheet('oil');
    else setSheet('people');
  };

  const removeDayEntry = (target: DayActivityEditTarget) => {
    if (target.kind === 'sack') patch((current) => removeSack(current, target.entry.id));
    else if (target.kind === 'mill') patch((current) => removeMillWeight(current, target.entry.id));
    else if (target.kind === 'oil') patch((current) => removeOil(current, target.entry.id));
    else patch((current) => removePeople(current, target.entry.id));
  };

  const openEvening = (date = eveningNudge?.date || workingDay) => {
    const day = clampHarvestWorkingDay(date, campaign, today);
    setSelectedDay(day);
    setReviewDate(day);
    setSheet('evening');
  };

  const saveSacks = async (input: { sacks: number; fieldId: string; kgPerSack?: number }) => {
    setSaving(true);
    if (editTarget?.kind === 'sack') {
      patch((current) =>
        updateSack(current, editTarget.entry.id, {
          sacks: input.sacks,
          fieldId: input.fieldId,
          kgPerSack: input.kgPerSack,
        })
      );
      setSaving(false);
      closeSheet();
      return;
    }
    const entry = {
      id: newHarvestEntryId(),
      date: workingDay,
      fieldId: input.fieldId,
      sacks: input.sacks,
      kgPerSack: input.kgPerSack,
      createdAt: new Date().toISOString(),
    };
    const harvestRecordId = await persistSackRecord(campaign, entry);
    patch((current) => addSack(current, { ...entry, harvestRecordId }));
    setSaving(false);
    const otherPending = unconfirmedSacks(campaign).filter((s) => s.date < workingDay);
    const otherCount = otherPending.reduce((sum, s) => sum + s.sacks, 0);
    setSackSavedHint(
      otherCount > 0
        ? t('harvestCampaign.chain.sacksSavedPlus', { count: otherCount })
        : t('harvestCampaign.chain.sacksSaved')
    );
    window.setTimeout(() => setSackSavedHint(null), 4200);
    closeSheet();
  };

  const saveMill = async (input: {
    kg: number;
    fieldIds: string[];
    fieldShares?: HarvestFieldShare[];
    sackIds: string[];
    note?: string;
  }) => {
    setSaving(true);
    if (editTarget?.kind === 'mill') {
      patch((current) =>
        updateMillWeight(current, editTarget.entry.id, {
          date: editTarget.entry.date,
          kg: input.kg,
          fieldIds: input.fieldIds,
          fieldShares: input.fieldShares,
          sackIds: input.sackIds,
          note: input.note,
        })
      );
      setSaving(false);
      closeSheet();
      return;
    }
    const entry = {
      id: newHarvestEntryId(),
      date: workingDay,
      kg: input.kg,
      fieldIds: input.fieldIds,
      fieldShares: input.fieldShares,
      sackIds: input.sackIds,
      note: input.note,
      createdAt: new Date().toISOString(),
    };
    const persisted = await persistMillRecord(campaign, entry);
    patch((current) =>
      addMillWeight(current, {
        ...entry,
        batchId: persisted?.batchId,
        harvestRecordId: persisted?.harvestRecordId,
        harvestRecordIds: persisted?.harvestRecordIds,
      })
    );
    setSaving(false);
    setPrefillSackIds([]);
    setPostMillId(entry.id);
    setSheet('mill-next');
  };

  const saveMillLink = (sackIds: string[]) => {
    if (!linkMillId) {
      closeSheet();
      return;
    }
    patch((current) => linkSacksToMill(current, linkMillId, sackIds));
    setLinkMillFieldIds([]);
    setPostMillId(linkMillId);
    setSheet('mill-next');
  };

  const saveOil = async (input: {
    amount: number;
    unit: 'kg' | 'litres';
    millWeightIds: string[];
    fieldIds: string[];
    fieldShares?: HarvestFieldShare[];
    acidity?: number;
    note?: string;
  }) => {
    setSaving(true);
    if (editTarget?.kind === 'oil') {
      patch((current) =>
        updateOil(current, editTarget.entry.id, {
          amount: input.amount,
          unit: input.unit,
          millWeightIds: input.millWeightIds,
          fieldIds: input.fieldIds,
          fieldShares: input.fieldShares,
          acidity: input.acidity,
          note: input.note,
        })
      );
      setSaving(false);
      closeSheet();
      return;
    }
    const related = campaign.millWeights
      .filter((row) => input.millWeightIds.includes(row.id))
      .reduce((sum, row) => sum + row.kg, 0);
    const entry = {
      id: newHarvestEntryId(),
      date: workingDay,
      amount: input.amount,
      unit: input.unit,
      millWeightIds: input.millWeightIds,
      fieldIds: input.fieldIds,
      fieldShares: input.fieldShares,
      acidity: input.acidity,
      note: input.note,
      createdAt: new Date().toISOString(),
    };
    const persisted = await persistOilRecord(campaign, entry, related);
    patch((current) =>
      addOil(current, {
        ...entry,
        batchId: persisted?.batchId,
        harvestRecordId: persisted?.harvestRecordId,
        harvestRecordIds: persisted?.harvestRecordIds,
      })
    );
    setSaving(false);
    closeSheet();
  };

  const savePeople = async (input: {
    people: number;
    hours: 'half' | 'full' | 'other' | 'skip';
    otherHours?: number;
  }) => {
    setSaving(true);
    if (editTarget?.kind === 'people') {
      patch((current) =>
        updatePeople(current, editTarget.entry.id, {
          people: input.people,
          hours: input.hours,
          otherHours: input.otherHours,
        })
      );
      setSaving(false);
      closeSheet();
      return;
    }
    const entry = {
      id: newHarvestEntryId(),
      date: workingDay,
      people: input.people,
      hours: input.hours,
      otherHours: input.otherHours,
      createdAt: new Date().toISOString(),
    };
    const harvestRecordId = await persistPeopleRecord(campaign, entry);
    patch((current) => addPeople(current, { ...entry, harvestRecordId }));
    setSaving(false);
    closeSheet();
  };

  useEffect(() => {
    if (!isLive) return;
    const onSaved = (event: Event) => {
      const detail = (event as CustomEvent<CaptureSavedDetail>).detail;
      if (shouldMirrorHarvestExpense(detail)) {
        const amountEur = detail.amount;
        const transactionId = detail.sourceId;
        if (!transactionId || amountEur == null) return;
        patch((current) => {
          if (current.expenses.some((row) => row.transactionId === transactionId)) return current;
          return addExpense(current, {
            id: newHarvestEntryId(),
            date: detail.occurredOn || workingDay,
            amountEur,
            note: detail.description,
            transactionId,
            createdAt: new Date().toISOString(),
          });
        });
        return;
      }
      if (!shouldMirrorHarvestNote(detail) || !detail.sourceId) return;
      patch((current) => {
        if (current.notes.some((row) => row.noteId === detail.sourceId)) return current;
        return addNote(current, {
          id: newHarvestEntryId(),
          date: detail.occurredOn || workingDay,
          body: detail.description,
          noteId: detail.sourceId,
          createdAt: new Date().toISOString(),
        });
      });
    };
    window.addEventListener(CAPTURE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(CAPTURE_SAVED_EVENT, onSaved);
  }, [isLive, workingDay, patch]);

  const finishHarvest = () => {
    stop();
    setSheet(null);
    setDoneBanner(true);
  };

  if (loading && fields.length === 0) return <LoadingSpinner className="page-inline-loading" />;

  const sheetTitle =
    editTarget != null
      ? t('harvestCampaign.dayActivity.editTitle')
      : sheet === 'add'
        ? t('harvestCampaign.home.whatAdd')
        : sheet === 'mill-link'
          ? t('harvestCampaign.millKg.linkTitle')
          : sheet === 'mill-next'
            ? t('harvestCampaign.chain.millNextTitle')
            : sheet
              ? t(`harvestCampaign.sheetTitle.${sheet}`)
              : '';

  const sheetWorkingDayLabel = new Date(`${workingDay}T12:00:00`).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const sheetDayKicker =
    sheet && sheet !== 'complete'
      ? workingDay === today
        ? t('harvestCampaign.dayNav.today')
        : sheetWorkingDayLabel
      : undefined;
  const sheetSubtitle =
    sheet && sheet !== 'add' && sheet !== 'complete'
      ? t('harvestCampaign.home.day', { day: days })
      : undefined;
  const SheetIcon =
    sheet === 'sacks' || sheet === 'mill' || sheet === 'oil' || sheet === 'people'
      ? HARVEST_ACTION_ICONS[sheet]
      : null;

  if (pageGuard.loading) {
    return (
      <PageContainer>
        <LoadingSpinner />
      </PageContainer>
    );
  }
  if (!pageGuard.allowed) {
    return <Navigate to="/chronologio" replace />;
  }

  return (
    <PageContainer>
      <div className={`harvest-campaign${isLive ? ' is-mode' : ''}`}>
        {!isLive && setupStep === 0 ? (
          <header className="hc-hero">
            <p className="hc-kicker">{seasonName(seasonStartYear)}</p>
            <h1>{t('harvestCampaign.title')}</h1>
            <p className="hc-lead">{t('harvestCampaign.leadIdle')}</p>
            {doneBanner || campaign.status === 'closed' ? (
              <div className="hc-done-banner">
                <p>{t('harvestCampaign.complete.done')}</p>
                <div className="hc-hero-actions">
                  <Link to="/this-harvest/review" className="hc-start">
                    {t('harvestCampaign.complete.review')}
                  </Link>
                  <button type="button" className="hc-ghost" onClick={openHarvestNote}>
                    {t('harvestCampaign.complete.addNote')}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="hc-hero-actions">
              <button type="button" className="hc-start" onClick={() => setSetupStep(1)}>
                {t('harvestCampaign.start')}
              </button>
            </div>
          </header>
        ) : null}

        {!isLive && setupStep === 1 ? (
          <section className="hc-setup-card" aria-labelledby="hc-setup-title">
            <p className="hc-kicker">{t('harvestCampaign.setup.step', { step: 1 })}</p>
            <h2 id="hc-setup-title">{t('harvestCampaign.setupTitle')}</h2>
            {harvestableFields.length === 0 ? (
              <p className="hc-help">{t('harvestCampaign.noFields')}</p>
            ) : (
              <div className="hc-setup-cards">
                {harvestableFields.map((field) => {
                  const on = pickedIds.includes(field.id);
                  const variety = field.variety || field.oliveVariety;
                  const area = formatFieldArea(field, areaLocale);
                  return (
                    <button
                      key={field.id}
                      type="button"
                      className={`hc-setup-card-btn${on ? ' is-on' : ''}`}
                      onClick={() =>
                        setPickedIds((prev) =>
                          prev.includes(field.id) ? prev.filter((id) => id !== field.id) : [...prev, field.id]
                        )
                      }
                    >
                      <strong>{friendlyFieldLabel(field.name)}</strong>
                      <span>
                        {[variety, area].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="hc-hero-actions hc-setup-actions">
              <button
                type="button"
                className="hc-ghost"
                onClick={() => setPickedIds(harvestableFields.map((field) => field.id))}
              >
                {t('harvestCampaign.setup.selectAll')}
              </button>
              <button type="button" className="hc-start" onClick={() => setSetupStep(2)}>
                {t('common:continue', { defaultValue: 'Continue' })}
              </button>
              <button
                type="button"
                className="hc-ghost"
                onClick={() => {
                  setPickedIds([]);
                  setSetupStep(2);
                }}
              >
                {t('harvestCampaign.setup.later')}
              </button>
            </div>
          </section>
        ) : null}

        {!isLive && setupStep === 2 ? (
          <section className="hc-setup-card">
            <p className="hc-kicker">{t('harvestCampaign.setup.step', { step: 2 })}</p>
            <h2>{t('harvestCampaign.setup.startTitle')}</h2>
            <p className="hc-lead">{t('harvestCampaign.setup.startHint')}</p>
            <div className="hc-hero-actions hc-setup-actions">
              <button type="button" className="hc-start" onClick={beginHarvest}>
                {t('harvestCampaign.setup.confirmStart')}
              </button>
              <button type="button" className="hc-ghost" onClick={() => setSetupStep(1)}>
                {t('common:back')}
              </button>
            </div>
          </section>
        ) : null}

        {isLive ? (
          <>
            <section className="hc-live-chrome">
              <HarvestDayStrip
                selectedDay={workingDay}
                today={today}
                dayNumber={days}
                closed={activeRow.closed}
                stripRows={stripRows}
                canPrev={canPrevDay}
                canNext={canNextDay}
                locale={locale}
                onSelectDay={(day) => {
                  setSelectedDay(day);
                  if (view !== 'today') setView('today');
                }}
                onShift={(delta) => {
                  setSelectedDay(shiftHarvestWorkingDay(workingDay, delta, campaign, today));
                  if (view !== 'today') setView('today');
                }}
              />

              <nav className="hc-mode-nav hc-mode-nav-top" aria-label={t('harvestCampaign.nav.label')}>
                {(['today', 'fields', 'totals', 'log'] as const).map((item, index) => (
                  <React.Fragment key={item}>
                    {index === 2 ? (
                      <button
                        type="button"
                        className="hc-mode-plus"
                        onClick={() => setSheet('add')}
                        aria-label={t('harvestCampaign.home.whatAdd')}
                      >
                        <Plus size={22} aria-hidden />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`hc-mode-tab${view === item ? ' is-on' : ''}`}
                      onClick={() => setView(item)}
                    >
                      {t(`harvestCampaign.nav.${item}`)}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            </section>

            {view === 'today' ? (
              <section className="hc-live-home">
                {sackSavedHint ? (
                  <p className="hc-chain-toast" role="status">
                    {sackSavedHint}
                  </p>
                ) : null}

                {(chainStatus.pendingSackCount > 0 ||
                  chainStatus.millKgWithoutOil > 0 ||
                  chainStatus.latestCompleteYield != null) && (
                  <section className="hc-chain-card" aria-label={t('harvestCampaign.chain.cardLabel')}>
                    {chainStatus.pendingSackCount > 0 ? (
                      <button
                        type="button"
                        className="hc-chain-row"
                        onClick={() => openMillCapture(chainStatus.pendingSackIds)}
                      >
                        <strong>
                          {t('harvestCampaign.chain.openSacks', {
                            count: chainStatus.pendingSackCount,
                            span: formatDaySpan(chainStatus.pendingSackDays, locale),
                          })}
                        </strong>
                        <span>{t('harvestCampaign.chain.ctaMill')}</span>
                      </button>
                    ) : null}
                    {chainStatus.millKgWithoutOil > 0 ? (
                      <button
                        type="button"
                        className="hc-chain-row"
                        onClick={() =>
                          openOilCapture(chainStatus.millsWithoutOil.map((m) => m.id))
                        }
                      >
                        <strong>
                          {t('harvestCampaign.chain.openMill', {
                            kg: formatGroveMassKg(chainStatus.millKgWithoutOil, locale),
                            span: formatDaySpan(
                              chainStatus.millsWithoutOil.map((m) => m.date),
                              locale
                            ),
                          })}
                        </strong>
                        <span>{t('harvestCampaign.chain.ctaOil')}</span>
                      </button>
                    ) : null}
                    {chainStatus.pendingSackCount === 0 &&
                    chainStatus.millKgWithoutOil === 0 &&
                    chainStatus.latestCompleteYield != null ? (
                      <p className="hc-chain-complete">
                        {t('harvestCampaign.chain.latestYield', {
                          yield: Math.round(chainStatus.latestCompleteYield),
                        })}
                      </p>
                    ) : null}
                  </section>
                )}

                <section className={`hc-day-summary${eveningNudge && workingDay === today ? ' is-nudge' : ''}`}>
                  <header className="hc-day-summary-head">
                    <div>
                      <p className="hc-kicker">{t('harvestCampaign.nav.today')}</p>
                      <h2>
                        {workingDay === today
                          ? t('harvestCampaign.dayNav.today')
                          : new Date(`${workingDay}T12:00:00`).toLocaleDateString(locale, {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            })}
                      </h2>
                    </div>
                    <span className={`hc-status-pill${activeRow.closed ? ' is-closed' : ''}`}>
                      {activeRow.closed
                        ? t('harvestCampaign.today.closed')
                        : t('harvestCampaign.status.active')}
                    </span>
                  </header>

                  <div className="hc-day-metrics">
                    <article className="hc-day-metric">
                      <span>{t('harvestCampaign.actions.mill')}</span>
                      <strong>
                        {activeRow.officialKg > 0
                          ? `${formatGroveMassKg(activeRow.officialKg, locale)} kg`
                          : '—'}
                      </strong>
                    </article>
                    <article className="hc-day-metric">
                      <span>{t('harvestCampaign.sacks.unit')}</span>
                      <strong>{activeRow.sacks > 0 ? activeRow.sacks : '—'}</strong>
                      {activeRow.estimatedKg > 0 && activeRow.officialKg <= 0 ? (
                        <em>
                          {t('harvestCampaign.approx', {
                            kg: formatGroveMassKg(activeRow.estimatedKg, locale),
                          })}
                        </em>
                      ) : null}
                    </article>
                    <article className="hc-day-metric">
                      <span>{t('harvestCampaign.actions.oil')}</span>
                      <strong>
                        {activeRow.oilKg > 0
                          ? `${formatGroveMassKg(activeRow.oilKg, locale)} kg`
                          : '—'}
                      </strong>
                    </article>
                    <article className="hc-day-metric">
                      <span>{t('harvestCampaign.actions.people')}</span>
                      <strong>{activeRow.people > 0 ? activeRow.people : '—'}</strong>
                    </article>
                  </div>

                  {activeRow.fieldIds.length > 0 ? (
                    <p className="hc-day-fields">
                      {activeRow.fieldIds.map(labelOf).join(' · ')}
                    </p>
                  ) : (
                    <p className="hc-help">{t('harvestCampaign.today.empty')}</p>
                  )}

                  <ul className="hc-today-extra">
                    {activeRow.expenseEur > 0 ? (
                      <li className="hc-chip is-on">
                        {t('harvestCampaign.today.expense', { amount: activeRow.expenseEur })}
                      </li>
                    ) : null}
                    {activeRow.photos > 0 ? (
                      <li className="hc-chip is-on">
                        {t('harvestCampaign.today.photos', { count: activeRow.photos })}
                      </li>
                    ) : null}
                  </ul>

                  <div className="hc-hero-actions">
                    {eveningNudge && workingDay === today ? (
                      <button type="button" className="hc-start" onClick={() => openEvening(eveningNudge.date)}>
                        {eveningNudge.kind === 'yesterday'
                          ? t('harvestCampaign.nudge.yesterdayAction')
                          : t('harvestCampaign.today.close')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="hc-ghost"
                        onClick={() => openEvening(workingDay)}
                        disabled={activeRow.closed}
                      >
                        {activeRow.closed
                          ? t('harvestCampaign.today.closed')
                          : t('harvestCampaign.today.close')}
                      </button>
                    )}
                  </div>
                  {eveningNudge && workingDay === today ? (
                    <p className="hc-help hc-nudge-copy">
                      {eveningNudge.kind === 'yesterday'
                        ? t('harvestCampaign.nudge.yesterdayReason')
                        : t('harvestCampaign.nudge.todayReason')}
                    </p>
                  ) : null}
                </section>

                <HarvestDayActivity
                  campaign={campaign}
                  date={workingDay}
                  locale={locale}
                  labelOf={labelOf}
                  closed={activeRow.closed}
                  onEdit={openDayEdit}
                  onRemove={removeDayEntry}
                  onAdd={openDayAdd}
                />
              </section>
            ) : null}

            {view === 'totals' ? (
              <section className="hc-live-home">
                <header className="hc-panel-head">
                  <p className="hc-kicker">{t('harvestCampaign.nav.totals')}</p>
                  <h1 className="hc-page-title">
                    {totals.officialKg > 0
                      ? t('harvestCampaign.dashboard.official', {
                          kg: formatGroveMassKg(totals.officialKg, locale),
                        })
                      : t('harvestCampaign.dashboard.seasonTitle')}
                  </h1>
                  <p className="hc-help">{t('harvestCampaign.dashboard.seasonLead')}</p>
                </header>
                <div className="hc-stat-grid hc-stat-grid-filled">
                  <article className="hc-stat-card">
                    <span>{t('harvestCampaign.actions.mill')}</span>
                    <strong>
                      {totals.officialKg > 0
                        ? `${formatGroveMassKg(totals.officialKg, locale)} kg`
                        : '—'}
                    </strong>
                  </article>
                  <article className="hc-stat-card">
                    <span>{t('harvestCampaign.actions.oil')}</span>
                    <strong>
                      {totals.oilKg > 0
                        ? t('harvestCampaign.dashboard.oil', {
                            kg: formatGroveMassKg(totals.oilKg, locale),
                          })
                        : '—'}
                    </strong>
                  </article>
                  <article className="hc-stat-card">
                    <span>{t('harvestCampaign.dashboard.yieldLabel')}</span>
                    <strong>
                      {totals.extractionYield != null
                        ? t('harvestCampaign.dashboard.yield', {
                            yield: formatGroveMassKg(totals.extractionYield, locale),
                          })
                        : '—'}
                    </strong>
                  </article>
                  <article className="hc-stat-card">
                    <span>{t('harvestCampaign.nav.today')}</span>
                    <strong>
                      {t('harvestCampaign.dashboard.days', { count: totals.harvestDays || days })}
                    </strong>
                  </article>
                  <article className="hc-stat-card">
                    <span>{t('harvestCampaign.actions.people')}</span>
                    <strong>
                      {totals.personDays > 0
                        ? t('harvestCampaign.dashboard.personDays', { count: totals.personDays })
                        : '—'}
                    </strong>
                  </article>
                  <article className="hc-stat-card">
                    <span>{t('harvestCampaign.actions.expense')}</span>
                    <strong>
                      {totals.expenseEur > 0
                        ? t('harvestCampaign.dashboard.expense', { amount: totals.expenseEur })
                        : '—'}
                    </strong>
                  </article>
                </div>
                {totals.unweighedSacks > 0 || totals.millKgWithoutOil > 0 ? (
                  <div className="hc-pending-card">
                    <h2>{t('harvestCampaign.dashboard.needs')}</h2>
                    {totals.unweighedSacks > 0 ? (
                      <button type="button" className="hc-pending-link" onClick={() => openCapture('mill')}>
                        {t('harvestCampaign.dashboard.unweighed', { count: totals.unweighedSacks })}
                      </button>
                    ) : null}
                    {totals.millKgWithoutOil > 0 ? (
                      <button type="button" className="hc-pending-link" onClick={() => openCapture('oil')}>
                        {t('harvestCampaign.dashboard.needOil', {
                          kg: formatGroveMassKg(totals.millKgWithoutOil, locale),
                        })}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <div className="hc-hero-actions">
                  {isActive ? (
                    <button type="button" className="hc-ghost" onClick={pause}>
                      {t('harvestCampaign.pause')}
                    </button>
                  ) : (
                    <button type="button" className="hc-start" onClick={resume}>
                      {t('harvestCampaign.resume')}
                    </button>
                  )}
                  <button type="button" className="hc-ghost is-danger" onClick={() => setSheet('complete')}>
                    {t('harvestCampaign.stop')}
                  </button>
                </div>
              </section>
            ) : null}

            {view === 'fields' ? (
              <section className="hc-live-home">
                <HarvestFlowView
                  campaign={campaign}
                  fields={sheetFields.length > 0 ? sheetFields : fields}
                  locale={locale}
                  onMarkDone={markGroveDone}
                  onOpenMill={openMillCapture}
                  onOpenOil={openOilCapture}
                />
              </section>
            ) : null}

            {view === 'log' ? (
              <section className="hc-live-home">
                <header className="hc-panel-head">
                  <p className="hc-kicker">{t('harvestCampaign.nav.log')}</p>
                  <h1 className="hc-page-title">{t('harvestCampaign.log.title')}</h1>
                  <p className="hc-help">{t('harvestCampaign.log.lead')}</p>
                </header>
                {logs.length === 0 ? (
                  <p className="hc-help">{t('harvestCampaign.log.empty')}</p>
                ) : (
                  <ul className="hc-log-list">
                    {logs.map((row) => (
                      <li key={row.date}>
                        <button
                          type="button"
                          className={`hc-log-card${workingDay === row.date ? ' is-selected' : ''}${
                            row.closed ? ' is-closed' : ''
                          }`}
                          onClick={() =>
                            setOpenLogDate((current) => (current === row.date ? null : row.date))
                          }
                        >
                          <strong>
                            {new Date(`${row.date}T12:00:00`).toLocaleDateString(locale, {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            })}
                          </strong>
                          <span className="hc-log-metrics">
                            {row.officialKg > 0
                              ? `${formatGroveMassKg(row.officialKg, locale)} kg`
                              : row.sacks > 0
                                ? `${row.sacks} ${t('harvestCampaign.sacks.unit')}`
                                : t('harvestCampaign.log.noMass')}
                            {row.oilKg > 0
                              ? ` · ${formatGroveMassKg(row.oilKg, locale)} kg ${t('harvestCampaign.actions.oil')}`
                              : ''}
                            {row.people > 0
                              ? ` · ${t('harvestCampaign.today.people', { count: row.people })}`
                              : ''}
                          </span>
                          {row.fieldIds[0] ? (
                            <em>{row.fieldIds.map(labelOf).join(' · ')}</em>
                          ) : null}
                        </button>
                        {openLogDate === row.date ? (
                          <div className="hc-log-detail">
                            {campaign.sacks
                              .filter((item) => item.date === row.date)
                              .map((item) => (
                                <p key={item.id}>
                                  {item.sacks} {t('harvestCampaign.sacks.unit')} · {labelOf(item.fieldId)}
                                </p>
                              ))}
                            {campaign.millWeights
                              .filter((item) => item.date === row.date)
                              .map((item) => (
                                <p key={item.id}>
                                  {t('harvestCampaign.today.official', {
                                    kg: formatGroveMassKg(item.kg, locale),
                                  })}
                                  {item.fieldIds.length > 1
                                    ? ` · ${t('harvestCampaign.shared.badge')}`
                                    : item.fieldIds[0]
                                      ? ` · ${labelOf(item.fieldIds[0])}`
                                      : ''}
                                </p>
                              ))}
                            {campaign.oils
                              .filter((item) => item.date === row.date)
                              .map((item) => (
                                <p key={item.id}>
                                  {t('harvestCampaign.today.oil', {
                                    kg: formatGroveMassKg(oilAmountToKg(item), locale),
                                  })}
                                </p>
                              ))}
                            {campaign.peopleLogs
                              .filter((item) => item.date === row.date)
                              .map((item) => (
                                <p key={item.id}>
                                  {t('harvestCampaign.today.people', { count: item.people })}
                                </p>
                              ))}
                            <button
                              type="button"
                              className="hc-ghost"
                              onClick={() => {
                                setSelectedDay(row.date);
                                setView('today');
                              }}
                            >
                              {t('harvestCampaign.dayNav.openDay')}
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </>
        ) : null}

        <HarvestSheetFrame
          open={Boolean(sheet)}
          title={sheetTitle}
          onClose={closeSheet}
          resetKey={`${sheet || 'closed'}:${workingDay}`}
          kicker={sheetDayKicker}
          subtitle={sheetSubtitle}
          icon={SheetIcon ? <SheetIcon size={18} aria-hidden /> : undefined}
        >
          {sheet === 'add' ? <HarvestAddMenu campaign={campaign} onPick={openCapture} /> : null}
          {sheet === 'sacks' ? (
            <HarvestSacksSheet
              key={editTarget?.kind === 'sack' ? `edit-sack:${editTarget.entry.id}` : 'new-sack'}
              campaign={campaign}
              fields={sheetFields}
              today={workingDay}
              locale={locale}
              initial={editTarget?.kind === 'sack' ? editTarget.entry : null}
              onClose={closeSheet}
              onSave={(input) => void saveSacks(input)}
            />
          ) : null}
          {sheet === 'mill' ? (
            <HarvestMillSheet
              key={
                editTarget?.kind === 'mill'
                  ? `edit-mill:${editTarget.entry.id}`
                  : `mill:${prefillSackIds.join(',')}`
              }
              campaign={campaign}
              fields={sheetFields}
              today={workingDay}
              locale={locale}
              prefillSackIds={prefillSackIds}
              initial={editTarget?.kind === 'mill' ? editTarget.entry : null}
              onClose={closeSheet}
              onSave={(input) => void saveMill(input)}
            />
          ) : null}
          {sheet === 'mill-link' ? (
            <HarvestMillLinkSheet
              campaign={campaign}
              fields={sheetFields}
              today={workingDay}
              locale={locale}
              filterFieldIds={linkMillFieldIds.length > 0 ? linkMillFieldIds : undefined}
              onClose={closeSheet}
              onSave={saveMillLink}
            />
          ) : null}
          {sheet === 'mill-next' ? (
            <HarvestMillNextSheet
              onAddOil={() => openOilCapture(postMillId ? [postMillId] : undefined)}
              onLater={closeSheet}
            />
          ) : null}
          {sheet === 'oil' ? (
            <HarvestOilSheet
              key={
                editTarget?.kind === 'oil'
                  ? `edit-oil:${editTarget.entry.id}`
                  : `oil:${prefillMillIds.join(',')}`
              }
              campaign={campaign}
              fields={sheetFields}
              today={workingDay}
              locale={locale}
              prefillMillIds={prefillMillIds}
              initial={editTarget?.kind === 'oil' ? editTarget.entry : null}
              onClose={closeSheet}
              onSave={(input) => void saveOil(input)}
            />
          ) : null}
          {sheet === 'people' ? (
            <HarvestPeopleSheet
              key={editTarget?.kind === 'people' ? `edit-people:${editTarget.entry.id}` : 'new-people'}
              campaign={campaign}
              fields={sheetFields}
              today={workingDay}
              locale={locale}
              initial={editTarget?.kind === 'people' ? editTarget.entry : null}
              onClose={closeSheet}
              onSave={(input) => void savePeople(input)}
            />
          ) : null}
          {sheet === 'evening' ? (
            <HarvestEveningSheet
              sacks={reviewRow.sacks}
              people={reviewRow.people}
              expenseEur={reviewRow.expenseEur}
              fieldNames={reviewRow.fieldIds.map(labelOf).join(' · ')}
              onAdd={openCapture}
              onCloseDay={() => {
                patch((current) => closeHarvestDay(current, reviewDate || workingDay));
                closeSheet();
              }}
            />
          ) : null}
          {sheet === 'complete' ? (
            <HarvestCompleteSheet
              officialKg={totals.officialKg}
              oilKg={totals.oilKg}
              yieldPct={totals.extractionYield}
              days={totals.harvestDays || days}
              personDays={totals.personDays}
              expenseEur={totals.expenseEur}
              unweighedSacks={totals.unweighedSacks}
              locale={locale}
              onFill={() => openCapture('mill')}
              onFinish={finishHarvest}
            />
          ) : null}
        </HarvestSheetFrame>

        {!isLive ? (
          <div className="hc-hero-actions" style={{ marginTop: '1.2rem' }}>
            <Link to="/this-harvest/review" className="hc-link">
              {t('fields:thisHarvest.reviewLink')}
            </Link>
            <Link to="/money" className="hc-link">
              <Wallet size={16} aria-hidden /> {t('fields:thisHarvest.openMoney')}
            </Link>
            <Link to="/chronologio" className="hc-link">
              <BookOpen size={16} aria-hidden /> {t('fields:thisHarvest.openChronologio')}
            </Link>
          </div>
        ) : null}
      </div>

      <HarvestSheetFrame
        open={Boolean(deepLinkRecord)}
        title={t('fields:harvestCampaign.record.title', { defaultValue: 'Harvest record' })}
        resetKey={deepLinkRecord ? `record:${deepLinkRecord.id}` : 'record'}
        kicker={
          deepLinkRecord
            ? new Date(`${deepLinkRecord.harvestDate.slice(0, 10)}T12:00:00`).toLocaleDateString(locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
            : undefined
        }
        onClose={() => {
          setDeepLinkRecord(null);
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.delete('harvestId');
              next.delete('day');
              return next;
            },
            { replace: true }
          );
        }}
      >
        {deepLinkRecord ? (
          <HarvestRecordSheet
            record={deepLinkRecord}
            fieldName={labelOf(deepLinkRecord.fieldId)}
            locale={locale}
            canVoid={user?.role === 'FieldOwner' || user?.role === 'Administrator'}
            busy={voidBusy}
            onVoid={() => {
              if (
                !window.confirm(
                  t('chronologio:drawer.voidConfirm', {
                    defaultValue: 'Void this record? Totals will update.',
                  })
                )
              ) {
                return;
              }
              setVoidBusy(true);
              void getHarvestService()
                .void(deepLinkRecord.id, t('chronologio:drawer.voidConfirm'))
                .then(() => {
                  setDeepLinkRecord(null);
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev);
                      next.delete('harvestId');
                      next.delete('day');
                      return next;
                    },
                    { replace: true }
                  );
                })
                .finally(() => setVoidBusy(false));
            }}
          />
        ) : null}
      </HarvestSheetFrame>

      {saving ? <span className="sr-only">{t('capture:saving')}</span> : null}
    </PageContainer>
  );
};

export default HarvestCampaignPage;
