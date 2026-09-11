import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Pin } from 'lucide-react';
import Button from '../Common/Button';
import HarvestMoneyPanel from '../money/HarvestMoneyPanel';
import WeatherMonthSnapshot from './WeatherMonthSnapshot';
import {
  getFieldWorkService,
  getFinancialTransactionService,
  getNoteService,
} from '../../services/serviceFactory';
import type { ChronologioEntry } from '../../services/chronologioService';
import type { FieldTask } from '../../services/fieldWorkService';
import type { FinancialTransaction } from '../../services/financialTransactionService';
import type { Note } from '../../services/noteService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { taskStatusI18nKey } from '../../utils/categoryNormalize';
import { formatQuantityLine } from '../../finance/moneyUi';
import { financialStatusLabel, financialTypeLabel } from '../../finance/display';
import {
  presentActorName,
  presentChronologioEvent,
  presentExpenseChip,
  presentHarvestQuality,
  presentLifecycleStage,
} from '../../chronologio/eventPresentation';
import { chronologioDetailKind } from '../../chronologio/detailKind';
import { buildDayWeatherView, type DayWeatherInput } from '../../chronologio/dayWeather';
import { EntityCache } from '../../utils/entityCache';

type Props = {
  entry: ChronologioEntry;
  numberLocale: string;
  dayWeather?: DayWeatherInput | null;
};

