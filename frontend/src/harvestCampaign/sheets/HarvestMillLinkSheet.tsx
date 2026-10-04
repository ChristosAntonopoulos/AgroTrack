import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { HarvestSegmentedControl } from '../components/HarvestSegmentedControl';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import { unconfirmedSacks } from '../storage';
import type { HarvestSheetSharedProps } from './types';

const fieldLabel = (fields: HarvestSheetSharedProps['fields'], id: string) =>
  friendlyFieldLabel(fields.find((field) => field.id === id)?.name || id);

export const HarvestMillLinkSheet: React.FC<
  HarvestSheetSharedProps & {
    /** When set, only show unconfirmed sacks for these fields. */
    filterFieldIds?: string[];
    onSave: (sackIds: string[]) => void;
  }
> = ({ campaign, fields, today, filterFieldIds, onSave, onClose }) => {
  const { t } = useTranslation('fields');
  const pending = unconfirmedSacks(campaign, filterFieldIds);
  const [customizing, setCustomizing] = useState(false);
  const [linkMode, setLinkMode] = useState<'all' | 'pick' | 'skip'>('all');
  const [pickedSacks, setPickedSacks] = useState<string[]>(pending.map((row) => row.id));
  const selectedSacks =
    linkMode === 'skip' ? [] : linkMode === 'all' ? pending.map((row) => row.id) : pickedSacks;
  const linkCount = selectedSacks.length;

  return (
    <HarvestSheetShell
      footer={
        <>
          <button type="button" className="money-primary-action" onClick={() => onSave(selectedSacks)}>
            {linkMode === 'skip'
              ? t('harvestCampaign.millKg.linkSkip')
              : t('harvestCampaign.millKg.linkFound', {
                  count: linkCount,
                  defaultValue: t('harvestCampaign.millKg.linkConfirm'),
                })}
          </button>
          <button type="button" className="money-text-link" onClick={onClose}>
            {t('common:cancel', { ns: 'common' })}
          </button>
        </>
      }
    >
      <p className="capture-prompt">{t('harvestCampaign.millKg.linkTitle')}</p>
      <ul className="hc-evening-list">
        {pending.map((sack) => (
          <li key={sack.id}>
            <label className="hc-link-row money-form-label">
              {customizing && linkMode === 'pick' ? (
                <input
                  type="checkbox"
                  checked={pickedSacks.includes(sack.id)}
                  onChange={() =>
                    setPickedSacks((prev) =>
                      prev.includes(sack.id) ? prev.filter((id) => id !== sack.id) : [...prev, sack.id]
                    )
                  }
                />
              ) : null}
              <span>
                {t(`harvestCampaign.relative.${sack.date === today ? 'today' : 'other'}`, {
                  defaultValue: sack.date,
                  date: sack.date,
                })}{' '}
                · {sack.sacks} {t('harvestCampaign.sacks.unit')} · {fieldLabel(fields, sack.fieldId)}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {!customizing ? (
        <button type="button" className="money-text-link" onClick={() => setCustomizing(true)}>
          {t('harvestCampaign.millKg.changeSelection', {
            defaultValue: t('harvestCampaign.millKg.linkPick'),
          })}
        </button>
      ) : (
        <>
          <p className="hc-form-section">{t('harvestCampaign.evening.missing')}</p>
          <HarvestSegmentedControl
            value={linkMode}
            className="hc-toggle-3"
            ariaLabel={t('harvestCampaign.millKg.linkTitle')}
            onChange={(next) => {
              setLinkMode(next);
              if (next === 'pick') setPickedSacks(pending.map((row) => row.id));
            }}
            options={[
              { value: 'all', label: t('harvestCampaign.millKg.linkAll') },
              { value: 'pick', label: t('harvestCampaign.millKg.linkPick') },
              { value: 'skip', label: t('harvestCampaign.millKg.linkSkip') },
            ]}
          />
        </>
      )}
    </HarvestSheetShell>
  );
};
