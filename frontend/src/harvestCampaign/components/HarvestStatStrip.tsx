import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type HarvestStatItem = {
  id: string;
  icon: LucideIcon;
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  items: HarvestStatItem[];
  label: string;
};

/** Shared harvest figures: icon, amount, and a short caption. */
export const HarvestStatStrip: React.FC<Props> = ({ items, label }) => (
  <div className="hc-stat-strip" aria-label={label}>
    {items.map((item) => {
      const Icon = item.icon;
      return (
        <div key={item.id} className={`hc-stat is-${item.id}`}>
          <span className="hc-stat-icon" aria-hidden>
            <Icon size={18} strokeWidth={2.15} />
          </span>
          <strong>{item.value}</strong>
          <span className="hc-stat-label">{item.label}</span>
          {item.hint ? <em className="hc-stat-hint">{item.hint}</em> : null}
        </div>
      );
    })}
  </div>
);
