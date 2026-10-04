import React from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { HarvestSheetShell } from '../components/HarvestSheetShell';

export const HarvestMillNextSheet: React.FC<{
  onAddOil: () => void;
  onLater: () => void;
}> = ({ onAddOil, onLater }) => {
  const { t } = useTranslation(['fields', 'common']);
  const { colors } = useTheme();

  return (
    <HarvestSheetShell
      footer={
        <>
          <Button
            title={t('fields:harvestCampaign.chain.addOilNow')}
            onPress={onAddOil}
            fullWidth
          />
          <Button
            title={t('fields:harvestCampaign.chain.addOilLater')}
            variant="ghost"
            onPress={onLater}
            fullWidth
          />
        </>
      }
    >
      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16 }}>
        {t('fields:harvestCampaign.chain.millSaved')}
      </Text>
      <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
        {t('fields:harvestCampaign.chain.millSavedHint')}
      </Text>
    </HarvestSheetShell>
  );
};
