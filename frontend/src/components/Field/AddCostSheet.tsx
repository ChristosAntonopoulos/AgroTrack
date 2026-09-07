import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import {
  CreateFinancialEntryInput,
  FinancialBucket,
  FinancialEntry,
  FinancialEntryKind,
} from '../../services/financialEntryService';
import { CATEGORY_TO_BUCKET } from '../../data/financialCategories';
import './AddCostSheet.css';

const BUCKETS: FinancialBucket[] = ['labor', 'inputs', 'harvest', 'other'];
const DETAIL_CATEGORIES = ['labor', 'mill_cost', 'harvest_workers', 'fertilizers', 'other'] as const;

const todayIso = () => new Date().toISOString().slice(0, 10);

type Props = {
  fieldId: string;
  lifecycleYear?: string;
  tasks?: Array<{ id: string; title: string }>;
  submitting?: boolean;
  detailed?: boolean;
  onSubmit: (input: CreateFinancialEntryInput) => Promise<FinancialEntry | void>;
  onCancel?: () => void;
};

const AddCostSheet: React.FC<Props> = ({
  fieldId,
  lifecycleYear,
  tasks = [],
  submitting = false,
  detailed = false,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [bucket, setBucket] = useState<FinancialBucket | ''>('');
  const [category, setCategory] = useState('');
  const [kind, setKind] = useState<FinancialEntryKind>('expense');
  const [taskId, setTaskId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [occurredOn, setOccurredOn] = useState(todayIso);
  const [changeDay, setChangeDay] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bucketLabel = (value: FinancialBucket) => t(`fields:costs.buckets.${value}`);
  const isPresetDescription = BUCKETS.some((value) => description === bucketLabel(value));

  const computedAmount = useMemo(() => {
    const qty = Number(quantity.replace(',', '.'));
    const price = Number(unitPrice.replace(',', '.'));
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(price) && price > 0) {
      return Math.round(qty * price * 100) / 100;
    }
    return null;
  }, [quantity, unitPrice]);

  const reset = () => {
    setAmount('');
    setDescription('');
    setBucket('');
    setCategory('');
    setKind('expense');
    setTaskId('');
    setQuantity('');
    setUnit('');
    setUnitPrice('');
    setNotes('');
    setOccurredOn(todayIso());
    setChangeDay(false);
    setShowNote(false);
    setShowMore(false);
  };

  const chooseBucket = (value: FinancialBucket) => {
    const next = bucket === value ? '' : value;
    setBucket(next);
    if (!next) {
      if (isPresetDescription) setDescription('');
      setShowNote(false);
      return;
    }
    if (next === 'other') {
      if (isPresetDescription) setDescription('');
      setShowNote(true);
      return;
    }
    if (!description.trim() || isPresetDescription) {
      setDescription(bucketLabel(next));
    }
    setShowNote(false);
  };

  const resolvedDescription = () => {
    const typed = description.trim();
    if (typed) return typed;
    if (bucket && bucket !== 'other') return bucketLabel(bucket);
    return '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(amount.replace(',', '.'));
    const qty = Number(quantity.replace(',', '.'));
    const price = Number(unitPrice.replace(',', '.'));
    const hasQtyPrice = Number.isFinite(qty) && qty > 0 && Number.isFinite(price) && price > 0;
    const hasAmount = Number.isFinite(parsed) && parsed > 0;
    const whatFor = resolvedDescription();

    if (!whatFor) {
      setError(t('fields:costs.descriptionRequired'));
      return;
    }
    if (!hasAmount && !hasQtyPrice) {
      setError(t('fields:costs.amountRequired'));
      return;
    }

    setError(null);
    await onSubmit({
      fieldId,
      amount: hasQtyPrice ? undefined : parsed,
      description: whatFor,
      currency: 'EUR',
      kind,
      bucket: category
        ? CATEGORY_TO_BUCKET[category as keyof typeof CATEGORY_TO_BUCKET]
        : bucket || undefined,
      category: category || undefined,
      taskId: taskId || undefined,
      lifecycleYear,
      quantity: hasQtyPrice ? qty : undefined,
      unit: unit.trim() || undefined,
      unitPrice: hasQtyPrice ? price : undefined,
      notes: notes.trim() || undefined,
      occurredOn: new Date(`${occurredOn}T12:00:00`).toISOString(),
    });
    reset();
  };

  return (
    <form className="add-cost-sheet" onSubmit={handleSubmit}>
      <div className="add-cost-sheet-kinds" role="group" aria-label={t('fields:costs.kind')}>
        {(['expense', 'income'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`add-cost-sheet-kind add-cost-sheet-kind--${value}${kind === value ? ' is-active' : ''}`}
            onClick={() => setKind(value)}
          >
            <span>{t(`fields:costs.kinds.${value}`)}</span>
            <small>{t(`fields:costs.kindHints.${value}`)}</small>
          </button>
        ))}
      </div>

      <label className="add-cost-sheet-field add-cost-sheet-field--amount">
        <span>{t('fields:costs.amount')}</span>
        <div className="add-cost-sheet-amount">
          <span aria-hidden="true">€</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={computedAmount != null ? String(computedAmount) : '80'}
          />
        </div>
      </label>

      <div className="add-cost-sheet-what" role="group" aria-label={t('fields:costs.whatFor')}>
        <span>{t('fields:costs.whatFor')}</span>
        <div className="add-cost-sheet-buckets">
          {BUCKETS.map((value) => (
            <button
              key={value}
              type="button"
              className={`add-cost-sheet-bucket${bucket === value ? ' is-active' : ''}`}
              onClick={() => chooseBucket(value)}
            >
              {bucketLabel(value)}
            </button>
          ))}
        </div>
      </div>

      {showNote || bucket === 'other' ? (
        <label className="add-cost-sheet-field">
          <span>{t('fields:costs.whatFor')}</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('fields:costs.whatForPlaceholder')}
            maxLength={300}
          />
        </label>
      ) : (
        <button type="button" className="add-cost-sheet-link" onClick={() => setShowNote(true)}>
          {t('fields:costs.addNote')}
        </button>
      )}

      <div className="add-cost-sheet-date">
        <span>{t('fields:costs.todayDefault', { date: occurredOn })}</span>
        <button type="button" className="add-cost-sheet-link" onClick={() => setChangeDay((v) => !v)}>
          {t('fields:costs.changeDay')}
        </button>
      </div>
      {changeDay ? (
        <label className="add-cost-sheet-field">
          <span>{t('fields:costs.date')}</span>
          <input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
        </label>
      ) : null}

      {detailed ? (
        showMore ? (
          <div className="add-cost-sheet-more">
            <p className="add-cost-sheet-more-title">{t('fields:costs.moreDetail')}</p>
            <div className="add-cost-sheet-chips" role="group" aria-label={t('fields:costs.category')}>
              {DETAIL_CATEGORIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`add-cost-sheet-chip${category === value ? ' is-active' : ''}`}
                  onClick={() => setCategory((current) => (current === value ? '' : value))}
                >
                  {t(`fields:costs.categories.${value}`)}
                </button>
              ))}
            </div>
            {tasks.length > 0 ? (
              <label className="add-cost-sheet-field">
                <span>{t('fields:costs.linkTask')}</span>
                <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                  <option value="">{t('fields:costs.noTask')}</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="add-cost-sheet-row add-cost-sheet-row--three">
              <label className="add-cost-sheet-field">
                <span>{t('fields:costs.quantity')}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>
              <label className="add-cost-sheet-field">
                <span>{t('fields:costs.unit')}</span>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder={t('fields:costs.unitPlaceholder')}
                />
              </label>
              <label className="add-cost-sheet-field">
                <span>{t('fields:costs.unitPrice')}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
              </label>
            </div>
            <label className="add-cost-sheet-field">
              <span>{t('fields:costs.notes')}</span>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            </label>
          </div>
        ) : (
          <button type="button" className="add-cost-sheet-link" onClick={() => setShowMore(true)}>
            {t('fields:costs.moreDetail')}
          </button>
        )
      ) : null}

      {error ? <p className="add-cost-sheet-error">{error}</p> : null}

      <div className="add-cost-sheet-actions">
        <Button type="submit" variant="primary" loading={submitting} fullWidth>
          {kind === 'income' ? t('fields:costs.saveIn') : t('fields:costs.saveOut')}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common:cancel')}
          </Button>
        ) : null}
      </div>
    </form>
  );
};

export default AddCostSheet;
