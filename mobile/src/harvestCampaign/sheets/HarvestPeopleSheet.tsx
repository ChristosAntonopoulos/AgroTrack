import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { HarvestNumberInput } from '../components/HarvestNumberInput';
import { HarvestNumberStepper } from '../components/HarvestNumberStepper';
import { HarvestSegmentedControl } from '../components/HarvestSegmentedControl';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import type { HarvestPeopleEntry, HarvestPeopleHours } from '../types';
import { isPositiveAmount, parseHarvestDecimal } from '../utils/harvestValidation';
import type { HarvestSheetSharedProps } from './types';

export const HarvestPeopleSheet: React.FC<
  HarvestSheetSharedProps & {
    initial?: HarvestPeopleEntry | null;
    onSave: (input: {
      people: number;
      hours: HarvestPeopleHours;
      otherHours?: number;
    }) => void;
  }
> = ({ initial, onSave, onClose }) => {
  const { t } = useTranslation(['fields', 'common']);
  const { colors } = useTheme();
  const editing = Boolean(initial);
  const [people, setPeople] = useState(initial?.people ?? 4);
  const [hours, setHours] = useState<HarvestPeopleHours>(initial?.hours ?? 'full');
  const [otherHours, setOtherHours] = useState(
    initial?.otherHours != null ? String(initial.otherHours) : ''
  );
  const otherParsed = parseHarvestDecimal(otherHours);
  const otherOk = hours !== 'other' || isPositiveAmount(otherParsed);
  const canSave = people > 0 && otherOk;
  const saveHint = !canSave
    ? people <= 0
      ? t('fields:harvestCampaign.validation.enterPeople')
      : t('fields:harvestCampaign.validation.enterHours')
    : null;

  return (
    <HarvestSheetShell
      footer={
        <>
          {saveHint ? (
            <Text style={{ color: colors.textTertiary, textAlign: 'center' }}>{saveHint}</Text>
          ) : null}
          <Button
            title={
              editing
                ? t('fields:harvestCampaign.dayActivity.saveChanges')
                : t('fields:harvestCampaign.people.save', { count: people })
            }
            disabled={!canSave}
            onPress={() =>
              onSave({
                people,
                hours,
                otherHours: hours === 'other' ? otherParsed ?? undefined : undefined,
              })
            }
            fullWidth
          />
          <Button title={t('common:cancel')} variant="ghost" onPress={onClose} fullWidth />
        </>
      }
    >
      <Text style={[styles.prompt, { color: colors.textPrimary }]}>
        {editing
          ? t('fields:harvestCampaign.dayActivity.editPeople')
          : t('fields:harvestCampaign.people.prompt')}
      </Text>
      <HarvestNumberStepper
        label={t('fields:harvestCampaign.people.unit')}
        value={people}
        onChange={setPeople}
        min={1}
        suffix={t('fields:harvestCampaign.people.unit')}
      />
      <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
        {t('fields:harvestCampaign.people.hoursPrompt')}
      </Text>
      <HarvestSegmentedControl
        value={hours}
        ariaLabel={t('fields:harvestCampaign.people.hoursPrompt')}
        onChange={setHours}
        options={(['half', 'full', 'other', 'skip'] as const).map((choice) => ({
          value: choice,
          label: t(`fields:harvestCampaign.people.hours.${choice}`),
        }))}
      />
      {hours === 'other' ? (
        <HarvestNumberInput
          label={t('fields:harvestCampaign.people.otherHours')}
          value={otherHours}
          onChange={setOtherHours}
          suffix="h"
        />
      ) : null}
    </HarvestSheetShell>
  );
};

const styles = StyleSheet.create({
  prompt: { fontWeight: '700', fontSize: 16 },
});
