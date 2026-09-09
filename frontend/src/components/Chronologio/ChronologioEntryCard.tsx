import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  CheckSquare,
  Wallet,
  Wheat,
  StickyNote,
  CloudRain,
  Sparkles,
  Leaf,
  Users,
  Activity,
  Camera,
  Pin,
} from 'lucide-react';
import type { ChronologioEntry, ChronologioCategory } from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import type { SupportedLocale } from '../../i18n/config';
import './Chronologio.css';

type Props = {
  entry: ChronologioEntry;
  showField: boolean;
  locale: SupportedLocale;
  onSelect?: (entry: ChronologioEntry) => void;
};

const iconFor = (category: string) => {
  switch (category) {
    case 'task':
      return <CheckSquare size={16} />;
    case 'expense':
      return <Wallet size={16} />;
    case 'harvest':
      return <Wheat size={16} />;
    case 'note':
      return <StickyNote size={16} />;
    case 'weather':
      return <CloudRain size={16} />;
    case 'intelligence':
      return <Sparkles size={16} />;
    case 'lifecycle':
      return <Leaf size={16} />;
    case 'collaborator':
      return <Users size={16} />;
    case 'photo':
      return <Camera size={16} />;
    default:
      return <Activity size={16} />;
  }
};

const categoryTone = (category: string, importance: string): string => {
  if (importance === 'critical') return 'is-critical';
  if (importance === 'warning') return 'is-warning';
  if (importance === 'positive') return 'is-positive';
  if (category === 'harvest') return 'is-harvest';
  if (category === 'expense') return 'is-expense';
  if (category === 'task') return 'is-task';
  if (category === 'note') return 'is-note';
  if (category === 'weather') return 'is-weather';
  if (category === 'intelligence') return 'is-intelligence';
  return '';
};

