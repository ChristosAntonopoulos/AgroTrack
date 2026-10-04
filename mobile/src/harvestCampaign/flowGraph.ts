import type { Field } from '../services/fieldService';
import {
  allocatedMillKgForField,
  allocatedOilKgForField,
  millFieldShares,
  oilFieldShares,
} from './allocation';
import { extractionYieldPercent } from './utils/harvestCalculations';
import { isSackWeighed, linkedSackIds, oilAmountToKg } from './totals';
import type { HarvestCampaign } from './types';

/** Layered material-genealogy stages (land → oil). */
export type HarvestFlowNodeKind = 'field' | 'harvest' | 'mill' | 'oil';

export type HarvestFlowNodeMeta = {
  /** Big number line (already unit-ready for display helpers). */
  metric: string;
  metricUnit?: string;
  /** Short lines under the metric. */
  lines: string[];
  /** Tiny chips (status / shared / pending). */
  chips: string[];
  /** Upstream summary e.g. "2 ημέρες". */
  fromSummary?: string;
  /** Downstream summary e.g. "→ 56 kg". */
  toSummary?: string;
  oliveKg?: number;
  oilKg?: number;
  sackCount?: number;
  openSacks?: number;
  fieldNames?: string[];
};

export type HarvestFlowNode = {
  id: string;
  kind: HarvestFlowNodeKind;
  label: string;
  detail?: string;
  weight: number;
  fieldIds: string[];
  date?: string;
  entryIds?: string[];
  pending?: 'needsMill' | 'needsOil';
  /** Only set when yield is in a plausible olive-oil range. */
  yieldPct?: number | null;
  shared?: boolean;
  meta: HarvestFlowNodeMeta;
};

export type HarvestFlowLink = {
  fromId: string;
  toId: string;
  weight: number;
  /** Short caption for selected ribbon tip. */
  label?: string;
  /** Primary grove for wire color (and split multi-field edges). */
  fieldId?: string;
};

export type HarvestFlowGraph = {
  nodes: HarvestFlowNode[];
  links: HarvestFlowLink[];
  byKind: Record<HarvestFlowNodeKind, HarvestFlowNode[]>;
};

/** Typical olive oil extraction; hide absurd % (e.g. oil kg > olives). */
export const plausibleOilYield = (pct: number | null | undefined): number | null => {
  if (pct == null || !Number.isFinite(pct)) return null;
  if (pct < 5 || pct > 40) return null;
  return pct;
};

const labelOf = (fields: Field[], id: string) =>
  fields.find((f) => f.id === id)?.name || id;

const shortNames = (fields: Field[], ids: string[]) =>
  ids.map((id) => labelOf(fields, id)).filter(Boolean);

/**
 * Build FIELD → HARVEST(day) → MILL → OIL genealogy with rich card meta.
 */
