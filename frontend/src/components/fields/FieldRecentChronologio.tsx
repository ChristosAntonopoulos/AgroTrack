import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { ChronologioEntry } from '../../services/chronologioService';
import ChronologioEvent from '../Chronologio/ChronologioEvent';
import { useLocale } from '../../context/LocaleProvider';
import { uniqueChronologioEntries } from '../../utils/chronologioUnique';

type Props = {
  fieldId: string;
  entries: ChronologioEntry[];
  onSelect: (entry: ChronologioEntry) => void;
};

const FieldRecentChronologio: React.FC<Props> = ({ fieldId, entries, onSelect }) => {
  const { t } = useTranslation(['fields', 'chronologio']);
  const { locale } = useLocale();
  const items = uniqueChronologioEntries(entries).slice(0, 3);

  return (
    <section className="field-recent-chrono" aria-labelledby="field-recent-chrono-title">
      <h2 id="field-recent-chrono-title">{t('fields:overview.recentChronologio')}</h2>
      {items.length === 0 ? (
        <p className="fd-muted">{t('chronologio:emptyFieldDescription')}</p>
      ) : (
        <ul className="field-recent-chrono-list">
          {items.map((entry) => (
            <li key={entry.id}>
              <ChronologioEvent
                entry={entry}
                density="card"
                showField={false}
                locale={locale}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}
      <Link className="fd-text-link" to={`/fields/${fieldId}?tab=chronologio`}>
        {t('fields:overview.seeAllChronologio')}
      </Link>
    </section>
  );
};

export default FieldRecentChronologio;
