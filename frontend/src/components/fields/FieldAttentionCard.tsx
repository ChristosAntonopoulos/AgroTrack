import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { ChronologioEntry } from '../../services/chronologioService';
import { formatRelativeTime } from '../../utils/localeFormatters';
import { useLocale } from '../../context/LocaleProvider';
import './FieldOverviewBlocks.css';

type Props = {
  fieldId: string;
  entries: ChronologioEntry[];
};

const FieldAttentionCard: React.FC<Props> = ({ fieldId, entries }) => {
  const { t } = useTranslation('fields');
  const { locale } = useLocale();
  const attention = entries.find(
    (entry) =>
      entry.importance === 'warning' ||
      entry.importance === 'critical' ||
      (entry.category === 'note' && entry.importance === 'important')
  );

  if (!attention) return null;

  const note = attention.details.note?.bodyPreview || attention.summary || '';

  return (
    <section className="fd-block fd-block--attention">
      <h2>{t('overview.needsAttention')}</h2>
      <p className="fd-next-task-title">{attention.title}</p>
      {note ? <p className="fd-muted">{note}</p> : null}
      <p className="fd-muted">
        {t('overview.recorded', {
          when: formatRelativeTime(attention.occurredAt, { locale }),
        })}
      </p>
      <Link className="fd-text-link" to={`/fields/${fieldId}?mode=chronologio&entry=${encodeURIComponent(attention.id)}`}>
        {t('overview.seeObservation')}
      </Link>
    </section>
  );
};

export default FieldAttentionCard;
