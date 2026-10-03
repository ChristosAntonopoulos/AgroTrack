import React from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useCaptureOptional } from '../../context/CaptureContext';
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import { useIsMobile } from '../../hooks/useBreakpoint';
import './CaptureFab.css';

type Props = {
  /** Hide while a full-screen overlay (e.g. More menu) is open. */
  obscured?: boolean;
};

/**
 * Floating Καταγραφή control for desktop, and for mobile only when the
 * bottom nav (which hosts the docked capture button) is not shown.
 */
const CaptureFab: React.FC<Props> = ({ obscured = false }) => {
  const { t } = useTranslation('capture');
  const capture = useCaptureOptional();
  const activation = useOwnerActivationOptional();
  const harvest = useHarvestCampaignOptional();
  const location = useLocation();
  const isMobile = useIsMobile();

  const harvestPage =
    location.pathname === '/harvest' || location.pathname.startsWith('/harvest/');
  const navHostsCapture = isMobile && !(harvest?.isLive && harvestPage);

  if (!capture || capture.isOpen || activation?.locked || obscured || navHostsCapture) {
    return null;
  }

  return (
    <button
      type="button"
      className={`capture-fab${isMobile ? ' is-mobile' : ''}`}
      data-guide-target="captureFab"
      aria-label={t('ctaPlus')}
      onClick={() => capture.openCapture()}
    >
      <span className="capture-fab__icon" aria-hidden>
        <Plus size={26} strokeWidth={2.5} />
      </span>
      <span className="capture-fab__label">{t('cta')}</span>
    </button>
  );
};

export default CaptureFab;
