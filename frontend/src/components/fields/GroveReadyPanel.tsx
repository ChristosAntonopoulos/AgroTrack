import React from 'react';
import { useTranslation } from 'react-i18next';
import { NotebookPen, Pentagon, Trees } from 'lucide-react';
import Button from '../Common/Button';
import { resolveFieldColor } from '../../utils/fieldColors';

type Props = {
  name: string;
  color?: string | null;
  fieldId?: string | null;
  hasBoundary: boolean;
  /** When true, boundary is the only primary path until drawn. */
  activationGuide?: boolean;
  /** Opens the capture chooser (work, money, observation, …). */
  onFirstCapture: () => void;
  onDrawBoundary: () => void;
  onOpenChronologio: () => void;
  onOpenGrove: () => void;
  onSkipBoundary?: () => void;
};

const GroveReadyPanel: React.FC<Props> = ({
  name,
  color,
  fieldId,
  hasBoundary,
  activationGuide = false,
  onFirstCapture,
  onDrawBoundary,
  onOpenChronologio,
  onOpenGrove,
  onSkipBoundary,
}) => {
  const { t } = useTranslation(['fields', 'onboarding']);
  const swatch = resolveFieldColor(color, fieldId);
  const guideBoundary = activationGuide && !hasBoundary;

  return (
    <div className="field-form-panel grove-ready-panel">
      <header className="grove-ready-header">
        <span
          className="grove-ready-swatch"
          style={{ '--swatch': swatch } as React.CSSProperties}
          aria-hidden
        />
        <h2>{t('fields:createGrove.ready.title', { name })}</h2>
        <p className="field-form-panel-desc">
          {guideBoundary
            ? t('onboarding:steps.drawBoundary.body')
            : t('fields:createGrove.ready.body')}
        </p>
      </header>

      <div className="grove-ready-actions">
        {!hasBoundary ? (
          <Button type="button" variant="primary" onClick={onDrawBoundary} icon={<Pentagon size={18} />}>
            {t('fields:createGrove.enrich.boundaryAction')}
          </Button>
        ) : null}
        {!guideBoundary ? (
          <Button
            type="button"
            variant={hasBoundary ? 'primary' : 'secondary'}
            onClick={onFirstCapture}
            icon={<NotebookPen size={18} />}
          >
            {t('fields:createGrove.ready.recordFirst')}
          </Button>
        ) : null}
        {!guideBoundary ? (
          <Button type="button" variant="outline" onClick={onOpenChronologio}>
            {t('fields:createGrove.ready.openChronologio')}
          </Button>
        ) : null}
        {!guideBoundary ? (
          <Button type="button" variant="ghost" onClick={onOpenGrove} icon={<Trees size={18} />}>
            {t('fields:createGrove.ready.openGrove')}
          </Button>
        ) : null}
        {guideBoundary && onSkipBoundary ? (
          <Button type="button" variant="ghost" onClick={onSkipBoundary}>
            {t('onboarding:spotlight.skip')}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default GroveReadyPanel;
