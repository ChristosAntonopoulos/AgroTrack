import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, DeviceEventEmitter } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import HeaderIconButton from '../components/layout/HeaderIconButton';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/ui/Button';
import Sheet from '../components/ui/Sheet';
import HarvestOpening from '../harvestCampaign/components/HarvestOpening';
import { HarvestStart } from '../harvestCampaign/components/HarvestStart';
import SegmentedControl from '../components/ui/SegmentedControl';
import { useTheme } from '../context/ThemeContext';
import { useHarvestCampaign } from '../context/HarvestCampaignContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { useFields } from '../hooks/useFields';
import { getHarvestService } from '../services/serviceFactory';
import type { HarvestRecord } from '../services/harvestService';
import { CAPTURE_SAVED_EVENT, type CaptureSavedDetail } from '../capture/types';
import { formatSeasonLabel } from '../utils/harvestSeason';
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
import { formatDaySpan, harvestChainStatus } from '../harvestCampaign/chain';
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
  allDaySummaries,
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
import { HarvestFlowView } from '../harvestCampaign/components/HarvestFlowView';
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
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const { t, i18n } = useTranslation(['fields', 'common', 'chronologio']);
  const locale = i18n.language || 'en';
  const { user, isFieldOwner } = useAuth();
  const familyModules = useFamilyMembershipModules();
  const accessLevel = useActiveFieldAccessLevel();
  const { fields, loading: fieldsLoading } = useFields();
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
  const [expandedLogDate, setExpandedLogDate] = useState<string | null>(null);
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
  const chainStatus = useMemo(() => harvestChainStatus(campaign), [campaign]);
  const showDayStrip = isLive;
  const days = harvestDayNumber(campaign, workingDay);
  const canPrevDay = workingDay > harvestStripFloor(today);
  const canNextDay = workingDay < harvestStripCeiling(today);
  const logs = useMemo(() => allDaySummaries(campaign), [campaign]);
  const labelOf = useCallback(
    (id: string) => friendlyFieldLabel(harvestable.find((f) => f.id === id)?.name || id),
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
    if (viewParam === 'fields' || viewParam === 'today' || viewParam === 'totals' || viewParam === 'log') {
      setView(viewParam);
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

  const openCapture = (kind: HarvestCaptureKind) => {
    const sackIds = addPrefill?.sackIds;
    const millIds = addPrefill?.millIds;
    setAddPrefill(null);
    setEditTarget(null);
    if (kind === 'expense') {
      if (!harvestCaps.canAddExpense) return;
      openHarvestExpense();
      return;
    }
    if (kind === 'income') {
      if (!harvestCaps.canAddIncome) return;
      openHarvestIncome();
      return;
    }
    if (kind === 'note') {
      if (!harvestCaps.canAddNote) return;
      openHarvestNote();
      return;
    }
    if (kind === 'mill') {
      if (!harvestCaps.canAddMill) return;
      openMillCapture(sackIds);
      return;
    }
    if (kind === 'oil') {
      if (!harvestCaps.canAddOil) return;
      openOilCapture(millIds);
      return;
    }
    if (kind === 'sacks' && !harvestCaps.canAddSacks) return;
    if (kind === 'people' && !harvestCaps.canAddPeople) return;
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

  const headerSubtitle = [
    formatSeasonLabel(seasonStartYear),
    isLive
      ? campaign.status === 'paused'
        ? t('fields:harvestCampaign.status.paused')
        : t('fields:harvestCampaign.status.active')
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

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
    <ScreenLayout tabBarInset>
      <ScreenHeader
        title={t('fields:harvestCampaign.title')}
        subtitle={headerSubtitle || t('fields:harvestCampaign.opening.body')}
        action={
          isLive && harvestCaps.captureKinds.length > 0 ? (
            <HeaderIconButton
              icon="add"
              accessibilityLabel={t('fields:harvestCampaign.home.whatAdd')}
              onPress={requestAdd}
              active={sheet === 'add'}
            />
          ) : undefined
        }
        context={
          isLive ? (
            <SegmentedControl
              fullWidth
              ariaLabel={t('fields:harvestCampaign.nav.label')}
              value={view}
              onChange={setView}
              options={[
                { value: 'today', label: t('fields:harvestCampaign.nav.today') },
                { value: 'fields', label: t('fields:harvestCampaign.nav.fields') },
                { value: 'totals', label: t('fields:harvestCampaign.nav.totals') },
                { value: 'log', label: t('fields:harvestCampaign.nav.log') },
              ]}
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
            title={t('fields:thisHarvest.openChronologio', { defaultValue: 'Chronologio' })}
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
          {showDayStrip ? (
            <View style={[styles.block, { paddingBottom: 0 }]}>
              <HarvestDayStrip
                selectedDay={workingDay}
                today={today}
                dayNumber={days}
                stripRows={stripRows}
                canPrev={canPrevDay}
                canNext={canNextDay}
                locale={locale}
                onSelectDay={(day) => {
                  selectWorkingDay(day);
                  if (view === 'log') setView('today');
                }}
                onShift={(delta) =>
                  selectWorkingDay(shiftHarvestWorkingDay(workingDay, delta, campaign, today))
                }
              />
            </View>
          ) : null}
          <ScrollView
            contentContainerStyle={[styles.block, { paddingBottom: spacing.md }]}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {view === 'today' ? (
              <View style={{ gap: spacing.base }}>
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

                {(chainStatus.pendingSackCount > 0 ||
                  chainStatus.millKgWithoutOil > 0 ||
                  chainStatus.latestCompleteYield != null) && (
                  <View style={{ gap: spacing.sm }}>
                    {chainStatus.pendingSackCount > 0 ? (
                      <Pressable
                        onPress={() => openMillCapture(chainStatus.pendingSackIds)}
                        style={{
                          padding: spacing.md,
                          borderRadius: radii.lg,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: colors.borderLight,
                          backgroundColor: colors.eventHarvestSoft,
                          gap: 4,
                        }}
                      >
                        <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>
                          {t('fields:harvestCampaign.chain.openSacks', {
                            count: chainStatus.pendingSackCount,
                            span: formatDaySpan(chainStatus.pendingSackDays, locale),
                          })}
                        </Text>
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                          {t('fields:harvestCampaign.chain.ctaMill')}
                        </Text>
                      </Pressable>
                    ) : null}
                    {chainStatus.millKgWithoutOil > 0 ? (
                      <Pressable
                        onPress={() =>
                          openOilCapture(chainStatus.millsWithoutOil.map((m) => m.id))
                        }
                        style={{
                          padding: spacing.md,
                          borderRadius: radii.lg,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: colors.borderLight,
                          backgroundColor: colors.eventHarvestSoft,
                          gap: 4,
                        }}
                      >
                        <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>
                          {t('fields:harvestCampaign.chain.openMill', {
                            kg: formatKg(chainStatus.millKgWithoutOil),
                            span: formatDaySpan(
                              chainStatus.millsWithoutOil.map((m) => m.date),
                              locale
                            ),
                          })}
                        </Text>
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                          {t('fields:harvestCampaign.chain.ctaOil')}
                        </Text>
                      </Pressable>
                    ) : null}
                    {chainStatus.pendingSackCount === 0 &&
                    chainStatus.millKgWithoutOil === 0 &&
                    chainStatus.latestCompleteYield != null ? (
                      <Text
                        style={{
                          color: colors.textPrimary,
                          fontWeight: '650' as '600',
                          padding: spacing.md,
                          borderRadius: radii.lg,
                          backgroundColor: colors.eventHarvestSoft,
                        }}
                      >
                        {t('fields:harvestCampaign.chain.latestYield', {
                          yield: Math.round(chainStatus.latestCompleteYield),
                        })}
                      </Text>
                    ) : null}
                  </View>
                )}

                <HarvestCard tone="hero">
                  <View style={styles.daySummaryHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.overline, { color: colors.textTertiary }]}>
                        {t('fields:harvestCampaign.nav.today')}
                      </Text>
                      <Text
                        style={[
                          styles.daySummaryTitle,
                          { color: colors.textPrimary, fontSize: 20 * fontScaleMultiplier },
                        ]}
                      >
                        {workingDay === today
                          ? t('fields:harvestCampaign.dayNav.today')
                          : new Date(`${workingDay}T12:00:00`).toLocaleDateString(locale, {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: colors.eventHarvestSoft },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.primary,
                          fontWeight: '700',
                          fontSize: 11,
                        }}
                      >
                        {t('fields:harvestCampaign.status.active')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dayMetrics}>
                    <View style={[styles.dayMetric, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.dayMetricLabel, { color: colors.textTertiary }]}>
                        {t('fields:harvestCampaign.actions.mill')}
                      </Text>
                      <Text style={[styles.dayMetricValue, { color: colors.textPrimary }]}>
                        {activeRow.officialKg > 0 ? `${formatKg(activeRow.officialKg)} kg` : '—'}
                      </Text>
                    </View>
                    <View style={[styles.dayMetric, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.dayMetricLabel, { color: colors.textTertiary }]}>
                        {t('fields:harvestCampaign.sacks.unit')}
                      </Text>
                      <Text style={[styles.dayMetricValue, { color: colors.textPrimary }]}>
                        {activeRow.sacks > 0 ? activeRow.sacks : '—'}
                      </Text>
                      {activeRow.estimatedKg > 0 && activeRow.officialKg <= 0 ? (
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                          {t('fields:harvestCampaign.approx', {
                            kg: formatKg(activeRow.estimatedKg),
                          })}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.dayMetric, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.dayMetricLabel, { color: colors.textTertiary }]}>
                        {t('fields:harvestCampaign.actions.oil')}
                      </Text>
                      <Text style={[styles.dayMetricValue, { color: colors.textPrimary }]}>
                        {activeRow.oilKg > 0 ? `${formatKg(activeRow.oilKg)} kg` : '—'}
                      </Text>
                    </View>
                    <View style={[styles.dayMetric, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.dayMetricLabel, { color: colors.textTertiary }]}>
                        {t('fields:harvestCampaign.actions.people')}
                      </Text>
                      <Text style={[styles.dayMetricValue, { color: colors.textPrimary }]}>
                        {activeRow.people > 0 ? activeRow.people : '—'}
                      </Text>
                    </View>
                  </View>

                  {activeRow.fieldIds.length > 0 ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                      {activeRow.fieldIds.map(labelOf).join(' · ')}
                    </Text>
                  ) : (
                    <Text style={{ color: colors.textSecondary }}>
                      {t('fields:harvestCampaign.today.empty')}
                    </Text>
                  )}

                  {(activeRow.expenseEur > 0 || activeRow.photos > 0) && (
                    <View style={styles.metaRow}>
                      {activeRow.expenseEur > 0 ? (
                        <View style={[styles.metaChip, { backgroundColor: colors.eventExpenseSoft }]}>
                          <Ionicons name="wallet-outline" size={14} color={colors.eventExpense} />
                          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 12 }}>
                            {t('fields:harvestCampaign.today.expense', {
                              amount: activeRow.expenseEur,
                            })}
                          </Text>
                        </View>
                      ) : null}
                      {activeRow.photos > 0 ? (
                        <View
                          style={[styles.metaChip, { backgroundColor: colors.eventObservationSoft }]}
                        >
                          <Ionicons name="camera-outline" size={14} color={colors.eventObservation} />
                          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 12 }}>
                            {t('fields:harvestCampaign.today.photos', { count: activeRow.photos })}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                </HarvestCard>

                <HarvestDayActivity
                  campaign={campaign}
                  date={workingDay}
                  labelOf={labelOf}
                  onEdit={openDayEdit}
                  onRemove={removeDayEntry}
                  onAdd={openDayAdd}
                  allowedKinds={harvestCaps.captureKinds}
                />

                {harvestCaps.captureKinds.length > 0 ? (
                  <HarvestCard tone="pending" onPress={requestAdd}>
                    <View style={styles.addCueInner}>
                      <View style={[styles.addCueIcon, { backgroundColor: colors.surface }]}>
                        <Ionicons name="add" size={22} color={colors.eventHarvest} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                          {t('fields:harvestCampaign.home.whatAdd')}
                        </Text>
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontSize: 13 * fontScaleMultiplier,
                          }}
                        >
                          {t('fields:harvestCampaign.home.addCue')}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </View>
                  </HarvestCard>
                ) : null}
              </View>
            ) : null}

            {view === 'totals' ? (
              <View style={{ gap: spacing.md }}>
                <HarvestCard tone="hero">
                  <Text style={[styles.overline, { color: colors.textTertiary }]}>
                    {t('fields:harvestCampaign.nav.totals')}
                  </Text>
                  <Text
                    style={[
                      styles.heroValue,
                      { color: colors.textPrimary, fontSize: 36 * fontScaleMultiplier },
                    ]}
                  >
                    {formatKg(totals.officialKg)}
                    <Text style={[styles.heroUnit, { color: colors.textSecondary }]}> kg</Text>
                  </Text>
                  <Text style={[styles.heroNote, { color: colors.textTertiary }]}>
                    {t('fields:harvestCampaign.dashboard.official', {
                      kg: formatKg(totals.officialKg),
                    })}
                  </Text>
                </HarvestCard>

                {totals.unweighedSacks > 0 || totals.millKgWithoutOil > 0 ? (
                  <HarvestCard tone="pending">
                    <Text style={[styles.overline, { color: colors.textTertiary }]}>
                      {t('fields:harvestCampaign.dashboard.needs')}
                    </Text>
                    {totals.unweighedSacks > 0 ? (
                      <Pressable onPress={() => openPendingCapture('mill')} style={styles.pendingLink}>
                        <Ionicons name="scale-outline" size={18} color={colors.warning} />
                        <Text style={{ color: colors.warning, fontWeight: '700', flex: 1 }}>
                          {t('fields:harvestCampaign.dashboard.unweighed', {
                            count: totals.unweighedSacks,
                          })}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </Pressable>
                    ) : null}
                    {totals.millKgWithoutOil > 0 ? (
                      <Pressable onPress={() => openPendingCapture('oil')} style={styles.pendingLink}>
                        <Ionicons name="water-outline" size={18} color={colors.eventHarvest} />
                        <Text style={{ color: colors.textPrimary, fontWeight: '700', flex: 1 }}>
                          {t('fields:harvestCampaign.dashboard.needOil', {
                            kg: formatKg(totals.millKgWithoutOil),
                          })}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </Pressable>
                    ) : null}
                  </HarvestCard>
                ) : null}

                <View style={styles.halfGrid}>
                  {(
                    [
                      {
                        key: 'oil',
                        label: t('fields:harvestCampaign.actions.oil'),
                        value: `${formatKg(totals.oilKg)} kg`,
                      },
                      {
                        key: 'yield',
                        label: t('fields:harvestCampaign.dashboard.yieldLabel'),
                        value:
                          totals.extractionYield != null
                            ? `${Math.round(totals.extractionYield * 10) / 10}%`
                            : '—',
                      },
                      {
                        key: 'days',
                        label: t('fields:harvestCampaign.dashboard.daysLabel'),
                        value: String(totals.harvestDays),
                      },
                      {
                        key: 'expense',
                        label: t('fields:harvestCampaign.actions.expense'),
                        value: `${totals.expenseEur} €`,
                      },
                    ] as const
                  ).map((stat) => (
                    <HarvestCard key={stat.key} style={styles.halfCardWrap}>
                      <Text style={[styles.overline, { color: colors.textTertiary }]}>{stat.label}</Text>
                      <Text style={[styles.halfValue, { color: colors.textPrimary }]}>{stat.value}</Text>
                    </HarvestCard>
                  ))}
                  {totals.personDays > 0 ? (
                    <HarvestCard style={styles.halfCardWrap}>
                      <Text style={[styles.overline, { color: colors.textTertiary }]}>
                        {t('fields:harvestCampaign.actions.people')}
                      </Text>
                      <Text style={[styles.halfValue, { color: colors.textPrimary }]}>
                        {totals.personDays}
                      </Text>
                      <Text style={[styles.heroNote, { color: colors.textTertiary }]}>
                        {t('fields:harvestCampaign.dashboard.personDays', {
                          count: totals.personDays,
                        })}
                      </Text>
                    </HarvestCard>
                  ) : null}
                </View>

                {campaign.status === 'paused' ? (
                  harvestCaps.canPause ? (
                  <Button title={t('fields:harvestCampaign.resume')} onPress={() => void resume()} fullWidth />
                  ) : null
                ) : harvestCaps.canPause ? (
                  <Button
                    title={t('fields:harvestCampaign.pause')}
                    variant="outline"
                    onPress={() => {
                      if (resolveHarvestTotalsLifecycle('pause') === 'pause') void pause();
                    }}
                    fullWidth
                  />
                ) : null}
                {harvestCaps.canCompleteSeason ? (
                <Button
                  title={t('fields:harvestCampaign.stop')}
                  variant="outline"
                  onPress={() => {
                    if (resolveHarvestTotalsLifecycle('stop') === 'openComplete') setSheet('complete');
                  }}
                  fullWidth
                />
                ) : null}
              </View>
            ) : null}

            {view === 'fields' ? (
              <View style={{ gap: spacing.md }}>
                {campaign.fieldOrder.length === 0 ? (
                  <HarvestCard tone="hero">
                    <Text style={{ fontWeight: '800', color: colors.textPrimary, fontSize: 16 }}>
                      {t('fields:harvestCampaign.fieldsEmpty.title')}
                    </Text>
                    <Text style={{ color: colors.textSecondary }}>
                      {t('fields:harvestCampaign.fieldsEmpty.hint')}
                    </Text>
                    <Button
                      title={t('fields:harvestCampaign.fieldsEmpty.add')}
                      onPress={() =>
                        void patch((current) => ({
                          ...current,
                          fieldOrder: harvestable.map((f) => f.id),
                        }))
                      }
                      fullWidth
                    />
                  </HarvestCard>
                ) : (
                  <HarvestFlowView
                    campaign={campaign}
                    fields={harvestable}
                    onMarkDone={(fieldId) => void markGroveDone(fieldId)}
                    onOpenMill={openMillCapture}
                    onOpenOil={openOilCapture}
                  />
                )}
              </View>
            ) : null}

            {view === 'log' ? (
              <View style={{ gap: spacing.md }}>
                {logs.length === 0 ? (
                  <HarvestCard tone="hero">
                    <Text style={{ color: colors.textSecondary }}>
                      {t('fields:harvestCampaign.log.empty')}
                    </Text>
                    {harvestCaps.captureKinds.length > 0 ? (
                      <Button
                        title={t('fields:harvestCampaign.home.whatAdd')}
                        variant="outline"
                        onPress={requestAdd}
                        fullWidth
                      />
                    ) : null}
                  </HarvestCard>
                ) : null}
                {logs.map((row) => {
                  const expanded = expandedLogDate === row.date;
                  return (
                    <HarvestCard
                      key={row.date}
                      tone={row.date === workingDay ? 'nudge' : 'default'}
                      onPress={() => setExpandedLogDate(expanded ? null : row.date)}
                    >
                      <View style={styles.logHeader}>
                        <Text style={{ fontWeight: '800', color: colors.textPrimary, fontSize: 16, flex: 1 }}>
                          {new Date(`${row.date}T12:00:00`).toLocaleDateString(locale, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                        <Ionicons
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={colors.textTertiary}
                        />
                      </View>
                      <Text style={{ color: colors.textSecondary }}>
                        {row.officialKg > 0
                          ? t('fields:harvestCampaign.log.officialLine', {
                              kg: formatKg(row.officialKg),
                            })
                          : t('fields:harvestCampaign.log.sacksLine', {
                              sacks: row.sacks,
                              people: row.people,
                              amount: row.expenseEur,
                            })}
                      </Text>
                      {expanded ? (
                        <View style={{ gap: 6 }}>
                          {row.sacks > 0 ? (
                            <Text style={{ color: colors.textSecondary }}>
                              {t('fields:harvestCampaign.evening.sacks', { count: row.sacks })}
                            </Text>
                          ) : null}
                          {row.people > 0 ? (
                            <Text style={{ color: colors.textSecondary }}>
                              {t('fields:harvestCampaign.evening.people', { count: row.people })}
                            </Text>
                          ) : null}
                          {row.expenseEur > 0 ? (
                            <Text style={{ color: colors.textSecondary }}>
                              {t('fields:harvestCampaign.evening.expense', { amount: row.expenseEur })}
                            </Text>
                          ) : null}
                          {row.oilKg > 0 ? (
                            <Text style={{ color: colors.textSecondary }}>
                              {t('fields:harvestCampaign.today.oil', { kg: formatKg(row.oilKg) })}
                            </Text>
                          ) : null}
                          <Button
                            title={t('fields:harvestCampaign.dayNav.openDay')}
                            variant="ghost"
                            onPress={() => {
                              selectWorkingDay(row.date);
                              setView('today');
                            }}
                          />
                        </View>
                      ) : null}
                    </HarvestCard>
                  );
                })}
              </View>
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
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  daySummaryTitle: {
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  heroValue: {
    fontWeight: '800',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  heroUnit: { fontWeight: '650' as '600', fontSize: 18 },
  heroNote: { ...typography.styles.caption, lineHeight: 18 },
  heroEmpty: { ...typography.styles.body, marginVertical: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  nudgeCaption: { ...typography.styles.caption, lineHeight: 18 },
  sectionKicker: {
    ...typography.styles.overline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  addCueInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  addCueIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  halfCardWrap: {
    width: '48%',
    flexGrow: 1,
  },
  halfValue: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pendingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default HarvestCampaignScreen;
