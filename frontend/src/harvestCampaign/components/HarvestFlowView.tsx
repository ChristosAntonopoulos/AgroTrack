import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import {
  buildHarvestFlowGraph,
  fieldAllocationCaption,
  relatedGenealogyIds,
  type HarvestFlowNode,
  type HarvestFlowNodeKind,
} from '../flowGraph';
import { formatHarvestYieldPercent } from '../utils/harvestCalculations';
import { fieldSummaries } from '../totals';
import type { HarvestCampaign } from '../types';
import { HarvestGenealogyConnectors } from './HarvestGenealogyConnectors';

type Props = {
  campaign: HarvestCampaign;
  fields: Field[];
  locale: string;
  onMarkDone: (fieldId: string) => void;
  onOpenMill?: (sackIds: string[]) => void;
  onOpenOil?: (millIds: string[]) => void;
};

const KIND_ORDER: HarvestFlowNodeKind[] = ['field', 'harvest', 'mill', 'oil'];

const formatDayLabel = (date: string, locale: string, style: 'short' | 'long' = 'short') => {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString(
      locale,
      style === 'long'
        ? { weekday: 'long', day: 'numeric', month: 'long' }
        : { weekday: 'short', day: 'numeric', month: 'short' }
    );
  } catch {
    return date;
  }
};

