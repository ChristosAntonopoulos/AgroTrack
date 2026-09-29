import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Droplets, Package, Trees } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { localeTagFor } from '../../utils/localeFormatters';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import {
  buildHarvestFlowGraph,
  relatedGenealogyIds,
  type HarvestFlowNode,
  type HarvestFlowNodeKind,
} from '../flowGraph';
import { convertOliveOilKgToLitres, formatHarvestYieldPercent } from '../utils/harvestCalculations';
import { farmerOilLitres } from '../oilSaleLots';
import { fieldSummaries } from '../totals';
import { HarvestStatStrip } from './HarvestStatStrip';
import type { HarvestCampaign } from '../types';
import { HarvestGenealogyConnectors } from './HarvestGenealogyConnectors';

type Props = {
  campaign: HarvestCampaign;
  fields: Field[];
  locale: string;
  fieldFilterId?: string | null;
  onFieldFilter?: (fieldId: string | null) => void;
  onMarkDone: (fieldId: string) => void;
  onOpenMill?: (sackIds: string[]) => void;
  onOpenOil?: (millIds: string[]) => void;
};

const KIND_ORDER: HarvestFlowNodeKind[] = ['field', 'harvest', 'mill', 'oil'];

/** Whole litres. Greek groups thousands with a dot, so 86.245 L would read as 86 thousand. */
const formatFlowLitres = (kg: number, locale: string): string | null => {
  const litres = convertOliveOilKgToLitres(kg);
  if (!(litres > 0)) return null;
  return new Intl.NumberFormat(localeTagFor(locale), { maximumFractionDigits: 0 }).format(
    Math.round(litres)
  );
};

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
  fieldFilterId = null,
  onFieldFilter,
  onMarkDone,
  onOpenMill,
  onOpenOil,
}) => {
  const { t } = useTranslation('fields');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stackEl, setStackEl] = useState<HTMLDivElement | null>(null);
  const [showMore, setShowMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
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

  const unitKg = t('harvestCampaign.flow.unitKg');
  const unitLitres = t('harvestCampaign.flow.unitLitres');

  const pathStory = useMemo(() => {
    if (!selectedNode) return null;
    const bits: string[] = [];
    if (selectedNode.kind === 'field' || selectedNode.kind === 'harvest') {
      if (selectedNode.meta.sackCount) {
        bits.push(t('harvestCampaign.flow.sackCount', { count: selectedNode.meta.sackCount }));
      }
    }
    if (selectedNode.kind === 'mill' && selectedNode.meta.oliveKg) {
      bits.push(
        t('harvestCampaign.flow.fruitLine', {
          kg: formatGroveMassKg(selectedNode.meta.oliveKg, locale),
        })
      );
    }
    if (selectedNode.kind === 'oil' && selectedNode.meta.oilKg) {
      const litres = formatFlowLitres(selectedNode.meta.oilKg, locale);
      if (litres) bits.push(`${litres} ${unitLitres}`);
      if (selectedNode.yieldPct != null) {
        bits.push(
          t('harvestCampaign.flow.yieldBadge', {
            yield: formatHarvestYieldPercent(selectedNode.yieldPct, locale),
          })
        );
      }
    }
    return bits.length > 0 ? bits.join(' · ') : null;
  }, [selectedNode, t, locale, unitLitres]);

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
      const count = node.meta.sackCount;
      const value =
        count != null && count > 0
          ? new Intl.NumberFormat(localeTagFor(locale), { maximumFractionDigits: 0 }).format(count)
          : node.meta.metric;
      return { value, unit: t('harvestCampaign.flow.unitSacks') };
    }
    if (node.kind === 'mill') {
      const kg = node.meta.oliveKg;
      return {
        value: kg && kg > 0 ? formatGroveMassKg(kg, locale) : node.meta.metric,
        unit: unitKg,
      };
    }
    const litres = formatFlowLitres(node.meta.oilKg || 0, locale);
    if (!litres) return { value: '—', unit: unitLitres };
    return { value: litres, unit: unitLitres };
  };

  const detailLine = (node: HarvestFlowNode): string | null => {
    const parts: string[] = [];
    if (node.kind === 'field') {
      if (node.meta.oliveKg && node.meta.oliveKg > 0) {
        parts.push(`${formatGroveMassKg(node.meta.oliveKg, locale)} ${unitKg}`);
      }
      const litres = formatFlowLitres(node.meta.oilKg || 0, locale);
      if (litres) parts.push(`${litres} ${unitLitres}`);
      const days = Number(node.meta.fromSummary);
      if (Number.isFinite(days) && days > 0) {
        parts.push(t('harvestCampaign.flow.daysCount', { count: days }));
      }
    } else if (node.kind === 'mill' && node.meta.sackCount && node.meta.sackCount > 0) {
      parts.push(t('harvestCampaign.flow.fromSacks', { count: node.meta.sackCount }));
    } else if (node.kind === 'oil' && node.yieldPct != null) {
      parts.push(
        t('harvestCampaign.flow.yieldBadge', {
          yield: formatHarvestYieldPercent(node.yieldPct, locale),
        })
      );
    } else if (
      node.kind === 'harvest' &&
      node.meta.openSacks != null &&
      node.meta.sackCount != null
    ) {
      const weighed = node.meta.sackCount - node.meta.openSacks;
      if (weighed > 0 && node.meta.openSacks > 0) {
        parts.push(
          t('harvestCampaign.flow.weighedSplit', {
            weighed,
            open: node.meta.openSacks,
          })
        );
      }
    }
    return parts.length > 0 ? parts.join(' · ') : null;
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
    const fact = detailLine(node);
    const chips = node.meta.chips.filter(
      (c) => c === 'needsMill' || c === 'needsOil' || (c === 'shared' && node.kind !== 'field')
    );
    const accent =
      node.fieldIds.length === 1 ? fieldColors[node.fieldIds[0]] : undefined;

    return (
      <div
        key={node.id}
        className={`hc-gene-node hc-gene-node-${node.kind}${isSelected ? ' is-selected' : ''}${
          active ? '' : ' is-dim'
        }${node.pending ? ' is-pending' : ''}`}
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
          {fact ? <span className="hc-gene-card-line">{fact}</span> : null}
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
        {isSelected && node.pending === 'needsMill' && onOpenMill && node.entryIds?.length ? (
          <button
            type="button"
            className="hc-gene-node-cta"
            onClick={() => onOpenMill(node.entryIds!)}
          >
            {t('harvestCampaign.chain.ctaMill')}
          </button>
        ) : null}
        {isSelected && node.pending === 'needsOil' && onOpenOil && node.entryIds?.length ? (
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
  const sackTotal = campaign.sacks.reduce((sum, row) => sum + (Number(row.sacks) || 0), 0);
  const harvestDays = new Set(
    [
      ...campaign.sacks.map((row) => row.date),
      ...campaign.millWeights.map((row) => row.date),
      ...campaign.oils.map((row) => row.date),
    ].filter(Boolean)
  ).size;
  const oilLitres = Math.round(campaign.oils.reduce((sum, row) => sum + farmerOilLitres(row), 0));
  const countLabel = (value: number) =>
    new Intl.NumberFormat(localeTagFor(locale), { maximumFractionDigits: 0 }).format(value);
  const summary = [
    {
      id: 'fields',
      icon: Trees,
      value: countLabel(fieldOrder.length),
      label: t('harvestCampaign.flow.fields'),
    },
    {
      id: 'sacks',
      icon: Package,
      value: countLabel(sackTotal),
      label: t('harvestCampaign.flow.sacks'),
    },
    {
      id: 'days',
      icon: CalendarDays,
      value: countLabel(harvestDays),
      label: t('harvestCampaign.flow.days'),
    },
    {
      id: 'oil',
      icon: Droplets,
      value: countLabel(oilLitres),
      label: t('harvestCampaign.flow.unitOilLitres'),
    },
  ];

  const selectedSummary =
    selectedFieldId != null
      ? summaries.find((s) => s.fieldId === selectedFieldId)
      : null;

  const selectedNeighbors = selectedNode ? neighbors(selectedNode) : null;
  const visibleIds = new Set(
    graph.nodes
      .filter((node) => !fieldFilterId || node.fieldIds.includes(fieldFilterId))
      .map((node) => node.id)
  );

  const updateScrollHint = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setShowMore(false);
      return;
    }
    const more = el.scrollHeight > el.clientHeight + 12;
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
    setShowMore(more && !atEnd);
  }, []);

  useEffect(() => {
    updateScrollHint();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateScrollHint());
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [updateScrollHint, fieldFilterId, graph.nodes.length]);

  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    const card = cardElsRef.current.get(selectedId);
    const scroller = scrollRef.current;
    if (!card) return;
    const cardTop =
      card.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    const cardBottom = cardTop + card.offsetHeight;
    const viewTop = scroller.scrollTop;
    const viewBottom = viewTop + scroller.clientHeight;
    if (cardTop < viewTop + 8) {
      scroller.scrollTo({ top: Math.max(0, cardTop - 16), behavior: 'smooth' });
    } else if (cardBottom > viewBottom - 8) {
      scroller.scrollTo({
        top: cardBottom - scroller.clientHeight + 16,
        behavior: 'smooth',
      });
    }
  }, [selectedId]);

  return (
    <section className="hc-gene" aria-label={t('harvestCampaign.flow.title')}>
      <header className="hc-gene-header">
        <h1 className="hc-page-title">{t('harvestCampaign.flow.title')}</h1>
      </header>

      {fieldOrder.length > 0 ? (
        <div className="hc-field-filter" role="group" aria-label={t('harvestCampaign.flow.fieldFilter')}>
          <button
            type="button"
            className={!fieldFilterId ? 'is-on' : ''}
            onClick={() => onFieldFilter?.(null)}
          >
            {t('harvestCampaign.flow.allFields')}
          </button>
          {fieldOrder.map((id) => {
            const color = fieldColors[id];
            return (
              <button
                key={id}
                type="button"
                className={fieldFilterId === id ? 'is-on' : ''}
                style={
                  color
                    ? ({ ['--hc-chip-color' as string]: color } as React.CSSProperties)
                    : undefined
                }
                onClick={() => onFieldFilter?.(id)}
              >
                <i className="hc-field-filter-dot" aria-hidden />
                {friendlyFieldLabel(fields.find((field) => field.id === id)?.name || id)}
              </button>
            );
          })}
        </div>
      ) : null}

      {!empty ? (
        <HarvestStatStrip items={summary} label={t('harvestCampaign.nav.fields')} />
      ) : null}

      {!empty && pathStory ? (
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
                    {row.officialKg > 0 ? `${formatGroveMassKg(row.officialKg, locale)} ${unitKg}` : '—'}
                  </span>
                  <span role="cell">
                    {formatFlowLitres(row.oilKg, locale)
                      ? `${formatFlowLitres(row.oilKg, locale)} ${unitLitres}`
                      : '—'}
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
        <div className="hc-gene-scroll-wrap">
        <div
          className={`hc-gene-scroll${showMore ? ' is-more' : ''}`}
          ref={scrollRef}
          onScroll={updateScrollHint}
        >
        <div className="hc-gene-canvas">
        <div className="hc-gene-stack" ref={bindStack}>
          <HarvestGenealogyConnectors
            container={stackEl}
            cardElsRef={cardElsRef}
            nodeIds={[...visibleIds]}
            links={graph.links.filter(
              (link) => visibleIds.has(link.fromId) && visibleIds.has(link.toId)
            )}
            highlight={highlight}
            selectedId={selectedId}
            fieldColors={fieldColors}
          />
          {KIND_ORDER.map((kind) => {
            const nodes = graph.byKind[kind].filter((node) => visibleIds.has(node.id));
            if (nodes.length === 0) return null;
            return (
              <div key={kind} className={`hc-gene-layer hc-gene-layer-${kind}`}>
                <p className="hc-gene-layer-label">
                  {rowLabel(kind)} · {nodes.length}
                </p>
                <div className="hc-gene-nodes">{nodes.map(renderNode)}</div>
              </div>
            );
          })}
        </div>
        </div>
        </div>
        {showMore ? (
          <p className="hc-gene-scroll-more">{t('harvestCampaign.flow.scrollMore')}</p>
        ) : null}
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
            {selectedNode.kind === 'field' && selectedSummary ? (
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
