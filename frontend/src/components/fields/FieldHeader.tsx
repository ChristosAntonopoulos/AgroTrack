import React from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import type { FieldPhenology } from '../../services/fieldWorkService';
import Button from '../Common/Button';
import FieldIdentity from './FieldIdentity';
import FieldMoreMenu from './FieldMoreMenu';
import FieldResultYearControl from './FieldResultYearControl';
import './FieldPageShell.css';

type Props = {
  field: Field;
  year: number;
  canOwn: boolean;
  canManageAccess?: boolean;
  showYearControl?: boolean;
  onYearChange: (year: number) => void;
  onCapture?: () => void;
  phenology?: FieldPhenology | null;
};

const FieldHeader: React.FC<Props> = ({
  field,
  year,
  canOwn,
  canManageAccess = false,
  showYearControl = true,
  onYearChange,
  onCapture,
  phenology,
}) => {
  const { t } = useTranslation('fields');
  const isDraft = field.status === 'Draft' || field.status === 'NeedsBoundaryConfirmation' || field.status === 'NeedsAreaReview';

  return (
    <header className="field-header">
      <div className="field-header-identity">
        {isDraft ? <p className="field-header-draft">{t('page.draftField')}</p> : null}
        <FieldIdentity field={field} size="page" phenology={phenology} />
      </div>
      <div className="field-header-actions">
        {showYearControl ? (
          <FieldResultYearControl year={year} onYearChange={onYearChange} />
        ) : null}
        {onCapture && (field.capabilities?.canCreateRecords ?? true) ? (
          <Button
            icon={<Plus />}
            variant="primary"
            size="md"
            className="field-header-capture"
            onClick={onCapture}
          >
            {t('page.capture')}
          </Button>
        ) : null}
        <FieldMoreMenu
          field={field}
          canOwn={canOwn}
          canManageAccess={canManageAccess}
        />
      </div>
    </header>
  );
};

export default FieldHeader;