export const HarvestFlowView: React.FC<Props> = ({
  campaign,
  fields,
  locale,
  onMarkDone,
  onOpenMill,
  onOpenOil,
}) => {
  const { t } = useTranslation('fields');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stackEl, setStackEl] = useState<HTMLDivElement | null>(null);
  const cardElsRef = useRef<Map<string, HTMLElement>>(new Map());
  const cardRefCbs = useRef(new Map<string, (el: HTMLButtonElement | null) => void>());

  const bindStack = useCallback((el: HTMLDivElement | null) => {
    setStackEl((prev) => (prev === el ? prev : el));
  }, []);

  const cardRef = (id: string) => {
    let cb = cardRefCbs.current.get(id);
    if (!cb) {
      cb = (el) => {
        if (el) cardElsRef.current.set(id, el);
        else cardElsRef.current.delete(id);
      };
      cardRefCbs.current.set(id, cb);
    }
    return cb;
  };

  const fieldOrder =
    campaign.fieldOrder.length > 0
      ? campaign.fieldOrder
      : fields.map((f) => f.id);

  const fieldColors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const field of fields) {
      map[field.id] = resolveFieldColor(field.color, field.id);
    }
    return map;
  }, [fields]);

  const graph = useMemo(
    () => buildHarvestFlowGraph(campaign, fields, fieldOrder),
    [campaign, fields, fieldOrder]
  );

  const highlight = useMemo(
    () => relatedGenealogyIds(selectedId, graph.links),
    [selectedId, graph.links]
  );
  const summaries = useMemo(
    () => fieldSummaries(campaign, fieldOrder),
    [campaign, fieldOrder]
  );

  const selectedNode = graph.nodes.find((n) => n.id === selectedId) || null;
  const selectedFieldId =
    selectedNode?.kind === 'field'
      ? selectedNode.fieldIds[0]
      : selectedNode?.fieldIds.length === 1
        ? selectedNode.fieldIds[0]
        : null;

  const pathStory = useMemo(() => {
    if (!selectedNode) return null;
    if (selectedNode.kind === 'field' && selectedFieldId) {
      const cap = fieldAllocationCaption(campaign, selectedFieldId);
      const bits = [friendlyFieldLabel(selectedNode.label)];
      if (selectedNode.meta.sackCount)
        bits.push(`${selectedNode.meta.sackCount} ${t('harvestCampaign.sacks.unit')}`);
      if (cap.millKg > 0) bits.push(`${formatGroveMassKg(cap.millKg, locale)} kg`);
      if (cap.oilKg > 0) bits.push(`${formatGroveMassKg(cap.oilKg, locale)} kg`);
      return bits.length > 1 ? bits.join(' → ') : null;
    }
    const related = graph.nodes.filter((n) => highlight.has(n.id));
    const fieldNames = related
      .filter((n) => n.kind === 'field')
      .map((n) => friendlyFieldLabel(n.label));
    const bits: string[] = [];
    if (fieldNames.length) bits.push(fieldNames.join(' + '));
    if (selectedNode.kind === 'harvest' && selectedNode.meta.sackCount) {
      bits.push(`${selectedNode.meta.sackCount} ${t('harvestCampaign.sacks.unit')}`);
    }
    if (selectedNode.meta.oliveKg && selectedNode.kind !== 'field') {
      bits.push(`${formatGroveMassKg(selectedNode.meta.oliveKg, locale)} kg`);
    }
    if (selectedNode.meta.oilKg && selectedNode.kind === 'oil') {
      bits.push(
        `${formatGroveMassKg(selectedNode.meta.oilKg, locale)} kg${
          selectedNode.yieldPct != null
            ? ` · ${formatHarvestYieldPercent(selectedNode.yieldPct, locale)}%`
            : ''
        }`
      );
    } else if (selectedNode.kind === 'mill') {
      const oils = related.filter((n) => n.kind === 'oil');
      if (oils.length === 1 && oils[0].meta.oilKg) {
        bits.push(`${formatGroveMassKg(oils[0].meta.oilKg, locale)} kg`);
      }
    }
    return bits.length > 1 ? bits.join(' → ') : null;
  }, [selectedNode, selectedFieldId, campaign, highlight, graph.nodes, t, locale]);

  const rowLabel = (kind: HarvestFlowNodeKind) => {
    switch (kind) {
      case 'field':
        return t('harvestCampaign.flow.fields');
      case 'harvest':
        return t('harvestCampaign.flow.harvests');
      case 'mill':
        return t('harvestCampaign.flow.weighing');
      case 'oil':
        return t('harvestCampaign.flow.oil');
      default:
        return kind;
    }
  };

  const chipLabel = (chip: string) => {
    switch (chip) {
      case 'shared':
        return t('harvestCampaign.shared.badge');
      case 'needsMill':
        return t('harvestCampaign.flow.needsMill');
      case 'needsOil':
        return t('harvestCampaign.flow.needsOil');
      case 'ok':
        return t('harvestCampaign.flow.linked');
      case 'yield':
        return t('harvestCampaign.dashboard.yieldLabel');
      default:
        return chip;
    }
  };

  const cardTitle = (node: HarvestFlowNode) => {
    if (node.kind === 'field') return friendlyFieldLabel(node.label);
    if (node.kind === 'harvest' && node.date) return formatDayLabel(node.date, locale);
    if (node.date) return formatDayLabel(node.date, locale);
    return rowLabel(node.kind);
  };

  const metricDisplay = (node: HarvestFlowNode) => {
    const unit =
      node.meta.metricUnit === 'sacks'
        ? t('harvestCampaign.sacks.unit')
        : node.meta.metricUnit || '';
    return { value: node.meta.metric, unit };
  };

  const metaRows = (node: HarvestFlowNode): string[] => {
    const rows: string[] = [];
    const names = (node.meta.fieldNames || []).map(friendlyFieldLabel);
    const yieldLine =
      node.yieldPct != null
        ? t('harvestCampaign.flow.yieldBadge', {
            yield: formatHarvestYieldPercent(node.yieldPct, locale),
          })
        : null;

    if (node.kind === 'field') {
      if (yieldLine) rows.push(yieldLine);
      if (node.meta.fromSummary)
        rows.push(t('harvestCampaign.flow.daysCount', { count: Number(node.meta.fromSummary) }));
      if (node.meta.oliveKg && node.meta.oliveKg > 0)
        rows.push(
          t('harvestCampaign.flow.oliveLine', {
            kg: formatGroveMassKg(node.meta.oliveKg, locale),
          })
        );
      if (node.meta.oilKg && node.meta.oilKg > 0)
        rows.push(
          t('harvestCampaign.flow.oilLine', {
            kg: formatGroveMassKg(node.meta.oilKg, locale),
          })
        );
      if (node.meta.openSacks && node.meta.openSacks > 0)
        rows.push(
          t('harvestCampaign.flow.openSacksLine', { count: node.meta.openSacks })
        );
    }
    if (node.kind === 'harvest') {
      if (names.length) rows.push(names.join(' · '));
      if (node.meta.oliveKg && node.meta.openSacks && node.meta.openSacks > 0)
        rows.push(
          t('harvestCampaign.flow.approxOlives', {
            kg: formatGroveMassKg(node.meta.oliveKg, locale),
          })
        );
      if (node.meta.openSacks != null && node.meta.sackCount != null) {
        const weighed = node.meta.sackCount - node.meta.openSacks;
        if (weighed > 0 && node.meta.openSacks > 0) {
          rows.push(
            t('harvestCampaign.flow.weighedSplit', {
              weighed,
              open: node.meta.openSacks,
            })
          );
        }
      }
      if (node.meta.toSummary && node.meta.toSummary !== 'ok') {
        const millKg = Number(node.meta.toSummary);
        rows.push(
          t('harvestCampaign.flow.intoMill', {
            kg: Number.isFinite(millKg)
              ? formatGroveMassKg(millKg, locale)
              : node.meta.toSummary.replace(/\s*kg\s*$/i, ''),
          })
        );
      }
    }
    if (node.kind === 'mill') {
      if (yieldLine) rows.push(yieldLine);
      if (names.length) rows.push(names.join(' · '));
      if (node.meta.sackCount && node.meta.sackCount > 0)
        rows.push(
          t('harvestCampaign.flow.fromSacks', { count: node.meta.sackCount })
        );
      if (node.meta.toSummary && /^\d+$/.test(node.meta.toSummary))
        rows.push(
          t('harvestCampaign.flow.daysCount', { count: Number(node.meta.toSummary) })
        );
      if (node.meta.oilKg && node.meta.oilKg > 0)
        rows.push(
          t('harvestCampaign.flow.oilLine', {
            kg: formatGroveMassKg(node.meta.oilKg, locale),
          })
        );
    }
    if (node.kind === 'oil') {
      if (yieldLine) rows.push(yieldLine);
      if (node.meta.oliveKg && node.meta.oliveKg > 0)
        rows.push(
          t('harvestCampaign.flow.fromOlives', {
            kg: formatGroveMassKg(node.meta.oliveKg, locale),
          })
        );
      if (names.length) rows.push(names.join(' · '));
    }
    return rows.slice(0, 3);
  };

  const neighbors = (node: HarvestFlowNode) => {
    const upstream = graph.links
      .filter((l) => l.toId === node.id)
      .map((l) => graph.nodes.find((n) => n.id === l.fromId))
      .filter((n): n is HarvestFlowNode => Boolean(n));
    const downstream = graph.links
      .filter((l) => l.fromId === node.id)
      .map((l) => graph.nodes.find((n) => n.id === l.toId))
      .filter((n): n is HarvestFlowNode => Boolean(n));
    return { upstream, downstream };
  };

  const renderNode = (node: HarvestFlowNode) => {
    const active = !selectedId || highlight.has(node.id);
    const isSelected = selectedId === node.id;
    const metric = metricDisplay(node);
    const rows = metaRows(node);
    const chips = node.meta.chips.filter(
      (c) => c !== 'ok' && !(c === 'yield' && node.yieldPct != null)
    );
    const accent =
      node.fieldIds.length === 1 ? fieldColors[node.fieldIds[0]] : undefined;

    return (
      <div
        key={node.id}
        className={`hc-gene-node hc-gene-node-${node.kind}${isSelected ? ' is-selected' : ''}${
          active ? '' : ' is-dim'
        }${node.pending ? ' is-pending' : ''}${node.kind === 'oil' ? ' is-hero' : ''}`}
      >
        <button
          type="button"
          className={`hc-gene-card${accent ? ' has-accent' : ''}`}
          ref={cardRef(node.id)}
          style={
            accent
              ? ({
                  ['--hc-gene-accent' as string]: accent,
                } as React.CSSProperties)
              : undefined
          }
          onClick={() => setSelectedId((prev) => (prev === node.id ? null : node.id))}
        >
          <span className="hc-gene-card-kicker">{rowLabel(node.kind)}</span>
          <span className="hc-gene-card-title">{cardTitle(node)}</span>
          <span className="hc-gene-card-metric">
            <em>{metric.value}</em>
            {metric.unit ? <small>{metric.unit}</small> : null}
          </span>
          {rows.map((row) => (
            <span key={row} className="hc-gene-card-line">
              {row}
            </span>
          ))}
          {chips.length > 0 ? (
            <span className="hc-gene-card-chips">
              {chips.map((chip) => (
                <i
                  key={chip}
                  className={`hc-gene-chip hc-gene-chip-${chip}`}
                >
                  {chipLabel(chip)}
                </i>
              ))}
            </span>
          ) : null}
        </button>
        {node.pending === 'needsMill' && onOpenMill && node.entryIds?.length ? (
          <button
            type="button"
            className="hc-gene-node-cta"
            onClick={() => onOpenMill(node.entryIds!)}
          >
            {t('harvestCampaign.chain.ctaMill')}
          </button>
        ) : null}
        {node.pending === 'needsOil' && onOpenOil && node.entryIds?.length ? (
          <button
            type="button"
            className="hc-gene-node-cta"
            onClick={() => onOpenOil(node.entryIds!)}
          >
            {t('harvestCampaign.chain.ctaOil')}
          </button>
        ) : null}
      </div>
    );
  };

  const empty =
    campaign.sacks.length === 0 &&
    campaign.millWeights.length === 0 &&
    campaign.oils.length === 0;

  const selectedSummary =
    selectedFieldId != null
      ? summaries.find((s) => s.fieldId === selectedFieldId)
      : null;

  const selectedNeighbors = selectedNode ? neighbors(selectedNode) : null;

  return (
    <section className="hc-gene" aria-label={t('harvestCampaign.flow.title')}>
      <header className="hc-gene-header">
        <p className="hc-kicker">{t('harvestCampaign.nav.fields')}</p>
        <h1 className="hc-page-title">{t('harvestCampaign.flow.title')}</h1>
        <p className="hc-help">{t('harvestCampaign.flow.lead')}</p>
      </header>

      {pathStory ? (
        <p className="hc-gene-path" role="status">
          {pathStory}
        </p>
      ) : !empty ? (
        <p className="hc-gene-hint">{t('harvestCampaign.flow.tapHint')}</p>
      ) : null}

      {empty ? (
        <>
          <p className="hc-help">{t('harvestCampaign.flow.empty')}</p>
          <p className="hc-help">{t('harvestCampaign.flow.emptyHint')}</p>
          {summaries.some((row) => row.sacks > 0 || row.officialKg > 0 || row.oilKg > 0) ? (
            <div className="hc-field-summary-table" role="table" aria-label={t('harvestCampaign.nav.fields')}>
              <div className="hc-field-summary-row hc-field-summary-head" role="row">
                <span role="columnheader">{t('harvestCampaign.nav.fields')}</span>
                <span role="columnheader">{t('harvestCampaign.actions.sacks')}</span>
                <span role="columnheader">{t('harvestCampaign.actions.mill')}</span>
                <span role="columnheader">{t('harvestCampaign.actions.oil')}</span>
              </div>
              {summaries.map((row) => (
                <div key={row.fieldId} className="hc-field-summary-row" role="row">
                  <span role="cell">
                    {friendlyFieldLabel(fields.find((f) => f.id === row.fieldId)?.name || row.fieldId)}
                  </span>
                  <span role="cell">{row.sacks || '—'}</span>
                  <span role="cell">
                    {row.officialKg > 0 ? `${formatGroveMassKg(row.officialKg, locale)} kg` : '—'}
                  </span>
                  <span role="cell">
                    {row.oilKg > 0 ? `${formatGroveMassKg(row.oilKg, locale)} kg` : '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : summaries.length > 0 ? (
            <ul className="hc-field-participant-list">
              {summaries.map((row) => (
                <li key={row.fieldId}>
                  {friendlyFieldLabel(fields.find((f) => f.id === row.fieldId)?.name || row.fieldId)}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <div className="hc-gene-stack" ref={bindStack}>
          <HarvestGenealogyConnectors
            container={stackEl}
            cardElsRef={cardElsRef}
            nodeIds={graph.nodes.map((n) => n.id)}
            links={graph.links}
            highlight={highlight}
            selectedId={selectedId}
            fieldColors={fieldColors}
          />
          {KIND_ORDER.map((kind) => {
            const nodes = graph.byKind[kind];
            if (nodes.length === 0) return null;
            return (
              <div key={kind} className={`hc-gene-layer hc-gene-layer-${kind}`}>
                <p className="hc-gene-layer-label">{rowLabel(kind)}</p>
                <div className="hc-gene-nodes">{nodes.map(renderNode)}</div>
              </div>
            );
          })}
        </div>
      )}

      {selectedNode ? (
        <div className="hc-gene-detail">
          <div className="hc-gene-detail-head">
            <div>
              <p className="hc-gene-detail-kicker">{rowLabel(selectedNode.kind)}</p>
              <strong>{cardTitle(selectedNode)}</strong>
              {pathStory ? <p className="hc-gene-detail-path">{pathStory}</p> : null}
            </div>
            {selectedSummary ? (
              <button
                type="button"
                className="hc-ghost"
                onClick={() => onMarkDone(selectedSummary.fieldId)}
              >
                {selectedSummary.status === 'done'
                  ? t('harvestCampaign.reopenGrove')
                  : t('harvestCampaign.groveDone')}
              </button>
            ) : null}
          </div>
          {selectedNeighbors &&
          (selectedNeighbors.upstream.length > 0 || selectedNeighbors.downstream.length > 0) ? (
            <div className="hc-gene-detail-cols">
              {selectedNeighbors.upstream.length > 0 ? (
                <div>
                  <p className="hc-gene-detail-label">{t('harvestCampaign.flow.from')}</p>
                  <ul>
                    {selectedNeighbors.upstream.map((n) => (
                      <li key={n.id}>
                        <button type="button" onClick={() => setSelectedId(n.id)}>
                          {cardTitle(n)}
                          <span>
                            {metricDisplay(n).value}
                            {metricDisplay(n).unit ? ` ${metricDisplay(n).unit}` : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selectedNeighbors.downstream.length > 0 ? (
                <div>
                  <p className="hc-gene-detail-label">{t('harvestCampaign.flow.into')}</p>
                  <ul>
                    {selectedNeighbors.downstream.map((n) => (
                      <li key={n.id}>
                        <button type="button" onClick={() => setSelectedId(n.id)}>
                          {cardTitle(n)}
                          <span>
                            {metricDisplay(n).value}
                            {metricDisplay(n).unit ? ` ${metricDisplay(n).unit}` : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
