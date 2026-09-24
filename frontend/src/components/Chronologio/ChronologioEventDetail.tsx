import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { harvestPath, taskPeekPath } from '../../navigation/intents';
import Button from '../Common/Button';
import HarvestMoneyPanel from '../money/HarvestMoneyPanel';
import WeatherMonthSnapshot from './WeatherMonthSnapshot';
import HarvestDayJourney from './HarvestDayJourney';
import { HarvestFlowView } from '../../harvestCampaign/components/HarvestFlowView';
import { campaignDayHasFlow, filterCampaignToDay } from '../../harvestCampaign/daySlice';
import {
  campaignFromHarvestRecords,
  fetchHarvestRecordsForFields,
} from '../../harvestCampaign/hydrateFromRecords';
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';
import { getSeasonStartYear } from '../../utils/harvestSeason';
import type { HarvestCampaign } from '../../harvestCampaign/types';
import type { Field } from '../../services/fieldService';
import {
  getFieldService,
  getFieldWorkService,
  getFinancialTransactionService,
  getNoteService,
} from '../../services/serviceFactory';
import PhotoLightbox from '../photos/PhotoLightbox';
import { usePhotoLightbox } from '../photos/usePhotoLightbox';
import type { ChronologioEntry } from '../../services/chronologioService';
import type { FieldTask } from '../../services/fieldWorkService';
import type { FinancialTransaction } from '../../services/financialTransactionService';
import type { Note } from '../../services/noteService';
import {
  extremeKindFromEventType,
  extremeVisualTone,
  formatExtremeDateRange,
} from '../../chronologio/weatherExtreme';
import { formatChronologioMoney, formatChronologioMoneySigned } from '../../utils/chronologioGrouping';
import { taskStatusI18nKey } from '../../utils/categoryNormalize';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
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
import { resolvePublicAssetUrl } from '../../config/apiConfig';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import { ChronologioMediaImage } from './ChronologioThumbnail';
import { isDateOnlyTimestamp } from '../../chronologio/clockLabel';
import { athensCalendarDateKey } from '../../utils/athensDate';

type Props = {
  entry: ChronologioEntry;
  numberLocale: string;
  dayWeather?: DayWeatherInput | null;
};

