import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { HarvestFlowLink } from '../flowGraph';

type Anchor = { id: string; x: number; yTop: number; yBottom: number };

type Props = {
  container: HTMLElement | null;
  cardElsRef: React.RefObject<Map<string, HTMLElement>>;
  nodeIds: string[];
  links: HarvestFlowLink[];
  highlight: Set<string>;
  selectedId: string | null;
  fieldColors: Record<string, string>;
  fallbackColor?: string;
};

const round = (n: number) => Math.round(n * 10) / 10;

const swayOf = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  return (hash % 1000) / 500 - 1;
};

/** A bowed curve. Each link leans a different way so the paths cross. */
export const weavePath = (sx: number, sy: number, tx: number, ty: number, sway: number): string => {
  const dy = Math.max(28, ty - sy);
  const span = Math.abs(tx - sx);
  const bow = sway * Math.min(148, 36 + span * 0.58);
  const kink = sway * Math.min(52, 14 + dy * 0.16);
  const c1x = sx + bow;
  const c1y = sy + dy * 0.24 + kink;
  const c2x = tx - bow * 0.62;
  const c2y = sy + dy * 0.74 - kink * 0.45;
  return `M ${round(sx)} ${round(sy)} C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(tx)} ${round(ty)}`;
};

const sameSize = (a: { w: number; h: number }, b: { w: number; h: number }) =>
  a.w === b.w && a.h === b.h;

const sameAnchors = (a: Map<string, Anchor>, b: Map<string, Anchor>) => {
  if (a.size !== b.size) return false;
  for (const [id, next] of b) {
    const prev = a.get(id);
    if (!prev) return false;
    if (prev.x !== next.x || prev.yTop !== next.yTop || prev.yBottom !== next.yBottom) {
      return false;
    }
  }
  return true;
};

export const HarvestGenealogyConnectors: React.FC<Props> = ({
  container,
  cardElsRef,
  nodeIds,
  links,
  highlight,
  selectedId,
  fieldColors,
  fallbackColor = '#C4A35A',
}) => {
  const gradId = useId().replace(/:/g, '');
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [anchors, setAnchors] = useState<Map<string, Anchor>>(() => new Map());
  const measuring = useRef(false);
  const nodeKey = nodeIds.join('|');

  useLayoutEffect(() => {
    if (!container) return;

    const measure = () => {
      if (measuring.current) return;
      measuring.current = true;
      const root = container.getBoundingClientRect();
      const cards = cardElsRef.current;
      const next = new Map<string, Anchor>();

      cards?.forEach((el, id) => {
        const box = el.getBoundingClientRect();
        next.set(id, {
          id,
          x: round(box.left - root.left + box.width / 2),
          yTop: round(box.top - root.top),
          yBottom: round(box.bottom - root.top),
        });
      });

      const nextSize = {
        w: Math.ceil(container.clientWidth),
        h: Math.ceil(container.clientHeight),
      };

      setAnchors((prev) => (sameAnchors(prev, next) ? prev : next));
      setSize((prev) => (sameSize(prev, nextSize) ? prev : nextSize));
      requestAnimationFrame(() => {
        measuring.current = false;
      });
    };

    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(container);
    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [container, cardElsRef, links, nodeKey, selectedId]);

  const edges = useMemo(() => {
    return links
      .map((link) => {
        const from = anchors.get(link.fromId);
        const to = anchors.get(link.toId);
        if (!from || !to) return null;
        const onPath = highlight.has(link.fromId) && highlight.has(link.toId);
        const active = Boolean(selectedId) && onPath;
        const muted = Boolean(selectedId) && !onPath;
        const color = (link.fieldId && fieldColors[link.fieldId]) || fallbackColor;
        const seed = `${link.fromId}|${link.toId}|${link.fieldId || ''}`;
        const sway = swayOf(seed);
        const lane = sway * 18;
        const d = weavePath(from.x + lane * 0.35, from.yBottom, to.x - lane * 0.2, to.yTop, sway);
        const midX = (from.x + to.x) / 2 + sway * 26;
        const midY = from.yBottom + (to.yTop - from.yBottom) / 2;
        return { link, d, active, muted, midX, midY, from, to, color };
      })
      .filter(Boolean) as Array<{
      link: HarvestFlowLink;
      d: string;
      active: boolean;
      muted: boolean;
      midX: number;
      midY: number;
      from: Anchor;
      to: Anchor;
      color: string;
    }>;
  }, [anchors, links, highlight, selectedId, fieldColors, fallbackColor]);

  if (size.w <= 0 || size.h <= 0) return null;

  return (
    <svg
      className="hc-gene-wires"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      aria-hidden
    >
      <defs>
        {edges.map(({ link, color }) => (
          <linearGradient
            key={`g-${link.fromId}-${link.toId}-${link.fieldId || 'x'}`}
            id={`hc-wire-${gradId}-${link.fromId}-${link.toId}-${link.fieldId || 'x'}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        ))}
      </defs>
      {edges.map(({ link, d, active, muted, midX, midY, from, to, color }) => {
        const gid = `hc-wire-${gradId}-${link.fromId}-${link.toId}-${link.fieldId || 'x'}`;
        const tone = active ? ' is-focus' : muted ? ' is-muted' : ' is-rest';
        const badge = active && link.label ? link.label : '';
        const badgeW = badge ? Math.max(badge.length, 2) * 6.4 + 16 : 0;
        return (
          <g
            key={`${link.fromId}->${link.toId}->${link.fieldId || ''}`}
            className={`hc-gene-wire${tone}`}
            style={{ color }}
          >
            <path d={d} className="hc-gene-wire-glow" fill="none" stroke={color} />
            <path d={d} className="hc-gene-wire-line" fill="none" stroke={`url(#${gid})`} />
            <circle
              cx={from.x}
              cy={from.yBottom}
              r={3.6}
              className="hc-gene-wire-port"
              stroke={color}
            />
            <circle
              cx={to.x}
              cy={to.yTop}
              r={3.6}
              className="hc-gene-wire-port"
              stroke={color}
            />
            {badge ? (
              <g>
                <rect
                  x={midX - badgeW / 2}
                  y={midY - 11}
                  width={badgeW}
                  height={22}
                  rx={11}
                  className="hc-gene-wire-badge"
                  stroke={color}
                />
                <text
                  x={midX}
                  y={midY + 1}
                  className="hc-gene-wire-badge-text"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {badge}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};