export const buildHarvestFlowGraph = (
  campaign: HarvestCampaign,
  fields: Field[],
  fieldOrder: string[]
): HarvestFlowGraph => {
  const linked = linkedSackIds(campaign);
  const millIdsWithOil = new Set(campaign.oils.flatMap((o) => o.millWeightIds));
  const oilCoversAll = campaign.oils.some((o) => o.millWeightIds.length === 0);

  const activeFieldIds =
    fieldOrder.length > 0
      ? fieldOrder
      : [...new Set(campaign.sacks.map((s) => s.fieldId))];

  const byDate = new Map<string, typeof campaign.sacks>();
  for (const sack of campaign.sacks) {
    const list = byDate.get(sack.date) || [];
    list.push(sack);
    byDate.set(sack.date, list);
  }
  const harvestDates = [...byDate.keys()].sort();

  const fieldNodes: HarvestFlowNode[] = activeFieldIds.map((fieldId) => {
    const fieldSacks = campaign.sacks.filter((s) => s.fieldId === fieldId);
    const sackCount = fieldSacks.reduce((sum, s) => sum + s.sacks, 0);
    const openSacks = fieldSacks
      .filter((s) => !isSackWeighed(s, linked))
      .reduce((sum, s) => sum + s.sacks, 0);
    const days = new Set(fieldSacks.map((s) => s.date)).size;
    let officialKg = 0;
    let oilKg = 0;
    let shared = false;
    for (const mill of campaign.millWeights) {
      const shares = millFieldShares(campaign, mill);
      if (!shares.some((s) => s.fieldId === fieldId)) continue;
      officialKg += allocatedMillKgForField(campaign, mill, fieldId);
      if (shares.length > 1) shared = true;
    }
    for (const oil of campaign.oils) {
      const shares = oilFieldShares(campaign, oil);
      if (!shares.some((s) => s.fieldId === fieldId)) continue;
      oilKg += allocatedOilKgForField(campaign, oil, fieldId);
      if (shares.length > 1) shared = true;
    }

    return {
      id: `field:${fieldId}`,
      kind: 'field' as const,
      label: labelOf(fields, fieldId),
      detail: String(sackCount),
      weight: Math.max(1, sackCount || 1),
      fieldIds: [fieldId],
      pending: openSacks > 0 ? ('needsMill' as const) : undefined,
      entryIds: fieldSacks.filter((s) => !isSackWeighed(s, linked)).map((s) => s.id),
      shared,
      meta: {
        metric: String(sackCount || '—'),
        metricUnit: 'sacks',
        lines: [],
        chips: [
          ...(shared ? ['shared'] : []),
          ...(openSacks > 0 ? ['needsMill'] : sackCount > 0 ? ['ok'] : []),
        ],
        sackCount,
        openSacks,
        oliveKg: officialKg,
        oilKg,
        fieldNames: [labelOf(fields, fieldId)],
        fromSummary: days > 0 ? String(days) : undefined,
        toSummary: officialKg > 0 ? String(Math.round(officialKg)) : undefined,
      },
    };
  });

  const harvestNodes: HarvestFlowNode[] = [];
  const harvestLinks: HarvestFlowLink[] = [];

  for (const date of harvestDates) {
    const daySacks = byDate.get(date)!;
    const total = daySacks.reduce((sum, s) => sum + s.sacks, 0);
    const fieldIds = [...new Set(daySacks.map((s) => s.fieldId))];
    const unweighed = daySacks.filter((s) => !isSackWeighed(s, linked));
    const openCount = unweighed.reduce((sum, s) => sum + s.sacks, 0);
    const weighedCount = total - openCount;
    const names = shortNames(fields, fieldIds);
    const nodeId = `harvest:${date}`;
    const estKg = daySacks.reduce(
      (sum, s) => sum + s.sacks * (s.kgPerSack || campaign.usualSackKg || 0),
      0
    );

    const lines: string[] = [];
    if (names.length) lines.push(names.join(' · '));

    harvestNodes.push({
      id: nodeId,
      kind: 'harvest',
      label: date,
      detail: String(total),
      weight: total,
      fieldIds,
      date,
      entryIds: unweighed.map((s) => s.id),
      pending: unweighed.length > 0 ? 'needsMill' : undefined,
      shared: fieldIds.length > 1,
      meta: {
        metric: String(total),
        metricUnit: 'sacks',
        lines,
        chips: [
          ...(fieldIds.length > 1 ? ['shared'] : []),
          ...(unweighed.length > 0 ? ['needsMill'] : ['ok']),
        ],
        sackCount: total,
        openSacks: openCount,
        oliveKg: estKg > 0 ? estKg : undefined,
        fieldNames: names,
        fromSummary: names.join(' + '),
        toSummary: weighedCount > 0 && openCount === 0 ? 'ok' : undefined,
      },
    });
    for (const fieldId of fieldIds) {
      const fieldSacks = daySacks
        .filter((s) => s.fieldId === fieldId)
        .reduce((sum, s) => sum + s.sacks, 0);
      harvestLinks.push({
        fromId: `field:${fieldId}`,
        toId: nodeId,
        weight: fieldSacks,
        label: `${fieldSacks}`,
        fieldId,
      });
    }
  }

  const millNodes: HarvestFlowNode[] = [];
  const millLinks: HarvestFlowLink[] = [];
  for (const mill of campaign.millWeights) {
    const shares = millFieldShares(campaign, mill);
    const nodeId = `mill:${mill.id}`;
    const needsOil = !oilCoversAll && !millIdsWithOil.has(mill.id);
    const shared = shares.length > 1;
    const names = shortNames(fields, shares.map((s) => s.fieldId));
    const linkedSacks = campaign.sacks.filter(
      (s) => s.millWeightId === mill.id || mill.sackIds.includes(s.id)
    );
    const sackCount = linkedSacks.reduce((sum, s) => sum + s.sacks, 0);
    const dayCount = new Set(linkedSacks.map((s) => s.date)).size;

    const lines: string[] = [];
    if (names.length) lines.push(names.join(' · '));

    millNodes.push({
      id: nodeId,
      kind: 'mill',
      label: `${Math.round(mill.kg)}`,
      detail: mill.date,
      weight: mill.kg,
      fieldIds: shares.map((s) => s.fieldId),
      date: mill.date,
      entryIds: needsOil ? [mill.id] : undefined,
      pending: needsOil ? 'needsOil' : undefined,
      shared,
      meta: {
        metric: `${Math.round(mill.kg)}`,
        metricUnit: 'kg',
        lines,
        chips: [...(shared ? ['shared'] : []), ...(needsOil ? ['needsOil'] : ['ok'])],
        oliveKg: mill.kg,
        sackCount,
        fieldNames: names,
        fromSummary: sackCount > 0 ? String(sackCount) : names.join(' + '),
        toSummary: dayCount > 1 ? String(dayCount) : undefined,
      },
    });

    const linkedHarvestDates = new Set(linkedSacks.map((s) => s.date));
    if (linkedHarvestDates.size > 0) {
      for (const date of linkedHarvestDates) {
        const daySacks = linkedSacks.filter((s) => s.date === date);
        const byField = new Map<string, number>();
        for (const sack of daySacks) {
          byField.set(sack.fieldId, (byField.get(sack.fieldId) || 0) + sack.sacks);
        }
        for (const [fieldId, fieldWeight] of byField) {
          millLinks.push({
            fromId: `harvest:${date}`,
            toId: nodeId,
            weight: fieldWeight || 1,
            label: `${fieldWeight}`,
            fieldId,
          });
        }
      }
    } else {
      for (const share of shares) {
        const harvestForField = [...harvestNodes]
          .filter((h) => h.fieldIds.includes(share.fieldId))
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
        millLinks.push({
          fromId: harvestForField?.id || `field:${share.fieldId}`,
          toId: nodeId,
          weight: share.weight,
          fieldId: share.fieldId,
        });
      }
    }
  }

  const oilNodes: HarvestFlowNode[] = [];
  const oilLinks: HarvestFlowLink[] = [];
  for (const oil of campaign.oils) {
    const oilKg = oilAmountToKg(oil);
    const shares = oilFieldShares(campaign, oil);
    const relatedMills = campaign.millWeights.filter((m) =>
      oil.millWeightIds.length > 0
        ? oil.millWeightIds.includes(m.id)
        : true
    );
    const relatedMillKg = relatedMills.reduce((sum, m) => sum + m.kg, 0);
    const rawYield =
      relatedMillKg > 0 && oilKg > 0
        ? extractionYieldPercent(relatedMillKg, oilKg)
        : null;
    const yieldPct = plausibleOilYield(rawYield);
    const nodeId = `oil:${oil.id}`;
    const names = shortNames(fields, shares.map((s) => s.fieldId));
    const amountLabel =
      oil.unit === 'litres'
        ? `${Math.round(oil.amount)}`
        : `${Math.round(oilKg)}`;
    const unit = oil.unit === 'litres' ? 'L' : 'kg';

    const lines: string[] = [];
    if (names.length) lines.push(names.join(' · '));

    oilNodes.push({
      id: nodeId,
      kind: 'oil',
      label: amountLabel,
      detail: oil.date,
      weight: oilKg,
      fieldIds: shares.map((s) => s.fieldId),
      date: oil.date,
      yieldPct,
      shared: shares.length > 1,
      meta: {
        metric: amountLabel,
        metricUnit: unit,
        lines,
        chips: [...(shares.length > 1 ? ['shared'] : []), ...(yieldPct != null ? ['yield'] : [])],
        oliveKg: relatedMillKg,
        oilKg,
        fieldNames: names,
        fromSummary: relatedMillKg > 0 ? String(Math.round(relatedMillKg)) : names.join(' + '),
      },
    });

    if (oil.millWeightIds.length > 0) {
      for (const millId of oil.millWeightIds) {
        const mill = campaign.millWeights.find((m) => m.id === millId);
        if (!mill) continue;
        const millShares = millFieldShares(campaign, mill);
        const topShare = [...millShares].sort((a, b) => b.weight - a.weight)[0];
        oilLinks.push({
          fromId: `mill:${millId}`,
          toId: nodeId,
          weight: mill.kg || oilKg,
          label: `${Math.round(mill.kg)}→${amountLabel}`,
          fieldId: topShare?.fieldId || shares[0]?.fieldId,
        });
      }
    } else {
      for (const mill of campaign.millWeights) {
        const millShares = millFieldShares(campaign, mill);
        const topShare = [...millShares].sort((a, b) => b.weight - a.weight)[0];
        oilLinks.push({
          fromId: `mill:${mill.id}`,
          toId: nodeId,
          weight: mill.kg || 1,
          fieldId: topShare?.fieldId || shares[0]?.fieldId,
        });
      }
      if (campaign.millWeights.length === 0) {
        for (const share of shares) {
          oilLinks.push({
            fromId: `field:${share.fieldId}`,
            toId: nodeId,
            weight: share.weight,
            fieldId: share.fieldId,
          });
        }
      }
    }
  }

  // Fill mill kg into harvest cards (numeric only — i18n adds "kg")
  for (const harvest of harvestNodes) {
    const outs = millLinks.filter((l) => l.fromId === harvest.id);
    if (outs.length === 0) continue;
    const millKg = outs.reduce((sum, l) => {
      const mill = millNodes.find((m) => m.id === l.toId);
      return sum + (mill?.weight || 0);
    }, 0);
    if (millKg > 0) harvest.meta.toSummary = String(Math.round(millKg));
  }

  // Fill oil kg + yield on mill cards (keep day-count toSummary intact)
  for (const mill of millNodes) {
    const outs = oilLinks.filter((l) => l.fromId === mill.id);
    if (outs.length === 0) continue;
    const oilKg = outs.reduce((sum, l) => {
      const oil = oilNodes.find((o) => o.id === l.toId);
      return sum + (oil?.weight || 0);
    }, 0);
    if (oilKg > 0) {
      mill.meta.oilKg = oilKg;
      const y = plausibleOilYield(extractionYieldPercent(mill.weight, oilKg));
      if (y != null) {
        mill.yieldPct = y;
        if (!mill.meta.chips.includes('yield')) mill.meta.chips.push('yield');
      }
    }
  }

  for (const field of fieldNodes) {
    const olive = field.meta.oliveKg || 0;
    const oil = field.meta.oilKg || 0;
    const y = plausibleOilYield(extractionYieldPercent(olive, oil));
    if (y != null) {
      field.yieldPct = y;
      if (!field.meta.chips.includes('yield')) field.meta.chips.push('yield');
    }
  }

  const nodes = [...fieldNodes, ...harvestNodes, ...millNodes, ...oilNodes];
  const links = [...harvestLinks, ...millLinks, ...oilLinks].filter((link) => {
    const fromOk = nodes.some((n) => n.id === link.fromId);
    const toOk = nodes.some((n) => n.id === link.toId);
    return fromOk && toOk && link.weight > 0;
  });

  return {
    nodes,
    links,
    byKind: {
      field: fieldNodes,
      harvest: harvestNodes,
      mill: millNodes,
      oil: oilNodes,
    },
  };
};

