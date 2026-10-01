import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, DeviceEventEmitter } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/layout/ScreenLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/ui/Button';
import Sheet from '../components/ui/Sheet';
import HarvestOpening from '../harvestCampaign/components/HarvestOpening';
import { HarvestShareRequestCard } from '../harvestCampaign/components/HarvestShareRequestCard';
import { HarvestStart } from '../harvestCampaign/components/HarvestStart';
import { HarvestModeSwitcher } from '../harvestCampaign/components/HarvestModeSwitcher';
import { HarvestSeasonSummary } from '../harvestCampaign/components/HarvestSeasonSummary';
import { HarvestDaySummary } from '../harvestCampaign/components/HarvestDaySummary';
import { HarvestCampaignHeader } from '../harvestCampaign/components/HarvestCampaignHeader';
import { useTheme } from '../context/ThemeContext';
import { useHarvestCampaign } from '../context/HarvestCampaignContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { useDock } from '../navigation/DockContext';
import { useFields } from '../hooks/useFields';
import { getHarvestService } from '../services/serviceFactory';
import {
  oilStockService,
  type OilShareRequest,
  type OilShareSource,
} from '../services/oilStockService';
import type { HarvestRecord } from '../services/harvestService';
import { CAPTURE_SAVED_EVENT, type CaptureSavedDetail } from '../capture/types';
import { formatSeasonLabel, formatSeasonShortLabel } from '../utils/harvestSeason';
import { athensCalendarDateKey } from '../utils/athensDate';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { formatKg } from '../utils/harvestUtils';
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
  harvestExpenseCaptureContext,
  harvestIncomeCaptureContext,
  harvestNoteCaptureContext,
  shouldMirrorHarvestExpense,
  shouldMirrorHarvestIncome,
  shouldMirrorHarvestNote,
} from '../harvestCampaign/harvestMoneyCapture';
import {
  persistMillRecord,
  persistOilRecord,
  persistPeopleRecord,
  persistSackRecord,
} from '../harvestCampaign/persist';
import {
  campaignTotals,
  daySummary,
  harvestDayNumber,
} from '../harvestCampaign/totals';
import {
  clampHarvestNavDay,
  harvestDayStripRows,
  harvestStripCeiling,
  harvestStripFloor,
  harvestStripWindow,
  isAthensDateKey,
  shiftHarvestWorkingDay,
} from '../harvestCampaign/workingDay';
import {
  findPostedHarvestRecord,
  harvestRecordsForDay,
  resolveHistoricalHarvestLink,
} from '../harvestCampaign/historicalDay';
import type {
  HarvestCaptureKind,
  HarvestFieldShare,
  HarvestModeView,
  HarvestOilUnit,
  HarvestPeopleHours,
} from '../harvestCampaign/types';
import { getHarvestCapabilities } from '../harvestCampaign/harvestCapabilities';
import { harvestSeatFromFields, resolveFieldGates } from '../utils/fieldGates';
import { useFamilyMembershipModules, useActiveFieldAccessLevel } from '../hooks/useFamilyMembershipModules';
import {
  HarvestAddMenu,
  HarvestCompleteSheet,
  HarvestDayStrip,
  HarvestMillLinkSheet,
  HarvestMillNextSheet,
  HarvestMillSheet,
  HarvestOilSheet,
  HarvestPeopleSheet,
  HarvestProductionWizard,
  HarvestRecordSheet,
  HarvestSacksSheet,
  type HarvestSheetKind,
} from '../harvestCampaign/HarvestSheets';
import { HarvestCard } from '../harvestCampaign/components/HarvestCard';
import { HistoricalHarvestDayBoard } from '../harvestCampaign/components/HistoricalHarvestDayBoard';
import {
  campaignFromHarvestRecords,
  fetchHarvestRecordsForFields,
  filterSeasonHarvestRecords,
  mergeCampaignWithHydrated,
} from '../harvestCampaign/hydrateFromRecords';
import { resolveHarvestTotalsLifecycle } from '../harvestCampaign/lifecycleActions';
import {
  HarvestDayActivity,
  type DayActivityEditTarget,
  type DayActivityKind,
} from '../harvestCampaign/components/HarvestDayActivity';
import { formatFieldArea } from '../utils/fieldGeo';
import { spacing, radii, typography } from '../theme';
import type { FieldsStackParamList } from '../navigation/types';
import { openChronologioHome } from '../navigation/intents';

type HarvestAddPrefill = {
  preferredKind?: HarvestCaptureKind;
  sackIds?: string[];
  millIds?: string[];
};

