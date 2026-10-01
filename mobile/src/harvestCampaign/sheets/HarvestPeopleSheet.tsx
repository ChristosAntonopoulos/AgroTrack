import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HarvestFormPager, HarvestQuickChips } from '../components/HarvestFormPager';
import { HarvestNumberInput } from '../components/HarvestNumberInput';
import { HarvestNumberStepper } from '../components/HarvestNumberStepper';
import { HarvestSegmentedControl } from '../components/HarvestSegmentedControl';
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
  const editing = Boolean(initial);
  const [people, setPeople] = useState(initial?.people ?? 0);
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
    <HarvestFormPager
      current={0}
      total={1}
      accent="people"
      title={editing ? t('fields:harvestCampaign.dayActivity.editPeople') : t('fields:harvestCampaign.people.prompt')}
      nextLabel={
        editing
          ? t('fields:harvestCampaign.dayActivity.saveChanges')
          : t('fields:harvestCampaign.people.save', { count: people })
      }
      nextDisabled={!canSave}
      onNext={() =>
        onSave({
          people,
          hours,
          otherHours: hours === 'other' ? otherParsed ?? undefined : undefined,
        })
      }
      cancelLabel={t('common:cancel')}
      onCancel={onClose}
      error={!canSave ? saveHint : null}
    >
      <HarvestNumberStepper
        label={t('fields:harvestCampaign.people.unit')}
        value={people}
        onChange={setPeople}
        min={0}
        suffix={t('fields:harvestCampaign.people.unit')}
      />
      <HarvestQuickChips
        values={[2, 4, 6, 8]}
        suffix={t('fields:harvestCampaign.people.unit')}
        onPick={(add) => setPeople((current) => current + add)}
      />
      <HarvestSegmentedControl
        value={hours}
        label={t('fields:harvestCampaign.people.hoursPrompt')}
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
    </HarvestFormPager>
  );
};
