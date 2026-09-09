import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import Button from '../Common/Button';
import type { FinancialEntry, UpdateFinancialEntryInput } from '../../services/financialEntryService';
import { FINANCIAL_CATEGORIES } from '../../data/financialCategories';
import { economicsGroupFor, formatEconomicsMoney } from '../../utils/economics';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { getTaskService, getUserService } from '../../services/serviceFactory';
import type { HarvestRecord } from '../../services/harvestService';
import './Economics.css';

type Props = {
  entry: FinancialEntry | null;
  fieldName?: string;
  harvest?: HarvestRecord | null;
  canManage: boolean;
  startEditing?: boolean;
  onClose: () => void;
  onVoid?: (id: string) => Promise<void>;
  onUpdate?: (id: string, input: UpdateFinancialEntryInput) => Promise<void>;
};

const EconomicsEntryDrawer: React.FC<Props> = ({
  entry,
  fieldName,
  harvest,
  canManage,
  startEditing = false,
  onClose,
  onVoid,
  onUpdate,
}) => {
  const { t, i18n } = useTranslation(['economics', 'common', 'fields']);
  const reduceMotion = useReducedMotion();
  const locale = i18n.language;
  const [editing, setEditing] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState<string | null>(null);
  const [actorName, setActorName] = useState<string | null>(null);
  const [draft, setDraft] = useState({ description: '', amount: '', category: '', notes: '' });

  useEffect(() => {
    setEditing(startEditing);
    setConfirmVoid(false);
    setError(null);
    if (!entry) return;
    setDraft({
      description: entry.description,
      amount: String(entry.amount),
      category: entry.category || '',
      notes: entry.notes || '',
    });
  }, [entry, startEditing]);

  useEffect(() => {
    if (!entry?.taskId) {
      setTaskTitle(null);
      return;
    }
    let cancelled = false;
    void getTaskService()
      .getTask(entry.taskId)
      .then((task) => {
        if (!cancelled) setTaskTitle(task.title);
      })
      .catch(() => {
        if (!cancelled) setTaskTitle(null);
      });
    return () => {
      cancelled = true;
    };
  }, [entry?.taskId]);

  useEffect(() => {
    if (!entry?.recordedBy) {
      setActorName(null);
      return;
    }
    let cancelled = false;
    void getUserService()
      .getUser(entry.recordedBy)
      .then((user) => {
        if (cancelled) return;
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
        setActorName(name || user.email || entry.recordedBy);
      })
      .catch(() => {
        if (!cancelled) setActorName(entry.recordedBy);
      });
    return () => {
      cancelled = true;
    };
  }, [entry]);

  const saveEdit = async () => {
    if (!entry || !onUpdate) return;
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBusy(true);
    setError(null);
    try {
      await onUpdate(entry.id, {
        amount,
        description: draft.description.trim() || entry.description,
        category: draft.category || undefined,
        notes: draft.notes.trim() || undefined,
      });
      setEditing(false);
    } catch {
      setError(t('economics:saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const doVoid = async () => {
    if (!entry || !onVoid) return;
    setBusy(true);
    setError(null);
    try {
      await onVoid(entry.id);
      onClose();
    } catch {
      setError(t('economics:deleteFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {entry ? (
        <>
          <motion.button
            type="button"
            className="eco-drawer-backdrop"
            aria-label={t('common:close', { defaultValue: 'Close' })}
            onClick={onClose}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
          />
          <motion.aside
            className="eco-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={entry.description}
            initial={reduceMotion ? false : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { x: 24, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
          >
            <header className="eco-drawer-header">
              <div>
                <p className="eco-drawer-kicker">
                  {entry.kind === 'income' ? t('economics:incomeLabel') : t('economics:expense')}
                </p>
                <h2>{entry.description}</h2>
                <p className={`eco-drawer-amount ${entry.kind === 'income' ? 'is-in' : ''}`}>
                  {formatEconomicsMoney(entry.amount, entry.currency, locale)}
                </p>
                <p>
                  {new Date(entry.occurredOn).toLocaleDateString(locale, { dateStyle: 'long' })}
                </p>
              </div>
              <button
                type="button"
                className="eco-icon-btn"
                onClick={onClose}
                aria-label={t('common:close', { defaultValue: 'Close' })}
              >
                <X size={18} />
              </button>
            </header>

            <div className="eco-drawer-body">
              {editing ? (
                <div className="eco-edit">
                  <label>
                    {t('economics:entryTitle')}
                    <input
                      value={draft.description}
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    />
                  </label>
                  <label>
                    {t('economics:amount')}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.amount}
                      onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                    />
                  </label>
                  <label>
                    {t('economics:category')}
                    <select
                      value={draft.category}
                      onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                    >
                      <option value="">{t('economics:allCategoriesOption')}</option>
                      {FINANCIAL_CATEGORIES.map((id) => (
                        <option key={id} value={id}>
                          {t(`fields:costs.categories.${id}`, { defaultValue: id })}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('economics:notes')}
                    <textarea
                      rows={3}
                      value={draft.notes}
                      onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                    />
                  </label>
                </div>
              ) : (
                <dl className="eco-facts">
                  <div>
                    <dt>{t('economics:category')}</dt>
                    <dd>{t(`economics:groups.${economicsGroupFor(entry)}`)}</dd>
                  </div>
                  {fieldName ? (
                    <div>
                      <dt>{t('economics:field')}</dt>
                      <dd>{friendlyFieldLabel(fieldName)}</dd>
                    </div>
                  ) : null}
                  {taskTitle ? (
                    <div>
                      <dt>{t('economics:relatedTask')}</dt>
                      <dd>{taskTitle}</dd>
                    </div>
                  ) : null}
                  {harvest ? (
                    <div>
                      <dt>{t('economics:harvest')}</dt>
                      <dd>
                        {harvest.oliveKg
                          ? `${harvest.oliveKg.toLocaleString(locale)} kg`
                          : harvest.harvestDate}
                      </dd>
                    </div>
                  ) : null}
                  {actorName ? (
                    <div>
                      <dt>{t('economics:recordedBy')}</dt>
                      <dd>{actorName}</dd>
                    </div>
                  ) : null}
                  {entry.notes ? (
                    <div>
                      <dt>{t('economics:notes')}</dt>
                      <dd>{entry.notes}</dd>
                    </div>
                  ) : null}
                </dl>
              )}
              {error ? <p className="eco-prev-year">{error}</p> : null}
              {confirmVoid ? (
                <div>
                  <p>{t('economics:deleteTitle')}</p>
                  <p className="eco-prev-year">{t('economics:deleteConfirm')}</p>
                </div>
              ) : null}
            </div>

            {canManage && (onVoid || onUpdate) ? (
              <footer className="eco-drawer-footer">
                {editing ? (
                  <>
                    <Button variant="primary" disabled={busy} onClick={() => void saveEdit()}>
                      {t('economics:save')}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>
                      {t('economics:cancel')}
                    </Button>
                  </>
                ) : confirmVoid ? (
                  <>
                    <Button variant="primary" disabled={busy} onClick={() => void doVoid()}>
                      {t('economics:delete')}
                    </Button>
                    <Button variant="outline" onClick={() => setConfirmVoid(false)}>
                      {t('economics:cancel')}
                    </Button>
                  </>
                ) : (
                  <>
                    {onUpdate ? (
                      <Button variant="outline" onClick={() => setEditing(true)}>
                        {t('economics:correct')}
                      </Button>
                    ) : null}
                    {onVoid ? (
                      <Button variant="outline" onClick={() => setConfirmVoid(true)}>
                        {t('economics:delete')}
                      </Button>
                    ) : null}
                  </>
                )}
              </footer>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
};

export default EconomicsEntryDrawer;
