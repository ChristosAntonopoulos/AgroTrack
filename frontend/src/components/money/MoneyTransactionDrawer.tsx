import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../Common/Button';
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
  const reduceMotion = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [voidReason, setVoidReason] = useState('');
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

  return (
    <AnimatePresence>
      {transaction ? (
        <>
          <motion.button
            type="button"
            className="drawer-scrim"
            aria-label={t('common:close', { defaultValue: 'Close' })}
            onClick={onClose}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
          />
          <motion.aside
            className="money-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={transaction.description}
            initial={reduceMotion ? false : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { x: 24, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
          >
            <header className="money-drawer__header">
              <div>
                <p className="money-drawer-kicker">
                  {labelOr(transaction.typeLabel, financialTypeLabel(transaction.type, i18n.language))}
                </p>
                <h2>{transaction.description}</h2>
                <p className={`money-drawer-amount${transaction.type === 'income' ? ' is-income' : ''}`}>
                  {formatOfficialAmount(
                    transaction.amount,
                    transaction.currency,
                    i18n.language,
                    t('money:unknownAmount')
                  )}
                </p>
                {quantityLine ? <p className="money-summary-note">{quantityLine}</p> : null}
              </div>
              <button
                type="button"
                className="money-icon-btn"
                onClick={onClose}
                aria-label={t('common:close', { defaultValue: 'Close' })}
              >
                <X size={18} />
              </button>
            </header>

            <div className="money-drawer__body">
              <dl className="money-facts">
                <div>
                  <dt>{t('money:status')}</dt>
                  <dd>
                    {labelOr(
                      transaction.statusLabel,
                      financialStatusLabel(transaction.status, i18n.language)
                    )}
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
            </div>

            {canManage ? (
              <footer className="money-drawer__footer">
                {transaction.status === 'draft' ? (
                  <>
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => void run(() => onPostDraft(transaction.id))}
                    >
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
              </footer>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
};

export default MoneyTransactionDrawer;
