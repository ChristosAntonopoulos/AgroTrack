import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { CaptureContext, CaptureSavedDetail, CaptureSavedOptions } from '../../capture/types';
import { uploadCapturePhotoUris } from '../../capture/photos';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
import FormDateField from '../forms/FormDateField';
import type { Field } from '../../services/fieldService';
import type { FieldTask } from '../../services/fieldWorkService';
import type { HarvestRecord } from '../../services/harvestService';
import {
  getFinancialTransactionService,
  getHarvestService,
  getFieldWorkService,
} from '../../services/serviceFactory';
import {
  categoriesForType,
  defaultCategoryForType,
  financialCategoryLabel,
  financialTypeHelp,
  financialTypeLabel,
  resultYearHelp,
  unassignedFieldLabel,
  type FinancialCategory,
  type FinancialTransactionType,
} from '../../finance/display';
import { rememberLastMoneyFieldId } from '../../finance/lastField';
import {
  clearMoneyEntryDraft,
  isMoneyEntryPartial,
  readMoneyEntryDraft,
  writeMoneyEntryDraft,
  type MoneyEntryStep,
} from '../../finance/moneyEntryDraft';
import {
  categorySupportsQuantity,
  defaultModeForCategory,
  suggestedUnitsForCategory,
} from '../../finance/moneyUi';
import { harvestYearSpan } from '../../finance/harvestYear';
import { planMoneySeries, type MoneyRepeat, type MoneySplitMode } from '../../finance/moneySeries';
import {
  defaultQuantityUnit,
  parseDecimal,
  resolveQuantityCalculation,
  type FinancialCalculationMode,
  type FinancialQuantityUnit,
} from '../../finance/quantityCalculator';
import { QuantityPriceCalculator } from '../money/QuantityPriceCalculator';
import { agriculturalYearFor } from '../../chronologio/agriculturalYear';
import { formatFieldAreaSqm } from '../../utils/fieldGeo';
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';
import { carryColor, HarvestCarryPicker } from '../../harvestCampaign/components/HarvestCarryPicker';
import { OilPackBars } from '../../harvestCampaign/components/OilPackBars';
import {
  allocateSoldPack,
  applyOilSale,
  combineOilPacks,
  emptyOilPack,
  oilSaleFieldId,
  packLitres,
  saleableOilLots,
  type OilPackStock,
} from '../../harvestCampaign/oilSaleLots';
import { formatHarvestOilAmount } from '../../harvestCampaign/utils/harvestCalculations';
import { resolveFieldColor } from '../../utils/fieldColors';
import FieldColorMark from '../fields/FieldColorMark';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { spacing, typography } from '../../theme';

const LARGE_AMOUNT = 2000;
type Props = {
  context: CaptureContext;
  fields: Field[];
  canRecordIncome: boolean;
  canRecordExpense: boolean;
  onSaved: (detail: CaptureSavedDetail, message: string, options?: CaptureSavedOptions) => void;
};

const todayIsoDate = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const yearFromDate = (isoDate: string): number => {
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return agriculturalYearFor(new Date());
  return agriculturalYearFor(parsed);
};

const parseAmount = (raw: string): number => parseDecimal(raw) ?? NaN;

