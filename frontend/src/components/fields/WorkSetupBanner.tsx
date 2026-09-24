import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Button from '../Common/Button';
import './WorkSetupBanner.css';

type Props = {
  fieldId: string;
  /** draft | missing profile — resume vs start copy */
  resume?: boolean;
  quiet?: boolean;
  onDismiss?: () => void;
  className?: string;
};

/**
 * Same “set up this field’s year” prompt used on field details —
 * reusable on Chronologio / Tasks when a grove still needs work setup.
 */
const WorkSetupBanner: React.FC<Props> = ({
  fieldId,
  resume = false,
  quiet = false,
  onDismiss,
  className,
}) => {
  const { t } = useTranslation('tasks');
  const navigate = useNavigate();

  if (quiet) {
    return (
      <div
        className={['fw-setup-banner', 'fw-setup-banner--quiet', className].filter(Boolean).join(' ')}
        role="region"
      >
        <p>{t('fieldWork.profile.title')}</p>
        <div className="fw-setup-banner-actions">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate(`/fields/${fieldId}/work-profile`)}
          >
            {t('fieldWork.profile.open')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={['fw-setup-banner', className].filter(Boolean).join(' ')}
      role="region"
      aria-label={t('fieldWork.onboarding.banner.title')}
    >
      <h2>{t('fieldWork.onboarding.banner.title')}</h2>
      <p>{t('fieldWork.onboarding.banner.body')}</p>
      <div className="fw-setup-banner-actions">
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate(`/fields/${fieldId}/work-setup`)}
        >
          {resume
            ? t('fieldWork.onboarding.banner.resume')
            : t('fieldWork.onboarding.banner.start')}
        </Button>
        {onDismiss ? (
          <Button variant="outline" size="md" onClick={onDismiss}>
            {t('fieldWork.onboarding.banner.later')}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default WorkSetupBanner;