const HarvestCampaignScreen = () => {
  const { colors, tapMin } = useTheme();
  const { setAdd } = useDock();
  const { t, i18n } = useTranslation(['fields', 'common', 'chronologio']);
  const locale = i18n.language || 'en';
  const { user, isFieldOwner } = useAuth();
  const familyModules = useFamilyMembershipModules();
  const accessLevel = useActiveFieldAccessLevel();
  const { fields, loading: fieldsLoading } = useFields('harvest');
  const { campaign, seasonStartYear, isLive, start, stop, pause, resume, markGroveDone, patch } =
    useHarvestCampaign();
  const moneyCapture = useCaptureOptional();
  const route = useRoute<RouteProp<FieldsStackParamList, 'HarvestCampaign'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [linkMillId, setLinkMillId] = useState<string | null>(null);
  const [linkMillFieldIds, setLinkMillFieldIds] = useState<string[]>([]);
  const [prefillSackIds, setPrefillSackIds] = useState<string[]>([]);
  const [prefillMillIds, setPrefillMillIds] = useState<string[]>([]);
  const [addPrefill, setAddPrefill] = useState<HarvestAddPrefill | null>(null);
  const [postMillId, setPostMillId] = useState<string | null>(null);
  const [sackSavedHint, setSackSavedHint] = useState<string | null>(null);
  const [shareSource, setShareSource] = useState<OilShareSource | null>(null);
  const [adminShareInbox, setAdminShareInbox] = useState<OilShareRequest[]>([]);
  const [deepLinkRecord, setDeepLinkRecord] = useState<HarvestRecord | null>(null);
  const [deepLinkRecordMissing, setDeepLinkRecordMissing] = useState(false);
  const [historicalDayRecords, setHistoricalDayRecords] = useState<HarvestRecord[]>([]);
  const [historicalDayLoading, setHistoricalDayLoading] = useState(false);
  const [setupStep, setSetupStep] = useState<0 | 1 | 2>(0);
  const [opening, setOpening] = useState(false);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [view, setView] = useState<HarvestModeView>('today');
  const [sheet, setSheet] = useState<HarvestSheetKind>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(route.params?.day || null);
  const [doneBanner, setDoneBanner] = useState(campaign.status === 'closed');
  const [preferredFieldId, setPreferredFieldId] = useState<string | undefined>(route.params?.fieldId);
  const [editTarget, setEditTarget] = useState<DayActivityEditTarget | null>(null);

  const today = athensCalendarDateKey(new Date());
  const historicalLink = useMemo(
    () =>
      resolveHistoricalHarvestLink({
        day: route.params?.day,
        fieldId: route.params?.fieldId,
        harvestId: route.params?.harvestId,
      }),
    [route.params?.day, route.params?.fieldId, route.params?.harvestId]
  );
  const showHistoricalDay =
    !isLive && (historicalLink.kind === 'day' || historicalLink.kind === 'dayMissing');
  const workingDay = showHistoricalDay
    ? historicalLink.kind === 'day' || historicalLink.kind === 'dayMissing'
      ? historicalLink.day
      : today
    : clampHarvestNavDay(selectedDay, today);
  const harvestable = useMemo(
    () => fields.filter((field) => field.status !== 'Draft' && field.status !== 'Archived'),
    [fields]
  );
  const campaignFieldIds = useMemo(
    () =>
      campaign.fieldOrder.length > 0
        ? campaign.fieldOrder
        : harvestable.map((f) => f.id),
    [campaign.fieldOrder, harvestable]
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
  }, [isLive, campaignFieldIds.join('|')]);

  const harvestCaps = useMemo(() => {
    const seat = harvestSeatFromFields(fields, preferredFieldId);
    if (seat) {
      return getHarvestCapabilities({
        hasAnyFieldAccess: fields.length > 0,
        canOwn: seat.canOwn,
        canWork: seat.canWork,
        familyModules,
        accessLevel: seat.accessLevel ?? accessLevel,
        harvestModuleGranted: seat.harvestModuleGranted,
      });
    }
    return getHarvestCapabilities({
      hasAnyFieldAccess: fields.length > 0,
      canOwn:
        isFieldOwner() ||
        user?.role === 'Administrator' ||
        fields.some((field) => field.ownerId === user?.id),
      canWork:
        user?.role === 'Producer' ||
        user?.role === 'FieldOwner' ||
        user?.role === 'Administrator' ||
        accessLevel === 'work' ||
        accessLevel === 'help',
      familyModules,
      accessLevel,
    });
  }, [fields, preferredFieldId, isFieldOwner, user?.id, user?.role, familyModules, accessLevel]);
  const patchRef = useRef(patch);
  patchRef.current = patch;

  useEffect(() => {
    if (harvestable.length === 0) return;
    let cancelled = false;
    const fieldIds = harvestable.map((field) => field.id);
    void (async () => {
      try {
        const rows = await fetchHarvestRecordsForFields(fieldIds);
        if (cancelled) return;
        const seasonRows = filterSeasonHarvestRecords(rows, seasonStartYear);
        if (seasonRows.length === 0) return;
        const hydrated = campaignFromHarvestRecords(seasonRows, seasonStartYear);
        patchRef.current((current) => mergeCampaignWithHydrated(current, hydrated));
      } catch {
        // Local campaign stays as-is if hydrate fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [harvestable, seasonStartYear]);

  useEffect(() => {
    if (setupStep !== 1) return;
    const allowed = new Set(harvestable.map((field) => field.id));
    const previous = campaign.fieldOrder.filter((id) => allowed.has(id));
    setPickedIds(previous.length ? previous : harvestable.map((field) => field.id));
  }, [setupStep, harvestable, campaign.fieldOrder]);

  useEffect(() => {
    const day = route.params?.day;
    if (day && isAthensDateKey(day)) setSelectedDay(day);
  }, [route.params?.day]);

  // Do not mirror workingDay → params in a loop; selectWorkingDay writes params explicitly.
  const totals = useMemo(() => campaignTotals(campaign), [campaign]);
  const activeRow = useMemo(() => daySummary(campaign, workingDay), [campaign, workingDay]);
  const stripBounds = useMemo(
    () => harvestStripWindow(workingDay, campaign, today),
    [workingDay, campaign, today]
  );
  const stripRows = useMemo(
    () => harvestDayStripRows(campaign, today, stripBounds),
    [campaign, today, stripBounds]
  );
  const showDayStrip = isLive && view === 'today';
  const days = harvestDayNumber(campaign, workingDay);
  const canPrevDay = workingDay > harvestStripFloor(today);
  const canNextDay = workingDay < harvestStripCeiling(today);
  const labelOf = useCallback(
    (id: string) => friendlyFieldLabel(harvestable.find((f) => f.id === id)?.name || id),
    [harvestable]
  );
  const fieldOf = useCallback(
    (id: string) => {
      const field = harvestable.find((item) => item.id === id);
      return { id, name: field?.name || id, color: field?.color };
    },
    [harvestable]
  );

  useEffect(() => {
    if (campaign.status === 'closed') setDoneBanner(true);
  }, [campaign.status]);

  useEffect(() => {
    if (route.params?.fieldId) setPreferredFieldId(route.params.fieldId);
  }, [route.params?.fieldId]);

  useEffect(() => {
    if (!isLive) return;
    const viewParam = route.params?.view;
    if (!viewParam) return;
    // Legacy deep links: fields/totals → season; log → today (records tab removed).
    if (viewParam === 'season' || viewParam === 'fields' || viewParam === 'totals') {
      setView('season');
    } else if (viewParam === 'today' || viewParam === 'log') {
      setView('today');
    }
  }, [isLive, route.params?.view]);

  useEffect(() => {
    if (!isLive) return;
    const add = route.params?.add;
    if (!add) return;
    setView('today');
    setAddPrefill(null);
    setSheet('add');
    navigation.setParams({ add: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot from params
  }, [isLive, route.params?.add]);

  useEffect(() => {
    const harvestId = route.params?.harvestId;
    const fieldId = route.params?.fieldId;
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
  }, [route.params?.harvestId, route.params?.fieldId]);

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

  const openMillCapture = (sackIds?: string[]) => {
    setEditTarget(null);
    setPrefillMillIds([]);
    setPrefillSackIds(sackIds || []);
    setSheet('mill');
  };

  const openOilCapture = (millIds?: string[]) => {
    setEditTarget(null);
    setPrefillSackIds([]);
    setPrefillMillIds(millIds || []);
    setSheet('oil');
  };

  const clearPreferredField = () => {
    if (route.params?.fieldId) {
      navigation.setParams({ fieldId: undefined });
    }
    setPreferredFieldId(undefined);
  };

  const selectWorkingDay = (day: string) => {
    const clamped = clampHarvestNavDay(day, today);
    setSelectedDay(clamped);
    navigation.setParams({ day: clamped === today ? undefined : clamped });
  };

  const openHarvestExpense = () => {
    const fieldId = preferredFieldId || campaign.fieldOrder[0] || harvestable[0]?.id;
    closeSheet();
    clearPreferredField();
    moneyCapture?.openCapture(
      harvestExpenseCaptureContext({
        campaign,
        fieldId,
        today: workingDay,
        description: t('fields:harvestCampaign.expense.moneyDescription'),
      })
    );
  };

  const openHarvestIncome = () => {
    if (!harvestCaps.canAddIncome) return;
    const fieldId = preferredFieldId || campaign.fieldOrder[0] || harvestable[0]?.id;
    closeSheet();
    clearPreferredField();
    moneyCapture?.openCapture(
      harvestIncomeCaptureContext({
        campaign,
        fieldId,
        today: workingDay,
        description: t('fields:harvestCampaign.income.moneyDescription'),
      })
    );
  };

  const openHarvestNote = () => {
    const fieldId = preferredFieldId || campaign.fieldOrder[0] || harvestable[0]?.id;
    closeSheet();
    clearPreferredField();
    moneyCapture?.openCapture(
      harvestNoteCaptureContext({
        campaign,
        fieldId,
        today: workingDay,
      })
    );
  };

  const requestAdd = (prefill?: HarvestAddPrefill) => {
    if (harvestCaps.captureKinds.length === 0) return;
    setEditTarget(null);
    if (prefill?.preferredKind === 'expense') {
      openHarvestExpense();
      return;
    }
    if (prefill?.preferredKind === 'income') {
      openHarvestIncome();
      return;
    }
    if (prefill?.preferredKind === 'note') {
      openHarvestNote();
      return;
    }
    if (prefill?.preferredKind === 'people') {
      if (!harvestCaps.canAddPeople) return;
      setAddPrefill(null);
      setSheet('people');
      return;
    }
    setAddPrefill(prefill || null);
    if (prefill?.preferredKind === 'sacks' || prefill?.preferredKind === 'mill' || prefill?.preferredKind === 'oil') {
      setSheet('produce');
      return;
    }
    setSheet('add');
  };

  const requestAddRef = useRef(requestAdd);
  requestAddRef.current = requestAdd;
  useEffect(() => {
    if (!isLive || harvestCaps.captureKinds.length === 0) {
      setAdd(null);
      return;
    }
    setAdd({ hideHome: false, onAdd: () => requestAddRef.current() });
    return () => setAdd(null);
  }, [harvestCaps.captureKinds.length, isLive, setAdd]);

  const openCapture = (kind: HarvestCaptureKind) => {
    const sackIds = addPrefill?.sackIds;
    const millIds = addPrefill?.millIds;
    setEditTarget(null);
    if (kind === 'expense') {
      if (!harvestCaps.canAddExpense) return;
      setAddPrefill(null);
      openHarvestExpense();
      return;
    }
    if (kind === 'income') {
      if (!harvestCaps.canAddIncome) return;
      setAddPrefill(null);
      openHarvestIncome();
      return;
    }
    if (kind === 'note') {
      if (!harvestCaps.canAddNote) return;
      setAddPrefill(null);
      openHarvestNote();
      return;
    }
    if (kind === 'people') {
      if (!harvestCaps.canAddPeople) return;
      setAddPrefill(null);
      setPrefillSackIds([]);
      setPrefillMillIds([]);
      setSheet('people');
      return;
    }
    // Production path: σάκια → ελαιόκαρπος → λάδι stays open and advances.
    if (kind === 'sacks' && !harvestCaps.canAddSacks) return;
    if (kind === 'mill' && !harvestCaps.canAddMill) return;
    if (kind === 'oil' && !harvestCaps.canAddOil) return;
    setPrefillSackIds(sackIds ?? []);
    setPrefillMillIds(millIds ?? []);
    setAddPrefill({
      preferredKind: kind,
      sackIds,
      millIds,
    });
    setSheet('produce');
  };

  const openDayAdd = (kind: DayActivityKind) => {
    if (kind === 'sack') openCapture('sacks');
    else if (kind === 'mill') openCapture('mill');
    else if (kind === 'oil') openCapture('oil');
    else openCapture('people');
  };

  const openDayEdit = (target: DayActivityEditTarget) => {
    if (!harvestCaps.canMutateDay) return;
    setEditTarget(target);
    setPrefillSackIds([]);
    setPrefillMillIds([]);
    if (target.kind === 'sack') setSheet('sacks');
    else if (target.kind === 'mill') setSheet('mill');
    else if (target.kind === 'oil') setSheet('oil');
    else setSheet('people');
  };

  const removeDayEntry = (target: DayActivityEditTarget) => {
    if (target.kind === 'sack') void patch((current) => removeSack(current, target.entry.id));
    else if (target.kind === 'mill')
      void patch((current) => removeMillWeight(current, target.entry.id));
    else if (target.kind === 'oil') void patch((current) => removeOil(current, target.entry.id));
    else void patch((current) => removePeople(current, target.entry.id));
  };

  const openPendingCapture = (kind: 'mill' | 'oil') => {
    setView('today');
    setSheet(kind);
  };

  useEffect(() => {
    if (!isLive) return;
    const sub = DeviceEventEmitter.addListener(CAPTURE_SAVED_EVENT, (detail: CaptureSavedDetail) => {
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
        void patch((current) => {
          if (detail.type === 'income') {
            if ((current.incomes || []).some((row) => row.transactionId === transactionId)) return current;
            return addIncome(current, entry);
          }
          if (current.expenses.some((row) => row.transactionId === transactionId)) return current;
          return addExpense(current, entry);
        });
        return;
      }
      if (!shouldMirrorHarvestNote(detail) || !detail.sourceId) return;
      void patch((current) => {
        if (current.notes.some((row) => row.noteId === detail.sourceId)) return current;
        return addNote(current, {
          id: newHarvestEntryId(),
          date: detail.occurredOn || workingDay,
          body: detail.description,
          noteId: detail.sourceId,
          createdAt: new Date().toISOString(),
        });
      });
    });
    return () => sub.remove();
  }, [isLive, workingDay, patch]);

  const saveSacks = async (
    input: { sacks: number; fieldId: string; kgPerSack?: number },
    opts?: { existingId?: string; keepOpen?: boolean }
  ): Promise<string> => {
    const sackId = opts?.existingId || (editTarget?.kind === 'sack' ? editTarget.entry.id : undefined);
    if (sackId) {
      await patch((current) =>
        updateSack(current, sackId, {
          sacks: input.sacks,
          fieldId: input.fieldId,
          kgPerSack: input.kgPerSack,
        })
      );
      if (!opts?.keepOpen) closeSheet();
      return sackId;
    }
    const entry = {
      id: newHarvestEntryId(),
      date: workingDay,
      fieldId: input.fieldId,
      sacks: input.sacks,
      kgPerSack: input.kgPerSack || campaign.usualSackKg || 45,
      createdAt: new Date().toISOString(),
    };
    const harvestRecordId = await persistSackRecord(campaign, entry);
    await patch((current) => addSack(current, { ...entry, harvestRecordId }));
    clearPreferredField();
    if (opts?.keepOpen) return entry.id;
    const otherPending = unconfirmedSacks(campaign).filter((s) => s.date < workingDay);
    const otherCount = otherPending.reduce((sum, s) => sum + s.sacks, 0);
    setSackSavedHint(
      otherCount > 0
        ? t('fields:harvestCampaign.chain.sacksSavedPlus', { count: otherCount })
        : t('fields:harvestCampaign.chain.sacksSaved')
    );
    setTimeout(() => setSackSavedHint(null), 4200);
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
  ): Promise<string> => {
    const millId = opts?.existingId || (editTarget?.kind === 'mill' ? editTarget.entry.id : undefined);
    if (millId) {
      const previous = campaign.millWeights.find((row) => row.id === millId);
      await patch((current) =>
        updateMillWeight(current, millId, {
          date: previous?.date || (editTarget?.kind === 'mill' ? editTarget.entry.date : workingDay),
          kg: input.kg,
          fieldIds: input.fieldIds,
          fieldShares: input.fieldShares,
          sackIds: input.sackIds,
          receiptRef: input.receiptRef,
          note: input.note,
        })
      );
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
    await patch((current) =>
      addMillWeight(current, {
        ...entry,
        batchId: persisted?.batchId,
        harvestRecordId: persisted?.harvestRecordId,
        harvestRecordIds: persisted?.harvestRecordIds,
      })
    );
    setPrefillSackIds([]);
    clearPreferredField();
    if (opts?.keepOpen) return entry.id;
    closeSheet();
    return entry.id;
  };

  const saveMillLink = (sackIds: string[]) => {
    if (linkMillId) {
      void patch((current) => linkSacksToMill(current, linkMillId, sackIds));
      setLinkMillFieldIds([]);
      closeSheet();
      return;
    }
    setLinkMillFieldIds([]);
    closeSheet();
  };

  const saveOil = async (
    input: {
      amount: number;
      unit: HarvestOilUnit;
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
    },
    opts?: { existingId?: string; keepOpen?: boolean }
  ): Promise<string> => {
    const oilId = opts?.existingId || (editTarget?.kind === 'oil' ? editTarget.entry.id : undefined);
    if (oilId) {
      await patch((current) =>
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
        })
      );
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
      millWeightIds: input.millWeightIds,
      fieldIds: input.fieldIds,
      fieldShares: input.fieldShares,
      millKept: input.millKept,
      tin16Count: input.tin16Count,
      tin17Count: input.tin17Count,
      tinSizeLitres: input.tinSizeLitres,
      tinCount: input.tinCount,
      extraLitres: input.extraLitres,
      acidity: input.acidity,
      note: input.note,
      cellarOwnerUserId: input.cellarOwnerUserId,
      createdAt: new Date().toISOString(),
    };
    const persisted = await persistOilRecord(campaign, entry, related || undefined);
    await patch((current) =>
      addOil(current, {
        ...entry,
        batchId: persisted?.batchId,
        harvestRecordId: persisted?.harvestRecordId,
        harvestRecordIds: persisted?.harvestRecordIds,
      })
    );
    if (!opts?.keepOpen) closeSheet();
    return entry.id;
  };

  const savePeople = async (input: {
    people: number;
    hours: HarvestPeopleHours;
    otherHours?: number;
  }) => {
    if (editTarget?.kind === 'people') {
      await patch((current) =>
        updatePeople(current, editTarget.entry.id, {
          people: input.people,
          hours: input.hours,
          otherHours: input.otherHours,
        })
      );
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
    await patch((current) => addPeople(current, { ...entry, harvestRecordId }));
    closeSheet();
  };

  if (fieldsLoading && fields.length === 0) return <LoadingSpinner />;

  const sheetTitle =
    editTarget != null
      ? t('fields:harvestCampaign.dayActivity.editTitle')
      : sheet === 'add' || sheet === 'produce'
        ? t('fields:harvestCampaign.home.whatAdd')
        : sheet === 'mill-link'
          ? t('fields:harvestCampaign.millKg.linkTitle')
          : sheet === 'mill-next'
            ? t('fields:harvestCampaign.chain.millNextTitle')
            : sheet
              ? t(`fields:harvestCampaign.sheetTitle.${sheet}`)
              : '';

  const sheetKicker =
    sheet && sheet !== 'complete' && sheet !== 'add' && sheet !== 'produce'
      ? new Date(`${workingDay}T12:00:00`).toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      : undefined;

  const shared = {
    campaign,
    fields: harvestable,
    today: workingDay,
    locale,
    onClose: closeSheet,
    preferredFieldId,
  };

  const seasonShort = formatSeasonShortLabel(seasonStartYear);
  const liveStatus =
    campaign.status === 'paused'
      ? t('fields:harvestCampaign.status.paused')
      : t('fields:harvestCampaign.headerOpen');

  const areaLocale: 'el' | 'en' | 'it' = locale.startsWith('en')
    ? 'en'
    : locale.startsWith('it')
      ? 'it'
      : 'el';
  const startFields = harvestable.map((field) => ({
    id: field.id,
    name: friendlyFieldLabel(field.name),
    color: field.color,
    meta: [field.variety, formatFieldArea(field, areaLocale)]
      .filter((part) => part && part !== '—')
      .join(' · '),
  }));

  return (
    <ScreenLayout tabBarInset canvasOpacity={0.08} canvasSettle>
      <HarvestCampaignHeader
        title={t('fields:harvestCampaign.title')}
        season={seasonShort}
        statusLabel={isLive ? liveStatus : undefined}
        statusTone={campaign.status === 'paused' ? 'paused' : 'live'}
        context={
          isLive ? (
            <HarvestModeSwitcher
              value={view}
              onChange={setView}
              ariaLabel={t('fields:harvestCampaign.nav.label')}
              todayLabel={t('fields:harvestCampaign.nav.today')}
              todayHint={t('fields:harvestCampaign.nav.todayHint')}
              seasonLabel={t('fields:harvestCampaign.nav.totals')}
              seasonHint={t('fields:harvestCampaign.nav.totalsHint')}
            />
          ) : undefined
        }
      />
      {!isLive && showHistoricalDay ? (
        <HistoricalHarvestDayBoard
          fieldLabel={labelOf(
            historicalLink.kind === 'day' || historicalLink.kind === 'dayMissing'
              ? historicalLink.fieldId || route.params?.fieldId || ''
              : route.params?.fieldId || ''
          )}
          day={
            historicalLink.kind === 'day' || historicalLink.kind === 'dayMissing'
              ? historicalLink.day
              : workingDay
          }
          records={historicalDayRecords}
          loading={historicalDayLoading}
          onOpenChronologio={() => openChronologioHome(navigation)}
          onOpenRecord={(record) => {
            setDeepLinkRecord(record);
            setDeepLinkRecordMissing(false);
            navigation.setParams({
              fieldId: record.fieldId,
              harvestId: record.id,
              day: athensCalendarDateKey(record.harvestDate),
            });
          }}
        />
      ) : null}

      {!isLive && !showHistoricalDay && deepLinkRecordMissing ? (
        <View style={styles.block}>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            {t('fields:harvestCampaign.historical.missing', {
              defaultValue: 'No harvest records were found for this day.',
            })}
          </Text>
          <Button
            title={t('fields:thisHarvest.openChronologio', { defaultValue: 'History' })}
            onPress={() => openChronologioHome(navigation)}
            fullWidth
          />
        </View>
      ) : null}

      {!isLive && !showHistoricalDay && setupStep === 0 && (doneBanner || campaign.status === 'closed') ? (
        <View style={styles.block}>
          <HarvestCard tone="nudge">
            <Text style={[styles.overline, { color: colors.textTertiary }]}>
              {t('fields:harvestCampaign.complete.finishedTitle')}
            </Text>
            <Text style={[styles.lead, { color: colors.textPrimary }]}>
              {t('fields:harvestCampaign.complete.done')}
            </Text>
            <Button
              title={t('fields:harvestCampaign.complete.review')}
              onPress={() => navigation.navigate('ThisHarvestReview')}
              fullWidth
            />
            <Button
              title={t('fields:harvestCampaign.complete.addNote')}
              variant="ghost"
              onPress={openHarvestNote}
              fullWidth
            />
          </HarvestCard>
        </View>
      ) : null}

      {!isLive && !showHistoricalDay ? (
        <View style={styles.block}>
          <HarvestStart
            step={setupStep}
            fields={startFields}
            pickedIds={pickedIds}
            canStart={harvestCaps.canStart}
            startLabel={
              doneBanner
                ? t('fields:harvestCampaign.complete.startAgain', {
                    defaultValue: t('fields:harvestCampaign.start'),
                  })
                : t('fields:harvestCampaign.start')
            }
            onBegin={() => {
              setDoneBanner(false);
              setSetupStep(1);
            }}
            onToggle={(id) =>
              setPickedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
            }
            onSelectAll={() => setPickedIds(harvestable.map((field) => field.id))}
            onContinue={() => setSetupStep(2)}
            onLater={() => {
              setPickedIds([]);
              setSetupStep(2);
            }}
            onConfirm={() => {
              void start({ fieldOrder: pickedIds });
              setOpening(true);
            }}
            onBack={() => setSetupStep(setupStep === 2 ? 1 : 0)}
            onGoToFields={() =>
              navigation.navigate('Main', { screen: 'Fields', params: { screen: 'FieldsHome' } })
            }
          />
        </View>
      ) : null}

      {isLive ? (
        <>
          <ScrollView
            contentContainerStyle={[styles.block, { paddingBottom: spacing.lg }]}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {view === 'today' ? (
              <View style={{ gap: spacing.lg }}>
                {showDayStrip ? (
                  <HarvestDayStrip
                    selectedDay={workingDay}
                    today={today}
                    stripRows={stripRows}
                    canPrev={canPrevDay}
                    canNext={canNextDay}
                    locale={locale}
                    onSelectDay={selectWorkingDay}
                    onShift={(delta) =>
                      selectWorkingDay(shiftHarvestWorkingDay(workingDay, delta, campaign, today))
                    }
                  />
                ) : null}
                {sackSavedHint ? (
                  <View
                    style={{
                      padding: spacing.md,
                      borderRadius: radii.lg,
                      backgroundColor: colors.eventHarvestSoft,
                    }}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
                      {sackSavedHint}
                    </Text>
                  </View>
                ) : null}

                {adminShareInbox.length > 0 ? (
                  <Pressable
                    onPress={() => navigation.navigate('MyOil')}
                    accessibilityRole="button"
                    accessibilityLabel={t('fields:harvestCampaign.shareRequest.adminChip', {
                      name: adminShareInbox[0].toDisplayName || '…',
                      count: adminShareInbox.length,
                    })}
                    style={({ pressed }) => [
                      styles.adminShareChip,
                      {
                        backgroundColor: colors.eventHarvestSoft,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="water-outline" size={14} color={colors.eventHarvest} />
                    <Text
                      style={[styles.adminShareChipText, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {t('fields:harvestCampaign.shareRequest.adminChip', {
                        name: adminShareInbox[0].toDisplayName || '…',
                        count: adminShareInbox.length,
                      })}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                  </Pressable>
                ) : null}

                {shareSource ? (
                  <HarvestShareRequestCard
                    fieldIds={campaignFieldIds}
                    source={shareSource}
                    onSubmitted={() => setSackSavedHint(t('fields:harvestCampaign.shareRequest.sent'))}
                  />
                ) : null}

                {activeRow.sacks > 0 ||
                activeRow.officialKg > 0 ||
                activeRow.oilKg > 0 ||
                activeRow.people > 0 ? (
                  <HarvestDaySummary
                    day={activeRow}
                    isToday={workingDay === today}
                    fieldRefs={activeRow.fieldIds.map(fieldOf)}
                    onAddSacks={() => openDayAdd('sack')}
                    onAddMill={() => openDayAdd('mill')}
                    onAddOil={() => openDayAdd('oil')}
                  />
                ) : null}

                <HarvestDayActivity
                  campaign={campaign}
                  date={workingDay}
                  fieldOf={fieldOf}
                  onEdit={openDayEdit}
                  onRemove={removeDayEntry}
                  onAdd={openDayAdd}
                  allowedKinds={harvestCaps.captureKinds}
                />
              </View>
            ) : null}

            {view === 'season' ? (
              <HarvestSeasonSummary
                campaign={campaign}
                fields={harvestable}
                totals={totals}
                onNeedsMill={() => openPendingCapture('mill')}
                onNeedsOil={() => openPendingCapture('oil')}
                onAddFields={() =>
                  void patch((current) => ({
                    ...current,
                    fieldOrder: harvestable.map((f) => f.id),
                  }))
                }
                onMarkDone={(fieldId) => void markGroveDone(fieldId)}
                onOpenMill={openMillCapture}
                onOpenOil={openOilCapture}
                onAdd={() => requestAdd()}
                canPause={harvestCaps.canPause}
                canComplete={harvestCaps.canCompleteSeason}
                onPause={() => {
                  if (resolveHarvestTotalsLifecycle('pause') === 'pause') void pause();
                }}
                onResume={() => void resume()}
                onStop={() => {
                  if (resolveHarvestTotalsLifecycle('stop') === 'openComplete') setSheet('complete');
                }}
              />
            ) : null}
          </ScrollView>
        </>
      ) : null}

      <Sheet
        open={Boolean(sheet)}
        onClose={closeSheet}
        title={sheetTitle}
        kicker={sheetKicker}
        subtitle={
          sheet && sheet !== 'add' && sheet !== 'produce' && sheet !== 'complete'
            ? t('fields:harvestCampaign.home.day', { day: days })
            : undefined
        }
        edge="bottom"
        accent
        maxHeightPercent={sheet === 'produce' ? 100 : 92}
        fullScreen={sheet === 'produce'}
        scrollable={
          sheet !== 'sacks' &&
          sheet !== 'mill' &&
          sheet !== 'oil' &&
          sheet !== 'people' &&
          sheet !== 'produce'
        }
        footer={undefined}
      >
        {sheet === 'produce' ? (
          <HarvestProductionWizard
            campaign={campaign}
            fields={shared.fields}
            today={workingDay}
            locale={locale}
            preferredFieldId={preferredFieldId}
            preferredKind={addPrefill?.preferredKind}
            prefillSackIds={addPrefill?.sackIds}
            prefillMillIds={addPrefill?.millIds}
            allowedKinds={harvestCaps.captureKinds}
            onClose={closeSheet}
            onSaveSacks={(input, existingId) => saveSacks(input, { existingId, keepOpen: true })}
            onSaveMill={(input, existingId) => saveMill(input, { existingId, keepOpen: true })}
            onSaveOil={(input, existingId) => saveOil(input, { existingId, keepOpen: true })}
            onOther={(kind) => openCapture(kind)}
          />
        ) : null}
        {sheet === 'add' ? (
          <HarvestAddMenu
            key={`sheet-add-${workingDay}`}
            campaign={campaign}
            allowedKinds={harvestCaps.captureKinds}
            preferredKind={addPrefill?.preferredKind}
            onPick={openCapture}
          />
        ) : null}
        {sheet === 'sacks' ? (
          <HarvestSacksSheet
            key={
              editTarget?.kind === 'sack'
                ? `edit-sack:${editTarget.entry.id}`
                : `sheet-sacks-${workingDay}-${preferredFieldId || ''}`
            }
            {...shared}
            initial={editTarget?.kind === 'sack' ? editTarget.entry : null}
            onSave={(input) => void saveSacks(input)}
          />
        ) : null}
        {sheet === 'mill' ? (
          <HarvestMillSheet
            key={
              editTarget?.kind === 'mill'
                ? `edit-mill:${editTarget.entry.id}`
                : `sheet-mill-${workingDay}-${prefillSackIds.join(',')}`
            }
            {...shared}
            prefillSackIds={prefillSackIds}
            initial={editTarget?.kind === 'mill' ? editTarget.entry : null}
            onSave={(input) => void saveMill(input)}
          />
        ) : null}
        {sheet === 'mill-link' ? (
          <HarvestMillLinkSheet
            key={`sheet-mill-link-${workingDay}-${linkMillId || ''}`}
            {...shared}
            filterFieldIds={linkMillFieldIds.length > 0 ? linkMillFieldIds : undefined}
            onSave={saveMillLink}
          />
        ) : null}
        {sheet === 'mill-next' ? (
          <HarvestMillNextSheet
            key="sheet-mill-next"
            onAddOil={() => openOilCapture(postMillId ? [postMillId] : undefined)}
            onLater={closeSheet}
          />
        ) : null}
        {sheet === 'oil' ? (
          <HarvestOilSheet
            key={
              editTarget?.kind === 'oil'
                ? `edit-oil:${editTarget.entry.id}`
                : `sheet-oil-${workingDay}-${prefillMillIds.join(',')}`
            }
            {...shared}
            prefillMillIds={prefillMillIds}
            initial={editTarget?.kind === 'oil' ? editTarget.entry : null}
            onSave={(input) => void saveOil(input)}
          />
        ) : null}
        {sheet === 'people' ? (
          <HarvestPeopleSheet
            key={
              editTarget?.kind === 'people'
                ? `edit-people:${editTarget.entry.id}`
                : `sheet-people-${workingDay}`
            }
            {...shared}
            initial={editTarget?.kind === 'people' ? editTarget.entry : null}
            onSave={(input) => void savePeople(input)}
          />
        ) : null}
        {sheet === 'complete' ? (
          <HarvestCompleteSheet
            key="sheet-complete"
            officialKg={totals.officialKg}
            oilKg={totals.oilKg}
            yieldPct={totals.extractionYield}
            days={totals.harvestDays}
            personDays={totals.personDays}
            expenseEur={totals.expenseEur}
            unweighedSacks={totals.unweighedSacks}
            locale={locale}
            onFill={() => requestAdd({ preferredKind: 'mill' })}
            onFinish={() => {
              void stop().then(() => {
                setDoneBanner(true);
                setSetupStep(0);
                closeSheet();
              });
            }}
          />
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(deepLinkRecord)}
        onClose={() => {
          setDeepLinkRecord(null);
          navigation.setParams({ harvestId: undefined, fieldId: undefined, day: undefined });
        }}
        title={t('fields:harvestCampaign.record.title', { defaultValue: 'Harvest record' })}
        edge="bottom"
        accent
      >
        {deepLinkRecord ? (
          <HarvestRecordSheet
            record={deepLinkRecord}
            fieldName={labelOf(deepLinkRecord.fieldId)}
            fieldColor={fields.find((field) => field.id === deepLinkRecord.fieldId)?.color}
            locale={locale}
            canVoid={
              resolveFieldGates({
                field: fields.find((field) => field.id === deepLinkRecord.fieldId),
                userId: user?.id,
                userRole: user?.role,
              }).canOwn
            }
            onVoid={() => {
              Alert.alert(
                t('chronologio:drawer.voidConfirm', {
                  defaultValue: 'Void this record? Totals will update.',
                }),
                undefined,
                [
                  { text: t('common:cancel'), style: 'cancel' },
                  {
                    text: t('chronologio:drawer.void', { defaultValue: 'Void' }),
                    style: 'destructive',
                    onPress: () => {
                      void getHarvestService()
                        .void(deepLinkRecord.id)
                        .then(() => {
                          setDeepLinkRecord(null);
                          navigation.setParams({
                            harvestId: undefined,
                            fieldId: undefined,
                            day: undefined,
                          });
                        });
                    },
                  },
                ]
              );
            }}
          />
        ) : null}
      </Sheet>
      <HarvestOpening
        visible={opening}
        seasonLabel={formatSeasonLabel(seasonStartYear)}
        onClose={() => setOpening(false)}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  block: { gap: spacing.md, paddingHorizontal: spacing.sm },
  lead: { ...typography.styles.body, lineHeight: 22 },
  h2: { ...typography.styles.h3 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  heroCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.base,
    gap: spacing.sm,
  },
  overline: {
    ...typography.styles.overline,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  daySummaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scanGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  scanCell: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adminShareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    minHeight: 36,
  },
  adminShareChipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  dayMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historicalRow: {
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  dayMetric: {
    width: '47%',
    flexGrow: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  dayMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dayMetricValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
});

export default HarvestCampaignScreen;
