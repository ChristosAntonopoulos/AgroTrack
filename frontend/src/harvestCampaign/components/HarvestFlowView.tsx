import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import {
  buildHarvestFlowGraph,
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
    const bits: string[] = [];
    if (selectedNode.kind === 'field') {
      bits.push(friendlyFieldLabel(selectedNode.label));
      if (selectedNode.meta.sackCount) {
        bits.push(
          t('harvestCampaign.flow.sackCount', { count: selectedNode.meta.sackCount })
        );
      }
      return bits.length > 1 ? bits.join(' · ') : null;
    }
    const related = graph.nodes.filter((n) => highlight.has(n.id));
    const fieldNames = related
      .filter((n) => n.kind === 'field')
      .map((n) => friendlyFieldLabel(n.label));
    if (fieldNames.length) bits.push(fieldNames.join(' · '));
    if (selectedNode.kind === 'harvest' && selectedNode.meta.sackCount) {
      bits.push(t('harvestCampaign.flow.sackCount', { count: selectedNode.meta.sackCount }));
    }
    if (selectedNode.kind === 'mill' && selectedNode.meta.oliveKg) {
      bits.push(
        t('harvestCampaign.flow.fruitLine', {
          kg: formatGroveMassKg(selectedNode.meta.oliveKg, locale),
        })
      );
    }
    if (selectedNode.kind === 'oil' && selectedNode.meta.oilKg) {
      bits.push(
        t('harvestCampaign.flow.oilLine', {
          kg: formatGroveMassKg(selectedNode.meta.oilKg, locale),
        })
      );
      if (selectedNode.yieldPct != null) {
        bits.push(
          t('harvestCampaign.flow.yieldBadge', {
            yield: formatHarvestYieldPercent(selectedNode.yieldPct, locale),
          })
        );
      }
    }
    return bits.length > 1 ? bits.join(' · ') : null;
  }, [selectedNode, highlight, graph.nodes, t, locale]);

  const rowLabel = (kind: HarvestFlowNodeKind) => {
    switch (kind) {
      case 'field':
        return t('harvestCampaign.flow.fields');
      case 'harvest':
        return t('harvestCampaign.flow.sacks');
      case 'mill':
        return t('harvestCampaign.flow.fruit');
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
    if (node.meta.metric === '—') return { value: '—', unit: '' };
    if (node.kind === 'field' || node.kind === 'harvest') {
      return { value: node.meta.metric, unit: t('harvestCampaign.flow.unitSacks') };
    }
    if (node.kind === 'mill') {
      return { value: node.meta.metric, unit: t('harvestCampaign.flow.unitFruit') };
    }
    return {
      value: node.meta.metric,
      unit:
        node.meta.metricUnit === 'L'
          ? t('harvestCampaign.flow.unitOilLitres')
          : t('harvestCampaign.flow.unitOil'),
    };
  };

  const metaRows = (node: HarvestFlowNode): string[] => {
    const rows: string[] = [];
    const names = (node.meta.fieldNames || []).map(friendlyFieldLabel);

    if (node.kind === 'field') {
      const days = Number(node.meta.fromSummary);
      if (Number.isFinite(days) && days > 0) {
        rows.push(t('harvestCampaign.flow.daysCount', { count: days }));
      }
    }
    if (node.kind === 'harvest') {
      if (names.length) rows.push(names.join(' · '));
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
    }
    if (node.kind === 'mill') {
      if (names.length) rows.push(names.join(' · '));
      if (node.meta.sackCount && node.meta.sackCount > 0) {
        rows.push(t('harvestCampaign.flow.fromSacks', { count: node.meta.sackCount }));
      }
    }
    if (node.kind === 'oil') {
      if (names.length) rows.push(names.join(' · '));
      if (node.meta.oliveKg && node.meta.oliveKg > 0) {
        rows.push(
          t('harvestCampaign.flow.fromOlives', {
            kg: formatGroveMassKg(node.meta.oliveKg, locale),
          })
        );
      }
      if (node.yieldPct != null) {
        rows.push(
          t('harvestCampaign.flow.yieldBadge', {
            yield: formatHarvestYieldPercent(node.yieldPct, locale),
          })
        );
      }
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
    const chips = node.meta.chips.filter((c) => {
      if (c === 'ok' || c === 'yield') return false;
      if (c === 'shared' && node.kind === 'field') return false;
      return true;
    });
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
        <p className="hc-kicker">{t('harvestCampaign.flow.steps')}</p>
        <h1 className="hc-page-title">{t('harvestCampaign.flow.title')}</h1>
        <p className="hc-help">{t('harvestCampaign.flow.lead')}</p>
      </header>

      {pathStory ? (
        <p className="hc-gene-path" role="status">
          {pathStory}
        </p>
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
