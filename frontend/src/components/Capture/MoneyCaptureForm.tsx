import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import type { CaptureContext, CaptureSavedDetail } from '../../capture/types';
import type { Field } from '../../services/fieldService';
import type { HarvestRecord } from '../../services/harvestService';
import { getFieldWorkService, getFinancialTransactionService, getHarvestService } from '../../services/serviceFactory';
import type { FieldTask } from '../../services/fieldWorkService';
import { fileUploadService } from '../../services/fileUploadService';
import {
  defaultCategoryForType,
  financialCategoryLabel,
  type FinancialCategory,
  type FinancialTransactionType,
} from '../../finance/display';
import { rememberLastMoneyFieldId } from '../../finance/lastField';
import {
  parseDecimal,
  resolveQuantityCalculation,
  type FinancialCalculationMode,
  type FinancialQuantityUnit,
} from '../../finance/quantityCalculator';
import {
  categorySupportsQuantity,
  defaultModeForCategory,
  formatQuantityLine,
  newIdempotencyKey,
  suggestedUnitsForCategory,
  todayIsoDate,
  yearFromIsoDate,
} from '../../finance/moneyUi';
import {
  clearMoneyEntryDraft,
  isMoneyEntryPartial,
  readMoneyEntryDraft,
  writeMoneyEntryDraft,
  type MoneyEntryStep,
} from '../../finance/moneyEntryDraft';
import { formatRelatedHarvestLabel, uniqueRelatedHarvestLabels } from '../../finance/relatedHarvestLabel';
import {
  planMoneySeries,
  type MoneyRepeat,
  type MoneySplitMode,
} from '../../finance/moneySeries';
import { harvestYearRangeLabel, harvestYearSpan } from '../../finance/harvestYear';
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';
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
import OilPackBars from '../money/OilPackBars';
import { HarvestCarryPicker, carryColor } from '../../harvestCampaign/components/HarvestCarryPicker';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { formatGroveLitres } from '../../utils/groveTotals';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import MoneyCategorySelector from '../money/MoneyCategorySelector';
import TransactionAmountInput from '../money/TransactionAmountInput';
import QuantityPriceCalculator from '../money/QuantityPriceCalculator';
import OliveOilSaleFields from '../money/OliveOilSaleFields';
import TransactionFieldSelector from '../money/TransactionFieldSelector';
import TransactionDateSelector from '../money/TransactionDateSelector';
import RelatedRecordSelector from '../money/RelatedRecordSelector';
import TransactionAdvancedDetails from '../money/TransactionAdvancedDetails';
import SaleBuyerPicker from '../money/SaleBuyerPicker';
import AddMoneyFooter from '../money/AddMoneyFooter';
import { oilStockService } from '../../services/oilStockService';
import '../money/Money.css';

type PhotoItem = { id: string; file: File; preview: string; url?: string };

type Props = {
  context: CaptureContext;
  fields: Field[];
  canRecordIncome: boolean;
  canRecordExpense: boolean;
  onSaved: (
    detail: CaptureSavedDetail,
    message: string,
    options?: { transactionId: string; status: 'draft' | 'posted'; reopen?: CaptureContext }
  ) => void;
  /** Notify the capture shell that the form has unsaved partial input. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Lets the capture shell save or discard without a browser confirm. */
  onBindLeave?: (
    actions: {
      saveDraft: () => Promise<'saved' | 'kept-local' | 'failed'>;
      discardLocal: () => void;
    } | null
  ) => void;
};

const moneySteps = (askKind: boolean, oilPath: boolean, askField: boolean): MoneyEntryStep[] => {
  const head: MoneyEntryStep[] = askKind ? ['kind', 'category'] : ['category'];
  const oil: MoneyEntryStep[] = oilPath ? ['oil', 'pack'] : [];
  const field: MoneyEntryStep[] = askField ? ['field'] : [];
  return [...head, ...oil, 'amount', ...field, 'when'];
};

const firstMoneyStep = (askKind: boolean): MoneyEntryStep => {
  const draft = readMoneyEntryDraft();
  const steps = moneySteps(askKind, draft?.category === 'olive_oil_sale', draft?.category !== 'olive_oil_sale');
  const saved = draft?.step as string | undefined;
  // The name used to be its own step; it now lives on the type screen.
  if (saved === 'what') return 'category';
  if (saved && steps.includes(saved as MoneyEntryStep)) return saved as MoneyEntryStep;
  if (draft && (draft.amount || draft.quantity || draft.unitPrice)) return 'amount';
  if (draft?.description) return 'category';
  return steps[0];
};

