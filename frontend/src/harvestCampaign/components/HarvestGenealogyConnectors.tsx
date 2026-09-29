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
      {edges.map(({ link, d, lit, from, to, color }) => {
        const gid = `hc-wire-${gradId}-${link.fromId}-${link.toId}-${link.fieldId || 'x'}`;
        return (
          <g
            key={`${link.fromId}->${link.toId}->${link.fieldId || ''}`}
            className={`hc-gene-wire${lit ? ' is-lit' : ' is-muted'}${
              selectedId && lit ? ' is-focus' : ''
            }`}
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
          </g>
        );
      })}
    </svg>
  );
};
