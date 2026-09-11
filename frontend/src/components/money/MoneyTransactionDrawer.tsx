import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import type { FinancialTransaction } from '../../services/financialTransactionService';
import {
  financialCategoryLabel,
  financialSourceLabel,
  financialStatusLabel,
  financialTypeLabel,
  isRawFinancialValue,
  paymentMethodLabel,
  unassignedFieldLabel,
} from '../../finance/display';
import { formatOfficialAmount } from '../../finance/format';
import { formatQuantityLine } from '../../finance/moneyUi';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import './Money.css';

type Props = {
  transaction: FinancialTransaction | null;
  fieldName?: string;
  relatedTaskTitle?: string;
  relatedHarvestTitle?: string;
  canManage: boolean;
  fullPicture: boolean;
  onClose: () => void;
  onVoid: (id: string, reason: string) => Promise<void>;
  onPostDraft: (id: string) => Promise<void>;
  onDeleteDraft: (id: string) => Promise<void>;
};

const labelOr = (raw: string | undefined, fallback: string) =>
  raw && !isRawFinancialValue(raw) ? raw : fallback;

const MoneyTransactionDrawer: React.FC<Props> = ({
  transaction,
  fieldName,
  relatedTaskTitle,
  relatedHarvestTitle,
  canManage,
  fullPicture,
  onClose,
  onVoid,
  onPostDraft,
  onDeleteDraft,
}) => {
  const { t, i18n } = useTranslation(['money', 'common']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  useEffect(() => {
    if (transaction) return;
    setBusy(false);
    setError(null);
    setConfirmVoid(false);
    setVoidReason('');
  }, [transaction]);

  const quantityLine = useMemo(
    () =>
      transaction
        ? formatQuantityLine(
            transaction.quantity,
            transaction.quantityUnit,
            transaction.unitPrice,
            i18n.language
          )
        : null,
    [i18n.language, transaction]
  );

  const run = async (action: () => Promise<void>) => {
    try {
      setBusy(true);
      setError(null);
      await action();
    } catch {
      setError(t('money:actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  const footer =
    transaction && canManage ? (
      <>
        {transaction.status === 'draft' ? (
          <>
            <Button variant="primary" disabled={busy} onClick={() => void run(() => onPostDraft(transaction.id))}>
              {t('money:postDraft')}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (window.confirm(t('money:deleteDraftConfirm'))) {
                  void run(() => onDeleteDraft(transaction.id));
                }
              }}
            >
              {t('money:deleteDraft')}
            </Button>
          </>
        ) : null}
        {transaction.status === 'posted' ? (
          confirmVoid ? (
            <>
              <Button
                variant="primary"
                disabled={busy || !voidReason.trim()}
                onClick={() => void run(() => onVoid(transaction.id, voidReason.trim()))}
              >
                {t('money:voidPosted')}
              </Button>
              <Button variant="outline" onClick={() => setConfirmVoid(false)}>
                {t('common:cancel', { defaultValue: 'Cancel' })}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setConfirmVoid(true)}>
              {t('money:voidPosted')}
            </Button>
          )
        ) : null}
      </>
    ) : undefined;

  return (
    <RightDrawer
      open={Boolean(transaction)}
      onClose={onClose}
      resetKey={transaction?.id}
      size="lg"
      title={transaction?.description || ''}
      kicker={
        transaction
          ? labelOr(transaction.typeLabel, financialTypeLabel(transaction.type, i18n.language))
          : undefined
      }
      headerExtra={
        transaction ? (
          <>
            <p className={`money-drawer-amount${transaction.type === 'income' ? ' is-income' : ''}`}>
              {formatOfficialAmount(
                transaction.amount,
                transaction.currency,
                i18n.language,
                t('money:unknownAmount')
              )}
            </p>
            {quantityLine ? <p className="money-summary-note">{quantityLine}</p> : null}
          </>
        ) : null
      }
      footer={footer}
    >
      {transaction ? (
        <>
          <dl className="money-facts">
            <div>
              <dt>{t('money:status')}</dt>
              <dd>
                {labelOr(transaction.statusLabel, financialStatusLabel(transaction.status, i18n.language))}
              </dd>
            </div>
            <div>
              <dt>{t('money:category')}</dt>
              <dd>
                {transaction.category
                  ? labelOr(
                      transaction.categoryLabel,
                      financialCategoryLabel(transaction.category, i18n.language)
                    )
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>{t('money:date')}</dt>
              <dd>
                {new Date(transaction.occurredOn).toLocaleDateString(i18n.language, {
                  dateStyle: 'long',
                })}
              </dd>
            </div>
            <div>
              <dt>{t('money:field')}</dt>
              <dd>
                {transaction.fieldId
                  ? friendlyFieldLabel(fieldName || transaction.fieldId)
                  : unassignedFieldLabel(i18n.language)}
              </dd>
            </div>
            {transaction.relatedTaskId ? (
              <div>
                <dt>{t('money:relatedTask')}</dt>
                <dd>
                  {relatedTaskTitle ? (
                    <Link to={`/tasks/${transaction.relatedTaskId}`}>{relatedTaskTitle}</Link>
                  ) : (
                    t('money:relatedTask')
                  )}
                </dd>
              </div>
            ) : null}
            {transaction.relatedHarvestId ? (
              <div>
                <dt>{t('money:relatedHarvest')}</dt>
                <dd>{relatedHarvestTitle || t('money:relatedHarvest')}</dd>
              </div>
            ) : null}
            {fullPicture ? (
              <>
                {transaction.paymentMethod ? (
                  <div>
                    <dt>{t('money:payment')}</dt>
                    <dd>{paymentMethodLabel(transaction.paymentMethod, i18n.language)}</dd>
                  </div>
                ) : null}
                {transaction.counterpartyName ? (
                  <div>
                    <dt>{t('money:counterparty')}</dt>
                    <dd>{transaction.counterpartyName}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t('money:receipts')}</dt>
                  <dd>
                    {transaction.attachmentIds.length
                      ? t('money:receiptCount', { count: transaction.attachmentIds.length })
                      : t('money:noReceipts')}
                  </dd>
                </div>
                <div>
                  <dt>{t('money:source')}</dt>
                  <dd>
                    {labelOr(
                      transaction.sourceTypeLabel,
                      financialSourceLabel(
                        transaction.sourceType as 'manual' | 'task' | 'harvest' | 'service',
                        i18n.language
                      )
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t('money:createdAt', { date: '' }).trim()}</dt>
                  <dd>
                    {t('money:createdAt', {
                      date: new Date(transaction.createdAt).toLocaleString(i18n.language),
                    })}
                  </dd>
                </div>
                {transaction.postedAt ? (
                  <div>
                    <dt>{t('money:postedAt', { date: '' }).trim()}</dt>
                    <dd>
                      {t('money:postedAt', {
                        date: new Date(transaction.postedAt).toLocaleString(i18n.language),
                      })}
                    </dd>
                  </div>
                ) : null}
              </>
            ) : null}
            {transaction.notes ? (
              <div>
                <dt>{t('money:notes')}</dt>
                <dd>{transaction.notes}</dd>
              </div>
            ) : null}
          </dl>
          {confirmVoid ? (
            <div>
              <p>{t('money:voidConfirm')}</p>
              <label className="money-form-label">
                {t('money:voidReasonPrompt')}
                <input
                  className="money-void-reason"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                />
              </label>
            </div>
          ) : null}
          {error ? <p className="money-error">{error}</p> : null}
        </>
      ) : null}
    </RightDrawer>
  );
};

export default MoneyTransactionDrawer;