const formatMoney = (value: number, locale: string) =>
  value.toLocaleString(locale.toLowerCase().startsWith('en') ? 'en-GB' : 'el-GR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const MoneyCaptureForm: React.FC<Props> = ({
  context,
  fields,
  canRecordIncome,
  canRecordExpense,
  onSaved,
  onDirtyChange,
  onBindLeave,
}) => {
  const { t, i18n } = useTranslation(['capture', 'chronologio', 'money']);
  const language = i18n.language || 'el';
  const { dateFormat, formatDate } = useLocaleFormatters();
  const harvestCampaign = useHarvestCampaignOptional();
  const amountRef = useRef<HTMLInputElement>(null);
  const draftAppliedRef = useRef(false);
  const skipContextHydrationRef = useRef(false);

  const preferredKind: FinancialTransactionType | null =
    context.preferredType === 'income' && canRecordIncome
      ? 'income'
      : context.preferredType === 'expense' && canRecordExpense
        ? 'expense'
        : canRecordExpense
          ? 'expense'
          : canRecordIncome
            ? 'income'
            : null;

  const askKind =
    canRecordIncome &&
    canRecordExpense &&
    context.preferredType !== 'income' &&
    context.preferredType !== 'expense';
  const storedDraft = readMoneyEntryDraft();
  const activeDraft =
    context.taskId && storedDraft && storedDraft.relatedTaskId !== context.taskId ? null : storedDraft;
  const [selectedOilIds, setSelectedOilIds] = useState<string[]>([]);
  const [soldPack, setSoldPack] = useState<OilPackStock>(() => emptyOilPack());
  const [kind, setKind] = useState<FinancialTransactionType | null>(
    () => activeDraft?.kind ?? preferredKind
  );
  const [step, setStep] = useState<MoneyEntryStep>(() => {
    if (activeDraft) return firstMoneyStep(askKind);
    if (context.taskId && context.category) return 'amount';
    return askKind ? 'kind' : 'category';
  });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [category, setCategory] = useState<FinancialCategory>(
    () => activeDraft?.category ?? context.category ?? defaultCategoryForType(preferredKind || 'expense')
  );
  const [mode, setMode] = useState<FinancialCalculationMode>(
    () => activeDraft?.mode ?? defaultModeForCategory(category)
  );
  const [quantity, setQuantity] = useState(() => activeDraft?.quantity ?? '');
  const [unit, setUnit] = useState<FinancialQuantityUnit>(
    () => activeDraft?.unit ?? ((suggestedUnitsForCategory(category)[0] || 'litre') as FinancialQuantityUnit)
  );
  const [unitPrice, setUnitPrice] = useState(() => activeDraft?.unitPrice ?? '');
  const [amount, setAmount] = useState(() => activeDraft?.amount ?? '');
  const [fieldId, setFieldId] = useState(() => activeDraft?.fieldId || context.fieldId || '');
  const [occurredOn, setOccurredOn] = useState(
    () => activeDraft?.occurredOn || todayIsoDate(context.occurredAt)
  );
  const [description, setDescription] = useState(
    () => activeDraft?.description || context.description || ''
  );
  const [moreOpen, setMoreOpen] = useState(() =>
    Boolean(
      activeDraft?.moreOpen ||
        activeDraft?.relatedTaskId ||
        activeDraft?.relatedHarvestId ||
        context.taskId ||
        context.harvestId
    )
  );
  const [relatedTaskId, setRelatedTaskId] = useState(
    () => activeDraft?.relatedTaskId || context.taskId || ''
  );
  const [relatedHarvestId, setRelatedHarvestId] = useState(
    () => activeDraft?.relatedHarvestId || context.harvestId || ''
  );
  const [paymentMethod, setPaymentMethod] = useState(() => activeDraft?.paymentMethod ?? '');
  const [counterpartyName, setCounterpartyName] = useState(
    () => activeDraft?.counterpartyName ?? ''
  );
  const [notes, setNotes] = useState(() => activeDraft?.notes ?? '');
  const [splitMode, setSplitMode] = useState<MoneySplitMode>(() => activeDraft?.splitMode ?? 'single');
  const [splitFieldIds, setSplitFieldIds] = useState<string[]>(() => activeDraft?.splitFieldIds ?? []);
  const [repeat, setRepeat] = useState<MoneyRepeat>(() => activeDraft?.repeat ?? 'once');
  const [resultYear, setResultYear] = useState(
    () => activeDraft?.resultYear ?? yearFromIsoDate(todayIsoDate(context.occurredAt))
  );
  const [resultYearTouched, setResultYearTouched] = useState(() => Boolean(activeDraft));
  const [photos] = useState<PhotoItem[]>([]);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skippedPresetCategoryRef = useRef(false);

  const usableFields = useMemo(
    () => fields.filter((field) => (field.status || 'Active') !== 'Draft'),
    [fields]
  );
  const selectedFieldName = usableFields.find((field) => field.id === fieldId)?.name;

  useEffect(() => {
    if (draftAppliedRef.current) return;
    draftAppliedRef.current = true;
    if (activeDraft) {
      skipContextHydrationRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (skipContextHydrationRef.current) return;
    if (preferredKind) {
      setKind(preferredKind);
      if (!context.category) setCategory(defaultCategoryForType(preferredKind));
    }
  }, [preferredKind, context.category]);

  useEffect(() => {
    if (skipContextHydrationRef.current) return;
    if (context.fieldId) setFieldId(context.fieldId);
    if (context.taskId) setRelatedTaskId(context.taskId);
    if (context.harvestId) setRelatedHarvestId(context.harvestId);
  }, [context.fieldId, context.taskId, context.harvestId]);

  useEffect(() => {
    if (skipContextHydrationRef.current) return;
    if (!context.category) return;
    setCategory(context.category);
    const units = suggestedUnitsForCategory(context.category);
    if (units[0]) setUnit(units[0] as FinancialQuantityUnit);
    setMode(defaultModeForCategory(context.category));
  }, [context.category]);

  useEffect(() => {
    if (skipContextHydrationRef.current) return;
    if (context.description) setDescription(context.description);
  }, [context.description]);

  useEffect(() => {
    if (skipContextHydrationRef.current) return;
    if (context.occurredAt) {
      const date = todayIsoDate(context.occurredAt);
      setOccurredOn(date);
      if (!resultYearTouched) setResultYear(yearFromIsoDate(date));
    }
  }, [context.occurredAt, resultYearTouched]);

  useEffect(() => {
    if (!fieldId) {
      setTasks([]);
      setHarvests([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      getFieldWorkService().listFieldTasks({ fieldId }).catch(() => [] as FieldTask[]),
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

  const applyCategory = (next: FinancialCategory) => {
    setCategory(next);
    const units = suggestedUnitsForCategory(next);
    if (units[0]) setUnit(units[0]);
    setMode(defaultModeForCategory(next));
    setError(null);
  };

  const selectKind = (next: FinancialTransactionType) => {
    setKind(next);
    applyCategory(defaultCategoryForType(next));
  };

  const onDateChange = (value: string) => {
    setOccurredOn(value);
    if (!resultYearTouched && category !== 'olive_oil_sale') setResultYear(yearFromIsoDate(value));
  };

  const qtyValue = parseDecimal(quantity);
  const priceValue = parseDecimal(unitPrice);
  const amountValue = parseDecimal(amount);
  const isOil = category === 'olive_oil_sale';
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
      mode: activeMode === 'quantity_times_unit_price' && qtyValue && priceValue
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

  // Harvest oil lots only when the entry was started from συγκομιδή.
  // From Χρήματα, a sale is litres and price — it does not open the harvest.
  const tieOilToHarvest =
    context.harvestCampaignLink === true || context.sourcePage === 'harvest';
  const oilLots = useMemo(
    () => (tieOilToHarvest && harvestCampaign ? saleableOilLots(harvestCampaign.campaign) : []),
    [tieOilToHarvest, harvestCampaign]
  );
  const oilPath = isOil && oilLots.length > 0;
  const selectedLots = useMemo(
    () => oilLots.filter((lot) => selectedOilIds.includes(lot.id) && !lot.sold),
    [oilLots, selectedOilIds]
  );
  /** Oil sales take the grove from the lot — never ask which field. */
  const askField = !oilPath && !(context.taskId && context.fieldId);
  const steps = useMemo(
    () => moneySteps(askKind, oilPath, askField),
    [askKind, oilPath, askField]
  );

  // Preselected category from My Oil / deep links — skip the category picker.
  useEffect(() => {
    if (skippedPresetCategoryRef.current || activeDraft) return;
    if (!context.category || askKind) return;
    skippedPresetCategoryRef.current = true;
    if (context.category === 'olive_oil_sale' && oilLots.length > 0) {
      setStep('oil');
    } else {
      setStep('amount');
    }
  }, [context.category, oilLots.length, askKind, activeDraft]);

  const oilStock = combineOilPacks(selectedLots);
  const selectedOilLitres = Math.round(selectedLots.reduce((sum, lot) => sum + lot.litres, 0) * 10) / 10;
  const oilSeasonYear =
    harvestCampaign?.campaign.seasonStartYear ??
    (selectedLots[0] ? yearFromIsoDate([...selectedLots].sort((a, b) => b.date.localeCompare(a.date))[0].date) : null);

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
    setError(null);
  };

  const applySoldPack = (next: OilPackStock) => {
    setSoldPack(next);
    const litres = packLitres(next);
    setQuantity(litres > 0 ? String(litres) : '');
    setUnit('litre');
    setMode('quantity_times_unit_price');
  };

  const selectedHarvest = harvests.find((harvest) => harvest.id === relatedHarvestId);
  const availableLitres = oilPath && selectedLots.length > 0 ? selectedOilLitres : selectedHarvest?.oilLitres ?? null;
  const exceedsAvailable =
    isOil && availableLitres != null && qtyValue != null && qtyValue > availableLitres;

  const hasMeaningfulAmount = Boolean(resolvedAmount && resolvedAmount > 0);
  const canSubmit = hasMeaningfulAmount;
  const canDraft = Boolean(kind) && hasMeaningfulAmount;
  const quantityLine = formatQuantityLine(qtyValue, unit, resolvedUnitPrice, language);

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

  useEffect(() => {
    onDirtyChange?.(partial);
  }, [partial, onDirtyChange]);

  useEffect(() => {
    if (!kind || !partial) return;
    writeMoneyEntryDraft({
      kind,
      step,
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
    });
  }, [
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
    partial,
    step,
  ]);

  useEffect(() => {
    if (steps.includes(step)) return;
    setStep(steps[0]);
  }, [steps, step]);

  useEffect(() => {
    if (!oilPath || oilSeasonYear == null) return;
    setResultYear(oilSeasonYear);
  }, [oilPath, oilSeasonYear]);

  useEffect(() => {
    if (step === 'amount') amountRef.current?.focus();
  }, [step]);

  const stepIndex = Math.max(0, steps.indexOf(step));
  const goTo = (next: MoneyEntryStep) => {
    const nextIndex = steps.indexOf(next);
    if (nextIndex < 0) return;
    setDirection(nextIndex >= stepIndex ? 1 : -1);
    setStep(next);
  };
  const goNext = () => {
    const next = steps[stepIndex + 1];
    if (next) goTo(next);
  };
  const goBack = () => {
    const prev = steps[stepIndex - 1];
    if (prev) goTo(prev);
  };

  const save = async (saveAsDraft: boolean): Promise<boolean> => {
    if (!kind) return false;
    if (saveAsDraft && !canDraft) {
      setError(t('money:draftNeedsAmount'));
      amountRef.current?.focus();
      return false;
    }
    if (!resolvedAmount || resolvedAmount <= 0) {
      setError(t('capture:money.needPositiveAmount'));
      amountRef.current?.focus();
      return false;
    }
    const text = description.trim() || financialCategoryLabel(category, language);
    if (!saveAsDraft && !text) {
      setError(t('capture:money.descriptionRequired'));
      return false;
    }
    const harvestId = relatedHarvestId === 'later' ? undefined : relatedHarvestId || undefined;
    const resolvedFieldId = oilPath ? oilSaleFieldId(selectedLots) : fieldId;
    const allowSeries = !oilPath && !context.harvestCampaignLink;
    const hectaresOf = (id: string) => {
      const match = usableFields.find((item) => item.id === id);
      return match?.areaHectares != null && match.areaHectares > 0 ? match.areaHectares : null;
    };
    let entries = [
      {
        fieldId: resolvedFieldId || '',
        amount: resolvedAmount,
        occurredOn,
        resultYear,
      },
    ];
    if (allowSeries && (splitMode !== 'single' || repeat === 'monthly')) {
      const plan = planMoneySeries({
        amount: resolvedAmount,
        occurredOn,
        resultYear,
        fieldIds: splitMode === 'single' ? [fieldId] : splitFieldIds,
        areaHectares: Object.fromEntries(usableFields.map((item) => [item.id, hectaresOf(item.id)])),
        splitMode,
        repeat,
      });
      if (!plan.ok) {
        setError(
          plan.reason === 'need-two'
            ? t('capture:money.splitNeedTwo')
            : plan.reason === 'missing-area'
              ? t('capture:money.splitMissingAreaShort')
              : t('capture:money.seriesTooMany')
        );
        return false;
      }
      entries = plan.entries;
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
    setError(null);
    try {
      const attachmentIds: string[] = [];
      for (const photo of photos) {
        const url = photo.url || (await fileUploadService.uploadFile(photo.file));
        attachmentIds.push(url);
      }
      if (oilPath && !saveAsDraft && packLitres(soldPack) > 0 && harvestCampaign) {
        const allocations = allocateSoldPack(selectedLots, soldPack);
        if (allocations.length > 0) {
          harvestCampaign.patch((campaign) => applyOilSale(campaign, allocations));
        }
      }
      let createdId = '';
      let createdStatus: 'draft' | 'posted' = saveAsDraft ? 'draft' : 'posted';
      let savedCount = 0;
      for (const entry of entries) {
        const entryMode = splitting ? 'total_only' : activeMode;
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
          calculationMode: entryMode,
          quantity: entryMode === 'total_only' ? undefined : qtyValue || undefined,
          quantityUnit: entryMode === 'total_only' ? undefined : unit,
          unitPrice: entryMode === 'total_only' ? undefined : resolvedUnitPrice || undefined,
          productKind: isOil ? 'olive_oil' : undefined,
        });
        savedCount += 1;
        if (!createdId) {
          createdId = created.id;
          createdStatus = created.status === 'draft' ? 'draft' : 'posted';
        }
      }
      rememberLastMoneyFieldId(entries[0]?.fieldId || undefined);
      clearMoneyEntryDraft();
      onDirtyChange?.(false);

      // Sync cellar reservation when a posted olive-oil sale is recorded via καταγραφή.
      if (
        !saveAsDraft &&
        kind === 'income' &&
        category === 'olive_oil_sale' &&
        createdId &&
        resolvedAmount &&
        resolvedAmount > 0
      ) {
        const pack =
          oilPath && packLitres(soldPack) > 0
            ? {
                tin16: soldPack.tin16,
                tin17: soldPack.tin17,
                bulkLitres: soldPack.bulkLitres,
              }
            : qtyValue && qtyValue > 0
              ? { tin16: 0, tin17: 0, bulkLitres: qtyValue }
              : null;
        if (pack) {
          try {
            await oilStockService.createCommitment({
              counterpartyName: counterpartyName.trim() || text,
              requested: pack,
              isSale: true,
              amount: resolvedAmount,
              alreadyDelivered: false,
              financialTransactionId: createdId,
            });
          } catch {
            // Income stands; farmer can reserve/deliver from Το λάδι μου if stock sync fails.
          }
        }
      }

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
          amount: resolvedAmount,
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
            sourcePage: context.sourcePage || 'money',
            category,
            description: text,
            harvestCampaignLink: context.harvestCampaignLink,
          },
        }
      );
      return true;
    } catch {
      setError(t('capture:errors.saveFailed'));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const saveRef = useRef(save);
  saveRef.current = save;
  const canDraftRef = useRef(canDraft);
  canDraftRef.current = canDraft;
  useEffect(() => {
    if (!onBindLeave) return;
    onBindLeave({
      saveDraft: async () => {
        if (!canDraftRef.current) return 'kept-local';
        const ok = await saveRef.current(true);
        return ok ? 'saved' : 'failed';
      },
      discardLocal: () => {
        clearMoneyEntryDraft();
        onDirtyChange?.(false);
      },
    });
    return () => onBindLeave(null);
  }, [onBindLeave, onDirtyChange]);

  const harvestOptionLabels = useMemo(
    () =>
      uniqueRelatedHarvestLabels(harvests, {
        fieldName: selectedFieldName,
        locale: language,
        dateFormat,
        statusLabel: (status) =>
          status === 'voided' ? t('money:harvestStatusVoided') : t('money:harvestStatusPosted'),
      }),
    [harvests, selectedFieldName, language, dateFormat, t]
  );
  const draftReason = !canDraft ? t('money:draftNeedsAmount') : null;
  const allowSeries = !oilPath && !context.harvestCampaignLink;
  const seriesPlan =
    allowSeries && resolvedAmount && (splitMode !== 'single' || repeat === 'monthly')
      ? planMoneySeries({
          amount: resolvedAmount,
          occurredOn,
          resultYear,
          fieldIds: splitMode === 'single' ? [fieldId] : splitFieldIds,
          areaHectares: Object.fromEntries(
            usableFields.map((item) => [
              item.id,
              item.areaHectares != null && item.areaHectares > 0 ? item.areaHectares : null,
            ])
          ),
          splitMode,
          repeat,
        })
      : null;
  const seriesReady = seriesPlan == null || seriesPlan.ok;

  if (!kind) {
    return (
      <div className="money-drawer">
        <div className="money-drawer__body">
          <p className="capture-hint">{t('capture:money.noPermission')}</p>
        </div>
      </div>
    );
  }

  const linkedLabel = relatedTaskId
    ? tasks.find((task) => task.id === relatedTaskId)?.title || relatedTaskId
    : relatedHarvestId && selectedHarvest
      ? formatRelatedHarvestLabel(selectedHarvest, {
          fieldName: selectedFieldName,
          locale: language,
          dateFormat,
          statusLabel: (status) =>
            status === 'voided' ? t('money:harvestStatusVoided') : t('money:harvestStatusPosted'),
        })
      : relatedHarvestId || undefined;

  const stepTitle =
    step === 'kind'
      ? t('capture:money.stepKind')
      : step === 'category'
        ? t(kind === 'income' ? 'capture:money.stepCategoryIncome' : 'capture:money.stepCategoryExpense')
        : step === 'oil'
          ? t('capture:money.fromThisOil')
          : step === 'pack'
            ? t('capture:money.packTitle')
            : step === 'amount'
              ? t('capture:money.stepAmount')
              : step === 'field'
                ? t('capture:money.whichField')
                : oilPath
                  ? t('capture:money.whenSold')
                  : t('capture:money.whenDidItHappen');

  const continueFooter = (enabled: boolean) => (
    <footer className="money-drawer__footer">
      <button type="button" className="money-primary-action" disabled={!enabled} onClick={goNext}>
        {t('capture:money.continue')}
      </button>
    </footer>
  );

  return (
    <div className={`money-drawer is-${kind}`}>
      <div className="money-drawer__body money-entry">
        <div className="money-step-bar">
          {stepIndex > 0 ? (
            <button type="button" className="money-step-back" onClick={goBack} aria-label={t('capture:back')}>
              <ChevronLeft size={18} aria-hidden />
            </button>
          ) : (
            <span className="money-step-back is-spacer" aria-hidden />
          )}
          <p className="money-sr-only">
            {t('capture:money.stepProgress', { current: stepIndex + 1, total: steps.length })}
          </p>
          <div className="money-step-dots" aria-hidden>
            {steps.map((id, index) => (
              <span
                key={id}
                className={index === stepIndex ? 'is-current' : index < stepIndex ? 'is-done' : ''}
              />
            ))}
          </div>
        </div>
        <div key={step} className="money-step-panel" data-dir={direction}>
          <p className="money-step-title" id="money-step-title">
            {stepTitle}
          </p>
          {step === 'kind' ? (
            <div className="money-push-list">
              <p className="money-push-hint">{t('capture:tabPrompt.moneyHint')}</p>
              {canRecordIncome ? (
                <button
                  type="button"
                  className="money-push is-income"
                  onClick={() => {
                    selectKind('income');
                    goNext();
                  }}
                >
                  <span className="money-push-icon" aria-hidden>
                    <TrendingUp size={24} />
                  </span>
                  <span className="money-push-copy">
                    <strong>{t('capture:types.income.title')}</strong>
                    <em>{t('capture:types.income.description')}</em>
                  </span>
                  <ChevronRight size={22} aria-hidden />
                </button>
              ) : null}
              {canRecordExpense ? (
                <button
                  type="button"
                  className="money-push is-expense"
                  onClick={() => {
                    selectKind('expense');
                    goNext();
                  }}
                >
                  <span className="money-push-icon" aria-hidden>
                    <TrendingDown size={24} />
                  </span>
                  <span className="money-push-copy">
                    <strong>{t('capture:types.expense.title')}</strong>
                    <em>{t('capture:types.expense.description')}</em>
                  </span>
                  <ChevronRight size={22} aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}
          {step === 'category' ? (
            <>
              <MoneyCategorySelector
                type={kind}
                value={category}
                hideLabel
                onChange={(next) => {
                  applyCategory(next);
                  setDirection(1);
                  setStep(next === 'olive_oil_sale' && oilLots.length > 0 ? 'oil' : 'amount');
                }}
              />
            </>
          ) : null}
          {step === 'oil' ? (
            <>
              <HarvestCarryPicker
                label={t('capture:money.fromThisOil')}
                hideHeading
                items={oilLots.map((lot) => {
                  const names = lot.fieldIds
                    .map((id) => friendlyFieldLabel(usableFields.find((field) => field.id === id)?.name || id))
                    .filter(Boolean);
                  return {
                    id: lot.id,
                    title: formatGroveLitres(lot.sold ? lot.farmerLitres : lot.litres, language),
                    detail: names.join(' + ') || undefined,
                    colors: lot.fieldIds.map((id) =>
                      resolveFieldColor(usableFields.find((field) => field.id === id)?.color, id)
                    ),
                    group: formatDate(`${lot.date}T12:00:00`),
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
                        from: formatGroveLitres(selectedOilLitres, language),
                        to: t('capture:money.packTitle'),
                        color: carryColor(
                          selectedLots.flatMap((lot) =>
                            lot.fieldIds.map((id) =>
                              resolveFieldColor(usableFields.find((field) => field.id === id)?.color, id)
                            )
                          )
                        ),
                      }
                    : undefined
                }
              />
            </>
          ) : null}
          {step === 'pack' ? (
            <OilPackBars
              stock={oilStock}
              value={soldPack}
              availableLitres={selectedOilLitres}
              onChange={applySoldPack}
            />
          ) : null}
          {step === 'amount' ? (
            isOil ? (
              <>
                {oilPath && packLitres(soldPack) > 0 ? (
                  <p className="oil-pack-sum">
                    <span>{formatGroveLitres(packLitres(soldPack), language)}</span>
                    <span aria-hidden>→</span>
                    <strong>{t('capture:money.incomeTotal')}</strong>
                  </p>
                ) : tieOilToHarvest && oilLots.length === 0 ? (
                  <p className="capture-hint">{t('capture:money.noHarvestOil')}</p>
                ) : null}
                <OliveOilSaleFields
                mode={mode === 'total_only' ? 'total' : 'litres'}
                onModeChange={(next) => setMode(next === 'total' ? 'total_only' : 'quantity_times_unit_price')}
                litres={quantity}
                onLitresChange={setQuantity}
                unitPrice={unitPrice}
                onUnitPriceChange={setUnitPrice}
                amount={amount}
                onAmountChange={setAmount}
                calculatedAmount={resolvedAmount ? formatMoney(resolvedAmount, language) : null}
                harvests={harvests}
                harvestId={relatedHarvestId}
                onHarvestChange={setRelatedHarvestId}
                fieldName={selectedFieldName}
                availableLitres={availableLitres}
                exceedsAvailable={exceedsAvailable}
                showHarvestLink={false}
              />
              </>
            ) : supportsQty ? (
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
                calculatedAmount={resolvedAmount ? formatMoney(resolvedAmount, language) : null}
                calculatedUnitPrice={resolvedUnitPrice ? formatMoney(resolvedUnitPrice, language) : null}
                amountRef={amountRef}
                hideAmountLabel
              />
            ) : (
              <div className="money-amount-stage">
                <TransactionAmountInput
                  value={amount}
                  onChange={setAmount}
                  inputRef={amountRef}
                  invalid={Boolean(error)}
                  describedBy={error ? 'money-capture-error' : undefined}
                  hideLabel
                />
              </div>
            )
          ) : null}
          {step === 'field' ? (
            <>
              {allowSeries && usableFields.length > 1 ? (
                <div className="money-split-toggle" role="group" aria-label={t('capture:money.splitAcross')}>
                  <button
                    type="button"
                    className={splitMode === 'single' ? 'is-on' : ''}
                    onClick={() => setSplitMode('single')}
                  >
                    {t('capture:money.splitOne')}
                  </button>
                  <button
                    type="button"
                    className={splitMode !== 'single' ? 'is-on' : ''}
                    onClick={() => setSplitMode((current) => (current === 'single' ? 'equal' : current))}
                  >
                    {t('capture:money.splitAcross')}
                  </button>
                </div>
              ) : null}
              {splitMode !== 'single' && allowSeries ? (
                <>
                  <div className="money-split-toggle" role="group" aria-label={t('capture:money.splitByArea')}>
                    <button
                      type="button"
                      className={splitMode === 'equal' ? 'is-on' : ''}
                      onClick={() => setSplitMode('equal')}
                    >
                      {t('capture:money.splitEqual')}
                    </button>
                    <button
                      type="button"
                      className={splitMode === 'area' ? 'is-on' : ''}
                      onClick={() => setSplitMode('area')}
                    >
                      {t('capture:money.splitByArea')}
                    </button>
                  </div>
                  <TransactionFieldSelector
                    value={fieldId}
                    fields={usableFields}
                    hideLabel
                    allowUnassigned={false}
                    selectionMode="multiple"
                    selectedIds={splitFieldIds}
                    disabledIds={
                      splitMode === 'area'
                        ? usableFields
                            .filter((item) => !(item.areaHectares != null && item.areaHectares > 0))
                            .map((item) => item.id)
                        : []
                    }
                    onChange={() => undefined}
                    onToggle={(id) =>
                      setSplitFieldIds((current) =>
                        current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
                      )
                    }
                  />
                  {splitMode === 'area'
                    ? usableFields
                        .filter((item) => !(item.areaHectares != null && item.areaHectares > 0))
                        .map((item) => (
                          <p key={item.id} className="capture-hint">
                            {t('capture:money.splitMissingArea', {
                              name: friendlyFieldLabel(item.name),
                            })}
                          </p>
                        ))
                    : null}
                </>
              ) : (
                <TransactionFieldSelector
                  value={fieldId}
                  fields={usableFields}
                  hideLabel
                  allowUnassigned
                  onChange={(next) => {
                    setFieldId(next);
                    goNext();
                  }}
                />
              )}
            </>
          ) : null}
          {step === 'when' ? (
            <>
              <TransactionDateSelector value={occurredOn} onChange={onDateChange} hideLabel />
              {oilPath ? (
                <div className="money-oil-year">
                  <p className="money-oil-year__label">{t('capture:money.resultYearLabel')}</p>
                  <p className="money-oil-year__span">{harvestYearSpan(resultYear)}</p>
                  <p className="money-oil-year__range">
                    {harvestYearRangeLabel(resultYear, language)}
                  </p>
                  <p className="capture-hint">{t('capture:money.oilHarvestYearHint')}</p>
                  {selectedLots.length > 0 ? (
                    <p className="money-oil-year__link">
                      {t('capture:money.oilLinkedSummary', {
                        amount: formatGroveLitres(selectedOilLitres, language),
                      })}
                    </p>
                  ) : null}
                </div>
              ) : (
                <>
                  <p className="money-entry-year">
                    {t('capture:money.yearLine', { span: harvestYearSpan(resultYear) })}
                  </p>
                  {resultYear !== yearFromIsoDate(occurredOn) ? (
                    <p className="capture-hint">{t('capture:money.harvestYearOverride')}</p>
                  ) : null}
                </>
              )}
              {context.dateNeedsChoice && !oilPath ? (
                <p className="capture-hint">
                  {t('chronologio:captureDateChoose', { period: context.periodLabel || '' })}
                </p>
              ) : context.dateDefaultedToToday && !oilPath ? (
                <p className="capture-hint">{t('chronologio:captureDateUsesToday')}</p>
              ) : null}
              {allowSeries ? (
                <div className="money-split-toggle" role="group" aria-label={t('capture:money.repeatMonthly')}>
                  <button
                    type="button"
                    className={repeat === 'once' ? 'is-on' : ''}
                    onClick={() => setRepeat('once')}
                  >
                    {t('capture:money.repeatOnce')}
                  </button>
                  <button
                    type="button"
                    className={repeat === 'monthly' ? 'is-on' : ''}
                    onClick={() => setRepeat('monthly')}
                  >
                    {t('capture:money.repeatMonthly')}
                  </button>
                </div>
              ) : null}
              {seriesPlan?.ok && seriesPlan.entries.length > 1 ? (
                <p className="capture-hint">
                  {t('capture:money.seriesPreview', {
                    count: seriesPlan.entries.length,
                    amount: formatMoney(
                      seriesPlan.entries.reduce((sum, entry) => sum + entry.amount, 0),
                      language
                    ),
                  })}
                </p>
              ) : null}
              {seriesPlan && !seriesPlan.ok ? (
                <p className="capture-error" role="alert">
                  {seriesPlan.reason === 'need-two'
                    ? t('capture:money.splitNeedTwo')
                    : seriesPlan.reason === 'missing-area'
                      ? t('capture:money.splitMissingAreaShort')
                      : t('capture:money.seriesTooMany')}
                </p>
              ) : null}
              <label className="money-form-label">
                {t('capture:money.entryName')}
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={300}
                  placeholder={financialCategoryLabel(category, language)}
                />
              </label>
              {oilPath ? (
                <SaleBuyerPicker
                  value={counterpartyName}
                  onChange={setCounterpartyName}
                  fieldId={oilPath ? oilSaleFieldId(selectedLots) || undefined : fieldId || undefined}
                />
              ) : null}
              <TransactionAdvancedDetails
                open={moreOpen}
                onToggle={() => setMoreOpen((open) => !open)}
                notes={notes}
                onNotes={setNotes}
                resultYear={resultYear}
                onResultYear={(year) => {
                  setResultYear(year);
                  setResultYearTouched(true);
                }}
                hideResultYear={oilPath}
              >
                {oilPath ? null : isOil ? (
                  <label className="money-form-label">
                    {t('capture:money.fromWhichHarvest')}
                    <select
                      value={relatedHarvestId}
                      onChange={(e) => setRelatedHarvestId(e.target.value)}
                      aria-label={t('capture:money.relatedHarvest')}
                    >
                      <option value="">{t('capture:money.noLink')}</option>
                      <option value="later">{t('capture:money.linkLater')}</option>
                      {harvests.map((harvest) => (
                        <option key={harvest.id} value={harvest.id}>
                          {harvestOptionLabels.get(harvest.id) ||
                            formatRelatedHarvestLabel(harvest, {
                              fieldName: selectedFieldName,
                              locale: language,
                              dateFormat,
                            })}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <RelatedRecordSelector
                    fieldId={fieldId}
                    fieldName={selectedFieldName}
                    tasks={tasks}
                    harvests={harvests}
                    taskId={relatedTaskId}
                    harvestId={relatedHarvestId}
                    onTaskChange={setRelatedTaskId}
                    onHarvestChange={setRelatedHarvestId}
                    preselectedLabel={linkedLabel}
                  />
                )}
              </TransactionAdvancedDetails>
            </>
          ) : null}
          {error && (step === 'amount' || step === 'when') ? (
            <p id="money-capture-error" className="capture-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      {step === 'oil' ? continueFooter(selectedOilIds.length > 0) : null}
      {step === 'pack' ? continueFooter(packLitres(soldPack) > 0) : null}
      {step === 'amount' ? continueFooter(canSubmit) : null}
      {step === 'field' && splitMode !== 'single' && allowSeries
        ? continueFooter(
            splitFieldIds.length >= 2 &&
              (splitMode !== 'area' ||
                splitFieldIds.filter((id) => {
                  const match = usableFields.find((item) => item.id === id);
                  return match?.areaHectares != null && match.areaHectares > 0;
                }).length >= 2)
          )
        : null}
      {step === 'when' ? (
        <AddMoneyFooter
          type={kind}
          amountLabel={resolvedAmount ? `${formatMoney(resolvedAmount, language)} €` : '—'}
          quantityLine={quantityLine}
          canSubmit={canSubmit && seriesReady}
          canDraft={canDraft}
          disabledReason={canSubmit ? null : t('capture:money.needPositiveAmount')}
          draftDisabledReason={draftReason}
          submitting={submitting}
          onSubmit={() => void save(false)}
          onDraft={() => void save(true)}
        />
      ) : null}
    </div>
  );
};

export default MoneyCaptureForm;
