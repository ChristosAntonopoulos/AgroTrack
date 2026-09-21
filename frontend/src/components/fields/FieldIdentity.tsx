import React from 'react';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import type { FieldPhenology } from '../../services/fieldWorkService';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel } from '../../utils/fieldDisplay';
import { resolveFieldStageLabel } from '../../utils/fieldStage';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import './FieldIdentity.css';

type Props = {
  field: Field;
  size?: 'card' | 'page';
  showMeta?: boolean;
  phenology?: FieldPhenology | null;
};

type MetaChip = {
  key: string;
  label: string;
  kind: 'status' | 'variety' | 'area' | 'stage';
};

const FieldIdentity: React.FC<Props> = ({ field, size = 'card', showMeta = true, phenology }) => {
  const { t } = useTranslation(['fields', 'common']);
  const displayName = friendlyFieldLabel(field.name);
  const accent = resolveFieldColor(field.color, field.id);
  const shortLocation = getFieldShortLocation(field);
  const status = getFieldStatusLabel(field.status, t);
  const stage = resolveFieldStageLabel({
    phenology,
    currentLifecycleStage: field.currentLifecycleStage,
    t,
  });
  const varietyRaw = field.variety || field.oliveVariety;
  const variety = varietyRaw
    ? t(`fields:addField.varietyOptions.${varietyRaw}`, { defaultValue: varietyRaw })
    : null;
  const area = formatFieldArea(field);

  const chips: MetaChip[] = [];
  if (status) chips.push({ key: 'status', label: status, kind: 'status' });
  if (area) chips.push({ key: 'area', label: area, kind: 'area' });
  if (size === 'page' && stage) chips.push({ key: 'stage', label: stage, kind: 'stage' });
  // Variety lives on the field page only — list cards keep the grove name clean.
  if (size === 'page' && variety) chips.push({ key: 'variety', label: variety, kind: 'variety' });

  return (
    <div
      className={`field-identity field-identity--${size}`}
      style={
        {
          ['--field-accent' as string]: accent,
          ['--field-accent-wash' as string]: `color-mix(in srgb, ${accent} 28%, transparent)`,
          ['--field-accent-soft' as string]: `color-mix(in srgb, ${accent} 12%, transparent)`,
        } as React.CSSProperties
      }
    >
      <div className="field-identity-title">
        <span className="field-identity-swatch" aria-hidden />
        {size === 'page' ? (
          <h1 className="field-identity-name">{displayName}</h1>
        ) : (
          <h2 className="field-identity-name">{displayName}</h2>
        )}
      </div>
      {shortLocation ? <p className="field-identity-place">{shortLocation}</p> : null}
      {showMeta && chips.length > 0 ? (
        <ul className="field-identity-chips" aria-label={t('fields:card.metaAria', { defaultValue: 'Field details' })}>
          {chips.map((chip) => (
            <li key={chip.key} className={`field-identity-chip field-identity-chip--${chip.kind}`}>
              {chip.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default FieldIdentity;
