import React from 'react';
import { useTranslation } from 'react-i18next';
import { HARVEST_ACTION_ICONS, HARVEST_HOME_ACTIONS } from '../harvestActions';
import { millKgNeedingOil, pendingSackTotal } from '../chain';
import type { HarvestCampaign, HarvestCaptureKind } from '../types';
import { HarvestSheetShell } from './HarvestSheetShell';
import { HarvestStepRail, type HarvestPathStep } from './HarvestStepRail';

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
  /** Kind suggested by chain / evening / fields prompts. */
  preferredKind?: HarvestCaptureKind;
  onPick: (kind: HarvestCaptureKind) => void;
}> = ({ campaign, allowedKinds, preferredKind, onPick }) => {
  const { t } = useTranslation('fields');
  const openSacks = pendingSackTotal(campaign);
  const openMillKg = millKgNeedingOil(campaign);
  const allowed = new Set(allowedKinds ?? HARVEST_HOME_ACTIONS);
  const production = PRODUCTION.filter((k) => allowed.has(k));
  const other = HARVEST_HOME_ACTIONS.filter((k) => !PRODUCTION.includes(k) && allowed.has(k));

  const titleOf = (kind: HarvestCaptureKind) =>
    PRODUCTION.includes(kind)
      ? t(`harvestCampaign.addMenu.title.${kind}`)
      : t(`harvestCampaign.actions.${kind}`);

  const hintOf = (kind: HarvestCaptureKind) => {
    if (kind === 'mill' && openSacks > 0) {
      return t('harvestCampaign.addMenu.sacksWaiting', { count: openSacks });
    }
    if (kind === 'oil' && openMillKg > 0) {
      return t('harvestCampaign.addMenu.fruitWaiting', { kg: Math.round(openMillKg) });
    }
    if (PRODUCTION.includes(kind)) return t(`harvestCampaign.addMenu.hint.${kind}`);
    return t(`harvestCampaign.actionHint.${kind}`);
  };

  const suggested: HarvestCaptureKind | null = (() => {
    if (preferredKind && production.includes(preferredKind)) return preferredKind;
    if (production.includes('mill') && openSacks > 0) return 'mill';
    if (production.includes('oil') && openMillKg > 0) return 'oil';
    if (production.includes('sacks')) return 'sacks';
    return production[0] ?? null;
  })();

  const waiting =
    (suggested === 'mill' && openSacks > 0) || (suggested === 'oil' && openMillKg > 0);

  const row = (kind: HarvestCaptureKind, featured = false) => {
    const Icon = HARVEST_ACTION_ICONS[kind];
    return (
      <button
        key={kind}
        type="button"
        className={`capture-type-card${featured ? ' is-next' : ''}`}
        onClick={() => onPick(kind)}
      >
        <span className="capture-type-icon" aria-hidden>
          <Icon size={featured ? 26 : 22} />
        </span>
        <span className="hc-add-row-copy">
          <strong>{titleOf(kind)}</strong>
          <span>{hintOf(kind)}</span>
        </span>
      </button>
    );
  };

  const pathSteps = production.filter(
    (kind): kind is HarvestPathStep => kind === 'sacks' || kind === 'mill' || kind === 'oil'
  );
  const pathCurrent: HarvestPathStep | null =
    suggested === 'sacks' || suggested === 'mill' || suggested === 'oil' ? suggested : null;

  const pathFacts: Partial<Record<HarvestPathStep, string>> = {};
  if (openSacks > 0) {
    pathFacts.sacks = t('harvestCampaign.flow.sackCount', { count: openSacks });
  }
  if (openMillKg > 0 && pathCurrent !== 'mill') {
    pathFacts.mill = t('harvestCampaign.flow.fruitLine', { kg: Math.round(openMillKg) });
  }

  return (
    <HarvestSheetShell>
      {pathCurrent ? (
        <>
          <p className="hc-form-section">
            {waiting
              ? t('harvestCampaign.addMenu.next')
              : t('harvestCampaign.addMenu.start')}
          </p>
          <div className="hc-step-block">
            <HarvestStepRail
              current={pathCurrent}
              facts={pathFacts}
              caption={hintOf(pathCurrent)}
              enabled={pathSteps}
              onPick={onPick}
            />
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
