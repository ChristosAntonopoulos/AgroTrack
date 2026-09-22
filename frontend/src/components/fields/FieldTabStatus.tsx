import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../Common/LoadingSpinner';
import EmptyState from '../Common/EmptyState';
import Button from '../Common/Button';
import './FieldTabStatus.css';

export type FieldTabStatusKind = 'loading' | 'empty' | 'unavailable' | 'error';

type Props = {
  kind: FieldTabStatusKind;
  title?: string;
  description?: string;
  onRetry?: () => void;
  icon?: ReactNode;
  className?: string;
};

/**
 * Shared loading / empty / unavailable / error panel for field-detail tabs.
 * Reuses EmptyState + existing field page spacing; does not invent a new design system.
 */
const FieldTabStatus: React.FC<Props> = ({
  kind,
  title,
  description,
  onRetry,
  icon,
  className = '',
}) => {
  const { t } = useTranslation(['fields', 'common']);

  if (kind === 'loading') {
    return (
      <div className={`field-tab-status field-tab-status--loading ${className}`.trim()} role="status">
        <LoadingSpinner className="page-inline-loading" />
        <p>{title || t('fields:page.tabLoading')}</p>
      </div>
    );
  }

  const resolvedTitle =
    title ||
    (kind === 'empty'
      ? t('fields:page.tabEmpty')
      : kind === 'unavailable'
        ? t('fields:page.tabUnavailable')
        : t('fields:page.tabError'));

  const resolvedDescription =
    description ||
    (kind === 'empty'
      ? t('fields:page.tabEmptyHint')
      : kind === 'unavailable'
        ? t('fields:page.tabUnavailableHint')
        : t('fields:page.tabErrorHint'));

  return (
    <div className={`field-tab-status field-tab-status--${kind} ${className}`.trim()}>
      <EmptyState
        icon={icon}
        title={resolvedTitle}
        description={resolvedDescription}
        action={
          kind === 'error' && onRetry ? (
            <Button variant="primary" onClick={onRetry}>
              {t('common:retry', { defaultValue: t('fields:form.retry') })}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
};

export default FieldTabStatus;
