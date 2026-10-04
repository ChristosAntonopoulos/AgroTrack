import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import type { ChronologioHarvestDetails } from '../../services/chronologioService';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { HARVEST_ACTION_ICONS } from '../../harvestCampaign/harvestActions';
import { formatOilLitresAmountFromKg } from '../../harvestCampaign/utils/harvestCalculations';
import '../../pages/HarvestCampaignPage.css';

type JourneyStage = {
  kind: 'harvest' | 'mill' | 'oil';
  value: string;
  unit: string;
  lines: string[];
  accent?: string;
};

type Props = {
  harvest: ChronologioHarvestDetails;
  numberLocale: string;
  fieldName?: string | null;
  fieldAccent?: string;
  /** Compact horizontal chain for the timeline card. */
  compact?: boolean;
};

const STAGE_ICON: Record<JourneyStage['kind'], LucideIcon> = {
  harvest: HARVEST_ACTION_ICONS.sacks,
  mill: HARVEST_ACTION_ICONS.mill,
  oil: HARVEST_ACTION_ICONS.oil,
};

const stageTitle = (kind: JourneyStage['kind'], t: (key: string) => string) => {
  if (kind === 'harvest') return t('harvestCampaign.flow.sacks');
  if (kind === 'mill') return t('harvestCampaign.flow.fruit');
  return t('harvestCampaign.flow.oil');
};

/**
 * Day slice of the harvest journey — same language as Η διαδρομή της συγκομιδής:
 * σάκοι → ελαιόκαρπος → λάδι.
 */
const HarvestDayJourney: React.FC<Props> = ({
  harvest,
  numberLocale,
  fieldName,
  fieldAccent,
  compact = false,
}) => {
  const { t } = useTranslation('fields');

  const stages = useMemo(() => {
    const out: JourneyStage[] = [];
    const fieldLine = fieldName ? friendlyFieldLabel(fieldName) : null;
    const sacks = harvest.sackCount ?? 0;
    const olives = harvest.oliveKg ?? 0;
    const oil = harvest.oilKg ?? 0;

    if (sacks > 0) {
      out.push({
        kind: 'harvest',
        value: String(sacks),
        unit: t('harvestCampaign.sacks.unit'),
        lines: [
          fieldLine,
          harvest.hasOfficialWeight === false && olives > 0
            ? t('harvestCampaign.flow.approxOlives', {
                kg: formatGroveMassKg(olives, numberLocale),
              })
            : null,
        ].filter(Boolean) as string[],
        accent: fieldAccent,
      });
    }

    if (olives > 0 && harvest.hasOfficialWeight !== false) {
      out.push({
        kind: 'mill',
        value: formatGroveMassKg(olives, numberLocale),
        unit: t('harvestCampaign.flow.unitFruit'),
        lines: [
          fieldLine,
          sacks > 0 ? t('harvestCampaign.flow.fromSacks', { count: sacks }) : null,
        ].filter(Boolean) as string[],
        accent: fieldAccent,
      });
    }

    if (oil > 0) {
      out.push({
        kind: 'oil',
        value: formatOilLitresAmountFromKg(oil, numberLocale),
        unit: t('harvestCampaign.flow.unitOilLitres'),
        lines: [
          fieldLine,
          olives > 0
            ? t('harvestCampaign.flow.fromOlives', {
                kg: formatGroveMassKg(olives, numberLocale),
              })
            : null,
          harvest.oilYieldPercent != null && harvest.oilYieldPercent > 0
            ? t('harvestCampaign.flow.yieldBadge', {
                yield: formatGroveMassKg(harvest.oilYieldPercent, numberLocale),
              })
            : null,
        ].filter(Boolean) as string[],
        accent: fieldAccent,
      });
    }

    return out;
  }, [fieldAccent, fieldName, harvest, numberLocale, t]);

  if (stages.length === 0) return null;

  if (compact) {
    return (
      <div
        className="chrono-harvest-journey is-compact"
        style={fieldAccent ? ({ '--field-accent': fieldAccent } as React.CSSProperties) : undefined}
        aria-label={t('harvestCampaign.flow.title')}
      >
        <div className="chrono-harvest-journey-metrics">
          {stages.map((stage, index) => {
            const Icon = STAGE_ICON[stage.kind];
            return (
              <React.Fragment key={stage.kind}>
                {index > 0 ? (
                  <span className="chrono-harvest-journey-dot" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span className={`chrono-harvest-journey-metric is-${stage.kind}`}>
                  <Icon size={16} strokeWidth={2.4} aria-hidden />
                  <strong>
                    {stage.value} <span className="chrono-harvest-journey-unit">{stage.unit}</span>
                  </strong>
                </span>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="chrono-harvest-journey" aria-label={t('harvestCampaign.flow.title')}>
      <p className="chrono-harvest-journey-lead">{t('harvestCampaign.flow.lead')}</p>
      <div className="hc-gene-stack chrono-harvest-journey-stack">
        {stages.map((stage) => {
          const accent = stage.accent || fieldAccent;
          return (
            <div key={stage.kind} className={`hc-gene-node hc-gene-node-${stage.kind}`}>
              <div
                className="hc-gene-card has-accent"
                style={
                  accent
                    ? ({ ['--hc-gene-accent' as string]: accent } as React.CSSProperties)
                    : undefined
                }
              >
                <span className="hc-gene-card-title">{stageTitle(stage.kind, t)}</span>
                <span className="hc-gene-card-metric">
                  <em>{stage.value}</em>
                  <small>{stage.unit}</small>
                </span>
                {stage.lines.map((line) => (
                  <span key={line} className="hc-gene-card-line">
                    {line}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HarvestDayJourney;
