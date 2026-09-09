import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X, ExternalLink } from 'lucide-react';
import Button from '../Common/Button';
import type { ChronologioEntry } from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';

type Props = {
  entry: ChronologioEntry | null;
  onClose: () => void;
};

const ChronologioEventDrawer: React.FC<Props> = ({ entry, onClose }) => {
  const { t, i18n } = useTranslation(['chronologio', 'common']);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const numberLocale = i18n.language?.startsWith('el')
    ? 'el-GR'
    : i18n.language?.startsWith('it')
      ? 'it-IT'
      : 'en-US';

  const openFull = () => {
    if (!entry) return;
    if (entry.sourceType === 'Task') navigate(`/tasks/${entry.sourceId}`);
    else if (entry.sourceType === 'Expense')
      navigate(`/money?fieldId=${encodeURIComponent(entry.fieldId)}`);
    else if (entry.sourceType === 'Harvest') navigate(`/fields/${entry.fieldId}`);
  };

  return (
    <AnimatePresence>
      {entry ? (
        <>
          <motion.button
            type="button"
            className="chrono-drawer-backdrop"
            aria-label={t('common:close', { defaultValue: 'Close' })}
            onClick={onClose}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
          />
          <motion.aside
            className="chrono-event-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={entry.title}
            initial={reduceMotion ? false : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { x: 24, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
          >
            <header className="chrono-drawer-header">
              <div>
                <p className="chrono-drawer-meta">
                  {t(`chronologio:categoryLabel.${entry.category}`, {
                    defaultValue: entry.category,
                  })}
                </p>
                <h2>{entry.title}</h2>
                <p className="chrono-drawer-when">
                  {new Date(entry.occurredAt).toLocaleDateString(i18n.language, {
                    dateStyle: 'long',
                  })}
                  {' · '}
                  {new Date(entry.occurredAt).toLocaleTimeString(i18n.language, {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </p>
              </div>
              <button type="button" className="chrono-icon-btn" onClick={onClose} aria-label={t('common:close', { defaultValue: 'Close' })}>
                <X size={18} />
              </button>
            </header>

            <div className="chrono-drawer-body">
              {entry.details.harvest ? (
                <div className="chronologio-harvest-stats">
                  <div className="chronologio-harvest-stat">
                    <strong>
                      {entry.details.harvest.oliveKg.toLocaleString(numberLocale, {
                        maximumFractionDigits: 0,
                      })}
                    </strong>
                    <span>{t('chronologio:olivesUnit')}</span>
                  </div>
                  {entry.details.harvest.oilKg != null ? (
                    <div className="chronologio-harvest-stat">
                      <strong>
                        {entry.details.harvest.oilKg.toLocaleString(numberLocale, {
                          maximumFractionDigits: 1,
                        })}
                      </strong>
                      <span>{t('chronologio:oilUnit')}</span>
                    </div>
                  ) : null}
                  {entry.details.harvest.oilYieldPercent != null ? (
                    <div className="chronologio-harvest-stat">
                      <strong>{entry.details.harvest.oilYieldPercent}%</strong>
                      <span>{t('chronologio:yieldUnit')}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {entry.amount ? (
                <p className="chrono-drawer-amount">
                  {formatChronologioMoney(
                    entry.amount.value,
                    entry.amount.currency,
                    numberLocale
                  )}
                </p>
              ) : null}

              {entry.summary || entry.details.note?.bodyPreview ? (
                <p className="chrono-drawer-notes">
                  {entry.summary || entry.details.note?.bodyPreview}
                </p>
              ) : null}

              <dl className="chrono-drawer-facts">
                <div>
                  <dt>{t('chronologio:living.field')}</dt>
                  <dd>{entry.field?.name || '—'}</dd>
                </div>
                {entry.actor?.displayName ? (
                  <div>
                    <dt>{t('chronologio:living.actor')}</dt>
                    <dd>{entry.actor.displayName}</dd>
                  </div>
                ) : null}
                {entry.details.harvest?.mill ? (
                  <div>
                    <dt>{t('chronologio:mill')}</dt>
                    <dd>{entry.details.harvest.mill}</dd>
                  </div>
                ) : null}
                {entry.details.harvest?.workers ? (
                  <div>
                    <dt>{t('chronologio:workers')}</dt>
                    <dd>{entry.details.harvest.workers}</dd>
                  </div>
                ) : null}
              </dl>

              {entry.media?.length ? (
                <div className="chrono-drawer-media">
                  <h3>{t('chronologio:living.photos')}</h3>
                  <div className="chrono-drawer-media-grid">
                    {entry.media.map((m) => (
                      <img
                        key={m.id}
                        src={m.url || m.thumbnailUrl}
                        alt=""
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <footer className="chrono-drawer-footer">
              <Button variant="outline" icon={<ExternalLink size={14} />} onClick={openFull}>
                {t('chronologio:living.openFull')}
              </Button>
            </footer>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
};

export default ChronologioEventDrawer;
