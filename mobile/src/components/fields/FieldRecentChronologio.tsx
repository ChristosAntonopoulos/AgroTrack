import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ChronologioEntry } from '../../services/chronologioService';
import ChronologioRecentList from '../chronologio/ChronologioRecentList';

type Props = {
  entries: ChronologioEntry[];
  onSeeAll: () => void;
  onPressEntry?: (entry: ChronologioEntry) => void;
};

/** Field overview recent block — inherits ChronologioRecentList / EntryCard. */
const FieldRecentChronologio: React.FC<Props> = ({ entries, onSeeAll, onPressEntry }) => {
  const { t } = useTranslation(['fields', 'chronologio']);

  return (
    <ChronologioRecentList
      framed
      entries={entries}
      title={t('fields:overview.recentChronologio')}
      emptyLabel={t('chronologio:emptyFieldDescription')}
      seeAllLabel={t('fields:overview.seeAllChronologio')}
      onSeeAll={onSeeAll}
      onPressEntry={onPressEntry || (() => onSeeAll())}
    />
  );
};

export default FieldRecentChronologio;