const formatWhen = (value?: string | null, language = 'el') => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const clock = isDateOnlyTimestamp(value)
    ? ''
    : ` · ${d.toLocaleTimeString(language, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })}`;
  return `${d.toLocaleDateString(language, { dateStyle: 'long' })}${clock}`;
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
  const { t } = useTranslation(['photos', 'chronologio']);
  const lightbox = usePhotoLightbox();
  const photos = entry.media || [];
  const audio = photos.filter((m) => (m.url || m.thumbnailUrl) && /audio|voice/i.test(m.type || ''));
  const documents = photos.filter(
    (m) => (m.url || m.thumbnailUrl) && /document/i.test(m.type || '')
  );
  const items = useMemo(
    () =>
      (entry.media || [])
        .filter(
          (m) =>
            (m.url || m.thumbnailUrl) && !/audio|voice|document/i.test(m.type || '')
        )
        .map((m) => {
          const src = resolvePublicAssetUrl(m.url || m.thumbnailUrl) || m.url || m.thumbnailUrl || '';
          return {
            id: m.id || src,
            src,
            alt: t('detail.title'),
          };
        }),
    [entry.media, t]
  );
  if (!items.length && !audio.length && !documents.length) return null;
  return (
    <div className="chrono-drawer-media">
      <h3>{title}</h3>
      {items.length ? (
        <div className="chrono-drawer-media-grid">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => lightbox.openAt(items, index)}
              aria-label={t('chronologio:drawer.openPhotoN', { index: index + 1 })}
            >
              <ChronologioMediaImage
                src={item.src}
                alt=""
                retryLabel={t('chronologio:drawer.mediaRetry')}
                unavailableLabel={t('chronologio:drawer.mediaUnavailable', { index: index + 1 })}
              />
            </button>
          ))}
        </div>
      ) : null}
      {audio.map((m) => {
        const src = resolvePublicAssetUrl(m.url) || m.url;
        return src ? (
          <audio key={m.id} className="chrono-drawer-audio" controls src={src} />
        ) : null;
      })}
      {documents.map((m) => {
        const src = resolvePublicAssetUrl(m.url) || m.url;
        if (!src) return null;
        const label =
          entry.summary ||
          t('chronologio:drawer.document', { defaultValue: 'Document' });
        return (
          <a
            key={m.id}
            className="chrono-drawer-document"
            href={src}
            target="_blank"
            rel="noopener noreferrer"
          >
            {label}
          </a>
        );
      })}
      <PhotoLightbox
        open={lightbox.open}
        items={lightbox.items}
        index={lightbox.index}
        onClose={lightbox.close}
        onIndexChange={lightbox.setIndex}
      />
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
  if (kind === 'weatherExtreme') {
    const weather = entry.details.weather;
    const kindKey =
      weather?.extremeKind || extremeKindFromEventType(entry.eventType) || 'heatwave';
    const tone = extremeVisualTone(kindKey);
    const period = formatExtremeDateRange(
      weather?.extremeStartDate,
      weather?.extremeEndDate,
      i18n.language
    );
    return (
      <div className="chrono-drawer-extreme">
        <header className={`chrono-drawer-extreme-hero is-${tone}`}>
          <h3 className="chrono-drawer-extreme-kind">
            {t(`extremeWeather.kinds.${kindKey}`, { defaultValue: entry.title })}
          </h3>
          {entry.summary ? (
            <p className="chrono-drawer-extreme-summary">{entry.summary}</p>
          ) : null}
        </header>
        <dl className="chrono-drawer-extreme-facts">
          {period ? (
            <div className="chrono-drawer-extreme-fact">
              <dt>{t('extremeWeather.period')}</dt>
              <dd>{period}</dd>
            </div>
          ) : null}
          {weather?.streakDays != null ? (
            <div className="chrono-drawer-extreme-fact">
              <dt>{t('extremeWeather.streak')}</dt>
              <dd>{t('extremeWeather.days', { count: weather.streakDays })}</dd>
            </div>
          ) : null}
          {weather?.temperatureMin != null ? (
            <div className="chrono-drawer-extreme-fact">
              <dt>{t('extremeWeather.minTemp')}</dt>
              <dd>
                {weather.temperatureMin.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}°C
              </dd>
            </div>
          ) : null}
          {weather?.temperatureMax != null ? (
            <div className="chrono-drawer-extreme-fact">
              <dt>{t('extremeWeather.maxTemp')}</dt>
              <dd>
                {weather.temperatureMax.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}°C
              </dd>
            </div>
          ) : null}
          {weather?.rainfallMm != null ? (
            <div className="chrono-drawer-extreme-fact">
              <dt>{t('extremeWeather.rain')}</dt>
              <dd>
                {weather.rainfallMm.toLocaleString(numberLocale, { maximumFractionDigits: 1 })} mm
              </dd>
            </div>
          ) : null}
          {entry.field?.name ? (
            <div className="chrono-drawer-extreme-fact">
              <dt>{t('living.field')}</dt>
              <dd>{entry.field.name}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    );
  }
  if (kind === 'warning') {
    const intel = entry.details.intelligence;
    const relatedTaskId = intel?.relatedSourceIds?.[0];
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
        {relatedTaskId ? (
          <Fact label={t('drawer.relatedTask')}>
            <button
              type="button"
              className="money-text-link"
              onClick={() => {
                if (relatedTaskId) navigate(taskPeekPath(relatedTaskId));
              }}
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
  const followUpTaskId = task?.followUpTaskId;
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

  const mediaEntry = useMemo(() => {
    if ((entry.media || []).length > 0) return entry;
    const ids = full?.attachmentIds || [];
    if (!ids.length) return entry;
    return {
      ...entry,
      media: ids.map((url, i) => ({
        id: `task-media-${i}`,
        type: 'image',
        url,
        thumbnailUrl: url,
      })),
    };
  }, [entry, full?.attachmentIds]);

  return (
    <>
      <dl className="chrono-drawer-facts">
        <Fact label={t('drawer.taskName')}>{entry.title}</Fact>
        <Fact label={t('drawer.taskCategory')}>
          {taskDisplayTitle(
            task?.taskType || full?.templateCode || entry.title,
            full?.templateCode || task?.taskType,
            i18n.language
          )}
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
        {(() => {
          const assignee = (task?.assigneeName || '').trim();
          const completedBy = (actor || '').trim();
          const same =
            assignee &&
            completedBy &&
            assignee.localeCompare(completedBy, undefined, { sensitivity: 'accent' }) === 0;
          if (same) {
            return <Fact label={t('drawer.personOnce', { defaultValue: t('drawer.people') })}>{assignee}</Fact>;
          }
          return (
            <>
              {assignee ? (
                <Fact label={t('drawer.assignedTo', { defaultValue: 'Assigned to' })}>{assignee}</Fact>
              ) : null}
              {completedBy ? (
                <Fact label={t('drawer.completedBy', { defaultValue: 'Completed by' })}>{completedBy}</Fact>
              ) : null}
            </>
          );
        })()}
        <Fact label={t('common:description')}>{full?.notes || entry.summary}</Fact>
        <Fact label={t('drawer.correctRecordHintLabel')}>
          {t('drawer.correctRecordHint')}
        </Fact>
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
      <MediaGallery entry={mediaEntry} title={t('living.photos')} />
      {followUpTaskId ? (
        <Button
          variant="ghost"
          onClick={() => {
            if (followUpTaskId) navigate(taskPeekPath(followUpTaskId));
          }}
        >
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
  const mediaEntry = useMemo(() => {
    if ((entry.media || []).length > 0) return entry;
    const urls = note?.mediaUrls || [];
    if (!urls.length) return entry;
    return {
      ...entry,
      media: urls.map((url, i) => ({
        id: `note-media-${i}`,
        type: 'image',
        url,
        thumbnailUrl: url,
      })),
    };
  }, [entry, note?.mediaUrls]);

  return (
    <>
      {body ? <p className="chrono-drawer-notes">{body}</p> : null}
      <dl className="chrono-drawer-facts">
        <Fact label={t('living.field')}>{entry.field?.name}</Fact>
        <Fact label={t('drawer.recordedBy', { defaultValue: 'Recorded by' })}>{actor}</Fact>
        <Fact label={t('drawer.exactTime')}>{formatWhen(entry.occurredAt, i18n.language)}</Fact>
      </dl>
      <MediaGallery entry={mediaEntry} title={t('living.photos')} />
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
  const linkedTaskId = expense?.linkedTaskId;
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
          {formatChronologioMoneySigned(
            entry.amount.value,
            entry.amount.currency,
            numberLocale,
            entry.category === 'income' ? 'income' : 'expense'
          )}
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
          {(() => {
            const text = (expense?.description || tx?.description || entry.summary || '').trim();
            const title = (entry.title || '').trim();
            if (!text || text === title || text === typeLabel) return null;
            return text;
          })()}
        </Fact>
        <Fact label={t('drawer.posting')}>
          {tx ? financialStatusLabel(tx.status, i18n.language) : null}
        </Fact>
        <Fact label={t('living.actor')}>{actor || tx?.counterpartyName}</Fact>
        {linkedTaskId && expense?.relatedTaskTitle ? (
          <Fact label={t('relatedTask', { title: expense.relatedTaskTitle })}>
            <button
              type="button"
              className="money-text-link"
              onClick={() => {
                if (linkedTaskId) navigate(taskPeekPath(linkedTaskId));
              }}
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
  const { t, i18n } = useTranslation(['chronologio', 'common', 'fields']);
  const navigate = useNavigate();
  const harvestCampaign = useHarvestCampaignOptional();
  const harvest = entry.details.harvest;
  const [fields, setFields] = useState<Field[]>([]);
  const [dayCampaign, setDayCampaign] = useState<HarvestCampaign | null>(null);

  const isDay = /^Harvest:day:/i.test(entry.id);
  const dayKey = isDay
    ? entry.id.replace(/^Harvest:day:/i, '')
    : athensCalendarDateKey(entry.occurredAt);
  const fieldAccent = resolveFieldColor(entry.field?.color, entry.fieldId);
  const presented = presentChronologioEvent(entry, i18n.language);

  useEffect(() => {
    let cancelled = false;
    void getFieldService()
      .getFields()
      .then((rows) => {
        if (!cancelled) setFields(rows);
      })
      .catch(() => {
        if (!cancelled) setFields([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!harvest) return;
    let cancelled = false;

    const fromLive =
      harvestCampaign && isDay
        ? filterCampaignToDay(harvestCampaign.campaign, dayKey)
        : null;
    if (fromLive && campaignDayHasFlow(fromLive)) {
      setDayCampaign(fromLive);
      return;
    }

    const fieldIds = entry.fieldId
      ? [entry.fieldId]
      : fields.map((f) => f.id).filter(Boolean);
    if (fieldIds.length === 0) {
      setDayCampaign(null);
      return;
    }

    void (async () => {
      try {
        const rows = await fetchHarvestRecordsForFields(fieldIds);
        if (cancelled) return;
        const season = getSeasonStartYear(`${dayKey}T12:00:00`);
        const built = campaignFromHarvestRecords(rows, season, { ignoreSeason: true });
        const slice = filterCampaignToDay(built, dayKey);
        setDayCampaign(campaignDayHasFlow(slice) ? slice : null);
      } catch {
        if (!cancelled) setDayCampaign(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dayKey, entry.fieldId, fields, harvest, harvestCampaign, isDay]);

  if (!harvest) return null;

  const openFieldsTab = () => {
    navigate(harvestPath({ day: dayKey, fieldId: entry.fieldId || undefined, view: 'fields' }));
  };

  const flowFields =
    fields.length > 0
      ? fields
      : entry.field
        ? ([
            {
              id: entry.fieldId,
              name: entry.field.name,
              color: entry.field.color,
            },
          ] as Field[])
        : [];

  return (
    <>
      <header className="chrono-harvest-peek-head">
        <p className="chrono-harvest-peek-kicker">{t('fields:harvestCampaign.flow.title')}</p>
        <p className="chrono-harvest-peek-date">
          {new Date(`${dayKey}T12:00:00`).toLocaleDateString(i18n.language, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        {entry.field?.name ? (
          <p className="chrono-harvest-field">
            <span className="chrono-field-dot" style={{ background: fieldAccent }} aria-hidden />
            {friendlyFieldLabel(entry.field.name)}
          </p>
        ) : null}
      </header>

      {dayCampaign && flowFields.length > 0 ? (
        <div className="chrono-harvest-flow-embed">
          <HarvestFlowView
            campaign={dayCampaign}
            fields={flowFields}
            locale={i18n.language}
            onMarkDone={openFieldsTab}
            onOpenMill={openFieldsTab}
            onOpenOil={openFieldsTab}
          />
        </div>
      ) : (
        <HarvestDayJourney
          harvest={harvest}
          numberLocale={numberLocale}
          fieldName={entry.field?.name}
          fieldAccent={fieldAccent}
        />
      )}

      {presented.description ? <p className="chronologio-harvest-day-summary">{presented.description}</p> : null}

      {!isDay ? (
        <HarvestMoneyPanel
          harvestId={harvest.harvestId}
          fieldId={entry.fieldId}
          harvestDate={entry.occurredAt}
        />
      ) : null}

      <dl className="chrono-drawer-facts">
        {harvest.mill ? <Fact label={t('mill')}>{harvest.mill}</Fact> : null}
        {presentHarvestQuality(harvest.quality, i18n.language) ? (
          <Fact label={t('quality')}>{presentHarvestQuality(harvest.quality, i18n.language)}</Fact>
        ) : null}
        {actor ? <Fact label={t('living.actor')}>{actor}</Fact> : null}
        {harvest.oilLitres != null && harvest.oilLitres > 0 ? (
          <Fact label={t('drawer.oilLitres')}>
            {new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 1 }).format(harvest.oilLitres)}
          </Fact>
        ) : null}
      </dl>

      <MediaGallery entry={entry} title={t('living.photos')} />
    </>
  );
};

export default ChronologioEventDetail;
