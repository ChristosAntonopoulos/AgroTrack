import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import { friendlyFieldLabel } from '../../utils/fieldLabels';

type Props = {
  fieldIds?: string[];
  fields: Field[];
  showEmpty?: boolean;
};

const FieldLinkPills: React.FC<Props> = ({ fieldIds = [], fields, showEmpty = true }) => {
  const { t } = useTranslation(['partners']);
  const linked = fields.filter((field) => fieldIds.includes(field.id));

  if (linked.length === 0) {
    if (!showEmpty) return null;
    return <span className="partner-field-pill is-empty">{t('partners:noFieldLink')}</span>;
  }

  return (
    <div className="partner-field-pills" aria-label={t('partners:connectedFields')}>
      {linked.map((field) => (
        <span
          key={field.id}
          className="partner-field-pill"
          style={{ '--field-accent': field.color || '#8a9188' } as React.CSSProperties}
        >
          <span className="partner-field-pill-swatch" aria-hidden />
          {friendlyFieldLabel(field.name)}
        </span>
      ))}
    </div>
  );
};

export default FieldLinkPills;
