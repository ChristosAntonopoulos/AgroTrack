import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { HarvestFlowLink } from '../flowGraph';

export type CardAnchorBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Anchor = { id: string; x: number; yTop: number; yBottom: number };

type Props = {
  width: number;
  height: number;
  cardBoxes: Map<string, CardAnchorBox>;
  links: HarvestFlowLink[];
  highlight: Set<string>;
  selectedId: string | null;
  fieldColors: Record<string, string>;
  fallbackColor?: string;
};

/**
 * Orthogonal SmoothStep connectors — React Flow / Carbon Traceability style.
 * https://reactflow.dev/examples/edges/custom-edges
 */
export const smoothStepPath = (
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  radius = 10
): string => {
  const midY = sy + (ty - sy) / 2;
  const dx = tx - sx;
  const r = Math.min(radius, Math.abs(dx) / 2, Math.abs(ty - sy) / 2);
  if (Math.abs(dx) < 1) {
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  }
  const dir = dx > 0 ? 1 : -1;
  return [
    `M ${sx} ${sy}`,
    `L ${sx} ${midY - r}`,
    `Q ${sx} ${midY} ${sx + dir * r} ${midY}`,
    `L ${tx - dir * r} ${midY}`,
    `Q ${tx} ${midY} ${tx} ${midY + r}`,
    `L ${tx} ${ty}`,
  ].join(' ');
};

const round = (n: number) => Math.round(n * 10) / 10;

export const HarvestGenealogyConnectors: React.FC<Props> = ({
  width,
  height,
  cardBoxes,
  links,
  highlight,
  selectedId,
  fieldColors,
  fallbackColor = '#C4A35A',
}) => {
  const anchors = useMemo(() => {
    const next = new Map<string, Anchor>();
    cardBoxes.forEach((box, id) => {
      next.set(id, {
        id,
        x: round(box.x + box.width / 2),
        yTop: round(box.y),
        yBottom: round(box.y + box.height),
      });
    });
    return next;
  }, [cardBoxes]);

  const edges = useMemo(() => {
    return links
      .map((link) => {
        const from = anchors.get(link.fromId);
        const to = anchors.get(link.toId);
        if (!from || !to) return null;
        const lit =
          !selectedId || (highlight.has(link.fromId) && highlight.has(link.toId));
        const color = (link.fieldId && fieldColors[link.fieldId]) || fallbackColor;
        const d = smoothStepPath(from.x, from.yBottom, to.x, to.yTop, 14);
        const midX = (from.x + to.x) / 2;
        const midY = from.yBottom + (to.yTop - from.yBottom) / 2;
        return { link, d, lit, midX, midY, from, to, color };
      })
      .filter(Boolean) as Array<{
      link: HarvestFlowLink;
      d: string;
      lit: boolean;
      midX: number;
      midY: number;
      from: Anchor;
      to: Anchor;
      color: string;
    }>;
  }, [anchors, links, highlight, selectedId, fieldColors, fallbackColor]);

  if (width <= 0 || height <= 0 || edges.length === 0) return null;

  return (
    <View pointerEvents="none" style={[styles.wires, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          {edges.map(({ link, color }) => {
            const gid = `hc-wire-${link.fromId}-${link.toId}-${link.fieldId || 'x'}`;
            return (
              <LinearGradient key={gid} id={gid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={color} stopOpacity="0.95" />
                <Stop offset="100%" stopColor={color} stopOpacity="0.55" />
              </LinearGradient>
            );
          })}
        </Defs>
        {edges.map(({ link, d, lit, midX, midY, from, to, color }) => {
          const gid = `hc-wire-${link.fromId}-${link.toId}-${link.fieldId || 'x'}`;
          const opacity = lit ? 1 : 0.16;
          const strokeW = selectedId && lit ? 2.85 : 2.25;
          const glowW = selectedId && lit ? 10 : 7;
          const glowOp = selectedId && lit ? 0.28 : 0.16;
          const badgeW = Math.max(link.label?.length || 2, 2) * 3.6 + 12;
          return (
            <G key={`${link.fromId}->${link.toId}->${link.fieldId || ''}`} opacity={opacity}>
              <Path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={glowW}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={glowOp}
              />
              <Path
                d={d}
                fill="none"
                stroke={`url(#${gid})`}
                strokeWidth={strokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Circle
                cx={from.x}
                cy={from.yBottom}
                r={3.6}
                fill={color}
                fillOpacity={0.35}
                stroke={color}
                strokeWidth={1.75}
              />
              <Circle
                cx={to.x}
                cy={to.yTop}
                r={3.6}
                fill={color}
                fillOpacity={0.35}
                stroke={color}
                strokeWidth={1.75}
              />
              {selectedId && lit && link.label ? (
                <G>
                  <Rect
                    x={midX - badgeW / 2}
                    y={midY - 10}
                    width={badgeW}
                    height={20}
                    rx={10}
                    fill="#2A241C"
                    stroke={color}
                    strokeWidth={1}
                  />
                  <SvgText
                    x={midX}
                    y={midY + 1}
                    fill="#F5EFE4"
                    fontSize={11}
                    fontWeight="700"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {link.label}
                  </SvgText>
                </G>
              ) : null}
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wires: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 0,
  },
});
