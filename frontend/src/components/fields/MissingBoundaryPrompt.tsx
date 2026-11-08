import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pentagon } from 'lucide-react';
import type { Field } from '../../services/fieldService';
import { fieldHasBoundary, fieldHasLocation } from '../../utils/fieldDisplay';
import Button from '../Common/Button';

type Props = {
  field: Field;
  canEdit?: boolean;
};

const sessionKey = (fieldId: string) => `oleachron.boundaryPromptSnooze.${fieldId}`;

const MissingBoundaryPrompt: React.FC<Props> = ({ field, canEdit = true }) => {
  const { t } = useTranslation('fields');
  const [snoozed, setSnoozed] = useState(() => {
    try {
      return sessionStorage.getItem(sessionKey(field.id)) === '1';
    } catch {
      return false;
    }
  });

  if (!canEdit || !fieldHasLocation(field) || fieldHasBoundary(field) || snoozed) {
    return null;
  }

  return (
    <aside className="missing-boundary-prompt" role="status">
      <Pentagon size={22} strokeWidth={1.85} aria-hidden />
      <div className="missing-boundary-prompt-copy">
        <h3>{t('createGrove.mapPrompt.title')}</h3>
        <p>{t('createGrove.mapPrompt.body')}</p>
        <div className="missing-boundary-prompt-actions">
          <Link
            className="missing-boundary-prompt-cta"
            to={`/fields/${field.id}/edit?focus=boundary`}
          >
            {t('createGrove.mapPrompt.action')}
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              try {
                sessionStorage.setItem(sessionKey(field.id), '1');
              } catch {
                /* ignore */
              }
              setSnoozed(true);
            }}
          >
            {t('createGrove.mapPrompt.later')}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default MissingBoundaryPrompt;
