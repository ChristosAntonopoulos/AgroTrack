import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Pentagon, Sprout } from 'lucide-react';
import type { Field } from '../../services/fieldService';
import { fieldHasBoundary } from '../../utils/fieldDisplay';
import Button from '../Common/Button';

type Props = {
  field: Field;
  canEdit: boolean;
  onDismissBoundary?: () => void;
};

const hasDetails = (field: Field) =>
  Boolean((field.oliveVariety || field.variety)?.trim()) || field.treeCount != null;

const GroveEnrichmentCards: React.FC<Props> = ({ field, canEdit, onDismissBoundary }) => {
  const { t } = useTranslation('fields');
  const [boundaryDismissed, setBoundaryDismissed] = useState(false);

  if (!canEdit) return null;

  const needBoundary = !fieldHasBoundary(field) && !boundaryDismissed;
  const needDetails = !hasDetails(field);

  if (!needBoundary && !needDetails) return null;

  return (
    <div className="grove-enrichment" aria-label={t('createGrove.enrich.aria')}>
      {needBoundary ? (
        <article className="grove-enrichment-card">
          <Pentagon size={20} strokeWidth={1.85} aria-hidden />
          <div>
            <h3>{t('createGrove.enrich.boundaryTitle')}</h3>
            <p>{t('createGrove.enrich.boundaryBody')}</p>
            <div className="grove-enrichment-actions">
              <Link className="grove-enrichment-link" to={`/fields/${field.id}/edit?focus=boundary`}>
                {t('createGrove.enrich.boundaryAction')}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBoundaryDismissed(true);
                  onDismissBoundary?.();
                }}
              >
                {t('createGrove.enrich.boundaryLater')}
              </Button>
            </div>
          </div>
        </article>
      ) : null}

      {needDetails ? (
        <article className="grove-enrichment-card">
          <Sprout size={20} strokeWidth={1.85} aria-hidden />
          <div>
            <h3>{t('createGrove.enrich.detailsTitle')}</h3>
            <p>{t('createGrove.enrich.detailsBody')}</p>
            <Link className="grove-enrichment-link" to={`/fields/${field.id}/edit?focus=details`}>
              {t('createGrove.enrich.detailsAction')}
            </Link>
          </div>
        </article>
      ) : null}
    </div>
  );
};

export default GroveEnrichmentCards;
