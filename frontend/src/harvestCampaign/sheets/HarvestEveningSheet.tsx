import React from 'react';
import { useTranslation } from 'react-i18next';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import { HARVEST_ACTION_ICONS } from '../harvestActions';
import type { HarvestCaptureKind } from '../types';

export const HarvestEveningSheet: React.FC<{
  sacks: number;
  people: number;
  expenseEur: number;
  fieldNames: string;
  allowedAddKinds?: HarvestCaptureKind[];
  onAdd: (kind: HarvestCaptureKind) => void;
  onCloseDay: () => void;
  /** Empty day: user confirmed “no harvest today”. */
  onCloseEmpty?: () => void;
}> = ({
  sacks,
  people,
  expenseEur,
  fieldNames,
  allowedAddKinds,
  onAdd,
  onCloseDay,
  onCloseEmpty,
}) => {
  const { t } = useTranslation('fields');
  const hasFacts = sacks > 0 || people > 0 || expenseEur > 0 || Boolean(fieldNames);
  const addKinds = (['mill', 'oil', 'expense'] as const).filter(
    (kind) => !allowedAddKinds || allowedAddKinds.includes(kind)
  );

  if (!hasFacts) {
    return (
      <HarvestSheetShell
        footer={
          <>
            <button type="button" className="money-primary-action" onClick={() => onAdd('sacks')}>
              {t('harvestCampaign.evening.emptyReturn')}
            </button>
            <button
              type="button"
              className="money-text-link"
              onClick={() => (onCloseEmpty || onCloseDay)()}
            >
              {t('harvestCampaign.evening.emptyClose')}
            </button>
          </>
        }
      >
        <p className="capture-prompt">{t('harvestCampaign.evening.emptyTitle')}</p>
        <p className="capture-hint">{t('harvestCampaign.evening.emptyHint')}</p>
      </HarvestSheetShell>
    );
  }

  return (
    <HarvestSheetShell
      footer={
        <button type="button" className="money-primary-action" onClick={onCloseDay}>
          {t('harvestCampaign.evening.done')}
        </button>
      }
    >
      <p className="capture-prompt">{t('harvestCampaign.evening.recorded')}</p>
      <div className="hc-evening-stats" role="list">
        {sacks > 0 ? (
          <div className="hc-evening-stat" role="listitem">
            <span className="hc-evening-stat__label">{t('harvestCampaign.actions.sacks')}</span>
            <strong className="hc-evening-stat__value">{sacks}</strong>
          </div>
        ) : null}
        {people > 0 ? (
          <div className="hc-evening-stat" role="listitem">
            <span className="hc-evening-stat__label">{t('harvestCampaign.actions.people')}</span>
            <strong className="hc-evening-stat__value">{people}</strong>
          </div>
        ) : null}
        {expenseEur > 0 ? (
          <div className="hc-evening-stat" role="listitem">
            <span className="hc-evening-stat__label">{t('harvestCampaign.actions.expense')}</span>
            <strong className="hc-evening-stat__value">{expenseEur} €</strong>
          </div>
        ) : null}
        {fieldNames ? (
          <div className="hc-evening-stat hc-evening-stat--wide" role="listitem">
            <span className="hc-evening-stat__label">{t('harvestCampaign.nav.fields')}</span>
            <strong className="hc-evening-stat__value">{fieldNames}</strong>
          </div>
        ) : null}
      </div>
      <p className="hc-form-section">{t('harvestCampaign.evening.missing')}</p>
      <div className="capture-type-list">
        {addKinds.map((kind) => {
          const Icon = HARVEST_ACTION_ICONS[kind];
          return (
            <button key={kind} type="button" className="capture-type-card" onClick={() => onAdd(kind)}>
              <span className="capture-type-icon" aria-hidden>
                <Icon size={20} />
              </span>
              <span>
                <strong>{t(`harvestCampaign.actions.${kind}`)}</strong>
                <span>{t(`harvestCampaign.actionHint.${kind}`)}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="capture-hint">{t('harvestCampaign.evening.laterHint')}</p>
    </HarvestSheetShell>
  );
};
