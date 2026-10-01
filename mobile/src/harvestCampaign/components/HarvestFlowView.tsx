import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import { formatKg } from '../../utils/harvestUtils';
import { createElevation, radii, spacing } from '../../theme';
import {
  buildHarvestFlowGraph,
  fieldAllocationCaption,
  relatedGenealogyIds,
  type HarvestFlowNode,
  type HarvestFlowNodeKind,
} from '../flowGraph';
import { formatHarvestYieldPercent } from '../utils/harvestCalculations';
import { farmerOilLitres } from '../oilSaleLots';
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
  onAdd?: () => void;
  /** Hide the top count strip when a parent already shows the pipeline. */
  hideSummary?: boolean;
};

const STAGE_ICON: Record<HarvestFlowNodeKind, React.ComponentProps<typeof Ionicons>['name']> = {
  field: 'leaf',
  harvest: 'basket',
  mill: 'scale-outline',
  oil: 'water',
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
  onAdd,
  hideSummary = false,
}) => {
  const { t, i18n } = useTranslation('fields');
  const locale = i18n.language || 'en';
  const { colors, tapMin } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const summaryColumns = windowWidth < 380 ? 2 : 4;
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

  const cardTitle = (node: HarvestFlowNode) => {
    const raw = node.kind === 'field' ? friendlyFieldLabel(node.label) : node.date ? formatDayLabel(node.date, locale) : rowLabel(node.kind);
    if (/^\d{8,}$/.test(raw.replace(/\s/g, ''))) return `···${raw.slice(-4)}`;
    return raw;
  };

  const metricDisplay = (node: HarvestFlowNode) => {
    if (node.meta.metricUnit === 'sacks') {
      return { value: node.meta.metric, unit: t('harvestCampaign.sacks.unit') };
    }
    if (node.meta.metricUnit === 'kg') {
      return { value: node.meta.metric, unit: t('harvestCampaign.oil.kg') };
    }
    if (node.meta.metricUnit === 'L') {
      return { value: node.meta.metric, unit: t('harvestCampaign.oil.litres') };
    }
    return { value: node.meta.metric, unit: node.meta.metricUnit || '' };
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
    const accent =
      node.fieldIds.length === 1 ? fieldColors[node.fieldIds[0]] : colors.primary;
    const fieldKg =
      node.kind === 'field' && node.meta.oliveKg && node.meta.oliveKg > 0
        ? formatKg(node.meta.oliveKg)
        : null;
    const sackLine =
      node.kind === 'field' && node.meta.sackCount
        ? `${node.meta.sackCount} ${t('harvestCampaign.sacks.unit')}`
        : null;

    return (
      <View
        key={node.id}
        style={[styles.nodeWrap, { opacity: active ? 1 : 0.34 }]}
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
                backgroundColor: colors.surfaceElevated,
                borderWidth: isSelected ? 2 : 0,
                borderColor: isSelected ? accent : 'transparent',
                ...(!isSelected ? createElevation(colors, 'sm') : {}),
              },
            ]}
          >
            <View style={[styles.topStrip, { backgroundColor: accent }]} />
            {node.pending ? (
              <View style={[styles.pendingDot, { backgroundColor: colors.warning }]} />
            ) : null}
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {cardTitle(node)}
            </Text>
            {node.kind === 'field' ? (
              <>
                {fieldKg ? (
                  <Text
                    style={[styles.metric, { color: colors.textPrimary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {fieldKg}
                    <Text style={[styles.unit, { color: colors.textSecondary }]}>
                      {` ${t('harvestCampaign.oil.kg')}`}
                    </Text>
                  </Text>
                ) : metric.value && metric.value !== '—' ? (
                  <Text
                    style={[styles.metric, { color: colors.textPrimary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {metric.value}
                    {metric.unit ? (
                      <Text style={[styles.unit, { color: colors.textSecondary }]}>
                        {` ${metric.unit}`}
                      </Text>
                    ) : null}
                  </Text>
                ) : null}
                {sackLine ? (
                  <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                    {sackLine}
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                {metric.value && metric.value !== '—' ? (
                  <Text
                    style={[styles.metric, { color: colors.textPrimary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {metric.value}
                    {metric.unit ? (
                      <Text style={[styles.unit, { color: colors.textSecondary }]}>
                        {` ${metric.unit}`}
                      </Text>
                    ) : null}
                  </Text>
                ) : null}
              </>
            )}
          </Pressable>
        </View>
      </View>
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
  const oilLitres = Math.round(
    campaign.oils.reduce((sum, row) => sum + farmerOilLitres(row), 0)
  );
  const summary = [
    { value: String(fieldOrder.length), label: t('harvestCampaign.flow.fields') },
    { value: String(sackTotal), label: t('harvestCampaign.flow.sacks') },
    { value: String(harvestDays), label: t('harvestCampaign.flow.days') },
    { value: String(oilLitres), label: t('harvestCampaign.flow.unitOilLitres') },
  ];
  const selectedLabel = selectedNode
    ? `${cardTitle(selectedNode)}${
        selectedNode.meta.metric
          ? ` · ${selectedNode.meta.metric}${
              selectedNode.meta.metricUnit === 'sacks'
                ? ` ${t('harvestCampaign.sacks.unit')}`
                : selectedNode.meta.metricUnit
                  ? ` ${selectedNode.meta.metricUnit}`
                  : ''
            }`
          : ''
      }`
    : '';

  const selectedSummary =
    selectedFieldId != null
      ? summaries.find((s) => s.fieldId === selectedFieldId)
      : null;

  const selectedNeighbors = selectedNode ? neighbors(selectedNode) : null;

  return (
    <View style={styles.wrap}>
      {!hideSummary ? (
        <View style={[styles.summary, { backgroundColor: colors.surfaceMuted }]}>
          {summary.map((item) => (
            <View
              key={item.label}
              style={[styles.summaryCell, summaryColumns === 2 ? styles.summaryHalf : styles.summaryQuarter]}
            >
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{item.value}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textTertiary }]} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {selectedNode ? (
        <View style={styles.pathRow}>
          <Text style={[styles.hint, styles.pathHint, { color: colors.textSecondary }]} numberOfLines={2}>
            {t('harvestCampaign.flow.showing', { label: selectedLabel })}
          </Text>
          <Pressable onPress={() => setSelectedId(null)} hitSlop={8}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
              {t('harvestCampaign.flow.clear')}
            </Text>
          </Pressable>
        </View>
      ) : !hideSummary ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]} numberOfLines={2}>
          {t('harvestCampaign.flow.tapHint')}
        </Text>
      ) : null}

      {empty ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {t('harvestCampaign.flow.emptyTitle')}
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('harvestCampaign.flow.emptyBody')}
          </Text>
          {onAdd ? (
            <Pressable onPress={onAdd} style={[styles.addFirst, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.onOlive, fontWeight: '700' }}>
                {t('harvestCampaign.flow.addFirst')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.canvas}>
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
                <View style={styles.stageHead}>
                  <Ionicons name={STAGE_ICON[kind]} size={16} color={colors.eventHarvest} />
                  <Text style={[styles.rowLabel, { color: colors.eventHarvest }]}>
                    {rowLabel(kind)} · {nodes.length}
                  </Text>
                </View>
                <View style={styles.nodes}>
                  {nodes.map((node) => renderNode(node))}
                </View>
              </View>
            );
          })}
        </View>
        </View>
      )}

      {selectedNode ? (
        <View style={[styles.detail, { backgroundColor: colors.surface }]}>
          <View style={styles.detailHead}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: colors.eventHarvest }]}>
                {rowLabel(selectedNode.kind)}
              </Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 17 }}>
                {cardTitle(selectedNode)}
              </Text>
              {pathStory ? (
                <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{pathStory}</Text>
              ) : null}
            </View>
            {selectedNode.pending === 'needsMill' && onOpenMill && selectedNode.entryIds?.length ? (
              <Pressable
                onPress={() => onOpenMill(selectedNode.entryIds!)}
                style={{ minHeight: tapMin, justifyContent: 'center' }}
              >
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {t('harvestCampaign.chain.ctaMill')}
                </Text>
              </Pressable>
            ) : null}
            {selectedNode.pending === 'needsOil' && onOpenOil && selectedNode.entryIds?.length ? (
              <Pressable
                onPress={() => onOpenOil(selectedNode.entryIds!)}
                style={{ minHeight: tapMin, justifyContent: 'center' }}
              >
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {t('harvestCampaign.chain.ctaOil')}
                </Text>
              </Pressable>
            ) : null}
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
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
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
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
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
  wrap: { gap: spacing.sm },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  summaryCell: { alignItems: 'center', gap: 1, paddingVertical: 4 },
  summaryQuarter: { width: '25%' },
  summaryHalf: { width: '50%' },
  summaryValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  summaryLabel: { fontSize: 11, fontWeight: '600' },
  hint: { fontSize: 14, lineHeight: 19 },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pathHint: { flex: 1 },
  empty: { gap: 8, paddingVertical: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  addFirst: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  canvas: {
    borderRadius: 16,
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 10,
  },
  stack: {
    position: 'relative',
    gap: 4,
    width: '100%',
    paddingBottom: spacing.sm,
  },
  layer: { gap: 8, zIndex: 1, marginTop: 12 },
  stageHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  nodes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'stretch',
    width: '100%',
  },
  nodeWrap: { width: '31%', minWidth: 112, maxWidth: 120, flexGrow: 1 },
  card: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 3,
    overflow: 'hidden',
    minHeight: 96,
  },
  topStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  pendingDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  cardTitle: { fontWeight: '700', fontSize: 13, lineHeight: 16 },
  metric: { fontWeight: '700', fontSize: 18, letterSpacing: -0.4, marginTop: 2 },
  unit: { fontWeight: '700', fontSize: 11, opacity: 1 },
  meta: { fontSize: 12, lineHeight: 15, fontWeight: '600' },
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
