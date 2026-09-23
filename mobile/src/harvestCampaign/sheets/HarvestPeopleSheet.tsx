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
  const [phase, setPhase] = useState(0);
  const otherParsed = parseHarvestDecimal(otherHours);
  const otherOk = hours !== 'other' || isPositiveAmount(otherParsed);
  const canSave = people > 0 && otherOk;
  const lastPhase = phase >= 1;
  const canAdvance = phase === 0 ? people > 0 : canSave;
  const saveHint = !canSave
    ? people <= 0
      ? t('fields:harvestCampaign.validation.enterPeople')
      : t('fields:harvestCampaign.validation.enterHours')
    : null;

  return (
    <HarvestFormPager
      current={phase}
      total={2}
      title={
        phase === 0
          ? t('fields:harvestCampaign.steps.peopleCount')
          : t('fields:harvestCampaign.steps.peopleHours')
      }
      hint={
        phase === 0
          ? t('fields:harvestCampaign.people.prompt')
          : t('fields:harvestCampaign.people.hoursPrompt')
      }
      nextLabel={
        lastPhase
          ? editing
            ? t('fields:harvestCampaign.dayActivity.saveChanges')
            : t('fields:harvestCampaign.people.save', { count: people })
          : t('fields:harvestCampaign.wizard.next')
      }
      nextDisabled={!canAdvance}
      onNext={() => {
        if (!lastPhase) {
          setPhase(1);
          return;
        }
        onSave({
          people,
          hours,
          otherHours: hours === 'other' ? otherParsed ?? undefined : undefined,
        });
      }}
      backLabel={t('common:back')}
      onBack={phase > 0 ? () => setPhase(0) : undefined}
      cancelLabel={t('common:cancel')}
      onCancel={onClose}
      error={!canAdvance ? saveHint : null}
    >
      {phase === 0 ? (
        <>
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
        </>
      ) : (
        <>
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
        </>
      )}
    </HarvestFormPager>
  );
};
