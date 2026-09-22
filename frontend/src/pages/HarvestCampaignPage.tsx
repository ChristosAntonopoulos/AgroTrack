import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, BookOpen, Wallet, Unlock, Check } from 'lucide-react';
import PageContainer from '../components/Common/PageContainer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { useHarvestCampaign } from '../context/HarvestCampaignContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useLocale } from '../context/LocaleProvider';
import { useAuth } from '../context/AuthContext';
import { useModulePageGuard } from '../hooks/useModulePageGuard';
import { useActiveFieldAccess } from '../hooks/useActiveFieldAccess';
import { useLocaleFormatters } from '../hooks/useLocaleFormatters';
import {
  getFieldService,
  getHarvestService,
} from '../services/serviceFactory';
import type { Field } from '../services/fieldService';
import type { HarvestRecord } from '../services/harvestService';
import { CAPTURE_SAVED_EVENT, type CaptureSavedDetail } from '../capture/types';
import { formatSeasonLabel as seasonName, formatSeasonRange } from '../utils/harvestSeason';
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
  reopenHarvestDay,
  linkSacksToMill,
  newHarvestEntryId,
  removeExpense,
  removeMillWeight,
  removeNote,
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
import {
  campaignFromHarvestRecords,
  fetchHarvestRecordsForFields,
  filterSeasonHarvestRecords,
  mergeCampaignWithHydrated,
} from '../harvestCampaign/hydrateFromRecords';
import { allDaySummaries, campaignTotals, daySummary, fieldSummaries, harvestDayNumber, oilAmountToKg } from '../harvestCampaign/totals';
import { formatHarvestYieldPercent } from '../harvestCampaign/utils/harvestCalculations';
import type { HarvestCaptureKind, HarvestFieldShare, HarvestModeView } from '../harvestCampaign/types';
import { harvestEveningNudge } from '../harvestCampaign/eveningNudge';
import { harvestExpenseCaptureContext, harvestNoteCaptureContext, shouldMirrorHarvestExpense, shouldMirrorHarvestNote } from '../harvestCampaign/harvestMoneyCapture';
import { getHarvestCapabilities } from '../harvestCampaign/harvestCapabilities';
import { resolveHarvestCaptureFieldId } from '../harvestCampaign/fieldSelection';
import { resolveHarvestTotalsLifecycle } from '../harvestCampaign/lifecycleActions';
import {
  clampHarvestNavDay,
  clampHarvestWorkingDay,
  extendHarvestStripBounds,
  harvestDayStripRows,
  harvestStripCeiling,
  harvestStripFloor,
  harvestStripWindow,
  isAthensDateKey,
  shiftHarvestWorkingDay,
  type HarvestStripBounds,
} from '../harvestCampaign/workingDay';
import HarvestDayStrip from '../harvestCampaign/HarvestDayStrip';
import {
  HarvestAddMenu,
  HarvestProductionWizard,
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
} from '../harvestCampaign/components/HarvestDayActivity';
import { HistoricalHarvestDayBoard } from '../harvestCampaign/components/HistoricalHarvestDayBoard';
import {
  findPostedHarvestRecord,
  harvestRecordsForDay,
  resolveHistoricalHarvestLink,
} from '../harvestCampaign/historicalDay';
import './HarvestCampaignPage.css';

type HarvestAddPrefill = {
  preferredKind?: HarvestCaptureKind;
  sackIds?: string[];
  millIds?: string[];
  /** Where the user opened Add from (chain, evening, fields, …). */
  section?: string;
};

const HarvestCampaignPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common', 'capture', 'chronologio']);
  const { locale } = useLocale();
  const { formatDate } = useLocaleFormatters();
  const { user } = useAuth();
  const activeField = useActiveFieldAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageGuard = useModulePageGuard({ module: 'harvest' });
  const { campaign, seasonStartYear, isLive, isActive, start, stop, pause, resume, markGroveDone, patch } =
    useHarvestCampaign();
  const moneyCapture = useCaptureOptional();

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Field[]>([]);
  const [setupStep, setSetupStep] = useState<0 | 1 | 2>(0);
  const [serverHarvestHint, setServerHarvestHint] = useState(false);
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
  const [deepLinkRecordMissing, setDeepLinkRecordMissing] = useState(false);
  const [historicalDayRecords, setHistoricalDayRecords] = useState<HarvestRecord[]>([]);
  const [historicalDayLoading, setHistoricalDayLoading] = useState(false);
  const [voidBusy, setVoidBusy] = useState(false);
  const [editTarget, setEditTarget] = useState<DayActivityEditTarget | null>(null);
  const [addPrefill, setAddPrefill] = useState<HarvestAddPrefill | null>(null);
  const [selectedDay, setSelectedDayState] = useState(() => athensCalendarDateKey(new Date()));

  const today = athensCalendarDateKey(new Date());
  const areaLocale = locale.startsWith('el') ? 'el' : locale.startsWith('it') ? 'it' : 'en';
  const historicalLink = useMemo(
    () =>
      resolveHistoricalHarvestLink({
        day: searchParams.get('day'),
        fieldId: searchParams.get('fieldId'),
        harvestId: searchParams.get('harvestId'),
      }),
    [searchParams]
  );
  const showHistoricalDay =
    !isLive && (historicalLink.kind === 'day' || historicalLink.kind === 'dayMissing');
  const workingDay = showHistoricalDay
    ? historicalLink.kind === 'day' || historicalLink.kind === 'dayMissing'
      ? historicalLink.day
      : today
    : clampHarvestNavDay(selectedDay, today);
  const [stripBounds, setStripBounds] = useState<HarvestStripBounds>(() =>
    harvestStripWindow(workingDay, campaign, today)
  );

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

  // H2/H3: hydrate shared production from server harvest-records (all fields, this season).
  const patchRef = useRef(patch);
  patchRef.current = patch;
  useEffect(() => {
    if (fields.length === 0) return;
    let cancelled = false;
    const usable = fields.filter((field) => field.status !== 'Draft' && field.status !== 'Archived');
    const fieldIds = (usable.length > 0 ? usable : fields).map((field) => field.id);
    void (async () => {
      try {
        const rows = await fetchHarvestRecordsForFields(fieldIds);
        if (cancelled) return;
        const seasonRows = filterSeasonHarvestRecords(rows, seasonStartYear);
        if (seasonRows.length === 0) {
          setServerHarvestHint(false);
          return;
        }
        const hydrated = campaignFromHarvestRecords(seasonRows, seasonStartYear);
        let stillIdle = false;
        patchRef.current((current) => {
          const merged = mergeCampaignWithHydrated(current, hydrated);
          stillIdle = merged.status === 'idle';
          return merged;
        });
        if (!cancelled) setServerHarvestHint(stillIdle);
      } catch {
        if (!cancelled) setServerHarvestHint(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fields, seasonStartYear]);

  const harvestableFields = useMemo(() => {
    const usable = fields.filter((field) => field.status !== 'Draft' && field.status !== 'Archived');
    return usable.length > 0 ? usable : fields.filter((field) => field.status !== 'Archived');
  }, [fields]);

  useEffect(() => {
    if (setupStep !== 1) return;
    const allowed = new Set(harvestableFields.map((field) => field.id));
    const previous = campaign.fieldOrder.filter((id) => allowed.has(id));
    // Do not select-all by default — that caused 088→089 silent defaults (H1).
    setPickedIds(previous);
  }, [setupStep, harvestableFields, campaign.fieldOrder]);

  const harvestCaps = useMemo(
    () =>
      getHarvestCapabilities({
        hasAnyFieldAccess: harvestableFields.length > 0 || fields.length > 0,
        canOwn:
          user?.role === 'FieldOwner' ||
          user?.role === 'Administrator' ||
          fields.some((f) => f.ownerId === user?.userId) ||
          activeField.ownsAnyField,
        canWork:
          user?.role === 'Producer' ||
          user?.role === 'FieldOwner' ||
          user?.role === 'Administrator' ||
          activeField.isCollaboratorOnActive,
        familyModules: activeField.modules,
        accessLevel: activeField.accessLevel,
        harvestModuleGranted:
          !activeField.modules ||
          activeField.modules.size === 0 ||
          activeField.modules.has('harvest') ||
          activeField.isAdminOnActive,
      }),
    [harvestableFields.length, fields, user, activeField]
  );

  const selectedFields = useMemo(() => {
    const order = campaign.fieldOrder.length ? campaign.fieldOrder : [];
    return order
      .map((id) => harvestableFields.find((field) => field.id === id))
      .filter((field): field is Field => Boolean(field));
  }, [campaign.fieldOrder, harvestableFields]);

  const sheetFields = selectedFields.length ? selectedFields : harvestableFields;
  const totals = useMemo(() => campaignTotals(campaign), [campaign]);
  const fieldRows = useMemo(
    () => fieldSummaries(campaign, campaign.fieldOrder),
    [campaign]
  );
  const activeRow = useMemo(() => daySummary(campaign, workingDay), [campaign, workingDay]);
  const dayClosed = activeRow.closed;
  const days = harvestDayNumber(campaign, workingDay);
  const visibleStripBounds = useMemo(() => {
    if (workingDay < stripBounds.from || workingDay > stripBounds.to) {
      return harvestStripWindow(workingDay, campaign, today);
    }
    const floor = harvestStripFloor(today);
    const ceiling = harvestStripCeiling(today);
    if (stripBounds.from < floor || stripBounds.to > ceiling) {
      return {
        from: stripBounds.from < floor ? floor : stripBounds.from,
        to: stripBounds.to > ceiling ? ceiling : stripBounds.to,
      };
    }
    return stripBounds;
  }, [stripBounds, workingDay, campaign, today]);
  const stripRows = useMemo(
    () => harvestDayStripRows(campaign, today, visibleStripBounds),
    [campaign, today, visibleStripBounds]
  );
  const openUnclosedDays = useMemo(
    () => allDaySummaries(campaign).filter((row) => !row.closed).length,
    [campaign]
  );
  const canPrevDay = workingDay > harvestStripFloor(today);
  const canNextDay = workingDay < harvestStripCeiling(today);
  const logs = useMemo(() => allDaySummaries(campaign), [campaign]);
  const eveningNudge = useMemo(() => harvestEveningNudge(campaign, today), [campaign, today]);
  const chainStatus = useMemo(() => harvestChainStatus(campaign), [campaign]);
  const reviewRow = useMemo(
    () => daySummary(campaign, reviewDate || eveningNudge?.date || workingDay),
    [campaign, reviewDate, eveningNudge, workingDay]
  );

  const revealMoreDays = useCallback(
    (direction: -1 | 1) => {
      setStripBounds((current) =>
        extendHarvestStripBounds(current, direction, campaign, today)
      );
    },
    [campaign, today]
  );

  const setSelectedDay = useCallback(
    (next: string, syncUrl = true) => {
      const clamped = clampHarvestNavDay(next, today);
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

  const shiftVisibleDay = useCallback(
    (delta: -1 | 1) => {
      const next = shiftHarvestWorkingDay(workingDay, delta, campaign, today);
      if (next === workingDay) return;
      setStripBounds((current) => {
        if (next >= current.from && next <= current.to) return current;
        return extendHarvestStripBounds(current, delta, campaign, today);
      });
      setSelectedDay(next);
    },
    [campaign, setSelectedDay, today, workingDay]
  );

  useEffect(() => {
    setStripBounds(harvestStripWindow(workingDay, campaign, today));
    // Rebuild the first page when the season start or "today" changes, not on every day step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.startedAt, today]);

  useEffect(() => {
    if (workingDay >= stripBounds.from && workingDay <= stripBounds.to) return;
    setStripBounds(harvestStripWindow(workingDay, campaign, today));
  }, [workingDay, stripBounds.from, stripBounds.to, campaign, today]);

  useEffect(() => {
    const fromUrl = searchParams.get('day');
    // Historical Chronologio deep-links must keep the requested day even when the local campaign is idle.
    if (!isLive && fromUrl && isAthensDateKey(fromUrl)) {
      setSelectedDayState(fromUrl);
      return;
    }
    if (!fromUrl) {
      setSelectedDayState((prev) => clampHarvestNavDay(prev, today));
      return;
    }
    const clamped = clampHarvestNavDay(fromUrl, today);
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
  }, [campaign, isLive, searchParams, setSearchParams, today]);

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
      setDeepLinkRecordMissing(false);
      return;
    }
    let cancelled = false;
    void getHarvestService()
      .listByField(fieldId)
      .then((rows) => {
        if (cancelled) return;
        const hit = findPostedHarvestRecord(rows, harvestId);
        setDeepLinkRecord(hit);
        setDeepLinkRecordMissing(!hit);
      })
      .catch(() => {
        if (!cancelled) {
          setDeepLinkRecord(null);
          setDeepLinkRecordMissing(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (historicalLink.kind !== 'day') {
      setHistoricalDayRecords([]);
      setHistoricalDayLoading(false);
      return;
    }
    const { day, fieldId } = historicalLink;
    let cancelled = false;
    setHistoricalDayLoading(true);
    void getHarvestService()
      .listByField(fieldId)
      .then((rows) => {
        if (cancelled) return;
        setHistoricalDayRecords(harvestRecordsForDay(rows, day, fieldId));
      })
      .catch(() => {
        if (!cancelled) setHistoricalDayRecords([]);
      })
      .finally(() => {
        if (!cancelled) setHistoricalDayLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historicalLink]);

  const labelOf = (id: string) => {
    const field =
      harvestableFields.find((f) => f.id === id) || fields.find((f) => f.id === id);
    if (field?.name) return friendlyFieldLabel(field.name);
    if (/^[a-f0-9]{24}$/i.test(id)) return t('harvestCampaign.fieldLockedLabel');
    return friendlyFieldLabel(id);
  };

  const reopenSelectedDay = () => {
    if (!harvestCaps.canReopenDay) return;
    patch((current) => reopenHarvestDay(current, workingDay));
  };

  const ensureDayOpen = (opts?: { confirm?: boolean }) => {
    if (!dayClosed) return true;
    if (!harvestCaps.canReopenDay) {
      window.alert(t('harvestCampaign.dayNav.lockedBody'));
      return false;
    }
    if (opts?.confirm !== false) {
      const ok = window.confirm(
        `${t('harvestCampaign.dayNav.lockedTitle')}\n\n${t('harvestCampaign.dayNav.lockedBody')}`
      );
      if (!ok) return false;
    }
    patch((current) => reopenHarvestDay(current, workingDay));
    return true;
  };

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
    setAddPrefill(null);
  };

  /** Direct mill/oil sheets — only after the shared Add chooser (or post-save next step). */
  const openMillSheet = (sackIds?: string[]) => {
    if (!ensureDayOpen()) return;
    setEditTarget(null);
    setPrefillMillIds([]);
    setPrefillSackIds(sackIds || []);
    setSheet('mill');
  };

  const openOilSheet = (millIds?: string[]) => {
    if (!ensureDayOpen()) return;
    setEditTarget(null);
    setPrefillSackIds([]);
    setPrefillMillIds(millIds || []);
    setSheet('oil');
  };

  const openHarvestExpense = () => {
    if (!harvestCaps.canAddExpense) return;
    closeSheet();
    const fieldId = resolveHarvestCaptureFieldId({
      preferredFieldId: searchParams.get('fieldId'),
      campaignFieldOrder: campaign.fieldOrder,
      allowedFieldIds: sheetFields.map((f) => f.id),
    });
    moneyCapture?.openCapture(
      harvestExpenseCaptureContext({
        campaign,
        fieldId: fieldId || undefined,
        today: workingDay,
        description: t('harvestCampaign.expense.moneyDescription'),
      })
    );
  };

  const openHarvestNote = () => {
    if (!harvestCaps.canAddNote) return;
    closeSheet();
    const fieldId = resolveHarvestCaptureFieldId({
      preferredFieldId: searchParams.get('fieldId'),
      campaignFieldOrder: campaign.fieldOrder,
      allowedFieldIds: sheetFields.map((f) => f.id),
    });
    moneyCapture?.openCapture(
      harvestNoteCaptureContext({
        campaign,
        fieldId: fieldId || undefined,
        today: workingDay,
      })
    );
  };

  const openCapture = (kind: HarvestCaptureKind) => {
    const sackIds = addPrefill?.sackIds;
    const millIds = addPrefill?.millIds;
    setAddPrefill(null);
    if (kind === 'mill') {
      if (!harvestCaps.canAddMill) return;
      openMillSheet(sackIds);
      return;
    }
    if (kind === 'oil') {
      if (!harvestCaps.canAddOil) return;
      openOilSheet(millIds);
      return;
    }
    if (!ensureDayOpen()) return;
    setEditTarget(null);
    if (kind === 'expense') {
      openHarvestExpense();
      return;
    }
    if (kind === 'note') {
      openHarvestNote();
      return;
    }
    if (kind === 'sacks' && !harvestCaps.canAddSacks) return;
    if (kind === 'people' && !harvestCaps.canAddPeople) return;
    setPrefillSackIds([]);
    setPrefillMillIds([]);
    setSheet(kind);
  };

  /** Single Add entry: mode +, chain alerts, evening gaps, fields prompts. */
  const requestAdd = (prefill?: HarvestAddPrefill) => {
    if (!ensureDayOpen()) return;
    setEditTarget(null);
    const kind = prefill?.preferredKind;
    if (kind === 'expense') {
      openHarvestExpense();
      return;
    }
    if (kind === 'note') {
      openHarvestNote();
      return;
    }
    if (kind === 'people') {
      if (!harvestCaps.canAddPeople) return;
      setAddPrefill(null);
      setSheet('people');
      return;
    }
    setAddPrefill(prefill || null);
    const canProduce = harvestCaps.captureKinds.some(
      (item) => item === 'sacks' || item === 'mill' || item === 'oil'
    );
    setSheet(canProduce ? 'produce' : 'add');
  };

  const openDayEdit = (target: DayActivityEditTarget) => {
    if (target.kind === 'expense' || target.kind === 'note') return;
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
    else if (target.kind === 'people') patch((current) => removePeople(current, target.entry.id));
    else if (target.kind === 'expense') patch((current) => removeExpense(current, target.entry.id));
    else patch((current) => removeNote(current, target.entry.id));
  };

  const openEvening = (date = eveningNudge?.date || workingDay) => {
    const day = clampHarvestWorkingDay(date, campaign, today);
    setSelectedDay(day);
    setReviewDate(day);
    setSheet('evening');
  };

  const saveSacks = async (
    input: { sacks: number; fieldId: string; kgPerSack?: number },
    opts?: { existingId?: string; keepOpen?: boolean }
  ) => {
    setSaving(true);
    const sackId = opts?.existingId || (editTarget?.kind === 'sack' ? editTarget.entry.id : undefined);
    if (sackId) {
      patch((current) =>
        updateSack(current, sackId, {
          sacks: input.sacks,
          fieldId: input.fieldId,
          kgPerSack: input.kgPerSack,
        })
      );
      setSaving(false);
      if (!opts?.keepOpen) closeSheet();
      return sackId;
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
    if (opts?.keepOpen) return entry.id;
    const otherPending = unconfirmedSacks(campaign).filter((s) => s.date < workingDay);
    const otherCount = otherPending.reduce((sum, s) => sum + s.sacks, 0);
    setSackSavedHint(
      otherCount > 0
        ? t('harvestCampaign.chain.sacksSavedPlus', { count: otherCount })
        : t('harvestCampaign.chain.sacksSaved')
    );
    window.setTimeout(() => setSackSavedHint(null), 4200);
    closeSheet();
    return entry.id;
  };

  const saveMill = async (
    input: {
      kg: number;
      fieldIds: string[];
      fieldShares?: HarvestFieldShare[];
      sackIds: string[];
      receiptRef?: string;
      note?: string;
    },
    opts?: { existingId?: string; keepOpen?: boolean }
  ) => {
    setSaving(true);
    const millId = opts?.existingId || (editTarget?.kind === 'mill' ? editTarget.entry.id : undefined);
    if (millId) {
      const previous = campaign.millWeights.find((row) => row.id === millId);
      patch((current) =>
        updateMillWeight(current, millId, {
          date:
            previous?.date ||
            (editTarget?.kind === 'mill' ? editTarget.entry.date : workingDay),
          kg: input.kg,
          fieldIds: input.fieldIds,
          fieldShares: input.fieldShares,
          sackIds: input.sackIds,
          receiptRef: input.receiptRef,
          note: input.note,
        })
      );
      setSaving(false);
      if (!opts?.keepOpen) closeSheet();
      return millId;
    }
    const entry = {
      id: newHarvestEntryId(),
      date: workingDay,
      kg: input.kg,
      fieldIds: input.fieldIds,
      fieldShares: input.fieldShares,
      sackIds: input.sackIds,
      receiptRef: input.receiptRef,
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
    if (opts?.keepOpen) return entry.id;
    setPrefillSackIds([]);
    setPostMillId(entry.id);
    setSheet('mill-next');
    return entry.id;
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

  const saveOil = async (
    input: {
    amount: number;
    unit: 'kg' | 'litres';
    millKept?: number;
    tin16Count?: number;
    tin17Count?: number;
    tinSizeLitres?: 16 | 17;
    tinCount?: number;
    extraLitres?: number;
    millWeightIds: string[];
    fieldIds: string[];
    fieldShares?: HarvestFieldShare[];
    acidity?: number;
    note?: string;
  },
    opts?: { existingId?: string; keepOpen?: boolean }
  ) => {
    setSaving(true);
    const oilId = opts?.existingId || (editTarget?.kind === 'oil' ? editTarget.entry.id : undefined);
    if (oilId) {
      patch((current) =>
        updateOil(current, oilId, {
          amount: input.amount,
          unit: input.unit,
          millKept: input.millKept,
          tin16Count: input.tin16Count,
          tin17Count: input.tin17Count,
          tinSizeLitres: input.tinSizeLitres,
          tinCount: input.tinCount,
          extraLitres: input.extraLitres,
          millWeightIds: input.millWeightIds,
          fieldIds: input.fieldIds,
          fieldShares: input.fieldShares,
          acidity: input.acidity,
          note: input.note,
        })
      );
      setSaving(false);
      if (!opts?.keepOpen) closeSheet();
      return oilId;
    }
    const related = campaign.millWeights
      .filter((row) => input.millWeightIds.includes(row.id))
      .reduce((sum, row) => sum + row.kg, 0);
    const entry = {
      id: newHarvestEntryId(),
      date: workingDay,
      amount: input.amount,
      unit: input.unit,
      millKept: input.millKept,
      tin16Count: input.tin16Count,
      tin17Count: input.tin17Count,
      tinSizeLitres: input.tinSizeLitres,
      tinCount: input.tinCount,
      extraLitres: input.extraLitres,
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
    if (opts?.keepOpen) return entry.id;
    closeSheet();
    return entry.id;
  };

  const savePeople = async (input: {
    people: number;
    hours: 'half' | 'full' | 'other' | 'skip';
    otherHours?: number;
    costEur?: number;
  }) => {
    setSaving(true);
    if (editTarget?.kind === 'people') {
      patch((current) =>
        updatePeople(current, editTarget.entry.id, {
          people: input.people,
          hours: input.hours,
          otherHours: input.otherHours,
          costEur: input.costEur,
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
      costEur: input.costEur,
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
      : sheet === 'add' || sheet === 'produce'
        ? t('harvestCampaign.home.whatAdd')
        : sheet === 'mill-link'
          ? t('harvestCampaign.millKg.linkTitle')
          : sheet === 'mill-next'
            ? t('harvestCampaign.chain.millNextTitle')
            : sheet
              ? t(`harvestCampaign.sheetTitle.${sheet}`)
              : '';

  const sheetWorkingDayLabel = (() => {
    const when = new Date(`${workingDay}T12:00:00`);
    const weekday = when.toLocaleDateString(locale, { weekday: 'long' });
    return `${weekday}, ${formatDate(when)}`;
  })();
  const sheetDayKicker =
    sheet && sheet !== 'complete'
      ? workingDay === today
        ? t('harvestCampaign.dayNav.today')
        : sheetWorkingDayLabel
      : undefined;
  const sheetSubtitle =
    sheet && sheet !== 'add' && sheet !== 'produce' && sheet !== 'complete'
      ? t('harvestCampaign.home.day', { day: days })
      : undefined;
  const SheetIcon =
    sheet === 'sacks' || sheet === 'mill' || sheet === 'oil' || sheet === 'people'
      ? HARVEST_ACTION_ICONS[sheet]
      : null;

  if (pageGuard.loading) {
    return (
      <PageContainer maxWidth="full" padding="none" className="harvest-page">
        <LoadingSpinner />
      </PageContainer>
    );
  }
  if (!pageGuard.allowed) {
    return <Navigate to="/access-denied?module=harvest" replace />;
  }

  return (
    <PageContainer maxWidth="full" padding="none" className="harvest-page">
      <div className={`harvest-campaign${isLive ? ' is-mode' : ''}`}>
        {!isLive && showHistoricalDay ? (
          <HistoricalHarvestDayBoard
            day={
              historicalLink.kind === 'day' || historicalLink.kind === 'dayMissing'
                ? historicalLink.day
                : workingDay
            }
            fieldName={
              historicalLink.kind === 'day' || historicalLink.kind === 'dayMissing'
                ? labelOf(historicalLink.fieldId || searchParams.get('fieldId') || '')
                : labelOf(searchParams.get('fieldId') || '')
            }
            records={historicalDayRecords}
            locale={locale}
            loading={historicalDayLoading}
            notFound={!historicalDayLoading && historicalDayRecords.length === 0}
            onOpenRecord={(record) => {
              setDeepLinkRecord(record);
              setDeepLinkRecordMissing(false);
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('fieldId', record.fieldId);
                  next.set('harvestId', record.id);
                  next.set('day', athensCalendarDateKey(record.harvestDate));
                  return next;
                },
                { replace: true }
              );
            }}
          />
        ) : null}

        {!isLive && !showHistoricalDay && deepLinkRecordMissing ? (
          <section className="hc-setup-card" role="status">
            <p className="hc-lead">{t('harvestCampaign.historical.missing')}</p>
            <div className="hc-hero-actions">
              <Link to="/chronologio" className="hc-start">
                {t('fields:thisHarvest.openChronologio')}
              </Link>
            </div>
          </section>
        ) : null}

        {!isLive && !showHistoricalDay && !deepLinkRecordMissing && setupStep === 0 ? (
          <header className="hc-hero">
            <p className="hc-kicker">{seasonName(seasonStartYear)}</p>
            <h1>{t('harvestCampaign.title')}</h1>
            <p className="hc-lead">{t('harvestCampaign.leadIdle')}</p>
            {serverHarvestHint && campaign.status === 'idle' ? (
              <p className="money-warn" role="status">
                {t('harvestCampaign.serverActivityHint')}
              </p>
            ) : null}
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

        {!isLive && !showHistoricalDay && setupStep === 1 ? (
          <section className="hc-setup" aria-labelledby="hc-setup-title">
            <header className="hc-setup-head">
              <div className="hc-setup-progress" aria-hidden>
                <span className="hc-setup-dot is-current" />
                <span className="hc-setup-dot-line" />
                <span className="hc-setup-dot" />
              </div>
              <p className="hc-kicker">
                {t('harvestCampaign.setup.stepOf', { step: 1, total: 2 })}
              </p>
              <h1 id="hc-setup-title">{t('harvestCampaign.setupTitle')}</h1>
              <p className="hc-help">{t('harvestCampaign.setupHint')}</p>
            </header>

            {harvestableFields.length === 0 ? (
              <p className="hc-help">{t('harvestCampaign.noFields')}</p>
            ) : (
              <div className="hc-setup-pick">
                <div className="hc-setup-pick-bar">
                  <p className="hc-setup-pick-count">
                    {t('harvestCampaign.setup.selectedCount', { count: pickedIds.length })}
                  </p>
                  <div className="hc-setup-pick-tools">
                    {pickedIds.length > 0 ? (
                      <button
                        type="button"
                        className="hc-text-btn"
                        onClick={() => setPickedIds([])}
                      >
                        {t('harvestCampaign.setup.clearSelection')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="hc-text-btn"
                      onClick={() => setPickedIds(harvestableFields.map((field) => field.id))}
                    >
                      {t('harvestCampaign.setup.selectAll')}
                    </button>
                  </div>
                </div>
                <ul className="hc-setup-field-list">
                  {harvestableFields.map((field) => {
                    const on = pickedIds.includes(field.id);
                    const variety = field.variety || field.oliveVariety;
                    const area = formatFieldArea(field, areaLocale);
                    return (
                      <li key={field.id}>
                        <button
                          type="button"
                          className={`hc-setup-field${on ? ' is-on' : ''}`}
                          aria-pressed={on}
                          onClick={() =>
                            setPickedIds((prev) =>
                              prev.includes(field.id)
                                ? prev.filter((id) => id !== field.id)
                                : [...prev, field.id]
                            )
                          }
                        >
                          <span className={`hc-setup-check${on ? ' is-on' : ''}`} aria-hidden>
                            {on ? <Check size={16} strokeWidth={2.5} /> : null}
                          </span>
                          <span className="hc-setup-field-copy">
                            <strong>{friendlyFieldLabel(field.name)}</strong>
                            <span>{[variety, area].filter(Boolean).join(' · ') || '—'}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <footer className="hc-setup-footer">
              <button
                type="button"
                className="hc-start hc-setup-primary"
                disabled={pickedIds.length === 0 && harvestableFields.length > 0}
                onClick={() => setSetupStep(2)}
              >
                {t('common:continue')}
              </button>
              <button
                type="button"
                className="hc-text-btn hc-setup-skip"
                onClick={() => {
                  setPickedIds([]);
                  setSetupStep(2);
                }}
              >
                {t('harvestCampaign.setup.later')}
              </button>
            </footer>
          </section>
        ) : null}

        {!isLive && !showHistoricalDay && setupStep === 2 ? (
          <section className="hc-setup" aria-labelledby="hc-setup-confirm-title">
            <header className="hc-setup-head">
              <div className="hc-setup-progress" aria-hidden>
                <span className="hc-setup-dot is-done" />
                <span className="hc-setup-dot-line is-done" />
                <span className="hc-setup-dot is-current" />
              </div>
              <p className="hc-kicker">
                {t('harvestCampaign.setup.stepOf', { step: 2, total: 2 })}
              </p>
              <h1 id="hc-setup-confirm-title">{t('harvestCampaign.setup.startTitle')}</h1>
              <p className="hc-help">{t('harvestCampaign.setup.startHint')}</p>
            </header>

            <div className="hc-setup-review">
              <div className="hc-setup-review-row">
                <span className="hc-setup-review-label">
                  {t('harvestCampaign.setup.seasonLabel')}
                </span>
                <strong className="hc-setup-review-value">
                  {t('harvestCampaign.setup.seasonLine', {
                    season: seasonName(seasonStartYear),
                    range: formatSeasonRange(seasonStartYear, locale),
                  })}
                </strong>
              </div>
              <div className="hc-setup-review-row">
                <span className="hc-setup-review-label">
                  {t('harvestCampaign.setup.fieldsLabel')}
                </span>
                {pickedIds.length > 0 ? (
                  <ul className="hc-setup-review-chips">
                    {pickedIds.map((id) => (
                      <li key={id} className="hc-setup-review-chip">
                        {labelOf(id)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="money-warn" role="status">
                    {t('harvestCampaign.setup.noFieldsWarn')}
                  </p>
                )}
              </div>
            </div>

            <footer className="hc-setup-footer">
              <button type="button" className="hc-start hc-setup-primary" onClick={beginHarvest}>
                {t('harvestCampaign.setup.confirmStart')}
              </button>
              <button type="button" className="hc-text-btn" onClick={() => setSetupStep(1)}>
                {t('common:back')}
              </button>
            </footer>
          </section>
        ) : null}

        {isLive ? (
          <>
            <section className="hc-live-chrome">
              <nav className="hc-mode-nav hc-mode-nav-top" aria-label={t('harvestCampaign.nav.label')}>
                {(['today', 'fields'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`hc-mode-tab${view === item ? ' is-on' : ''}`}
                    onClick={() => setView(item)}
                  >
                    {t(`harvestCampaign.nav.${item}`)}
                  </button>
                ))}
                <button
                  type="button"
                  className={`hc-mode-plus${
                    dayClosed || harvestCaps.captureKinds.length === 0 ? ' is-locked' : ''
                  }`}
                  aria-label={t('harvestCampaign.today.add')}
                  onClick={() => {
                    if (harvestCaps.captureKinds.length === 0) return;
                    requestAdd();
                  }}
                >
                  <Plus size={22} aria-hidden />
                </button>
                {(['totals', 'log'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`hc-mode-tab${view === item ? ' is-on' : ''}`}
                    onClick={() => setView(item)}
                  >
                    {t(`harvestCampaign.nav.${item}`)}
                  </button>
                ))}
              </nav>
              {view === 'today' ? (
                <HarvestDayStrip
                  selectedDay={workingDay}
                  today={today}
                  dayNumber={days}
                  closed={activeRow.closed}
                  stripRows={stripRows}
                  canPrev={canPrevDay}
                  canNext={canNextDay}
                  locale={locale}
                  onSelectDay={setSelectedDay}
                  onShift={shiftVisibleDay}
                  onRevealMore={revealMoreDays}
                />
              ) : null}
            </section>

            {view === 'today' ? (
              <section className="hc-live-home">
                {sackSavedHint ? (
                  <p className="hc-chain-toast" role="status">
                    {sackSavedHint}
                  </p>
                ) : null}

                {harvestCaps.editRestrictionReasonKey ? (
                  <p className="hc-view-only-banner" role="status">
                    {t(`harvestCampaign.permissions.${harvestCaps.editRestrictionReasonKey}`)}
                  </p>
                ) : null}

                <section
                  className={`hc-day-summary${eveningNudge && workingDay === today && !dayClosed ? ' is-nudge' : ''}${dayClosed ? ' is-closed' : ''}`}
                >
                  <header className="hc-day-summary-head">
                    <div>
                      <p className="hc-kicker">{t('harvestCampaign.nav.today')}</p>
                      <h2>
                        {workingDay === today
                          ? t('harvestCampaign.dayNav.today')
                          : formatDate(`${workingDay}T12:00:00`)}
                      </h2>
                    </div>
                    <span className={`hc-status-pill${dayClosed ? ' is-closed' : ''}`}>
                      {dayClosed
                        ? t('harvestCampaign.today.closed')
                        : t('harvestCampaign.status.active')}
                    </span>
                  </header>

                  <div className="hc-day-metrics">
                    <article className="hc-day-metric">
                      <span>{t('harvestCampaign.actions.sacks')}</span>
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
                      <span>{t('harvestCampaign.actions.people')}</span>
                      <strong>{activeRow.people > 0 ? activeRow.people : '—'}</strong>
                    </article>
                    <article className="hc-day-metric">
                      <span>{t('harvestCampaign.actions.millShort', { defaultValue: t('harvestCampaign.actions.mill') })}</span>
                      <strong>
                        {activeRow.officialKg > 0
                          ? `${formatGroveMassKg(activeRow.officialKg, locale)} kg`
                          : '—'}
                      </strong>
                    </article>
                    <article className="hc-day-metric">
                      <span>{t('harvestCampaign.actions.oil')}</span>
                      <strong>
                        {activeRow.oilKg > 0
                          ? `${formatGroveMassKg(activeRow.oilKg, locale)} kg`
                          : '—'}
                      </strong>
                    </article>
                  </div>

                  {campaign.fieldOrder.length > 0 ? (
                    <p className="hc-day-fields">
                      {t('harvestCampaign.today.fieldsLine', {
                        fields: campaign.fieldOrder.map(labelOf).join(' · '),
                        defaultValue: campaign.fieldOrder.map(labelOf).join(' · '),
                      })}
                    </p>
                  ) : activeRow.fieldIds.length > 0 ? (
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

                  {!dayClosed && harvestCaps.captureKinds.length > 0 ? (
                    <div className="hc-primary-add">
                      <button type="button" className="hc-start hc-add-primary" onClick={() => requestAdd()}>
                        <Plus size={20} aria-hidden />
                        {t('harvestCampaign.home.whatAdd')}
                      </button>
                    </div>
                  ) : dayClosed && harvestCaps.canReopenDay ? (
                    <div className="hc-primary-add">
                      <button type="button" className="hc-ghost hc-reopen" onClick={reopenSelectedDay}>
                        <Unlock size={18} aria-hidden />
                        {t('harvestCampaign.dayNav.reopen')}
                      </button>
                    </div>
                  ) : null}

                  {dayClosed ? (
                    <p className="hc-help hc-closed-copy">
                      {t('harvestCampaign.dayNav.lockedBody')}
                    </p>
                  ) : null}
                </section>

                <HarvestDayActivity
                  campaign={campaign}
                  date={workingDay}
                  locale={locale}
                  labelOf={labelOf}
                  closed={dayClosed}
                  canMutateEntries={harvestCaps.captureKinds.length > 0}
                  onEdit={openDayEdit}
                  onRemove={removeDayEntry}
                />

                {(chainStatus.pendingSackCount > 0 ||
                  chainStatus.millKgWithoutOil > 0 ||
                  chainStatus.latestCompleteYield != null) && (
                  <section className="hc-chain-card hc-secondary-slot" aria-label={t('harvestCampaign.chain.cardLabel')}>
                    {chainStatus.pendingSackCount > 0 ? (
                      <button
                        type="button"
                        className="hc-chain-row"
                        onClick={() =>
                          requestAdd({
                            preferredKind: 'mill',
                            sackIds: chainStatus.pendingSackIds,
                            section: 'chain',
                          })
                        }
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
                          requestAdd({
                            preferredKind: 'oil',
                            millIds: chainStatus.millsWithoutOil.map((m) => m.id),
                            section: 'chain',
                          })
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
                          yield: formatHarvestYieldPercent(chainStatus.latestCompleteYield, locale),
                        })}
                      </p>
                    ) : null}
                  </section>
                )}

                <div className="hc-secondary-actions hc-secondary-slot">
                  {!dayClosed && harvestCaps.canCloseDay ? (
                    <button
                      type="button"
                      className="hc-close-day"
                      onClick={() => openEvening(workingDay)}
                    >
                      {eveningNudge && workingDay === today && eveningNudge.kind === 'yesterday'
                        ? t('harvestCampaign.nudge.yesterdayAction')
                        : t('harvestCampaign.today.close')}
                    </button>
                  ) : null}
                  {!dayClosed && eveningNudge && workingDay === today ? (
                    <p className="hc-help hc-nudge-copy">
                      {eveningNudge.kind === 'yesterday'
                        ? t('harvestCampaign.nudge.yesterdayReason')
                        : t('harvestCampaign.nudge.todayReason')}
                    </p>
                  ) : null}
                  {!dayClosed && harvestCaps.canCloseDay ? (
                    <p className="hc-help hc-close-day-hint">
                      {t('harvestCampaign.dayNav.closeExplain')}
                    </p>
                  ) : null}
                </div>

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
                    <span>{t('harvestCampaign.actions.sacks')}</span>
                    <strong>
                      {campaign.sacks.reduce((sum, row) => sum + row.sacks, 0) > 0
                        ? t('harvestCampaign.dashboard.sacks', {
                            count: campaign.sacks.reduce((sum, row) => sum + row.sacks, 0),
                          })
                        : '—'}
                    </strong>
                  </article>
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
                            yield: formatHarvestYieldPercent(totals.extractionYield, locale),
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
                  <article className="hc-stat-card">
                    <span>{t('harvestCampaign.dashboard.costPerKgLabel')}</span>
                    <strong>
                      {totals.officialKg > 0 && totals.expenseEur > 0
                        ? t('harvestCampaign.dashboard.costPerKg', {
                            amount: (totals.expenseEur / totals.officialKg).toFixed(2),
                          })
                        : '—'}
                    </strong>
                  </article>
                </div>
                {fieldRows.length > 0 ? (
                  <div className="hc-field-summary-table" role="table" aria-label={t('harvestCampaign.nav.fields')}>
                    <div className="hc-field-summary-row hc-field-summary-head" role="row">
                      <span role="columnheader">{t('harvestCampaign.nav.fields')}</span>
                      <span role="columnheader">{t('harvestCampaign.actions.sacks')}</span>
                      <span role="columnheader">{t('harvestCampaign.actions.mill')}</span>
                      <span role="columnheader">{t('harvestCampaign.actions.oil')}</span>
                    </div>
                    {fieldRows.map((row) => (
                      <div key={row.fieldId} className="hc-field-summary-row" role="row">
                        <span role="cell">{labelOf(row.fieldId)}</span>
                        <span role="cell">{row.sacks || '—'}</span>
                        <span role="cell">
                          {row.officialKg > 0
                            ? `${formatGroveMassKg(row.officialKg, locale)} kg`
                            : '—'}
                        </span>
                        <span role="cell">
                          {row.oilKg > 0 ? `${formatGroveMassKg(row.oilKg, locale)} kg` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {totals.unweighedSacks > 0 || totals.millKgWithoutOil > 0 ? (
                  <div className="hc-pending-card">
                    <h2>{t('harvestCampaign.dashboard.needs')}</h2>
                    {totals.unweighedSacks > 0 ? (
                      <button type="button" className="hc-pending-link" onClick={() => requestAdd({ preferredKind: 'mill', section: 'totals' })}>
                        {t('harvestCampaign.dashboard.unweighed', { count: totals.unweighedSacks })}
                      </button>
                    ) : null}
                    {totals.millKgWithoutOil > 0 ? (
                      <button type="button" className="hc-pending-link" onClick={() => requestAdd({ preferredKind: 'oil', section: 'totals' })}>
                        {t('harvestCampaign.dashboard.needOil', {
                          kg: formatGroveMassKg(totals.millKgWithoutOil, locale),
                        })}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <div className="hc-hero-actions hc-totals-actions">
                  {harvestCaps.canPause ? (
                    <div className="hc-totals-pause">
                      {isActive ? (
                        <button
                          type="button"
                          className="hc-ghost"
                          onClick={() => {
                            if (resolveHarvestTotalsLifecycle('pause') === 'pause') pause();
                          }}
                        >
                          {t('harvestCampaign.pause')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="hc-start"
                          onClick={() => {
                            if (resolveHarvestTotalsLifecycle('resume') === 'resume') resume();
                          }}
                        >
                          {t('harvestCampaign.resume')}
                        </button>
                      )}
                    </div>
                  ) : null}
                  {harvestCaps.canCompleteSeason ? (
                    <div className="hc-totals-complete">
                      <button
                        type="button"
                        className="hc-ghost is-danger"
                        onClick={() => {
                          if (resolveHarvestTotalsLifecycle('stop') !== 'openComplete') return;
                          if (
                            window.confirm(
                              t('harvestCampaign.complete.openConfirm', {
                                defaultValue: t('harvestCampaign.complete.readyTitle'),
                              })
                            )
                          ) {
                            setSheet('complete');
                          }
                        }}
                      >
                        {t('harvestCampaign.stop')}
                      </button>
                    </div>
                  ) : null}
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
                  onOpenMill={() => requestAdd({ preferredKind: 'mill', section: 'fields' })}
                  onOpenOil={() => requestAdd({ preferredKind: 'oil', section: 'fields' })}
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
                            {formatDate(`${row.date}T12:00:00`)}
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
          {sheet === 'produce' ? (
            <HarvestProductionWizard
              campaign={campaign}
              fields={sheetFields}
              today={workingDay}
              locale={locale}
              preferredFieldId={searchParams.get('fieldId') || undefined}
              preferredKind={addPrefill?.preferredKind}
              prefillSackIds={addPrefill?.sackIds}
              prefillMillIds={addPrefill?.millIds}
              allowedKinds={harvestCaps.captureKinds}
              onClose={closeSheet}
              onSaveSacks={(input, existingId) =>
                saveSacks(input, { existingId, keepOpen: true })
              }
              onSaveMill={(input, existingId) => saveMill(input, { existingId, keepOpen: true })}
              onSaveOil={(input, existingId) => saveOil(input, { existingId, keepOpen: true })}
              onOther={(kind) => openCapture(kind)}
            />
          ) : null}
          {sheet === 'add' ? (
            <HarvestAddMenu
              campaign={campaign}
              allowedKinds={harvestCaps.captureKinds}
              preferredKind={addPrefill?.preferredKind}
              onPick={openCapture}
            />
          ) : null}
          {sheet === 'sacks' ? (
            <HarvestSacksSheet
              key={editTarget?.kind === 'sack' ? `edit-sack:${editTarget.entry.id}` : 'new-sack'}
              campaign={campaign}
              fields={sheetFields}
              today={workingDay}
              locale={locale}
              preferredFieldId={searchParams.get('fieldId') || undefined}
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
              onAddOil={() => openOilSheet(postMillId ? [postMillId] : undefined)}
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
              allowedAddKinds={harvestCaps.captureKinds}
              onAdd={(kind) => requestAdd({ preferredKind: kind, section: 'evening' })}
              onCloseDay={() => {
                patch((current) => closeHarvestDay(current, reviewDate || workingDay));
                closeSheet();
              }}
              onCloseEmpty={() => {
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
              openDays={openUnclosedDays}
              locale={locale}
              onFill={() => requestAdd({ preferredKind: 'mill', section: 'complete' })}
              onFinish={finishHarvest}
            />
          ) : null}
        </HarvestSheetFrame>

        {!isLive ? (
          <nav className="hc-setup-aside" aria-label={t('harvestCampaign.title')}>
            <Link to="/this-harvest/review" className="hc-link">
              {t('fields:thisHarvest.reviewLink')}
            </Link>
            <Link to="/money" className="hc-link">
              <Wallet size={16} aria-hidden /> {t('fields:thisHarvest.openMoney')}
            </Link>
            <Link to="/chronologio" className="hc-link">
              <BookOpen size={16} aria-hidden /> {t('fields:thisHarvest.openChronologio')}
            </Link>
          </nav>
        ) : null}
      </div>

      <HarvestSheetFrame
        open={Boolean(deepLinkRecord)}
        title={t('fields:harvestCampaign.record.title', { defaultValue: 'Harvest record' })}
        resetKey={deepLinkRecord ? `record:${deepLinkRecord.id}` : 'record'}
        kicker={
          deepLinkRecord
            ? (() => {
                const when = new Date(`${deepLinkRecord.harvestDate.slice(0, 10)}T12:00:00`);
                const weekday = when.toLocaleDateString(locale, { weekday: 'long' });
                return `${weekday}, ${formatDate(when)}`;
              })()
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