const formatWhen = (value?: string | null, language = 'el') => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString(language, { dateStyle: 'long' })} · ${d.toLocaleTimeString(language, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
};

const Fact: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => {
  if (children == null || children === false || children === '') return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
};

const MediaGallery: React.FC<{ entry: ChronologioEntry; title: string }> = ({ entry, title }) => {
  const photos = (entry.media || []).filter((m) => m.url || m.thumbnailUrl);
  const audio = photos.filter((m) => /audio|voice/i.test(m.type || ''));
  const images = photos.filter((m) => !/audio|voice/i.test(m.type || ''));
  if (!photos.length) return null;
  return (
    <div className="chrono-drawer-media">
      <h3>{title}</h3>
      {images.length ? (
        <div className="chrono-drawer-media-grid">
          {images.map((m) => (
            <img key={m.id} src={m.url || m.thumbnailUrl} alt="" loading="lazy" />
          ))}
        </div>
      ) : null}
      {audio.map((m) =>
        m.url ? (
          <audio key={m.id} className="chrono-drawer-audio" controls src={m.url} />
        ) : null
      )}
    </div>
  );
};

const ChronologioEventDetail: React.FC<Props> = ({ entry, numberLocale, dayWeather }) => {
  const { t, i18n } = useTranslation(['chronologio', 'common', 'today']);
  const navigate = useNavigate();
  const kind = chronologioDetailKind(entry);
  const actor = presentActorName(entry.actor?.displayName, i18n.language);
  const weatherView = buildDayWeatherView(dayWeather, numberLocale);

  if (kind === 'task') {
    return (
      <TaskDetail
        entry={entry}
        numberLocale={numberLocale}
        actor={actor}
        weatherView={weatherView}
      />
    );
  }
  if (kind === 'observation') {
    return <ObservationDetail entry={entry} actor={actor} />;
  }
  if (kind === 'money') {
    return <MoneyDetail entry={entry} numberLocale={numberLocale} actor={actor} />;
  }
  if (kind === 'harvest') {
    return <HarvestDetail entry={entry} numberLocale={numberLocale} actor={actor} />;
  }
  if (kind === 'weatherPeriod') {
    const weather = entry.details.weather;
    return weather ? (
      <div className="chrono-drawer-weather">
        <WeatherMonthSnapshot
          weather={weather}
          eventType={entry.eventType}
          numberLocale={numberLocale}
          locale={i18n.language}
          fieldId={entry.fieldId}
          variant="detail"
        />
      </div>
    ) : (
      <p className="chrono-drawer-notes">{entry.summary}</p>
    );
  }
  if (kind === 'warning') {
    const intel = entry.details.intelligence;
    return (
      <dl className="chrono-drawer-facts">
        <Fact label={t('drawer.severity')}>
          {intel?.severity || String(entry.importance || '')}
        </Fact>
        <Fact label={t('drawer.source')}>{entry.isSystemGenerated ? 'OLEACHRON' : actor}</Fact>
        <Fact label={t('drawer.issued')}>{formatWhen(entry.occurredAt, i18n.language)}</Fact>
        <Fact label={t('living.field')}>{entry.field?.name}</Fact>
        <Fact label={t('drawer.why')}>{intel?.message || entry.summary}</Fact>
        <Fact label={t('drawer.response')}>{intel?.recommendation}</Fact>
        {intel?.relatedSourceIds?.[0] ? (
          <Fact label={t('drawer.relatedTask')}>
            <button
              type="button"
              className="money-text-link"
              onClick={() => navigate(`/tasks/${intel.relatedSourceIds?.[0]}`)}
            >
              {t('living.openTask')}
            </button>
          </Fact>
        ) : null}
      </dl>
    );
  }

  const lifecycle = entry.details.lifecycle;
  return (
    <>
      {entry.summary ? <p className="chrono-drawer-notes">{entry.summary}</p> : null}
      <dl className="chrono-drawer-facts">
        <Fact label={t('living.field')}>{entry.field?.name}</Fact>
        <Fact label={t('living.actor')}>{actor}</Fact>
        <Fact label={t('drawer.previous')}>
          {presentLifecycleStage(lifecycle?.previousStage, i18n.language) || lifecycle?.previousYear}
        </Fact>
        <Fact label={t('drawer.next')}>
          {presentLifecycleStage(lifecycle?.newStage, i18n.language) || lifecycle?.newYear}
        </Fact>
        <Fact label={t('common:description')}>{lifecycle?.message || entry.details.activity?.message}</Fact>
      </dl>
      <MediaGallery entry={entry} title={t('living.photos')} />
    </>
  );
};

const TaskDetail: React.FC<{
  entry: ChronologioEntry;
  numberLocale: string;
  actor: string;
  weatherView: ReturnType<typeof buildDayWeatherView>;
}> = ({ entry, numberLocale, actor, weatherView }) => {
  const { t, i18n } = useTranslation(['chronologio', 'common', 'today']);
  const navigate = useNavigate();
  const task = entry.details.task;
  const [full, setFull] = useState<FieldTask | null>(null);

  useEffect(() => {
    const id = task?.taskId || (entry.sourceType === 'Task' ? entry.sourceId : '');
    if (!id) return;
    let cancelled = false;
    void getFieldWorkService()
      .getFieldTask(id)
      .then((row) => {
        if (!cancelled) setFull(row);
      })
      .catch(() => {
        if (!cancelled) setFull(null);
      });
    return () => {
      cancelled = true;
    };
  }, [entry.sourceId, entry.sourceType, task?.taskId]);

  const checklist = (full?.checklist || []).filter((item) => item.isAnswered);
  const rainLabel =
    weatherView.rain.kind === 'missing'
      ? t('today.weatherMissing')
      : weatherView.rain.kind === 'zero'
        ? t('today.noRain')
        : t('today.rainMm', {
            mm: (weatherView.rain.value ?? 0).toLocaleString(numberLocale, {
              maximumFractionDigits: 1,
            }),
          });

  return (
    <>
      <dl className="chrono-drawer-facts">
        <Fact label={t('drawer.taskName')}>{entry.title}</Fact>
        <Fact label={t('drawer.taskCategory')}>
          {task?.taskType || full?.templateCode}
        </Fact>
        <Fact label={t('drawer.actualStart')}>
          {formatWhen(task?.startDate || full?.startedAt || full?.plannedStart, i18n.language)}
        </Fact>
        <Fact label={t('drawer.actualEnd')}>
          {formatWhen(task?.endDate || full?.updatedAt, i18n.language)}
        </Fact>
        <Fact label={t('common:status')}>
          {task?.status ? t(taskStatusI18nKey(task.status)) : full?.statusLabel}
        </Fact>
        <Fact label={t('living.field')}>{entry.field?.name}</Fact>
        <Fact label={t('drawer.people')}>
          {[actor, task?.assigneeName].filter(Boolean).join(' · ') || null}
        </Fact>
        <Fact label={t('common:description')}>{full?.notes || entry.summary}</Fact>
        {entry.amount ? (
          <Fact label={t('drawer.cost')}>
            {formatChronologioMoney(entry.amount.value, entry.amount.currency, numberLocale)}
          </Fact>
        ) : null}
        <Fact label={t('drawer.weatherDuring')}>
          {weatherView.missing
            ? t('today.weatherMissing')
            : [weatherView.tempLabel, rainLabel].filter(Boolean).join(' · ')}
        </Fact>
        <Fact label={t('drawer.weatherAfter')}>{full?.weatherSuitabilityLabel}</Fact>
      </dl>
      {checklist.length ? (
        <section className="chrono-drawer-section">
          <h3>{t('drawer.checklist')}</h3>
          <ul className="chrono-drawer-checklist">
            {checklist.map((item) => (
              <li key={item.key}>
                {i18n.language.startsWith('el') ? item.greekLabel || item.label : item.englishLabel || item.label}
                {item.textValue ? ` · ${item.textValue}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <MediaGallery entry={entry} title={t('living.photos')} />
      {task?.followUpTaskId ? (
        <Button variant="ghost" onClick={() => navigate(`/tasks/${task.followUpTaskId}`)}>
          {t('drawer.relatedTask')}
        </Button>
      ) : null}
    </>
  );
};

const ObservationDetail: React.FC<{ entry: ChronologioEntry; actor: string }> = ({ entry, actor }) => {
  const { t, i18n } = useTranslation(['chronologio', 'common']);
  const noteMeta = entry.details.note;
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    const id = noteMeta?.noteId || (entry.sourceType === 'Note' ? entry.sourceId : '');
    if (!id) return;
    const cached = EntityCache.getNote(id);
    if (cached?.data) setNote(cached.data);
    let cancelled = false;
    void getNoteService()
      .getNotes({ fieldId: entry.fieldId || undefined })
      .then((rows) => {
        if (cancelled) return;
        const found = rows.find((n) => n.id === id) || null;
        if (found) setNote(found);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [entry.fieldId, entry.sourceId, entry.sourceType, noteMeta?.noteId]);

  const body = note?.body || noteMeta?.bodyPreview || entry.summary || '';

  return (
    <>
      {body ? <p className="chrono-drawer-notes">{body}</p> : null}
      <dl className="chrono-drawer-facts">
        <Fact label={t('living.field')}>{entry.field?.name}</Fact>
        <Fact label={t('living.actor')}>{actor}</Fact>
        <Fact label={t('drawer.exactTime')}>{formatWhen(entry.occurredAt, i18n.language)}</Fact>
        {noteMeta?.pinned || note?.pinned ? (
          <p className="chrono-drawer-pin-flag">
            <Pin size={14} aria-hidden /> {t('pinned')}
          </p>
        ) : null}
      </dl>
      <MediaGallery entry={entry} title={t('living.photos')} />
    </>
  );
};

const MoneyDetail: React.FC<{
  entry: ChronologioEntry;
  numberLocale: string;
  actor: string;
}> = ({ entry, numberLocale, actor }) => {
  const { t, i18n } = useTranslation(['chronologio', 'common', 'money']);
  const navigate = useNavigate();
  const expense = entry.details.expense;
  const [tx, setTx] = useState<FinancialTransaction | null>(null);

  useEffect(() => {
    const id = expense?.expenseId || entry.sourceId;
    if (!id) return;
    let cancelled = false;
    void getFinancialTransactionService()
      .getById(id)
      .then((row) => {
        if (!cancelled) setTx(row);
      })
      .catch(() => {
        if (!cancelled) setTx(null);
      });
    return () => {
      cancelled = true;
    };
  }, [entry.sourceId, expense?.expenseId]);

  const typeLabel =
    tx?.typeLabel ||
    financialTypeLabel(entry.category === 'income' ? 'income' : 'expense', i18n.language);
  const qty = tx
    ? formatQuantityLine(tx.quantity, tx.quantityUnit, tx.unitPrice, i18n.language)
    : null;

  return (
    <>
      {entry.amount ? (
        <p className="chrono-drawer-amount">
          {formatChronologioMoney(entry.amount.value, entry.amount.currency, numberLocale)}
        </p>
      ) : null}
      <dl className="chrono-drawer-facts">
        <Fact label={t('common:type')}>{typeLabel}</Fact>
        <Fact label={t('drawer.quantity')}>{qty}</Fact>
        <Fact label={t('drawer.moneyCategory')}>
          {presentExpenseChip(entry, i18n.language) || tx?.categoryLabel}
        </Fact>
        <Fact label={t('living.field')}>{entry.field?.name || t('drawer.generalOperation')}</Fact>
        <Fact label={t('drawer.date')}>
          {new Date(entry.occurredAt).toLocaleDateString(i18n.language, { dateStyle: 'long' })}
        </Fact>
        <Fact label={t('common:description')}>
          {expense?.description || tx?.description || entry.summary}
        </Fact>
        <Fact label={t('drawer.posting')}>
          {tx ? financialStatusLabel(tx.status, i18n.language) : null}
        </Fact>
        <Fact label={t('living.actor')}>{actor || tx?.counterpartyName}</Fact>
        {expense?.relatedTaskTitle ? (
          <Fact label={t('relatedTask', { title: expense.relatedTaskTitle })}>
            <button
              type="button"
              className="money-text-link"
              onClick={() => navigate(`/tasks/${expense.linkedTaskId}`)}
            >
              {expense.relatedTaskTitle}
            </button>
          </Fact>
        ) : null}
        <Fact label={t('relatedHarvest', { title: expense?.relatedHarvestTitle || '' })}>
          {expense?.relatedHarvestTitle}
        </Fact>
      </dl>
      <MediaGallery entry={entry} title={t('drawer.receipt')} />
    </>
  );
};

const HarvestDetail: React.FC<{
  entry: ChronologioEntry;
  numberLocale: string;
  actor: string;
}> = ({ entry, numberLocale, actor }) => {
  const { t, i18n } = useTranslation(['chronologio', 'common']);
  const harvest = entry.details.harvest;
  if (!harvest) return null;
  return (
    <>
      <div className="chronologio-harvest-stats">
        <div className="chronologio-harvest-stat">
          <strong>
            {harvest.oliveKg.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}
          </strong>
          <span>{t('olivesUnit')}</span>
        </div>
        {harvest.oilLitres != null || harvest.oilKg != null ? (
          <div className="chronologio-harvest-stat">
            <strong>
              {(harvest.oilLitres ?? harvest.oilKg ?? 0).toLocaleString(numberLocale, {
                maximumFractionDigits: 1,
              })}
            </strong>
            <span>{harvest.oilLitres != null ? t('drawer.oilLitres') : t('oilUnit')}</span>
          </div>
        ) : null}
        {harvest.oilKg != null && harvest.oilLitres != null ? (
          <div className="chronologio-harvest-stat">
            <strong>
              {harvest.oilKg.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}
            </strong>
            <span>{t('oilUnit')}</span>
          </div>
        ) : null}
        {harvest.oilYieldPercent != null ? (
          <div className="chronologio-harvest-stat">
            <strong>{harvest.oilYieldPercent}%</strong>
            <span>{t('yieldUnit')}</span>
          </div>
        ) : null}
      </div>
      <HarvestMoneyPanel
        harvestId={harvest.harvestId}
        fieldId={entry.fieldId}
        harvestDate={entry.occurredAt}
      />
      <dl className="chrono-drawer-facts">
        <Fact label={t('drawer.eventType')}>
          {presentChronologioEvent(entry, i18n.language).label}
        </Fact>
        <Fact label={t('drawer.date')}>
          {new Date(entry.occurredAt).toLocaleDateString(i18n.language, { dateStyle: 'long' })}
        </Fact>
        <Fact label={t('living.field')}>{entry.field?.name}</Fact>
        <Fact label={t('mill')}>{harvest.mill}</Fact>
        <Fact label={t('drawer.quality')}>{presentHarvestQuality(harvest.quality, i18n.language)}</Fact>
        <Fact label={t('workers')}>{harvest.workers || null}</Fact>
        <Fact label={t('living.actor')}>{actor}</Fact>
        <Fact label={t('common:description')}>{entry.summary}</Fact>
      </dl>
      <MediaGallery entry={entry} title={t('living.photos')} />
    </>
  );
};

export default ChronologioEventDetail;
