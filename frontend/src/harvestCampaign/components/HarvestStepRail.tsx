import React from 'react';
import { useTranslation } from 'react-i18next';
import { HARVEST_ACTION_ICONS } from '../harvestActions';

export type HarvestPathStep = 'sacks' | 'mill' | 'oil';

const ORDER: HarvestPathStep[] = ['sacks', 'mill', 'oil'];

/**
 * Σάκοι → Ελαιόκαρπος → Λάδι, drawn as one connected path.
 * On the add menu every step is tappable. On a form, the previous step
 * opens the link (which sacks, which kilograms) that sits above the input.
 */
export const HarvestStepRail: React.FC<{
  current: HarvestPathStep;
  facts?: Partial<Record<HarvestPathStep, string>>;
  caption?: string;
  onPick?: (step: HarvestPathStep) => void;
  /** When picking, steps outside this list stay visible but cannot be opened. */
  enabled?: HarvestPathStep[];
  linkStep?: HarvestPathStep;
  linkOpen?: boolean;
  onOpenLink?: () => void;
}> = ({ current, facts, caption, onPick, enabled, linkStep, linkOpen, onOpenLink }) => {
  const { t } = useTranslation('fields');
  const you = t('harvestCampaign.stepRail.you');

  return (
    <div
      className="hc-path"
      data-step={current}
      role="group"
      aria-label={t('harvestCampaign.stepRail.aria')}
    >
      <span className="hc-path-line" aria-hidden />
      {ORDER.map((step) => {
        const Icon = HARVEST_ACTION_ICONS[step];
        const name = t(`harvestCampaign.addMenu.title.${step}`);
        const fact = facts?.[step];
        const isCurrent = step === current;
        const index = ORDER.indexOf(step);
        const canPick = onPick != null && (enabled == null || enabled.includes(step));
        const place =
          onPick != null
            ? isCurrent
              ? 'is-current'
              : canPick
                ? 'is-open'
                : 'is-later'
            : index < ORDER.indexOf(current)
              ? 'is-done'
              : isCurrent
                ? 'is-current'
                : 'is-later';
        const factText = isCurrent ? (onPick ? you : fact || you) : fact || '';
        const canLink = !onPick && linkStep === step && Boolean(onOpenLink);
        const className = `hc-path-node ${place}${canLink && linkOpen ? ' is-link-open' : ''}`;
        const body = (
          <>
            <span className="hc-path-dot" aria-hidden>
              <Icon size={isCurrent ? 18 : 16} strokeWidth={2.1} />
            </span>
            <span className="hc-path-name">{name}</span>
            <span className="hc-path-fact">{factText || '\u00a0'}</span>
          </>
        );

        if (canPick && onPick) {
          return (
            <button
              key={step}
              type="button"
              className={className}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => onPick(step)}
            >
              {body}
            </button>
          );
        }

        if (canLink) {
          return (
            <button
              key={step}
              type="button"
              className={className}
              aria-expanded={Boolean(linkOpen)}
              aria-label={t('harvestCampaign.stepRail.openLink', { step: name })}
              onClick={onOpenLink}
            >
              {body}
            </button>
          );
        }

        return (
          <div key={step} className={className} aria-current={isCurrent ? 'step' : undefined}>
            {body}
          </div>
        );
      })}
      {caption ? <p className="hc-path-caption">{caption}</p> : null}
    </div>
  );
};
