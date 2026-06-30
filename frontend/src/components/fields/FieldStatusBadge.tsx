import React from 'react';
import { useTranslation } from 'react-i18next';
import { FieldStatus } from '../../services/fieldService';

interface Props {
  status?: FieldStatus | string;
}

const statusClass: Record<string, string> = {
  Draft: 'status-draft',
  NeedsBoundaryConfirmation: 'status-needs-boundary',
  NeedsAreaReview: 'status-needs-review',
  Active: 'status-active',
  Archived: 'status-archived',
};

const FieldStatusBadge: React.FC<Props> = ({ status = 'Active' }) => {
  const { t } = useTranslation('fields');
  const key = status || 'Active';

  return (
    <span className={`field-status-badge ${statusClass[key] || 'status-active'}`}>
      {t(`addField.statuses.${key}`, { defaultValue: key })}
    </span>
  );
};

export default FieldStatusBadge;
