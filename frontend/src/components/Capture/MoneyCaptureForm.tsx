import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
} from '../../finance/moneyEntryDraft';
import { formatRelatedHarvestLabel, uniqueRelatedHarvestLabels } from '../../finance/relatedHarvestLabel';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import MoneyTypeToggle from '../money/MoneyTypeToggle';
import MoneyCategorySelector from '../money/MoneyCategorySelector';
import TransactionAmountInput from '../money/TransactionAmountInput';
import QuantityPriceCalculator from '../money/QuantityPriceCalculator';
import OliveOilSaleFields from '../money/OliveOilSaleFields';
import TransactionFieldSelector from '../money/TransactionFieldSelector';
import TransactionDateSelector from '../money/TransactionDateSelector';
import RelatedRecordSelector from '../money/RelatedRecordSelector';
import TransactionAdvancedDetails from '../money/TransactionAdvancedDetails';
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
  const { dateFormat } = useLocaleFormatters();
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

  const [kind, setKind] = useState<FinancialTransactionType | null>(() => {
    const draft = readMoneyEntryDraft();
    return draft?.kind ?? preferredKind;
  });
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
    if (!resultYearTouched) setResultYear(yearFromIsoDate(value));
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

  const selectedHarvest = harvests.find((harvest) => harvest.id === relatedHarvestId);
  const availableLitres = selectedHarvest?.oilLitres ?? null;
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
  ]);

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
      const created = await getFinancialTransactionService().create({
        type: kind,
        amount: resolvedAmount,
        currency: 'EUR',
        occurredOn: `${occurredOn}T00:00:00`,
        resultYear,
        fieldId: fieldId || undefined,
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
      rememberLastMoneyFieldId(fieldId || undefined);
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
          fieldId: fieldId || '',
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
            fieldId: fieldId || undefined,
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

  return (
    <div className="money-drawer">
      <div className="money-drawer__body">
        <MoneyTypeToggle
          value={kind}
          onChange={selectKind}
          canRecordIncome={canRecordIncome}
          canRecordExpense={canRecordExpense}
        />
        {isOil ? (
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
          />
        ) : (
          <TransactionAmountInput
            value={amount}
            onChange={setAmount}
            inputRef={amountRef}
            invalid={Boolean(error)}
            describedBy={error ? 'money-capture-error' : undefined}
          />
        )}
        <TransactionFieldSelector value={fieldId} fields={usableFields} onChange={setFieldId} />
        <TransactionDateSelector value={occurredOn} onChange={onDateChange} />
        {context.dateDefaultedToToday ? (
          <p className="capture-hint">{t('chronologio:captureDateUsesToday')}</p>
        ) : null}
        <label className="money-form-label">
          {t('capture:money.shortDescription')}
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            placeholder={suggestedDescription(category, language) || financialCategoryLabel(category, language)}
            aria-label={t('capture:money.shortDescription')}
          />
        </label>
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
          photos={photos}
          onAddPhotos={addPhotos}
          onRemovePhoto={(id) => {
            const photo = photos.find((item) => item.id === id);
            if (photo) URL.revokeObjectURL(photo.preview);
            setPhotos((prev) => prev.filter((item) => item.id !== id));
          }}
          fileRef={fileRef}
        >
          <MoneyCategorySelector type={kind} value={category} onChange={applyCategory} />
          {isOil ? (
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
        {error ? (
          <p id="money-capture-error" className="capture-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
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
    </div>
  );
};

export default MoneyCaptureForm;
