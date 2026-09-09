import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from '../Common/EmptyState';
import AddCostSheet from './AddCostSheet';
import {
  CreateFinancialEntryInput,
  FieldFinancialSummary,
  FinancialEntry,
} from '../../services/financialEntryService';
import './FieldCostsPanel.css';

type Props = {
  fieldId: string;
  lifecycleYear?: string;
  entries: FinancialEntry[];
  summary: FieldFinancialSummary | null;
  tasks?: Array<{ id: string; title: string }>;
  canAdd: boolean;
  canVoid?: boolean;
  compact?: boolean;
  detailed?: boolean;
  onCreate: (input: CreateFinancialEntryInput) => Promise<FinancialEntry | void>;
  onVoid?: (id: string) => Promise<void>;
};

const formatMoney = (amount: number, currency = 'EUR') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);

const FieldCostsPanel: React.FC<Props> = ({
  fieldId,
  lifecycleYear,
  entries,
  summary,
  tasks = [],
  canAdd,
  canVoid = false,
  compact = false,
  detailed = false,
  onCreate,
  onVoid,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<FinancialEntry | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);

  const visible = useMemo(
    () => entries.filter((e) => e.status === 'posted').slice(0, compact ? 5 : 20),
    [entries, compact]
  );

  const spent = summary?.totalExpenses ?? 0;
  const received = summary?.totalIncome ?? 0;
  const left = summary?.net ?? received - spent;
  const currency = summary?.currency ?? 'EUR';
  const hasMoney = spent > 0 || received > 0;

  const handleCreate = async (input: CreateFinancialEntryInput) => {
    setSubmitting(true);
    setVoidError(null);
    try {
      const created = await onCreate(input);
      if (created) setSaved(created);
    } finally {
      setSubmitting(false);
    }
  };

  const requestVoid = (id: string) => {
    setVoidError(null);
    setVoidingId(id);
  };

  const confirmVoid = async () => {
    if (!voidingId || !onVoid) return;
    try {
      await onVoid(voidingId);
      if (saved?.id === voidingId) setSaved(null);
      setVoidingId(null);
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : t('fields:costs.voidFailed'));
    }
  };

  return (
    <section className={`field-costs${compact ? ' field-costs--compact' : ''}`}>
      <header className="field-costs-header">
        <div>
          <h2>{t('fields:costs.title')}</h2>
          {hasMoney ? (
            <div className="field-costs-totals">
              <p className="field-costs-left">{t('fields:costs.result')}</p>
              <p className="field-costs-hero">
                {left > 0 ? '+' : left < 0 ? '−' : ''}
                {formatMoney(Math.abs(left), currency)}
              </p>
              <div className="field-costs-split">
                <p>
                  {t('fields:costs.income')}{' '}
                  {received > 0 ? formatMoney(received, currency) : t('fields:costs.dash')}
                </p>
                <p>
                  {t('fields:costs.expenses')}{' '}
                  {spent > 0 ? formatMoney(spent, currency) : t('fields:costs.dash')}
                </p>
              </div>
            </div>
          ) : (
            <p className="field-costs-total">{t('fields:costs.emptyHint')}</p>
          )}
        </div>
      </header>

      {saved ? (
        <div className="field-costs-saved">
          <p>
            {t('fields:costs.saved', {
              amount: formatMoney(saved.amount || 0, saved.currency),
            })}
          </p>
        </div>
      ) : null}

      {voidingId ? (
        <div className="field-costs-confirm" role="alertdialog" aria-labelledby="field-costs-void-title">
          <p id="field-costs-void-title">{t('fields:costs.wrongTitle')}</p>
          <p>{t('fields:costs.wrongConfirm')}</p>
          <div className="field-costs-confirm-actions">
            <button type="button" className="field-costs-void field-costs-void--danger" onClick={() => void confirmVoid()}>
              {t('fields:costs.takeOff')}
            </button>
            <button type="button" className="field-costs-void" onClick={() => setVoidingId(null)}>
              {t('common:cancel')}
            </button>
          </div>
        </div>
      ) : null}

      {voidError ? <p className="field-costs-void-error">{voidError}</p> : null}

      {canAdd ? (
        <AddCostSheet
          fieldId={fieldId}
          lifecycleYear={lifecycleYear}
          tasks={tasks}
          submitting={submitting}
          detailed={detailed}
          onSubmit={handleCreate}
        />
      ) : null}

      {visible.length === 0 && !canAdd ? (
        <EmptyState title={t('fields:costs.emptyTitle')} description={t('fields:costs.emptyHint')} />
      ) : visible.length === 0 ? null : (
        <ul className="field-costs-list">
          {visible.map((entry) => (
            <li key={entry.id} className="field-costs-item">
              <div>
                <div className="field-costs-item-title">{entry.description}</div>
                {entry.bucket && t(`fields:costs.buckets.${entry.bucket}`) !== entry.description ? (
                  <div className="field-costs-item-meta">
                    {t(`fields:costs.buckets.${entry.bucket}`)}
                  </div>
                ) : !entry.bucket ? (
                  <div className="field-costs-item-meta">{t('fields:costs.uncategorized')}</div>
                ) : null}
              </div>
              <div className="field-costs-item-right">
                <strong className={entry.kind === 'income' ? 'is-income' : undefined}>
                  {entry.kind === 'income' ? '+' : '−'}
                  {formatMoney(entry.amount, entry.currency)}
                </strong>
                {canVoid && onVoid ? (
                  <button
                    type="button"
                    className="field-costs-void"
                    aria-label={t('fields:costs.actions.delete')}
                    onClick={() => requestVoid(entry.id)}
                  >
                    ⋯
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default FieldCostsPanel;
