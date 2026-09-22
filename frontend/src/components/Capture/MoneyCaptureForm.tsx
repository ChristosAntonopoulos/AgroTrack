import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CaptureContext, CaptureSavedDetail } from '../../capture/types';
import type { Field } from '../../services/fieldService';
import type { HarvestRecord } from '../../services/harvestService';
import { getFieldWorkService, getFinancialTransactionService, getHarvestService } from '../../services/serviceFactory';
import type { FieldTask } from '../../services/fieldWorkService';
import { fileUploadService } from '../../services/fileUploadService';
import {
  defaultCategoryForType,
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
  suggestedDescription,
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
import '../money/Money.css';

const MAX_PHOTOS = 5;
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
}) => {
  const { t, i18n } = useTranslation(['capture', 'chronologio', 'money']);
  const language = i18n.language || 'el';
  const { dateFormat, formatDate } = useLocaleFormatters();
  const harvestCampaign = useHarvestCampaignOptional();
  const amountRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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
  const [selectedOilIds, setSelectedOilIds] = useState<string[]>([]);
  const [soldPack, setSoldPack] = useState<OilPackStock>(() => emptyOilPack());
  const [kind, setKind] = useState<FinancialTransactionType | null>(() => {
    const draft = readMoneyEntryDraft();
    return draft?.kind ?? preferredKind;
  });
  const [step, setStep] = useState<MoneyEntryStep>(() => firstMoneyStep(askKind));
  const [direction, setDirection] = useState<1 | -1>(1);
  const [category, setCategory] = useState<FinancialCategory>(() => {
    const draft = readMoneyEntryDraft();
    return draft?.category ?? context.category ?? defaultCategoryForType(preferredKind || 'expense');
  });
  const [mode, setMode] = useState<FinancialCalculationMode>(() => {
    const draft = readMoneyEntryDraft();
    return draft?.mode ?? defaultModeForCategory(category);
  });
  const [quantity, setQuantity] = useState(() => readMoneyEntryDraft()?.quantity ?? '');
  const [unit, setUnit] = useState<FinancialQuantityUnit>(() => {
    const draft = readMoneyEntryDraft();
    return draft?.unit ?? ((suggestedUnitsForCategory(category)[0] || 'litre') as FinancialQuantityUnit);
  });
  const [unitPrice, setUnitPrice] = useState(() => readMoneyEntryDraft()?.unitPrice ?? '');
  const [amount, setAmount] = useState(() => readMoneyEntryDraft()?.amount ?? '');
  const [fieldId, setFieldId] = useState(() => readMoneyEntryDraft()?.fieldId || context.fieldId || '');
  const [occurredOn, setOccurredOn] = useState(
    () => readMoneyEntryDraft()?.occurredOn || todayIsoDate(context.occurredAt)
  );
  const [description, setDescription] = useState(
    () => readMoneyEntryDraft()?.description || context.description || ''
  );
  const [moreOpen, setMoreOpen] = useState(() => {
    const draft = readMoneyEntryDraft();
    return Boolean(
      draft?.moreOpen ||
        draft?.relatedTaskId ||
        draft?.relatedHarvestId ||
        context.taskId ||
        context.harvestId
    );
  });
  const [relatedTaskId, setRelatedTaskId] = useState(
    () => readMoneyEntryDraft()?.relatedTaskId || context.taskId || ''
  );
  const [relatedHarvestId, setRelatedHarvestId] = useState(
    () => readMoneyEntryDraft()?.relatedHarvestId || context.harvestId || ''
  );
  const [paymentMethod, setPaymentMethod] = useState(() => readMoneyEntryDraft()?.paymentMethod ?? '');
  const [counterpartyName, setCounterpartyName] = useState(
    () => readMoneyEntryDraft()?.counterpartyName ?? ''
  );
  const [notes, setNotes] = useState(() => readMoneyEntryDraft()?.notes ?? '');
  const [resultYear, setResultYear] = useState(() => {
    const draft = readMoneyEntryDraft();
    return draft?.resultYear ?? yearFromIsoDate(todayIsoDate(context.occurredAt));
  });
  const [resultYearTouched, setResultYearTouched] = useState(() => Boolean(readMoneyEntryDraft()));
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usableFields = useMemo(
    () => fields.filter((field) => (field.status || 'Active') !== 'Draft'),
    [fields]
  );
  const selectedFieldName = usableFields.find((field) => field.id === fieldId)?.name;

  useEffect(() => {
    if (draftAppliedRef.current) return;
    draftAppliedRef.current = true;
    if (readMoneyEntryDraft()) {
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

  const oilLots = useMemo(
    () => (harvestCampaign ? saleableOilLots(harvestCampaign.campaign) : []),
    [harvestCampaign]
  );
  const oilPath = isOil && oilLots.length > 0;
  const selectedLots = useMemo(
    () => oilLots.filter((lot) => selectedOilIds.includes(lot.id) && !lot.sold),
    [oilLots, selectedOilIds]
  );
  /** Oil sales take the grove from the lot — never ask which field. */
  const askField = !oilPath;
  const steps = useMemo(
    () => moneySteps(askKind, oilPath, askField),
    [askKind, oilPath, askField]
  );
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

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    const next: PhotoItem[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith('image/')) continue;
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    if (next.length) setPhotos((prev) => [...prev, ...next]);
  };

  const save = async (saveAsDraft: boolean) => {
    if (!kind) return;
    if (saveAsDraft && !canDraft) {
      setError(t('money:draftNeedsAmount'));
      amountRef.current?.focus();
      return;
    }
    if (!resolvedAmount || resolvedAmount <= 0) {
      setError(t('capture:money.needPositiveAmount'));
      amountRef.current?.focus();
      return;
    }
    const text = description.trim() || suggestedDescription(category, language);
    if (!saveAsDraft && !text) {
      setError(t('capture:money.descriptionRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const attachmentIds: string[] = [];
      for (const photo of photos) {
        const url = photo.url || (await fileUploadService.uploadFile(photo.file));
        attachmentIds.push(url);
      }
      const harvestId = relatedHarvestId === 'later' ? undefined : relatedHarvestId || undefined;
      const resolvedFieldId = oilPath ? oilSaleFieldId(selectedLots) : fieldId;
      if (oilPath && !saveAsDraft && packLitres(soldPack) > 0 && harvestCampaign) {
        const allocations = allocateSoldPack(selectedLots, soldPack);
        if (allocations.length > 0) {
          harvestCampaign.patch((campaign) => applyOilSale(campaign, allocations));
        }
      }
      const created = await getFinancialTransactionService().create({
        type: kind,
        amount: resolvedAmount,
        currency: 'EUR',
        occurredOn: `${occurredOn}T00:00:00`,
        resultYear,
        fieldId: resolvedFieldId || undefined,
        category,
        description: text,
        paymentMethod: paymentMethod || undefined,
        counterpartyName: counterpartyName.trim() || undefined,
        relatedTaskId: relatedTaskId || undefined,
        relatedHarvestId: harvestId,
        sourceType: harvestId ? 'harvest' : relatedTaskId ? 'task' : 'manual',
        sourceId: harvestId || relatedTaskId || undefined,
        attachmentIds,
        notes: notes.trim() || undefined,
        saveAsDraft,
        idempotencyKey: newIdempotencyKey(),
        calculationMode: activeMode,
        quantity: activeMode === 'total_only' ? undefined : qtyValue || undefined,
        quantityUnit: activeMode === 'total_only' ? undefined : unit,
        unitPrice: activeMode === 'total_only' ? undefined : resolvedUnitPrice || undefined,
        productKind: isOil ? 'olive_oil' : undefined,
      });
      rememberLastMoneyFieldId(resolvedFieldId || undefined);
      clearMoneyEntryDraft();
      onDirtyChange?.(false);
      const message = saveAsDraft
        ? t('capture:money.draftSaved')
        : kind === 'income'
          ? t('capture:income.saved')
          : t('capture:expense.saved');
      onSaved(
        {
          type: kind,
          fieldId: resolvedFieldId || '',
          sourceId: created.id,
          amount: resolvedAmount,
          occurredOn,
          description: text,
          harvestCampaignLink: context.harvestCampaignLink,
        },
        message,
        {
          transactionId: created.id,
          status: created.status === 'draft' ? 'draft' : 'posted',
          reopen: {
            fieldId: resolvedFieldId || undefined,
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
      setError(t('capture:errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

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
              {canRecordIncome ? (
                <button
                  type="button"
                  className="money-push is-income"
                  onClick={() => {
                    selectKind('income');
                    goNext();
                  }}
                >
                  <span>
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
                  <span>
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
              <label className="money-entry-title">
                <span className="money-sr-only">{t('capture:money.shortDescription')}</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={300}
                  placeholder={t('capture:money.shortDescription')}
                  aria-label={t('capture:money.shortDescription')}
                />
              </label>
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
                ) : oilLots.length === 0 ? (
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
              {context.dateDefaultedToToday && !oilPath ? (
                <p className="capture-hint">{t('chronologio:captureDateUsesToday')}</p>
              ) : null}
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
                paymentMethod={paymentMethod}
                onPaymentMethod={setPaymentMethod}
                counterpartyName={counterpartyName}
                onCounterparty={setCounterpartyName}
                notes={notes}
                onNotes={setNotes}
                resultYear={resultYear}
                onResultYear={(year) => {
                  setResultYear(year);
                  setResultYearTouched(true);
                }}
                hideResultYear={oilPath}
                hideCounterparty={oilPath}
                photos={photos}
                onAddPhotos={addPhotos}
                onRemovePhoto={(id) => {
                  const photo = photos.find((item) => item.id === id);
                  if (photo) URL.revokeObjectURL(photo.preview);
                  setPhotos((prev) => prev.filter((item) => item.id !== id));
                }}
                fileRef={fileRef}
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
      {step === 'when' ? (
        <AddMoneyFooter
          type={kind}
          amountLabel={resolvedAmount ? `${formatMoney(resolvedAmount, language)} €` : '—'}
          quantityLine={quantityLine}
          canSubmit={canSubmit}
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