const ChronologioEntryCard: React.FC<Props> = ({ entry, showField, onSelect }) => {
  const { t, i18n } = useTranslation(['chronologio', 'common']);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const numberLocale = i18n.language?.startsWith('el')
    ? 'el-GR'
    : i18n.language?.startsWith('it')
      ? 'it-IT'
      : 'en-US';

  const category = entry.category as ChronologioCategory;
  const tone = categoryTone(category, String(entry.importance));
  const harvest = entry.details.harvest;
  const note = entry.details.note;
  const expense = entry.details.expense;
  const weather = entry.details.weather;
  const intelligence = entry.details.intelligence;
  const lifecycle = entry.details.lifecycle;
  const media = entry.media?.filter((m) => m.thumbnailUrl || m.url).slice(0, 3) ?? [];

  const onActivate = () => {
    if (onSelect) {
      onSelect(entry);
      return;
    }
    if (entry.sourceType === 'Task' && entry.sourceId) {
      navigate(`/tasks/${entry.sourceId}`);
      return;
    }
    if (entry.sourceType === 'Expense') {
      navigate(`/money?fieldId=${encodeURIComponent(entry.fieldId)}`);
      return;
    }
    if (entry.sourceType === 'Harvest') {
      navigate(`/fields/${entry.fieldId}`);
      return;
    }
    if (entry.sourceType === 'Note') {
      navigate('/chronologio');
      return;
    }
    setExpanded((v) => !v);
  };

  const hasExtraDetails = Boolean(
    lifecycle?.message ||
      intelligence?.message ||
      intelligence?.recommendation ||
      weather?.source ||
      harvest?.mill ||
      harvest?.quality ||
      expense?.description
  );

  return (
    <button type="button" className={`chronologio-card ${tone}`} onClick={onActivate}>
      <div className="chronologio-card-top">
        <div className={`chronologio-card-icon ${tone}`}>{iconFor(category)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="chronologio-card-meta">
            {t(`chronologio:categoryLabel.${category}`, { defaultValue: category })}
            {note?.pinned ? (
              <>
                {' · '}
                <Pin size={11} style={{ verticalAlign: 'middle' }} /> {t('chronologio:pinned')}
              </>
            ) : null}
          </div>
          <h3 className="chronologio-card-title">{entry.title}</h3>

          {category === 'harvest' && harvest ? (
            <div className="chronologio-harvest-stats">
              <div className="chronologio-harvest-stat">
                <strong>
                  {harvest.oliveKg.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}
                </strong>
                <span>{t('chronologio:olivesUnit')}</span>
              </div>
              {harvest.oilKg != null ? (
                <div className="chronologio-harvest-stat">
                  <strong>
                    {harvest.oilKg.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}
                  </strong>
                  <span>{t('chronologio:oilUnit')}</span>
                </div>
              ) : null}
              {harvest.oilYieldPercent != null ? (
                <div className="chronologio-harvest-stat">
                  <strong>
                    {harvest.oilYieldPercent.toLocaleString(numberLocale, {
                      maximumFractionDigits: 1,
                    })}
                    %
                  </strong>
                  <span>{t('chronologio:yieldUnit')}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {category === 'expense' ? (
            <div className="chronologio-expense-row">
              {entry.amount ? (
                <span className="chronologio-card-amount">
                  {formatChronologioMoney(entry.amount.value, entry.amount.currency, numberLocale)}
                </span>
              ) : null}
              {expense?.expenseCategory ? (
                <span className="chronologio-expense-cat">{expense.expenseCategory}</span>
              ) : null}
            </div>
          ) : null}

          {category === 'task' ? (
            <>
              {entry.summary ? <p className="chronologio-card-summary">{entry.summary}</p> : null}
              <span className="chronologio-task-status">{t('chronologio:completed')}</span>
            </>
          ) : null}

          {category === 'note' ? (
            <p className="chronologio-note-body">
              {note?.bodyPreview || entry.summary || ''}
            </p>
          ) : null}

          {category === 'weather' ? (
            <>
              {entry.summary ? <p className="chronologio-card-summary">{entry.summary}</p> : null}
              <span className="chronologio-weather-badge">
                {weather?.rainfallMm != null
                  ? `${weather.rainfallMm} mm`
                  : t('chronologio:categoryLabel.weather')}
              </span>
            </>
          ) : null}

          {category !== 'harvest' &&
          category !== 'expense' &&
          category !== 'task' &&
          category !== 'note' &&
          category !== 'weather' &&
          entry.summary ? (
            <p className="chronologio-card-summary">{entry.summary}</p>
          ) : null}

          {showField && entry.field?.name ? (
            <div className="chronologio-card-field">{entry.field.name}</div>
          ) : null}
          {entry.actor?.displayName ? (
            <div className="chronologio-card-actor">
              {t('chronologio:fromActor', { name: entry.actor.displayName })}
            </div>
          ) : null}

          {media.length > 0 ? (
            <div className="chronologio-media-row">
              {media.map((m) => (
                <img
                  key={m.id}
                  className="chronologio-media-thumb"
                  src={m.thumbnailUrl || m.url}
                  alt=""
                  loading="lazy"
                />
              ))}
            </div>
          ) : null}

          <AnimatePresence initial={false}>
            {expanded && hasExtraDetails ? (
              <motion.div
                className="chronologio-details"
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: 4 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
              >
                {lifecycle?.message ? <p>{lifecycle.message}</p> : null}
                {intelligence?.message ? <p>{intelligence.message}</p> : null}
                {intelligence?.recommendation ? <p>{intelligence.recommendation}</p> : null}
                {weather?.source ? (
                  <p>
                    {t('chronologio:dataSource')}: {weather.source}
                  </p>
                ) : null}
                {harvest?.mill ? (
                  <p>
                    {t('chronologio:mill')}: {harvest.mill}
                  </p>
                ) : null}
                {harvest?.quality ? (
                  <p>
                    {t('chronologio:quality')}: {harvest.quality}
                  </p>
                ) : null}
                {expense?.description ? <p>{expense.description}</p> : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </button>
  );
};

export default ChronologioEntryCard;
