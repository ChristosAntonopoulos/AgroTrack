import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';
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

const swayOf = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  return (hash % 1000) / 500 - 1;
};

/** A bowed curve. Each link leans a different way so the paths cross instead of stacking. */
export const weavePath = (sx: number, sy: number, tx: number, ty: number, sway: number): string => {
  const dy = Math.max(24, ty - sy);
  const bow = sway * Math.min(84, 26 + Math.abs(tx - sx) * 0.35);
  const c1x = sx + bow;
  const c1y = sy + dy * 0.28;
  const c2x = tx - bow * 0.72;
  const c2y = sy + dy * 0.78;
  return `M ${round(sx)} ${round(sy)} C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(tx)} ${round(ty)}`;
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
        const seed = `${link.fromId}|${link.toId}|${link.fieldId || ''}`;
        const sway = swayOf(seed);
        const lane = sway * 16;
        const d = weavePath(from.x + lane * 0.35, from.yBottom, to.x - lane * 0.2, to.yTop, sway);
        const midX = (from.x + to.x) / 2 + sway * 22;
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
        {edges.map(({ link, d, lit, midX, midY, color }, index) => {
          const active = Boolean(selectedId) && lit;
          const opacity = !selectedId ? 0.42 : active ? 0.95 : 0.1;
          const strokeW = active ? 2.6 : 1.6;
          const badgeW = Math.max(link.label?.length || 2, 2) * 3.6 + 12;
          return (
            <G key={`${link.fromId}->${link.toId}->${link.fieldId || ''}-${index}`}>
              {active ? (
                <Path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.16}
                />
              ) : null}
              <Path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={strokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={opacity}
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