const formatMoney = (value: number, locale: string) =>
  value.toLocaleString(locale.toLowerCase().startsWith('en') ? 'en-GB' : 'el-GR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const newIdempotencyKey = (): string =>
  `money-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const MoneyCaptureForm: React.FC<Props> = ({
  context,
  fields,
  canRecordIncome,
  canRecordExpense,
  onSaved,
}) => {
  const { t, i18n } = useTranslation(['capture', 'chronologio', 'common']);
  const language = i18n.language || 'el';
  const { colors, tapMin } = useTheme();
  const harvestCampaign = useHarvestCampaignOptional();

  const preferredKind: FinancialTransactionType | null =
    context.preferredType === 'income' && canRecordIncome
      ? 'income'
      : context.preferredType === 'expense' && canRecordExpense
        ? 'expense'
        : null;

  const [kind, setKind] = useState<FinancialTransactionType | null>(preferredKind);
  const askKind = !preferredKind && canRecordIncome && canRecordExpense;
  const [step, setStep] = useState<MoneyEntryStep>(askKind ? 'kind' : 'category');
  const [amount, setAmount] = useState('');
  const [fieldId, setFieldId] = useState(context.fieldId || '');
  const [occurredOn, setOccurredOn] = useState(todayIsoDate(context.occurredAt));
  const [category, setCategory] = useState(context.category || defaultCategoryForType(preferredKind || 'expense'));
  const [description, setDescription] = useState(context.description || '');
  const [moreOpen, setMoreOpen] = useState(false);
  const [relatedTaskId, setRelatedTaskId] = useState(context.taskId || '');
  const [relatedHarvestId, setRelatedHarvestId] = useState(context.harvestId || '');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [notes, setNotes] = useState('');
  const [resultYear, setResultYear] = useState(yearFromDate(todayIsoDate(context.occurredAt)));
  const [resultYearTouched, setResultYearTouched] = useState(false);
  const [photos] = useState<string[]>([]);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOilIds, setSelectedOilIds] = useState<string[]>([]);
  const [soldPack, setSoldPack] = useState<OilPackStock>(() => emptyOilPack());
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<FinancialQuantityUnit>('litre');
  const [mode, setMode] = useState<FinancialCalculationMode>('total_only');
  const [splitMode, setSplitMode] = useState<MoneySplitMode>('single');
  const [splitFieldIds, setSplitFieldIds] = useState<string[]>([]);
  const [repeat, setRepeat] = useState<MoneyRepeat>('once');
  const [draftReady, setDraftReady] = useState(false);

  const usableFields = useMemo(
    () => fields.filter((f) => (f.status || 'Active') !== 'Draft'),
    [fields]
  );

  useEffect(() => {
    if (preferredKind) {
      setKind(preferredKind);
      if (!context.category) setCategory(defaultCategoryForType(preferredKind));
      return;
    }
    if (canRecordIncome && !canRecordExpense) {
      setKind('income');
      setCategory(defaultCategoryForType('income'));
    } else if (!canRecordIncome && canRecordExpense) {
      setKind('expense');
      setCategory(context.category || defaultCategoryForType('expense'));
    }
  }, [preferredKind, canRecordIncome, canRecordExpense, context.category]);

  useEffect(() => {
    if (context.fieldId) setFieldId(context.fieldId);
    if (context.taskId) setRelatedTaskId(context.taskId);
    if (context.harvestId) setRelatedHarvestId(context.harvestId);
    if (context.category) setCategory(context.category);
    if (context.description) setDescription(context.description);
  }, [context.fieldId, context.taskId, context.harvestId, context.category, context.description]);

  useEffect(() => {
    if (!context.occurredAt) return;
    const next = todayIsoDate(context.occurredAt);
    setOccurredOn(next);
    if (!resultYearTouched) setResultYear(yearFromDate(next));
  }, [context.occurredAt, resultYearTouched]);

  useEffect(() => {
    if (!fieldId) {
      setTasks([]);
      setHarvests([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      getFieldWorkService()
        .listFieldTasks({ fieldId })
        .catch(() => [] as FieldTask[]),
      getHarvestService().listByField(fieldId).catch(() => [] as HarvestRecord[]),
    ]).then(([nextTasks, nextHarvests]) => {
      if (cancelled) return;
      setTasks(nextTasks);
      setHarvests(nextHarvests);
    });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  const oilLots = useMemo(
    () => (harvestCampaign ? saleableOilLots(harvestCampaign.campaign) : []),
    [harvestCampaign]
  );
  const isOil = kind === 'income' && category === 'olive_oil_sale';
  const oilPath = isOil && oilLots.length > 0;
  const selectedLots = useMemo(
    () => oilLots.filter((lot) => selectedOilIds.includes(lot.id) && !lot.sold),
    [oilLots, selectedOilIds]
  );
  const oilStock = combineOilPacks(selectedLots);
  const selectedOilLitres = Math.round(selectedLots.reduce((sum, lot) => sum + lot.litres, 0) * 10) / 10;
  const soldLitres = oilPath ? packLitres(soldPack) : 0;
  const oilSeasonYear = harvestCampaign?.campaign.seasonStartYear ?? null;

  useEffect(() => {
    if (!isOil) {
      setSelectedOilIds([]);
      setSoldPack(emptyOilPack());
    }
  }, [isOil]);

  useEffect(() => {
    if (!oilPath || oilSeasonYear == null) return;
    if (!resultYearTouched) setResultYear(oilSeasonYear);
  }, [oilPath, oilSeasonYear, resultYearTouched]);

  useEffect(() => {
    if (!oilPath) return;
    setQuantity(soldLitres > 0 ? String(soldLitres) : '');
    setUnit('litre');
    setMode('quantity_times_unit_price');
  }, [oilPath, soldLitres]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const draft = await readMoneyEntryDraft();
      if (cancelled) return;
      if (draft && !context.preferredType && !context.category) {
        setKind(draft.kind);
        setCategory(draft.category);
        setMode(draft.mode);
        setQuantity(draft.quantity);
        setUnit(draft.unit);
        setUnitPrice(draft.unitPrice);
        setAmount(draft.amount);
        if (!context.fieldId) setFieldId(draft.fieldId);
        if (!context.occurredAt) setOccurredOn(draft.occurredOn);
        if (!context.description) setDescription(draft.description);
        setRelatedTaskId(draft.relatedTaskId);
        setRelatedHarvestId(draft.relatedHarvestId);
        setPaymentMethod(draft.paymentMethod);
        setCounterpartyName(draft.counterpartyName);
        setNotes(draft.notes);
        setResultYear(draft.resultYear);
        setMoreOpen(draft.moreOpen);
        setSplitMode(draft.splitMode ?? 'single');
        setSplitFieldIds(draft.splitFieldIds ?? []);
        setRepeat(draft.repeat ?? 'once');
        if (draft.step) setStep(draft.step);
      }
      setDraftReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [context.preferredType, context.category, context.fieldId, context.occurredAt, context.description]);

  const applyCategory = (next: FinancialCategory) => {
    setCategory(next);
    setMode(defaultModeForCategory(next));
    const nextUnit = defaultQuantityUnit(next);
    if (nextUnit) setUnit(nextUnit);
    if (next !== 'olive_oil_sale') {
      setSelectedOilIds([]);
      setSoldPack(emptyOilPack());
    }
  };

  const toggleOilLot = (id: string) => {
    const lot = oilLots.find((row) => row.id === id);
    if (lot?.sold) return;
    const next = selectedOilIds.includes(id)
      ? selectedOilIds.filter((row) => row !== id)
      : [...selectedOilIds, id];
    setSelectedOilIds(next);
    setSoldPack(emptyOilPack());
    setQuantity('');
    const chosen = oilLots.filter((row) => next.includes(row.id) && !row.sold);
    const harvestIds = [...new Set(chosen.flatMap((row) => row.harvestRecordIds))];
    setRelatedHarvestId(harvestIds.length === 1 ? harvestIds[0] : '');
    setFieldId(oilSaleFieldId(chosen));
  };

  const applySoldPack = (next: OilPackStock) => {
    setSoldPack(next);
    const litres = packLitres(next);
    setQuantity(litres > 0 ? String(litres) : '');
    setUnit('litre');
    setMode('quantity_times_unit_price');
  };

  const applyCategoryKind = (next: FinancialTransactionType) => {
    setKind(next);
    applyCategory(defaultCategoryForType(next));
    setStep('category');
  };

  const qtyValue = parseDecimal(quantity);
  const priceValue = parseDecimal(unitPrice);
  const amountValue = parseDecimal(amount);
  const supportsQty = categorySupportsQuantity(category);
  const activeMode: FinancialCalculationMode = isOil
    ? mode === 'total_only'
      ? 'total_only'
      : 'quantity_times_unit_price'
    : supportsQty
      ? mode
      : 'total_only';
  let resolvedAmount: number | null = null;
  let resolvedUnitPrice: number | null = null;
  try {
    const resolved = resolveQuantityCalculation({
      mode:
        activeMode === 'quantity_times_unit_price' && qtyValue && priceValue
          ? 'quantity_times_unit_price'
          : activeMode === 'quantity_and_total' && qtyValue && amountValue
            ? 'quantity_and_total'
            : 'total_only',
      quantity: qtyValue,
      quantityUnit: unit,
      unitPrice: priceValue,
      amount: amountValue,
    });
    resolvedAmount = resolved.amount;
    resolvedUnitPrice = resolved.unitPrice;
  } catch {
    resolvedAmount = amountValue && amountValue > 0 ? amountValue : null;
  }

  const allowSeries = !oilPath && !context.harvestCampaignLink;
  const areaHectares = Object.fromEntries(
    usableFields.map((item) => {
      const sqm = formatFieldAreaSqm(item);
      return [item.id, sqm != null && sqm > 0 ? sqm / 10000 : null];
    })
  );
  const seriesPlan =
    allowSeries && resolvedAmount && (splitMode !== 'single' || repeat === 'monthly')
      ? planMoneySeries({
          amount: resolvedAmount,
          occurredOn,
          resultYear,
          fieldIds: splitMode === 'single' ? [fieldId] : splitFieldIds,
          areaHectares,
          splitMode,
          repeat,
        })
      : null;

  useEffect(() => {
    if (!draftReady || !kind) return;
    const partial = isMoneyEntryPartial({
      amount,
      quantity,
      unitPrice,
      description,
      relatedTaskId,
      relatedHarvestId,
      paymentMethod,
      counterpartyName,
      notes,
    });
    if (!partial) {
      void clearMoneyEntryDraft();
      return;
    }
    void writeMoneyEntryDraft({
      kind,
      category,
      mode,
      quantity,
      unit,
      unitPrice,
      amount,
      fieldId,
      occurredOn,
      description,
      relatedTaskId,
      relatedHarvestId,
      paymentMethod,
      counterpartyName,
      notes,
      resultYear,
      moreOpen,
      splitMode,
      splitFieldIds,
      repeat,
      step,
    });
  }, [
    draftReady,
    kind,
    category,
    mode,
    quantity,
    unit,
    unitPrice,
    amount,
    fieldId,
    occurredOn,
    description,
    relatedTaskId,
    relatedHarvestId,
    paymentMethod,
    counterpartyName,
    notes,
    resultYear,
    moreOpen,
    splitMode,
    splitFieldIds,
    repeat,
    step,
  ]);

  const confirmIfNeeded = (value: number, type: FinancialTransactionType): Promise<boolean> => {
    const derivedYear = yearFromDate(occurredOn);
    if (oilPath && oilSeasonYear != null && resultYear === oilSeasonYear && value < LARGE_AMOUNT) {
      return Promise.resolve(true);
    }
    if (value < LARGE_AMOUNT && resultYear === derivedYear) return Promise.resolve(true);
    const fieldName = usableFields.find((f) => f.id === fieldId)?.name || unassignedFieldLabel(language);
    const summary = t('capture:money.confirmSummary', {
      type: financialTypeLabel(type, language),
      amount: String(value),
      field: fieldName,
      date: occurredOn,
      year: resultYear,
    });
    return new Promise((resolve) => {
      Alert.alert('', summary, [
        { text: t('capture:cancel', { defaultValue: 'Cancel' }), style: 'cancel', onPress: () => resolve(false) },
        { text: t('common:ok', { defaultValue: 'OK' }), onPress: () => resolve(true) },
      ]);
    });
  };

  const save = async (saveAsDraft: boolean) => {
    if (!kind) return;
    const value = resolvedAmount;
    if (!value || value <= 0) {
      Alert.alert('', t('capture:errors.amountRequired'));
      return;
    }
    if (oilPath && !saveAsDraft && soldLitres <= 0) {
      Alert.alert('', t('capture:money.oilSaleHint'));
      return;
    }
    if (!saveAsDraft && !description.trim() && !isOil) {
      Alert.alert('', t('capture:money.descriptionRequired'));
      return;
    }
    if (seriesPlan && !seriesPlan.ok) {
      Alert.alert(
        '',
        seriesPlan.reason === 'need-two'
          ? t('capture:money.splitNeedTwo')
          : seriesPlan.reason === 'missing-area'
            ? t('capture:money.splitMissingAreaShort')
            : t('capture:money.seriesTooMany')
      );
      return;
    }
    if (!saveAsDraft && !(await confirmIfNeeded(value, kind))) return;

    const text = description.trim() || financialCategoryLabel(category, language);
    const resolvedFieldId = oilPath ? oilSaleFieldId(selectedLots) : fieldId;
    const harvestId = relatedHarvestId || undefined;
    let entries = [
      {
        fieldId: resolvedFieldId,
        amount: value,
        occurredOn,
        resultYear,
      },
    ];
    if (allowSeries && (splitMode !== 'single' || repeat === 'monthly') && seriesPlan?.ok) {
      entries = seriesPlan.entries;
    }
    const splitting = splitMode !== 'single' && entries.length > 1;
    const seriesNotes = [
      notes.trim(),
      splitting ? t('capture:money.splitNote', { count: new Set(entries.map((entry) => entry.fieldId)).size }) : '',
      repeat === 'monthly' && entries.length > 1 ? t('capture:money.repeatNote', { count: entries.length }) : '',
    ]
      .filter(Boolean)
      .join(' · ');
    setSubmitting(true);
    try {
      const attachmentIds = photos.length ? await uploadCapturePhotoUris(photos) : [];
      if (oilPath && !saveAsDraft && soldLitres > 0 && harvestCampaign) {
        const allocations = allocateSoldPack(selectedLots, soldPack);
        if (allocations.length > 0) {
          await harvestCampaign.patch((campaign) => applyOilSale(campaign, allocations));
        }
      }
      let createdId = '';
      let createdStatus: 'draft' | 'posted' = saveAsDraft ? 'draft' : 'posted';
      let savedCount = 0;
      const qty = qtyValue && qtyValue > 0 ? qtyValue : undefined;
      const entryMode = activeMode;
      for (const entry of entries) {
        const created = await getFinancialTransactionService().create({
          type: kind,
          amount: entry.amount,
          currency: 'EUR',
          occurredOn: `${entry.occurredOn}T00:00:00`,
          resultYear: entry.resultYear,
          fieldId: entry.fieldId || undefined,
          category,
          description: text,
          paymentMethod: paymentMethod || undefined,
          counterpartyName: counterpartyName.trim() || undefined,
          relatedTaskId: splitting ? undefined : relatedTaskId || undefined,
          relatedHarvestId: splitting ? undefined : harvestId,
          sourceType: harvestId ? 'harvest' : relatedTaskId ? 'task' : 'manual',
          sourceId: harvestId || relatedTaskId || undefined,
          attachmentIds,
          notes: seriesNotes || undefined,
          saveAsDraft,
          idempotencyKey: newIdempotencyKey(),
          productKind: isOil ? 'olive_oil' : undefined,
          quantity: splitting ? undefined : qty,
          quantityUnit: splitting || !qty ? undefined : unit,
          unitPrice: splitting ? undefined : resolvedUnitPrice || undefined,
          calculationMode: splitting ? 'total_only' : qty ? entryMode : 'total_only',
        });
        savedCount += 1;
        createdId = created.id;
        createdStatus = created.status === 'draft' ? 'draft' : 'posted';
      }
      await rememberLastMoneyFieldId(entries[0]?.fieldId || undefined);
      await clearMoneyEntryDraft();
      const message =
        savedCount < entries.length
          ? t('capture:money.seriesPartial', { saved: savedCount, total: entries.length })
          : entries.length > 1
            ? t('capture:money.seriesSaved', { count: entries.length })
            : saveAsDraft
              ? t('capture:money.draftSaved')
              : kind === 'income'
                ? t('capture:income.saved')
                : t('capture:expense.saved');
      onSaved(
        {
          type: kind,
          fieldId: entries[0]?.fieldId || '',
          sourceId: createdId,
          amount: value,
          occurredOn,
          description: text,
          harvestCampaignLink: context.harvestCampaignLink,
        },
        message,
        {
          transactionId: createdId,
          status: createdStatus,
          reopen: {
            fieldId: entries[0]?.fieldId || undefined,
            taskId: relatedTaskId || undefined,
            harvestId,
            preferredType: kind,
            occurredAt: context.occurredAt,
            category,
            description: text,
            harvestCampaignLink: context.harvestCampaignLink,
          },
        }
      );
    } catch {
      Alert.alert('', t('capture:errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const steps: MoneyEntryStep[] = [
    ...(askKind ? (['kind'] as MoneyEntryStep[]) : []),
    'category',
    ...(oilPath ? (['oil', 'pack'] as MoneyEntryStep[]) : []),
    'amount',
    ...(!oilPath ? (['field'] as MoneyEntryStep[]) : []),
    'when',
  ];
  const stepIndex = Math.max(0, steps.indexOf(step));
  const activeStep = steps.includes(step) ? step : steps[0];
  const goNext = () => {
    const next = steps[steps.indexOf(activeStep) + 1];
    if (next) setStep(next);
  };
  const goBack = () => {
    const prev = steps[steps.indexOf(activeStep) - 1];
    if (prev) setStep(prev);
  };
  const stepTitle =
    activeStep === 'kind'
      ? t('capture:money.stepKind')
      : activeStep === 'category'
        ? t(kind === 'income' ? 'capture:money.stepCategoryIncome' : 'capture:money.stepCategoryExpense')
        : activeStep === 'oil'
          ? t('capture:money.fromThisOil')
          : activeStep === 'pack'
            ? t('capture:money.packTitle')
            : activeStep === 'amount'
              ? t('capture:money.stepAmount')
              : activeStep === 'field'
                ? t('capture:money.whichField')
                : oilPath
                  ? t('capture:money.whenSold')
                  : t('capture:money.whenDidItHappen');
  const canContinue =
    activeStep === 'oil'
      ? selectedOilIds.length > 0
      : activeStep === 'pack'
        ? soldLitres > 0
        : activeStep === 'amount'
          ? Boolean(resolvedAmount && resolvedAmount > 0)
          : activeStep === 'field'
            ? splitMode === 'single' || Boolean(seriesPlan?.ok)
            : true;

  if (!kind || activeStep === 'kind') {
    return (
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[styles.prompt, { color: colors.textSecondary }]}>{t('capture:money.stepKind')}</Text>
        {!canRecordIncome && !canRecordExpense ? (
          <Text style={{ color: colors.textSecondary }}>{t('capture:money.noPermission')}</Text>
        ) : (
          <>
            {canRecordIncome ? (
              <Pressable
                style={[
                  styles.typeCard,
                  {
                    borderColor: colors.eventIncome,
                    backgroundColor: colors.eventIncomeSoft,
                    minHeight: Math.max(96, tapMin + 28),
                  },
                ]}
                onPress={() => applyCategoryKind('income')}
                accessibilityRole="button"
                accessibilityLabel={`${financialTypeLabel('income', language)}. ${financialTypeHelp('income', language)}`}
              >
                <View style={[styles.typeIcon, { backgroundColor: colors.surface }]}>
                  <Ionicons name="trending-up" size={26} color={colors.eventIncome} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeTitle, { color: colors.textPrimary }]}>
                    {financialTypeLabel('income', language)}
                  </Text>
                  <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
                    {financialTypeHelp('income', language)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.eventIncome} />
              </Pressable>
            ) : null}
            {canRecordExpense ? (
              <Pressable
                style={[
                  styles.typeCard,
                  {
                    borderColor: colors.eventExpense,
                    backgroundColor: colors.eventExpenseSoft,
                    minHeight: Math.max(96, tapMin + 28),
                  },
                ]}
                onPress={() => applyCategoryKind('expense')}
                accessibilityRole="button"
                accessibilityLabel={`${financialTypeLabel('expense', language)}. ${financialTypeHelp('expense', language)}`}
              >
                <View style={[styles.typeIcon, { backgroundColor: colors.surface }]}>
                  <Ionicons name="trending-down" size={26} color={colors.eventExpense} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeTitle, { color: colors.textPrimary }]}>
                    {financialTypeLabel('expense', language)}
                  </Text>
                  <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
                    {financialTypeHelp('expense', language)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.eventExpense} />
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    );
  }

  const categories = categoriesForType(kind);

  return (
    <>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.stepHead}>
          {stepIndex > 0 ? (
            <Pressable onPress={goBack} hitSlop={8} accessibilityLabel={t('common:back')}>
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={{ width: 22 }} />
          )}
          <Text style={{ color: colors.textTertiary, fontWeight: '700', fontSize: 13 }}>
            {t('capture:money.stepProgress', { current: stepIndex + 1, total: steps.length })}
          </Text>
          <View style={{ width: 22 }} />
        </View>
        <Text style={[styles.kind, { color: colors.textPrimary }]}>{stepTitle}</Text>

        {activeStep === 'amount' && !oilPath && supportsQty ? (
          <QuantityPriceCalculator
            mode={mode}
            onModeChange={setMode}
            quantity={quantity}
            onQuantityChange={setQuantity}
            unit={unit}
            units={suggestedUnitsForCategory(category)}
            onUnitChange={setUnit}
            unitPrice={unitPrice}
            onUnitPriceChange={setUnitPrice}
            amount={amount}
            onAmountChange={setAmount}
            calculatedAmount={resolvedAmount != null ? formatMoney(resolvedAmount, language) : null}
            calculatedUnitPrice={resolvedUnitPrice != null ? formatMoney(resolvedUnitPrice, language) : null}
          />
        ) : activeStep === 'amount' && !oilPath ? (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('capture:money.amount')}</Text>
            <View
              style={[
                styles.amountWrap,
                {
                  borderColor: colors.borderLight,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.euro,
                  { color: kind === 'income' ? colors.eventIncome : colors.eventExpense },
                ]}
              >
                €
              </Text>
              <TextInput
                style={[styles.amount, { color: colors.textPrimary }]}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel={t('capture:money.amount')}
              />
            </View>
          </>
        ) : null}

        {activeStep === 'amount' && isOil && oilLots.length === 0 ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('capture:money.noHarvestOil')}</Text>
        ) : null}
        {activeStep === 'oil' && oilPath ? (
          <>
            <HarvestCarryPicker
              label={t('capture:money.fromThisOil')}
              items={oilLots.map((lot) => {
                const names = lot.fieldIds
                  .map((id) => friendlyFieldLabel(usableFields.find((field) => field.id === id)?.name || id))
                  .filter(Boolean);
                return {
                  id: lot.id,
                  title: formatHarvestOilAmount(lot.sold ? lot.farmerLitres : lot.litres, 'litres', language),
                  detail: names.join(' + ') || undefined,
                  colors: lot.fieldIds.map((id) =>
                    resolveFieldColor(usableFields.find((field) => field.id === id)?.color, id)
                  ),
                  group: lot.date,
                  badge: lot.sold ? t('capture:money.oilSold') : undefined,
                  disabled: lot.sold,
                };
              })}
              selected={selectedOilIds}
              onToggle={toggleOilLot}
              hint={selectedOilIds.length ? undefined : t('capture:money.oilSaleHint')}
              transfer={
                selectedLots.length
                  ? {
                      from: formatHarvestOilAmount(selectedOilLitres, 'litres', language),
                      to: t('capture:money.packTitle'),
                      color: carryColor(
                        selectedLots.flatMap((lot) =>
                          lot.fieldIds.map((id) =>
                            resolveFieldColor(usableFields.find((field) => field.id === id)?.color, id)
                          )
                        )
                      ),
                    }
                  : null
              }
            />
          </>
        ) : null}

        {activeStep === 'pack' && oilPath ? (
          <OilPackBars
            stock={oilStock}
            value={soldPack}
            availableLitres={selectedOilLitres}
            onChange={applySoldPack}
          />
        ) : null}
        {activeStep === 'amount' && oilPath ? (
          <QuantityPriceCalculator
            mode="quantity_times_unit_price"
            onModeChange={setMode}
            quantity={quantity}
            onQuantityChange={setQuantity}
            unit="litre"
            units={['litre']}
            onUnitChange={setUnit}
            unitPrice={unitPrice}
            onUnitPriceChange={setUnitPrice}
            amount={amount}
            onAmountChange={setAmount}
            calculatedAmount={resolvedAmount != null ? formatMoney(resolvedAmount, language) : null}
            calculatedUnitPrice={resolvedUnitPrice != null ? formatMoney(resolvedUnitPrice, language) : null}
            hideModeToggle
            quantityLocked
          />
        ) : null}

        {activeStep === 'field' && !oilPath ? (
        <>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('capture:fieldLabel')}</Text>
        {allowSeries && usableFields.length > 1 ? (
          <View style={styles.chipRow}>
            <Pressable
              style={[
                styles.chip,
                {
                  borderColor: splitMode === 'single' ? colors.primary : colors.border,
                  backgroundColor: splitMode === 'single' ? colors.primary + '22' : 'transparent',
                  minHeight: tapMin,
                },
              ]}
              onPress={() => setSplitMode('single')}
            >
              <Text style={{ color: splitMode === 'single' ? colors.primary : colors.textPrimary }}>
                {t('capture:money.splitOne')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.chip,
                {
                  borderColor: splitMode !== 'single' ? colors.primary : colors.border,
                  backgroundColor: splitMode !== 'single' ? colors.primary + '22' : 'transparent',
                  minHeight: tapMin,
                },
              ]}
              onPress={() => {
                if (splitMode === 'single') {
                  setSplitMode('equal');
                  if (!splitFieldIds.length && fieldId) setSplitFieldIds([fieldId]);
                }
              }}
            >
              <Text style={{ color: splitMode !== 'single' ? colors.primary : colors.textPrimary }}>
                {t('capture:money.splitAcross')}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {splitMode !== 'single' && allowSeries ? (
          <>
            <View style={styles.chipRow}>
              <Pressable
                style={[
                  styles.chip,
                  {
                    borderColor: splitMode === 'equal' ? colors.primary : colors.border,
                    backgroundColor: splitMode === 'equal' ? colors.primary + '22' : 'transparent',
                    minHeight: tapMin,
                  },
                ]}
                onPress={() => setSplitMode('equal')}
              >
                <Text style={{ color: splitMode === 'equal' ? colors.primary : colors.textPrimary }}>
                  {t('capture:money.splitEqual')}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.chip,
                  {
                    borderColor: splitMode === 'area' ? colors.primary : colors.border,
                    backgroundColor: splitMode === 'area' ? colors.primary + '22' : 'transparent',
                    minHeight: tapMin,
                  },
                ]}
                onPress={() => setSplitMode('area')}
              >
                <Text style={{ color: splitMode === 'area' ? colors.primary : colors.textPrimary }}>
                  {t('capture:money.splitByArea')}
                </Text>
              </Pressable>
            </View>
            <View style={styles.chipRow}>
              {usableFields.map((f) => {
                const areaDisabled =
                  splitMode === 'area' && !(areaHectares[f.id] != null && (areaHectares[f.id] || 0) > 0);
                const on = splitFieldIds.includes(f.id);
                return (
                  <Pressable
                    key={f.id}
                    disabled={areaDisabled}
                    style={[
                      styles.chip,
                      {
                        borderColor: on ? colors.primary : colors.border,
                        backgroundColor: on ? colors.primary + '22' : 'transparent',
                        minHeight: tapMin,
                        opacity: areaDisabled ? 0.45 : 1,
                      },
                    ]}
                    onPress={() =>
                      setSplitFieldIds((current) =>
                        current.includes(f.id) ? current.filter((id) => id !== f.id) : [...current, f.id]
                      )
                    }
                  >
                    <FieldColorMark color={f.color} fieldId={f.id} size={10} />
                    <Text style={{ color: on ? colors.primary : colors.textPrimary }}>{f.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            {splitMode === 'area'
              ? usableFields
                  .filter((item) => !(areaHectares[item.id] != null && (areaHectares[item.id] || 0) > 0))
                  .map((item) => (
                    <Text key={item.id} style={[styles.hint, { color: colors.textSecondary }]}>
                      {t('capture:money.splitMissingArea', { name: friendlyFieldLabel(item.name) })}
                    </Text>
                  ))
              : null}
          </>
        ) : (
        <View style={styles.chipRow}>
          <Pressable
            style={[
              styles.chip,
              {
                borderColor: !fieldId ? colors.primary : colors.border,
                backgroundColor: !fieldId ? colors.primary + '22' : 'transparent',
                minHeight: tapMin,
              },
            ]}
            onPress={() => setFieldId('')}
          >
            <FieldColorMark hollow size={10} />
            <Text style={{ color: !fieldId ? colors.primary : colors.textPrimary }}>
              {unassignedFieldLabel(language)}
            </Text>
          </Pressable>
          {usableFields.map((f) => (
            <Pressable
              key={f.id}
              style={[
                styles.chip,
                {
                  borderColor: fieldId === f.id ? colors.primary : colors.border,
                  backgroundColor: fieldId === f.id ? colors.primary + '22' : 'transparent',
                  minHeight: tapMin,
                },
              ]}
              onPress={() => setFieldId(f.id)}
            >
              <FieldColorMark color={f.color} fieldId={f.id} size={10} />
              <Text style={{ color: fieldId === f.id ? colors.primary : colors.textPrimary }}>{f.name}</Text>
            </Pressable>
          ))}
        </View>
        )}
        </>
        ) : null}

        {activeStep === 'when' ? (
        <>
        <FormDateField
          label={t('capture:dateLabel')}
          value={occurredOn}
          onValueChange={(value) => {
            setOccurredOn(value);
            if (!resultYearTouched) setResultYear(yearFromDate(value));
          }}
        />
        {oilPath ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('capture:money.oilHarvestYearHint')}</Text>
        ) : (
          <>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('capture:money.yearLine', { span: harvestYearSpan(resultYear) })}
            </Text>
            {resultYear !== yearFromDate(occurredOn) ? (
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                {t('capture:money.harvestYearOverride')}
              </Text>
            ) : null}
          </>
        )}
        {context.dateNeedsChoice && !oilPath ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('chronologio:captureDateChoose', { period: context.periodLabel || '' })}
          </Text>
        ) : context.dateDefaultedToToday && !oilPath ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('chronologio:captureDateUsesToday')}
          </Text>
        ) : null}
        {seriesPlan?.ok && seriesPlan.entries.length > 1 ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('capture:money.seriesPreview', {
              count: seriesPlan.entries.length,
              amount: formatMoney(
                seriesPlan.entries.reduce((sum, entry) => sum + entry.amount, 0),
                language
              ),
            })}
          </Text>
        ) : seriesPlan && !seriesPlan.ok ? (
          <Text style={[styles.hint, { color: colors.eventExpense }]}>
            {seriesPlan.reason === 'need-two'
              ? t('capture:money.splitNeedTwo')
              : seriesPlan.reason === 'missing-area'
                ? t('capture:money.splitMissingAreaShort')
                : t('capture:money.seriesTooMany')}
          </Text>
        ) : null}
        </>
        ) : null}

        {activeStep === 'category' ? (
        <>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('capture:money.category')}</Text>
        <View style={styles.chipRow}>
          {categories.map((c) => (
            <Pressable
              key={c}
              style={[
                styles.chip,
                {
                  borderColor: category === c ? colors.primary : colors.border,
                  backgroundColor: category === c ? colors.primary + '22' : 'transparent',
                  minHeight: tapMin,
                },
              ]}
              onPress={() => {
                applyCategory(c);
                setStep(c === 'olive_oil_sale' && oilLots.length > 0 ? 'oil' : 'amount');
              }}
            >
              <Text style={{ color: category === c ? colors.primary : colors.textPrimary }}>
                {financialCategoryLabel(c, language)}
              </Text>
            </Pressable>
          ))}
        </View>
        </>
        ) : null}

        {activeStep === 'when' ? (
        <>
        <TextInput
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('capture:money.description')}
          placeholderTextColor={colors.textSecondary}
        />

        <Pressable onPress={() => setMoreOpen((v) => !v)} style={{ minHeight: tapMin, justifyContent: 'center' }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {moreOpen ? t('capture:less') : t('capture:more')}
          </Text>
        </Pressable>

        {moreOpen ? (
          <>
            {allowSeries ? (
              <View style={styles.chipRow}>
                <Pressable
                  style={[
                    styles.chip,
                    {
                      borderColor: repeat === 'once' ? colors.primary : colors.border,
                      backgroundColor: repeat === 'once' ? colors.primary + '22' : 'transparent',
                      minHeight: tapMin,
                    },
                  ]}
                  onPress={() => setRepeat('once')}
                >
                  <Text style={{ color: repeat === 'once' ? colors.primary : colors.textPrimary }}>
                    {t('capture:money.repeatOnce')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.chip,
                    {
                      borderColor: repeat === 'monthly' ? colors.primary : colors.border,
                      backgroundColor: repeat === 'monthly' ? colors.primary + '22' : 'transparent',
                      minHeight: tapMin,
                    },
                  ]}
                  onPress={() => setRepeat('monthly')}
                >
                  <Text style={{ color: repeat === 'monthly' ? colors.primary : colors.textPrimary }}>
                    {t('capture:money.repeatMonthly')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {fieldId
              ? tasks.map((task) => (
                  <Pressable
                    key={task.id}
                    style={[
                      styles.chip,
                      {
                        borderColor: relatedTaskId === task.id ? colors.primary : colors.border,
                        minHeight: tapMin,
                      },
                    ]}
                    onPress={() => setRelatedTaskId(relatedTaskId === task.id ? '' : task.id)}
                  >
                    <Text style={{ color: colors.textPrimary }}>{task.title}</Text>
                  </Pressable>
                ))
              : null}
            {fieldId && !oilPath
              ? harvests.map((harvest) => (
                  <Pressable
                    key={harvest.id}
                    style={[
                      styles.chip,
                      {
                        borderColor: relatedHarvestId === harvest.id ? colors.primary : colors.border,
                        minHeight: tapMin,
                      },
                    ]}
                    onPress={() => setRelatedHarvestId(relatedHarvestId === harvest.id ? '' : harvest.id)}
                  >
                    <Text style={{ color: colors.textPrimary }}>
                      {harvest.harvestDate.slice(0, 10)}
                      {harvest.millName ? ` · ${harvest.millName}` : ''}
                    </Text>
                  </Pressable>
                ))
              : null}
            <TextInput
              style={[styles.input, styles.textarea, { color: colors.textPrimary, borderColor: colors.border }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('capture:money.notes')}
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{resultYearHelp(language)}</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              keyboardType="number-pad"
              value={String(resultYear)}
              onChangeText={(value) => {
                setResultYear(Number(value) || resultYear);
                setResultYearTouched(true);
              }}
              accessibilityLabel={t('capture:money.resultYear')}
            />
            <Button
              title={t('capture:money.saveDraft')}
              onPress={() => void save(true)}
              variant="outline"
              size="large"
              disabled={submitting}
            />
          </>
        ) : null}
        </>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        {activeStep === 'when' ? (
        <Button
          title={
            submitting
              ? t('capture:saving')
              : kind === 'income'
                ? t('capture:money.saveIncome')
                : t('capture:money.saveExpense')
          }
          onPress={() => void save(false)}
          loading={submitting}
          fullWidth
          size="large"
        />
        ) : (
        <Button
          title={t('capture:money.continue')}
          onPress={goNext}
          disabled={!canContinue}
          fullWidth
          size="large"
        />
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  body: { padding: spacing.md, paddingBottom: 24 },
  prompt: { fontSize: 16, marginBottom: 12 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  kindBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  kind: { ...typography.styles.h3, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  stepHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10, fontSize: 16 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 68,
    marginBottom: 10,
  },
  euro: { fontSize: 24, fontWeight: '700', marginRight: 8 },
  amount: { flex: 1, fontSize: 28, fontWeight: '700', minHeight: 56 },
  hint: { fontSize: 13, marginBottom: 6 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});

export default MoneyCaptureForm;