export const fieldAllocationCaption = (
  campaign: HarvestCampaign,
  fieldId: string
): { millKg: number; oilKg: number; shared: boolean } => {
  let millKg = 0;
  let oilKg = 0;
  let shared = false;
  for (const mill of campaign.millWeights) {
    const shares = millFieldShares(campaign, mill);
    if (!shares.some((s) => s.fieldId === fieldId)) continue;
    millKg += allocatedMillKgForField(campaign, mill, fieldId);
    if (shares.length > 1) shared = true;
  }
  for (const oil of campaign.oils) {
    const shares = oilFieldShares(campaign, oil);
    if (!shares.some((s) => s.fieldId === fieldId)) continue;
    oilKg += allocatedOilKgForField(campaign, oil, fieldId);
    if (shares.length > 1) shared = true;
  }
  return { millKg, oilKg, shared };
};

/**
 * The path through this node only.
 * Walk upstream for where it came from, and downstream for where it went.
 * Do not step sideways into other branches that share a field or a weighing.
 */
export const relatedGenealogyIds = (
  nodeId: string | null,
  links: HarvestFlowLink[]
): Set<string> => {
  if (!nodeId) return new Set();
  const related = new Set<string>([nodeId]);

  const downstream = new Set<string>([nodeId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const link of links) {
      if (downstream.has(link.fromId) && !downstream.has(link.toId)) {
        downstream.add(link.toId);
        related.add(link.toId);
        grew = true;
      }
    }
  }

  const upstream = new Set<string>([nodeId]);
  grew = true;
  while (grew) {
    grew = false;
    for (const link of links) {
      if (upstream.has(link.toId) && !upstream.has(link.fromId)) {
        upstream.add(link.fromId);
        related.add(link.fromId);
        grew = true;
      }
    }
  }

  return related;
};
