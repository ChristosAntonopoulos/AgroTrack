import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import type { FieldPhenology } from '../../services/fieldWorkService';
import FieldGroveSwitcher from './FieldGroveSwitcher';
import FieldMoreMenu from './FieldMoreMenu';
import FieldResultYearControl from './FieldResultYearControl';
import { formatFieldArea } from '../../utils/fieldGeo';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import './FieldPageShell.css';

type Props = {
  field: Field;
  year: number;
  canOwn: boolean;
  canManageAccess?: boolean;
  showYearControl?: boolean;
  onYearChange: (year: number) => void;
  phenology?: FieldPhenology | null;
  onArchive?: () => Promise<void>;
  onRestore?: () => Promise<void>;
};

const FieldHeader: React.FC<Props> = ({
  field,
  year,
  canOwn,
  canManageAccess = false,
  showYearControl = true,
  onYearChange,
  onArchive,
  onRestore,
}) => {
  const { t } = useTranslation('fields');
  const isDraft = field.status === 'Draft' || field.status === 'NeedsBoundaryConfirmation' || field.status === 'NeedsAreaReview';
  const varietyRaw = field.variety || field.oliveVariety;
  const variety = varietyRaw
    ? t(`addField.varietyOptions.${varietyRaw}`, { defaultValue: varietyRaw })
    : null;
  const area = formatFieldArea(field);
  const meta = [area, variety].filter(Boolean).join(' · ');
  const accent = resolveFieldColor(field.color, field.id);

  return (
    <header
      className="field-header field-header--switcher"
      style={{ ['--field-accent' as string]: accent } as React.CSSProperties}
    >
      <div className="field-header-identity">
        {isDraft ? <p className="field-header-draft">{t('page.draftField')}</p> : null}
        <FieldGroveSwitcher field={field} />
        {meta ? (
          <p className="field-header-meta" title={friendlyFieldLabel(field.name)}>
            {meta}
          </p>
        ) : null}
      </div>
      <div className="field-header-actions">
        {showYearControl ? (
          <FieldResultYearControl year={year} onYearChange={onYearChange} />
        ) : null}
        <FieldMoreMenu
          field={field}
          canOwn={canOwn}
          canManageAccess={canManageAccess}
          onArchive={onArchive}
          onRestore={onRestore}
        />
      </div>
    </header>
  );
};

export default FieldHeader;
