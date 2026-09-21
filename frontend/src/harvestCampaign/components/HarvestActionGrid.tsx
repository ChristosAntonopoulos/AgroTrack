import React from 'react';
import { useTranslation } from 'react-i18next';
import { HARVEST_ACTION_ICONS, HARVEST_HOME_ACTIONS } from '../harvestActions';
import { millKgNeedingOil, pendingSackTotal } from '../chain';
import type { HarvestCampaign, HarvestCaptureKind } from '../types';
import { HarvestSheetShell } from './HarvestSheetShell';

const PRODUCTION: HarvestCaptureKind[] = ['sacks', 'mill', 'oil'];

export const HarvestActionGrid: React.FC<{
  kinds?: HarvestCaptureKind[];
  onPick: (kind: HarvestCaptureKind) => void;
}> = ({ kinds = HARVEST_HOME_ACTIONS, onPick }) => {
  const { t } = useTranslation('fields');
  return (
    <div className="hc-action-grid">
      {kinds.map((kind) => {
        const Icon = HARVEST_ACTION_ICONS[kind];
        return (
          <button key={kind} type="button" className="hc-action-tile" onClick={() => onPick(kind)}>
            <span className="hc-action-icon" aria-hidden>
              <Icon size={22} />
            </span>
            <strong>{t(`harvestCampaign.actions.${kind}`)}</strong>
            <span>{t(`harvestCampaign.actionHint.${kind}`)}</span>
          </button>
        );
      })}
    </div>
  );
};

export const HarvestAddMenu: React.FC<{
  campaign: HarvestCampaign;
  /** When set, only these kinds are listed (capability-gated). */
  allowedKinds?: HarvestCaptureKind[];
  onPick: (kind: HarvestCaptureKind) => void;
}> = ({ campaign, allowedKinds, onPick }) => {
  const { t } = useTranslation('fields');
  const openSacks = pendingSackTotal(campaign);
  const openMillKg = millKgNeedingOil(campaign);
  const allowed = new Set(allowedKinds ?? HARVEST_HOME_ACTIONS);
  const production = PRODUCTION.filter((k) => allowed.has(k));
  const other = HARVEST_HOME_ACTIONS.filter((k) => !PRODUCTION.includes(k) && allowed.has(k));

  const row = (kind: HarvestCaptureKind, badge?: string | null) => {
    const Icon = HARVEST_ACTION_ICONS[kind];
    return (
      <button key={kind} type="button" className="capture-type-card" onClick={() => onPick(kind)}>
        <span className="capture-type-icon" aria-hidden>
          <Icon size={22} />
        </span>
        <span className="hc-add-row-copy">
          <strong>{t(`harvestCampaign.actions.${kind}`)}</strong>
          <span>{t(`harvestCampaign.actionHint.${kind}`)}</span>
        </span>
        {badge ? <em className="hc-add-badge">{badge}</em> : null}
      </button>
    );
  };

  return (
    <HarvestSheetShell>
      {production.length > 0 ? (
        <>
          <p className="hc-form-section">{t('harvestCampaign.chain.production')}</p>
          <div className="capture-type-list hc-add-chain">
            {production.includes('sacks') ? row('sacks') : null}
            {production.includes('mill')
              ? row(
                  'mill',
                  openSacks > 0
                    ? t('harvestCampaign.chain.openSacksBadge', { count: openSacks })
                    : null
                )
              : null}
            {production.includes('oil')
              ? row(
                  'oil',
                  openMillKg > 0
                    ? t('harvestCampaign.chain.openMillBadge', { kg: Math.round(openMillKg) })
                    : null
                )
              : null}
          </div>
        </>
      ) : null}
      {other.length > 0 ? (
        <>
          <p className="hc-form-section">{t('harvestCampaign.chain.other')}</p>
          <div className="capture-type-list">{other.map((kind) => row(kind))}</div>
        </>
      ) : null}
    </HarvestSheetShell>
  );
};
