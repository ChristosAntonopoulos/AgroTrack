import React from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import Button from '../Common/Button';
import FieldIdentity from './FieldIdentity';
import FieldMoreMenu from './FieldMoreMenu';
import FieldModeSegment from './FieldModeSegment';
import FieldResultYearControl from './FieldResultYearControl';
import './FieldPageShell.css';

type Props = {
  field: Field;
  year: number;
  canOwn: boolean;
  onYearChange: (year: number) => void;
  onCapture: () => void;
  onDocuments: () => void;
  onDelete?: () => void;
};

const FieldHeader: React.FC<Props> = ({
  field,
  year,
  canOwn,
  onYearChange,
  onCapture,
  onDocuments,
  onDelete,
}) => {
  const { t } = useTranslation('fields');
  const isDraft = field.status === 'Draft';

  return (
    <header className="field-header">
      <div className="field-header-identity">
        {isDraft ? <p className="field-header-draft">{t('page.draftField')}</p> : null}
        <FieldIdentity field={field} size="page" />
        <p className="field-header-year-label">{t('page.yearLabel', { year })}</p>
        <div className="field-header-controls">
          <FieldResultYearControl year={year} onYearChange={onYearChange} />
          <FieldModeSegment />
        </div>
      </div>
      <div className="field-header-actions">
        <Button
          icon={<Plus />}
          variant="primary"
          size="md"
          className="field-header-capture"
          onClick={onCapture}
        >
          {t('page.capture')}
        </Button>
        <FieldMoreMenu
          field={field}
          canOwn={canOwn}
          onDocuments={onDocuments}
          onDelete={canOwn ? onDelete : undefined}
        />
      </div>
    </header>
  );
};

export default FieldHeader;
