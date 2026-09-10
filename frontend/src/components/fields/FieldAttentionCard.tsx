import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FieldAttentionModel } from '../../utils/fieldOverviewAttention';
import { formatCompactDate } from '../../utils/fieldDisplay';

type Props = {
  attention: FieldAttentionModel;
  onKeepDate?: (id: string) => void;
};

const FieldAttentionCard: React.FC<Props> = ({ attention, onKeepDate }) => {
  const { t, i18n } = useTranslation('fields');
  const windowLabel =
    attention.window && !Number.isNaN(new Date(attention.window).getTime())
      ? formatCompactDate(attention.window, i18n.language)
      : attention.window;
  const title =
    attention.kind === 'none'
      ? t(attention.id === 'draft' ? 'overview.attention.draftTitle' : 'overview.attention.noneTitle')
      : attention.title;
  const explanation = t(attention.explanationKey, attention.explanationParams);

  return (
    <section className={`field-attention field-attention--${attention.severity}`} aria-labelledby="field-attention-title">
      <p className="field-attention-kicker">{t('overview.needsNow')}</p>
      <h2 id="field-attention-title">{title}</h2>
      <p className="field-attention-body">{explanation}</p>
      {windowLabel ? <p className="field-attention-meta">{windowLabel}</p> : null}
      {attention.reason ? <p className="field-attention-meta">{attention.reason}</p> : null}
      <div className="field-attention-actions">
        {attention.primaryTo ? (
          <Link className="field-attention-primary" to={attention.primaryTo}>
            {t(attention.primaryKey)}
          </Link>
        ) : null}
        {attention.secondaryKey && attention.taskId ? (
          <button
            type="button"
            className="field-attention-secondary"
            onClick={() => onKeepDate?.(attention.taskId!)}
          >
            {t(attention.secondaryKey)}
          </button>
        ) : null}
      </div>
    </section>
  );
};

export default FieldAttentionCard;
