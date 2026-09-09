import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { ChronologioEntry } from '../../services/chronologioService';
import { chronologioDetailLine, formatDayMonth, numberLocaleFor } from '../../utils/fieldDisplay';
import './FieldOverviewBlocks.css';

type Props = {
  fieldId: string;
  entries: ChronologioEntry[];
};

const FieldRecentChronologio: React.FC<Props> = ({ fieldId, entries }) => {
  const { t, i18n } = useTranslation(['fields', 'chronologio']);
  const locale = numberLocaleFor(i18n.language);
  const items = entries.slice(0, 5);

  return (
    <section className="fd-block">
      <h2>{t('fields:overview.recentChronologio')}</h2>
      {items.length === 0 ? (
        <p className="fd-muted">{t('chronologio:emptyFieldDescription')}</p>
      ) : (
        <ul className="fd-chrono-preview">
          {items.map((entry) => {
            const detail = chronologioDetailLine(entry, locale);
            const thumb = entry.media?.find((m) => m.thumbnailUrl || m.url);
            return (
              <li key={entry.id}>
                <time>{formatDayMonth(entry.occurredAt, locale)}</time>
                <div>
                  <strong>{entry.title}</strong>
                  {detail ? <span>{detail}</span> : null}
                </div>
                {thumb?.thumbnailUrl || thumb?.url ? (
                  <img src={thumb.thumbnailUrl || thumb.url} alt="" />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <Link className="fd-text-link" to={`/fields/${fieldId}?mode=chronologio`}>
        {t('fields:overview.seeAllChronologio')}
      </Link>
    </section>
  );
};

export default FieldRecentChronologio;
