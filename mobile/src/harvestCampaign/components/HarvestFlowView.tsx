import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import { formatKg } from '../../utils/harvestUtils';
import { radii, spacing } from '../../theme';
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
import {
  HarvestGenealogyConnectors,
  type CardAnchorBox,
} from './HarvestGenealogyConnectors';

type Props = {
  campaign: HarvestCampaign;
  fields: Field[];
  onMarkDone: (fieldId: string) => void;
  onOpenMill?: (sackIds: string[]) => void;
  onOpenOil?: (millIds: string[]) => void;
};

const KIND_ORDER: HarvestFlowNodeKind[] = ['field', 'harvest', 'mill', 'oil'];

const formatDayLabel = (date: string, locale: string) => {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return date;
  }
};

export const HarvestFlowView: React.FC<Props> = ({
  campaign,
  fields,
  onMarkDone,
  onOpenMill,
  onOpenOil,
}) => {
  const { t, i18n } = useTranslation('fields');
  const locale = i18n.language || 'en';
  const { colors, tapMin } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stackRef = useRef<View>(null);
  const cardRefs = useRef(new Map<string, View | null>());
  const [stackSize, setStackSize] = useState({ w: 0, h: 0 });
  const [cardBoxes, setCardBoxes] = useState<Map<string, CardAnchorBox>>(() => new Map());
  const measureGen = useRef(0);

  const fieldOrder =
    campaign.fieldOrder.length > 0 ? campaign.fieldOrder : fields.map((f) => f.id);

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

  const remeasure = useCallback(() => {
    const gen = ++measureGen.current;
    const stack = stackRef.current;
    if (!stack) return;
    stack.measureInWindow((sx, sy, sw, sh) => {
      if (gen !== measureGen.current) return;
      setStackSize((prev) =>
        prev.w === Math.ceil(sw) && prev.h === Math.ceil(sh)
          ? prev
          : { w: Math.ceil(sw), h: Math.ceil(sh) }
      );
      const next = new Map<string, CardAnchorBox>();
      let pending = 0;
      const ids = [...cardRefs.current.keys()];
      if (ids.length === 0) {
        setCardBoxes(next);
        return;
      }
      ids.forEach((id) => {
        const node = cardRefs.current.get(id);
        if (!node) return;
        pending += 1;
        node.measureInWindow((cx, cy, cw, ch) => {
          if (gen !== measureGen.current) return;
          next.set(id, {
            x: cx - sx,
            y: cy - sy,
            width: cw,
            height: ch,
          });
          pending -= 1;
          if (pending === 0) setCardBoxes(new Map(next));
        });
      });
    });
  }, []);

  const onStackLayout = (_e: LayoutChangeEvent) => {
    requestAnimationFrame(remeasure);
  };

  const bindCard = (id: string) => (ref: View | null) => {
    if (ref) cardRefs.current.set(id, ref);
    else cardRefs.current.delete(id);
  };

  const pathStory = useMemo(() => {
    if (!selectedNode) return null;
    if (selectedNode.kind === 'field' && selectedFieldId) {
      const cap = fieldAllocationCaption(campaign, selectedFieldId);
      const bits = [friendlyFieldLabel(selectedNode.label)];
      if (selectedNode.meta.sackCount)
        bits.push(`${selectedNode.meta.sackCount} ${t('harvestCampaign.sacks.unit')}`);
      if (cap.millKg > 0) bits.push(`${formatKg(cap.millKg)} kg`);
      if (cap.oilKg > 0) bits.push(`${formatKg(cap.oilKg)} kg`);
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
      bits.push(`${formatKg(selectedNode.meta.oliveKg)} kg`);
    }
    if (selectedNode.meta.oilKg && selectedNode.kind === 'oil') {
      bits.push(
        `${formatKg(selectedNode.meta.oilKg)} kg${
          selectedNode.yieldPct != null
            ? ` · ${formatHarvestYieldPercent(selectedNode.yieldPct, locale)}%`
            : ''
        }`
      );
    } else if (selectedNode.kind === 'mill') {
      const oils = related.filter((n) => n.kind === 'oil');
      if (oils.length === 1 && oils[0].meta.oilKg) {
        bits.push(`${formatKg(oils[0].meta.oilKg)} kg`);
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
        rows.push(t('harvestCampaign.flow.oliveLine', { kg: formatKg(node.meta.oliveKg) }));
      if (node.meta.oilKg && node.meta.oilKg > 0)
        rows.push(t('harvestCampaign.flow.oilLine', { kg: formatKg(node.meta.oilKg) }));
      if (node.meta.openSacks && node.meta.openSacks > 0)
        rows.push(t('harvestCampaign.flow.openSacksLine', { count: node.meta.openSacks }));
    }
    if (node.kind === 'harvest') {
      if (names.length) rows.push(names.join(' · '));
      if (node.meta.oliveKg && node.meta.openSacks && node.meta.openSacks > 0)
        rows.push(t('harvestCampaign.flow.approxOlives', { kg: formatKg(node.meta.oliveKg) }));
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
              ? formatKg(millKg)
              : node.meta.toSummary.replace(/\s*kg\s*$/i, ''),
          })
        );
      }
    }
    if (node.kind === 'mill') {
      if (yieldLine) rows.push(yieldLine);
      if (names.length) rows.push(names.join(' · '));
      if (node.meta.sackCount && node.meta.sackCount > 0)
        rows.push(t('harvestCampaign.flow.fromSacks', { count: node.meta.sackCount }));
      if (node.meta.toSummary && /^\d+$/.test(node.meta.toSummary))
        rows.push(t('harvestCampaign.flow.daysCount', { count: Number(node.meta.toSummary) }));
      if (node.meta.oilKg && node.meta.oilKg > 0)
        rows.push(t('harvestCampaign.flow.oilLine', { kg: formatKg(node.meta.oilKg) }));
    }
    if (node.kind === 'oil') {
      if (yieldLine) rows.push(yieldLine);
      if (node.meta.oliveKg && node.meta.oliveKg > 0)
        rows.push(t('harvestCampaign.flow.fromOlives', { kg: formatKg(node.meta.oliveKg) }));
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
      <View
        key={node.id}
        style={[styles.nodeWrap, { opacity: active ? 1 : 0.2 }]}
      >
        <View
          ref={bindCard(node.id)}
          onLayout={() => requestAnimationFrame(remeasure)}
          collapsable={false}
        >
          <Pressable
            onPress={() => {
              setSelectedId((prev) => (prev === node.id ? null : node.id));
              requestAnimationFrame(remeasure);
            }}
            style={[
              styles.card,
              {
                minHeight: Math.max(128, tapMin + 44),
                backgroundColor:
                  isSelected || node.kind === 'oil'
                    ? colors.eventHarvestSoft
                    : colors.surface,
                borderLeftWidth: accent ? 3 : 0,
                borderLeftColor: accent || 'transparent',
              },
              isSelected && accent
                ? { borderColor: accent, borderWidth: 2, borderLeftWidth: 3 }
                : null,
            ]}
          >
            <Text style={[styles.kicker, { color: colors.textTertiary }]}>
              {rowLabel(node.kind)}
            </Text>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {cardTitle(node)}
            </Text>
            <View style={styles.metricRow}>
              <Text
                style={[
                  styles.metric,
                  { color: colors.textPrimary, fontSize: node.kind === 'oil' ? 30 : 26 },
                ]}
              >
                {metric.value}
              </Text>
              {metric.unit ? (
                <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
                  {metric.unit}
                </Text>
              ) : null}
            </View>
            {rows.map((row) => (
              <Text key={row} style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 16 }}>
                {row}
              </Text>
            ))}
            {chips.length > 0 ? (
              <View style={styles.chipRow}>
                {chips.map((chip) => (
                  <View
                    key={chip}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          chip === 'needsMill' || chip === 'needsOil'
                            ? 'rgba(200,146,78,0.22)'
                            : colors.eventHarvestSoft,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          chip === 'needsMill' || chip === 'needsOil'
                            ? '#C8924E'
                            : colors.primary,
                        fontSize: 11,
                        fontWeight: '700',
                      }}
                    >
                      {chipLabel(chip)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Pressable>
        </View>
        {node.pending === 'needsMill' && onOpenMill && node.entryIds?.length ? (
          <Pressable
            onPress={() => onOpenMill(node.entryIds!)}
            style={[styles.cta, { backgroundColor: colors.eventHarvestSoft }]}
          >
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
              {t('harvestCampaign.chain.ctaMill')}
            </Text>
          </Pressable>
        ) : null}
        {node.pending === 'needsOil' && onOpenOil && node.entryIds?.length ? (
          <Pressable
            onPress={() => onOpenOil(node.entryIds!)}
            style={[styles.cta, { backgroundColor: colors.eventHarvestSoft }]}
          >
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
              {t('harvestCampaign.chain.ctaOil')}
            </Text>
          </Pressable>
        ) : null}
      </View>
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
    <View style={styles.wrap}>
      <Text style={[styles.sectionKicker, { color: colors.textTertiary }]}>
        {t('harvestCampaign.nav.fields')}
      </Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('harvestCampaign.flow.title')}
      </Text>
      <Text style={{ color: colors.textSecondary }}>{t('harvestCampaign.flow.lead')}</Text>

      {pathStory ? (
        <View style={[styles.path, { backgroundColor: colors.eventHarvestSoft }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', lineHeight: 20 }}>
            {pathStory}
          </Text>
        </View>
      ) : (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {t('harvestCampaign.flow.tapHint')}
        </Text>
      )}

      {empty ? (
        <Text style={{ color: colors.textSecondary }}>{t('harvestCampaign.flow.empty')}</Text>
      ) : (
        <View
          ref={stackRef}
          style={styles.stack}
          onLayout={onStackLayout}
          collapsable={false}
        >
          <HarvestGenealogyConnectors
            width={stackSize.w}
            height={stackSize.h}
            cardBoxes={cardBoxes}
            links={graph.links}
            highlight={highlight}
            selectedId={selectedId}
            fieldColors={fieldColors}
          />
          {KIND_ORDER.map((kind) => {
            const nodes = graph.byKind[kind];
            if (nodes.length === 0) return null;
            return (
              <View key={kind} style={styles.layer}>
                <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>
                  {rowLabel(kind)}
                </Text>
                <View style={styles.nodes}>{nodes.map(renderNode)}</View>
              </View>
            );
          })}
        </View>
      )}

      {selectedNode ? (
        <View style={[styles.detail, { backgroundColor: colors.surface }]}>
          <View style={styles.detailHead}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: colors.textTertiary }]}>
                {rowLabel(selectedNode.kind)}
              </Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 17 }}>
                {cardTitle(selectedNode)}
              </Text>
              {pathStory ? (
                <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{pathStory}</Text>
              ) : null}
            </View>
            {selectedSummary ? (
              <Pressable
                onPress={() => onMarkDone(selectedSummary.fieldId)}
                style={{ minHeight: tapMin, justifyContent: 'center' }}
              >
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {selectedSummary.status === 'done'
                    ? t('harvestCampaign.reopenGrove')
                    : t('harvestCampaign.groveDone')}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {selectedNeighbors &&
          (selectedNeighbors.upstream.length > 0 || selectedNeighbors.downstream.length > 0) ? (
            <View style={styles.detailCols}>
              {selectedNeighbors.upstream.length > 0 ? (
                <View style={styles.detailCol}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                    {t('harvestCampaign.flow.from')}
                  </Text>
                  {selectedNeighbors.upstream.map((n) => {
                    const m = metricDisplay(n);
                    return (
                      <Pressable
                        key={n.id}
                        onPress={() => setSelectedId(n.id)}
                        style={[styles.neighborBtn, { backgroundColor: colors.eventHarvestSoft }]}
                      >
                        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
                          {cardTitle(n)}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {m.value}
                          {m.unit ? ` ${m.unit}` : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {selectedNeighbors.downstream.length > 0 ? (
                <View style={styles.detailCol}>
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
                    {t('harvestCampaign.flow.into')}
                  </Text>
                  {selectedNeighbors.downstream.map((n) => {
                    const m = metricDisplay(n);
                    return (
                      <Pressable
                        key={n.id}
                        onPress={() => setSelectedId(n.id)}
                        style={[styles.neighborBtn, { backgroundColor: colors.eventHarvestSoft }]}
                      >
                        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
                          {cardTitle(n)}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {m.value}
                          {m.unit ? ` ${m.unit}` : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  sectionKicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  path: { borderRadius: radii.lg, padding: spacing.md },
  stack: {
    position: 'relative',
    gap: spacing.xl,
    width: '100%',
    paddingBottom: spacing.sm,
  },
  layer: { gap: spacing.xs, zIndex: 1 },
  rowLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  nodes: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
    width: '100%',
  },
  nodeWrap: { flex: 1, minWidth: 0, gap: 6 },
  card: {
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
    overflow: 'hidden',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  cardTitle: { fontWeight: '700', fontSize: 14, lineHeight: 18 },
  metricRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  metric: { fontWeight: '800', letterSpacing: -0.6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  cta: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detail: { borderRadius: radii.xl, padding: spacing.md, gap: spacing.sm },
  detailHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  detailCols: { flexDirection: 'row', gap: spacing.md },
  detailCol: { flex: 1, gap: 6 },
  detailLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  neighborBtn: {
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
});
