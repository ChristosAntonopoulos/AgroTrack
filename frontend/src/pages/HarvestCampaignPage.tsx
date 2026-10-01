import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  BookOpen,
  Wallet,
  Check,
  CalendarDays,
  CircleDollarSign,
  Droplets,
  Package,
  Percent,
  Scale,
  Users,
} from 'lucide-react';
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
import {
  oilStockService,
  type OilShareRequest,
  type OilShareSource,
} from '../services/oilStockService';
import type { Field } from '../services/fieldService';
import type { HarvestRecord } from '../services/harvestService';
import { CAPTURE_SAVED_EVENT, type CaptureSavedDetail } from '../capture/types';
import { formatSeasonLabel as seasonName, formatSeasonRange } from '../utils/harvestSeason';
import { athensCalendarDateKey } from '../utils/athensDate';
import { formatGroveLitres, formatGroveMassKg } from '../utils/groveTotals';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { resolveFieldColor } from '../utils/fieldColors';
import { formatFieldArea } from '../utils/fieldGeo';
import {
  addExpense,
  addIncome,
  addMillWeight,
  addNote,
  addOil,
  addPeople,
  addSack,
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
  pruneCampaignToKnownFields,
} from '../harvestCampaign/hydrateFromRecords';
import { allDaySummaries, campaignTotals, daySummary, fieldSummaries, harvestDayNumber, oilAmountToKg } from '../harvestCampaign/totals';
import { convertOliveOilKgToLitres, formatHarvestYieldPercent } from '../harvestCampaign/utils/harvestCalculations';
import type { HarvestCaptureKind, HarvestFieldShare, HarvestModeView } from '../harvestCampaign/types';
import { harvestExpenseCaptureContext, harvestIncomeCaptureContext, harvestNoteCaptureContext, shouldMirrorHarvestExpense, shouldMirrorHarvestIncome, shouldMirrorHarvestNote } from '../harvestCampaign/harvestMoneyCapture';
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
import { HarvestStatStrip } from '../harvestCampaign/components/HarvestStatStrip';
import {
  HarvestDayActivity,
  type DayActivityEditTarget,
} from '../harvestCampaign/components/HarvestDayActivity';
import { HistoricalHarvestDayBoard } from '../harvestCampaign/components/HistoricalHarvestDayBoard';
import HarvestOpening from '../harvestCampaign/components/HarvestOpening';
import { HarvestShareRequestCard } from '../harvestCampaign/components/HarvestShareRequestCard';
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
  const { t } = useTranslation(['fields', 'common', 'capture', 'chronologio', 'myOil']);
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
  const [opening, setOpening] = useState(false);
  const [serverHarvestHint, setServerHarvestHint] = useState(false);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [view, setView] = useState<HarvestModeView>('today');
  const [sheet, setSheet] = useState<HarvestSheetKind>(null);
  const [saving, setSaving] = useState(false);
  const [doneBanner, setDoneBanner] = useState(false);
  const [openLogDate, setOpenLogDate] = useState<string | null>(null);
  const [linkMillId, setLinkMillId] = useState<string | null>(null);
  const [linkMillFieldIds, setLinkMillFieldIds] = useState<string[]>([]);
  const [prefillSackIds, setPrefillSackIds] = useState<string[]>([]);
  const [prefillMillIds, setPrefillMillIds] = useState<string[]>([]);
  const [postMillId, setPostMillId] = useState<string | null>(null);
  const [sackSavedHint, setSackSavedHint] = useState<string | null>(null);
  const [oilSavedHint, setOilSavedHint] = useState<string | null>(null);
  const [shareSource, setShareSource] = useState<OilShareSource | null>(null);
  const [adminShareInbox, setAdminShareInbox] = useState<OilShareRequest[]>([]);
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
      const groveList = await getFieldService().getFields('harvest').catch(() => [] as Field[]);
      setFields(groveList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // H2/H3: hydrate shared production from server harvest-records (all fields, this season).
  // Also prune stale localStorage field ids (retired parcels) so the journey matches Fields.
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
        const hydrated =
          seasonRows.length > 0
            ? campaignFromHarvestRecords(seasonRows, seasonStartYear)
            : null;
        let stillIdle = false;
        patchRef.current((current) => {
          const merged = hydrated
            ? mergeCampaignWithHydrated(current, hydrated)
            : current;
          const pruned = pruneCampaignToKnownFields(merged, fieldIds);
          stillIdle = pruned.status === 'idle';
          return pruned;
        });
        if (!cancelled) setServerHarvestHint(Boolean(hydrated) && stillIdle);
      } catch {
        if (!cancelled) {
          patchRef.current((current) => pruneCampaignToKnownFields(current, fieldIds));
          setServerHarvestHint(false);
        }
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
  const campaignFieldIds = useMemo(
    () => (campaign.fieldOrder.length ? campaign.fieldOrder : sheetFields.map((f) => f.id)),
    [campaign.fieldOrder, sheetFields]
  );

  useEffect(() => {
    if (!isLive || campaignFieldIds.length === 0) {
      setShareSource(null);
      setAdminShareInbox([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [source, requests] = await Promise.all([
          oilStockService.getShareSource(campaignFieldIds).catch(() => null),
          oilStockService.listShareRequests(true).catch(() => [] as OilShareRequest[]),
        ]);
        if (cancelled) return;
        const avail = source?.available;
        const hasFree =
          !!avail &&
          (avail.tin16 > 0 || avail.tin17 > 0 || avail.bulkLitres > 0.05 || avail.litres > 0.05);
        setShareSource(hasFree && source ? source : null);
        setAdminShareInbox(requests.filter((r) => r.isIncoming && r.status === 'pending'));
      } catch {
        if (!cancelled) {
          setShareSource(null);
          setAdminShareInbox([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLive, campaignFieldIds.join('|'), oilSavedHint]);

  const totals = useMemo(() => campaignTotals(campaign), [campaign]);
  const fieldRows = useMemo(
    () => fieldSummaries(campaign, campaign.fieldOrder),
    [campaign]
  );
  const activeRow = useMemo(() => daySummary(campaign, workingDay), [campaign, workingDay]);
  const dayClosed = false;
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
  const canPrevDay = workingDay > harvestStripFloor(today);
  const canNextDay = workingDay < harvestStripCeiling(today);
  const logs = useMemo(() => allDaySummaries(campaign), [campaign]);
  const chainStatus = useMemo(() => harvestChainStatus(campaign), [campaign]);

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

  const selectView = useCallback(
    (next: HarvestModeView) => {
      setView(next);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'today') p.delete('view');
          else p.set('view', next);
          if (next !== 'fields') p.delete('grove');
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const groveFilter = searchParams.get('grove');
  const setGroveFilter = useCallback(
    (fieldId: string | null) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('view', 'fields');
          if (fieldId) p.set('grove', fieldId);
          else p.delete('grove');
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (!isLive) return;
    const viewParam = searchParams.get('view');
    if (viewParam === 'fields' || viewParam === 'log' || viewParam === 'totals') {
      setView(viewParam);
      return;
    }
    setView('today');
    if (viewParam === 'today') {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (next.get('view') !== 'today') return prev;
          next.delete('view');
          return next;
        },
        { replace: true }
      );
    }
  }, [isLive, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isLive) return;
    const add = searchParams.get('add');
    if (add !== '1') return;
    setView('today');
    setSheet('add');
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('add');
        next.delete('evening');
        next.delete('view');
        return next;
      },
      { replace: true }
    );
  }, [isLive, searchParams, setSearchParams]);

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

  const ensureDayOpen = () => true;

  const beginHarvest = () => {
    start({ fieldOrder: pickedIds });
    setSetupStep(0);
    selectView('today');
    setOpening(true);
  };

  const closeOpening = useCallback(() => setOpening(false), []);

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

  const openHarvestIncome = () => {
    if (!harvestCaps.canAddIncome) return;
    closeSheet();
    const fieldId = resolveHarvestCaptureFieldId({
      preferredFieldId: searchParams.get('fieldId'),
      campaignFieldOrder: campaign.fieldOrder,
      allowedFieldIds: sheetFields.map((f) => f.id),
    });
    moneyCapture?.openCapture(
      harvestIncomeCaptureContext({
        campaign,
        fieldId: fieldId || undefined,
        today: workingDay,
        description: t('harvestCampaign.income.moneyDescription'),
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
    if (kind === 'income') {
      openHarvestIncome();
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
    if (kind === 'income') {
      openHarvestIncome();
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
    if (kind === 'sacks' || kind === 'mill' || kind === 'oil') {
      setSheet('produce');
      return;
    }
    setSheet('add');
  };

  const openDayEdit = (target: DayActivityEditTarget) => {
    if (target.kind === 'expense' || target.kind === 'income' || target.kind === 'note') return;
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
    else if (target.kind === 'income') return;
    else patch((current) => removeNote(current, target.entry.id));
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
    cellarOwnerUserId?: string;
    cellarOwnerDisplayName?: string;
    cellarIsYou?: boolean;
    cellarAllocations?: { cellarOwnerUserId: string; litres: number }[];
  },
    opts?: { existingId?: string; keepOpen?: boolean }
  ) => {
    setSaving(true);
    const oilId = opts?.existingId || (editTarget?.kind === 'oil' ? editTarget.entry.id : undefined);
    if (oilId) {
      const existing = campaign.oils.find((o) => o.id === oilId);
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
          cellarOwnerUserId: input.cellarOwnerUserId,
          cellarAllocations: input.cellarAllocations,
        })
      );
      if (existing?.batchId) {
        try {
          const { upsertOilLotFromEntry } = await import('../myOil/syncOilLots');
          await upsertOilLotFromEntry(
            {
              ...existing,
              ...input,
              cellarOwnerUserId: input.cellarOwnerUserId,
              batchId: existing.batchId,
            },
            existing.harvestRecordIds?.length
              ? existing.harvestRecordIds
              : existing.harvestRecordId
                ? [existing.harvestRecordId]
                : []
          );
        } catch {
          /* local campaign updated; cellar sync can retry */
        }
      }
      setSaving(false);
      if (!opts?.keepOpen) {
        announceOilCellar(input);
        closeSheet();
      }
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
      cellarOwnerUserId: input.cellarOwnerUserId,
      cellarAllocations: input.cellarAllocations,
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
    announceOilCellar(input);
    closeSheet();
    return entry.id;
  };

  const announceOilCellar = (input: {
    cellarIsYou?: boolean;
    cellarOwnerDisplayName?: string;
    cellarOwnerUserId?: string;
  }) => {
    const isYou =
      input.cellarIsYou !== false &&
      (!input.cellarOwnerUserId || input.cellarOwnerUserId === user?.userId);
    if (isYou) {
      setOilSavedHint(t('harvestCampaign.oil.cellarYou'));
    } else {
      setOilSavedHint(
        t('harvestCampaign.oil.cellarAssigned', {
          name: input.cellarOwnerDisplayName || t('harvestCampaign.oil.cellarSomeone', { defaultValue: '…' }),
        })
      );
    }
    window.setTimeout(() => setOilSavedHint(null), 5200);
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
      if (shouldMirrorHarvestExpense(detail) || shouldMirrorHarvestIncome(detail)) {
        const amountEur = detail.amount;
        const transactionId = detail.sourceId;
        if (!transactionId || amountEur == null) return;
        const entry = {
          id: newHarvestEntryId(),
          date: detail.occurredOn || workingDay,
          amountEur,
          note: detail.description,
          transactionId,
          createdAt: new Date().toISOString(),
        };
        patch((current) => {
          if (detail.type === 'income') {
            if (current.incomes.some((row) => row.transactionId === transactionId)) return current;
            return addIncome(current, entry);
          }
          if (current.expenses.some((row) => row.transactionId === transactionId)) return current;
          return addExpense(current, entry);
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
              <div className="hc-mode-toolbar">
              <nav className="hc-mode-nav hc-mode-nav-top" aria-label={t('harvestCampaign.nav.label')}>
                {(['today', 'fields', 'totals', 'log'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`hc-mode-tab${view === item ? ' is-on' : ''}`}
                    onClick={() => selectView(item)}
                  >
                    {t(`harvestCampaign.nav.${item}`)}
                  </button>
                ))}
              </nav>
                <button
                  type="button"
                  className={`hc-record-cta${
                    dayClosed || harvestCaps.captureKinds.length === 0 ? ' is-locked' : ''
                  }`}
                  aria-label={t('harvestCampaign.nav.record')}
                  onClick={() => {
                    if (harvestCaps.captureKinds.length === 0) return;
                    requestAdd();
                  }}
                >
                  <Plus size={18} aria-hidden />
                  {t('harvestCampaign.nav.record')}
                </button>
              </div>
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
                {sackSavedHint || oilSavedHint ? (
                  <p className="hc-chain-toast" role="status">
                    {oilSavedHint || sackSavedHint}
                    {oilSavedHint ? (
                      <>
                        {' · '}
                        <Link to="/my-oil" className="hc-chain-toast__link">
                          {t('myOil:seeCellar')}
                        </Link>
                      </>
                    ) : null}
                  </p>
                ) : null}

                {harvestCaps.editRestrictionReasonKey ? (
                  <p className="hc-view-only-banner" role="status">
                    {t(`harvestCampaign.permissions.${harvestCaps.editRestrictionReasonKey}`)}
                  </p>
                ) : null}

                {adminShareInbox.length > 0 ? (
                  <p className="hc-chain-toast" role="status">
                    {t('harvestCampaign.shareRequest.adminBanner', {
                      name: adminShareInbox[0].toDisplayName || '…',
                      count: adminShareInbox.length,
                    })}
                    {' · '}
                    <Link to="/my-oil" className="hc-chain-toast__link">
                      {t('myOil:seeCellar')}
                    </Link>
                  </p>
                ) : null}

                {shareSource ? (
                  <HarvestShareRequestCard
                    fieldIds={campaignFieldIds}
                    source={shareSource}
                    onSubmitted={() => {
                      setOilSavedHint(t('harvestCampaign.shareRequest.sent'));
                      window.setTimeout(() => setOilSavedHint(null), 4200);
                    }}
                  />
                ) : null}

                <section
                  className="hc-day-summary"
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

                  <HarvestStatStrip
                    label={t('harvestCampaign.nav.today')}
                    items={[
                      {
                        id: 'sacks',
                        icon: Package,
                        value: activeRow.sacks > 0 ? formatGroveMassKg(activeRow.sacks, locale) : '—',
                        label: t('harvestCampaign.actions.sacks'),
                        hint:
                          activeRow.estimatedKg > 0 && activeRow.officialKg <= 0
                            ? t('harvestCampaign.approx', {
                                kg: formatGroveMassKg(activeRow.estimatedKg, locale),
                              })
                            : undefined,
                      },
                      {
                        id: 'people',
                        icon: Users,
                        value: activeRow.people > 0 ? formatGroveMassKg(activeRow.people, locale) : '—',
                        label: t('harvestCampaign.actions.people'),
                      },
                      {
                        id: 'mill',
                        icon: Scale,
                        value:
                          activeRow.officialKg > 0
                            ? formatGroveMassKg(activeRow.officialKg, locale)
                            : '—',
                        label: t('harvestCampaign.flow.unitKg'),
                      },
                      {
                        id: 'oil',
                        icon: Droplets,
                        value:
                          activeRow.oilKg > 0
                            ? formatGroveMassKg(
                                Math.round(convertOliveOilKgToLitres(activeRow.oilKg)),
                                locale
                              )
                            : '—',
                        label: t('harvestCampaign.flow.unitOilLitres'),
                      },
                    ]}
                  />

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

                {harvestCaps.canPause || harvestCaps.canCompleteSeason ? (
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
                ) : null}

              </section>
            ) : null}

            {view === 'totals' ? (
              <section className="hc-live-home hc-season">
                <header className="hc-panel-head">
                  <p className="hc-kicker">{t('harvestCampaign.nav.totals')}</p>
                  <h1 className="hc-page-title">{t('harvestCampaign.dashboard.seasonTitle')}</h1>
                  <p className="hc-help">{t('harvestCampaign.dashboard.seasonLead')}</p>
                </header>
                <div className="hc-season-strips">
                  <HarvestStatStrip
                    label={t('harvestCampaign.nav.totals')}
                    items={[
                      {
                        id: 'sacks',
                        icon: Package,
                        value:
                          campaign.sacks.reduce((sum, row) => sum + row.sacks, 0) > 0
                            ? formatGroveMassKg(
                                campaign.sacks.reduce((sum, row) => sum + row.sacks, 0),
                                locale
                              )
                            : '—',
                        label: t('harvestCampaign.actions.sacks'),
                      },
                      {
                        id: 'mill',
                        icon: Scale,
                        value:
                          totals.officialKg > 0 ? formatGroveMassKg(totals.officialKg, locale) : '—',
                        label: t('harvestCampaign.flow.unitKg'),
                      },
                      {
                        id: 'oil',
                        icon: Droplets,
                        value:
                          totals.oilKg > 0
                            ? formatGroveMassKg(
                                Math.round(convertOliveOilKgToLitres(totals.oilKg)),
                                locale
                              )
                            : '—',
                        label: t('harvestCampaign.flow.unitOilLitres'),
                      },
                      {
                        id: 'yield',
                        icon: Percent,
                        value:
                          totals.extractionYield != null
                            ? `${formatHarvestYieldPercent(totals.extractionYield, locale)}%`
                            : '—',
                        label: t('harvestCampaign.dashboard.yieldLabel'),
                      },
                    ]}
                  />
                  <HarvestStatStrip
                    label={t('harvestCampaign.dashboard.seasonLead')}
                    items={[
                      {
                        id: 'days',
                        icon: CalendarDays,
                        value: formatGroveMassKg(totals.harvestDays || days, locale),
                        label: t('harvestCampaign.flow.days'),
                      },
                      {
                        id: 'people',
                        icon: Users,
                        value:
                          totals.personDays > 0 ? formatGroveMassKg(totals.personDays, locale) : '—',
                        label: t('harvestCampaign.complete.personDaysLabel'),
                      },
                      {
                        id: 'expense',
                        icon: Wallet,
                        value:
                          totals.expenseEur > 0
                            ? `${formatGroveMassKg(totals.expenseEur, locale)} €`
                            : '—',
                        label: t('harvestCampaign.actions.expense'),
                      },
                      {
                        id: 'cost',
                        icon: CircleDollarSign,
                        value:
                          totals.officialKg > 0 && totals.expenseEur > 0
                            ? `${(totals.expenseEur / totals.officialKg).toLocaleString(locale, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} €`
                            : '—',
                        label: t('harvestCampaign.dashboard.costPerKgLabel'),
                      },
                    ]}
                  />
                </div>
                {fieldRows.length > 0 ? (
                  <div className="hc-grove-board">
                    <h2>{t('harvestCampaign.flow.fields')}</h2>
                    <ul>
                      {fieldRows.map((row) => {
                        const field = sheetFields.find((item) => item.id === row.fieldId);
                        const color = resolveFieldColor(field?.color, row.fieldId);
                        const rowLitres =
                          row.oilKg > 0
                            ? formatGroveMassKg(
                                Math.round(convertOliveOilKgToLitres(row.oilKg)),
                                locale
                              )
                            : null;
                        return (
                          <li key={row.fieldId} style={{ ['--hc-grove' as string]: color }}>
                            <header>
                              <i aria-hidden />
                              <strong>{labelOf(row.fieldId)}</strong>
                            </header>
                            <dl>
                              <div>
                                <dt>{t('harvestCampaign.actions.sacks')}</dt>
                                <dd>{row.sacks > 0 ? formatGroveMassKg(row.sacks, locale) : '—'}</dd>
                              </div>
                              <div>
                                <dt>{t('harvestCampaign.flow.unitKg')}</dt>
                                <dd>
                                  {row.officialKg > 0
                                    ? formatGroveMassKg(row.officialKg, locale)
                                    : '—'}
                                </dd>
                              </div>
                              <div>
                                <dt>{t('harvestCampaign.flow.unitOilLitres')}</dt>
                                <dd>{rowLitres ?? '—'}</dd>
                              </div>
                            </dl>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                {totals.unweighedSacks > 0 || totals.millKgWithoutOil > 0 ? (
                  <div className="hc-pending-card">
                    <h2>{t('harvestCampaign.dashboard.needs')}</h2>
                    {totals.unweighedSacks > 0 ? (
                      <button
                        type="button"
                        className="hc-pending-link"
                        onClick={() => requestAdd({ preferredKind: 'mill', section: 'totals' })}
                      >
                        {t('harvestCampaign.dashboard.unweighed', { count: totals.unweighedSacks })}
                      </button>
                    ) : null}
                    {totals.millKgWithoutOil > 0 ? (
                      <button
                        type="button"
                        className="hc-pending-link"
                        onClick={() => requestAdd({ preferredKind: 'oil', section: 'totals' })}
                      >
                        {t('harvestCampaign.dashboard.needOil', {
                          kg: formatGroveMassKg(totals.millKgWithoutOil, locale),
                        })}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {view === 'fields' ? (
              <section className="hc-live-home">
                <HarvestFlowView
                  campaign={campaign}
                  fields={sheetFields.length > 0 ? sheetFields : fields}
                  locale={locale}
                  fieldFilterId={groveFilter}
                  onFieldFilter={setGroveFilter}
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
                          className={`hc-log-card${workingDay === row.date ? ' is-selected' : ''}`}
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
                              ? ` · ${formatGroveLitres(convertOliveOilKgToLitres(row.oilKg), locale)}`
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
                                  {formatGroveLitres(
                                    convertOliveOilKgToLitres(oilAmountToKg(item)),
                                    locale
                                  )}
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
                                selectView('today');
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
          {sheet === 'complete' ? (
            <HarvestCompleteSheet
              officialKg={totals.officialKg}
              oilKg={totals.oilKg}
              yieldPct={totals.extractionYield}
              days={totals.harvestDays || days}
              personDays={totals.personDays}
              expenseEur={totals.expenseEur}
              unweighedSacks={totals.unweighedSacks}
              openDays={0}
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

      {opening ? (
        <HarvestOpening seasonLabel={seasonName(seasonStartYear)} onClose={closeOpening} />
      ) : null}

      {saving ? <span className="sr-only">{t('capture:saving')}</span> : null}
    </PageContainer>
  );
};

export default HarvestCampaignPage;
