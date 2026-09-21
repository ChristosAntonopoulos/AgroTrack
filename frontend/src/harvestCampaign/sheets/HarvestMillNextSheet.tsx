import React from 'react';
import { useTranslation } from 'react-i18next';
import { HarvestSheetShell } from '../components/HarvestSheetShell';

/** One-tap follow-up after saving mill kg. */
export const HarvestMillNextSheet: React.FC<{
  onAddOil: () => void;
  onLater: () => void;
}> = ({ onAddOil, onLater }) => {
  const { t } = useTranslation('fields');
  return (
    <HarvestSheetShell
      footer={
        <>
          <button type="button" className="money-primary-action" onClick={onAddOil}>
            {t('harvestCampaign.chain.addOilNow')}
          </button>
          <button type="button" className="money-text-link" onClick={onLater}>
            {t('harvestCampaign.chain.addOilLater')}
          </button>
        </>
      }
    >
      <p className="capture-prompt">{t('harvestCampaign.chain.millSaved')}</p>
      <p className="capture-hint">{t('harvestCampaign.chain.millSavedHint')}</p>
    </HarvestSheetShell>
  );
};
