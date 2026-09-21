import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HarvestNumberInput, HarvestNumberStepper } from '../components/HarvestNumberInput';
import { HarvestSegmentedControl } from '../components/HarvestSegmentedControl';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import type { HarvestPeopleHours } from '../types';
import { parseHarvestDecimal } from '../utils/harvestValidation';
import type { HarvestSheetSharedProps } from './types';

export const HarvestPeopleSheet: React.FC<
  HarvestSheetSharedProps & {
    initial?: import('../types').HarvestPeopleEntry | null;
    onSave: (input: {
      people: number;
      hours: HarvestPeopleHours;
      otherHours?: number;
    }) => void;
  }
> = ({ initial, onSave, onClose }) => {
  const { t } = useTranslation('fields');
  const [people, setPeople] = useState(initial?.people ?? 4);
  const [hours, setHours] = useState<HarvestPeopleHours>(initial?.hours ?? 'full');
  const [otherHours, setOtherHours] = useState(
    initial?.otherHours != null ? String(initial.otherHours) : ''
  );
  const editing = Boolean(initial);

  return (
    <HarvestSheetShell
      footer={
        <>
          <button
            type="button"
            className="money-primary-action"
            disabled={people <= 0}
            onClick={() =>
              onSave({
                people,
                hours,
                otherHours:
                  hours === 'other' ? parseHarvestDecimal(otherHours) ?? undefined : undefined,
              })
            }
          >
            {editing
              ? t('harvestCampaign.dayActivity.saveChanges')
              : t('harvestCampaign.people.save', { count: people })}
          </button>
          <button type="button" className="money-text-link" onClick={onClose}>
            {t('common:cancel', { ns: 'common' })}
          </button>
        </>
      }
    >
      <p className="capture-prompt">
        {editing ? t('harvestCampaign.dayActivity.editPeople') : t('harvestCampaign.people.prompt')}
      </p>
      <HarvestNumberStepper
        label={t('harvestCampaign.people.unit')}
        value={people}
        onChange={setPeople}
        min={1}
        suffix={t('harvestCampaign.people.unit')}
      />
      <p className="hc-form-section">{t('harvestCampaign.people.hoursPrompt')}</p>
      <HarvestSegmentedControl
        value={hours}
        className="hc-toggle-4"
        ariaLabel={t('harvestCampaign.people.hoursPrompt')}
        onChange={setHours}
        options={(['half', 'full', 'other', 'skip'] as const).map((choice) => ({
          value: choice,
          label: t(`harvestCampaign.people.hours.${choice}`),
        }))}
      />
      {hours === 'other' ? (
        <HarvestNumberInput
          label={t('harvestCampaign.people.otherHours')}
          value={otherHours}
          onChange={setOtherHours}
          suffix="h"
        />
      ) : null}
    </HarvestSheetShell>
  );
};
