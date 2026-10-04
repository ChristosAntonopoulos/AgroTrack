import React from 'react';
import { Check } from 'lucide-react';
import '../HarvestSheets.css';

const inkOn = (hex: string): string => {
  const h = hex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return '#1a140c';
  const y =
    (parseInt(h.slice(0, 2), 16) * 299 +
      parseInt(h.slice(2, 4), 16) * 587 +
      parseInt(h.slice(4, 6), 16) * 114) /
    1000;
  return y > 160 ? '#1a140c' : '#fff';
};

/** One shared field color, or none when the selection mixes fields. */
export const carryColor = (colors: string[]): string | undefined => {
  const unique = [...new Set(colors.filter(Boolean))];
  return unique.length === 1 ? unique[0] : undefined;
};

export type HarvestCarryItem = {
  id: string;
  title: string;
  detail?: string;
  /** Field colors, in the same order as the fields on this entry. */
  colors: string[];
  badge?: string;
  group?: string;
  /** Shown but not selectable (e.g. fully sold oil). */
  disabled?: boolean;
};

/**
 * Previous step, shown as choices. Each row keeps its field color
 * so the sack, the kilograms, and the oil stay visually the same lot.
 */
export const HarvestCarryPicker: React.FC<{
  label: string;
  items: HarvestCarryItem[];
  selected: string[];
  onToggle: (id: string) => void;
  onSelectAll?: () => void;
  selectAllLabel?: string;
  transfer?: { from: string; to: string; color?: string } | null;
  hint?: string;
  trailing?: React.ReactNode;
  /** Step title already asks the question, so the section heading stays off. */
  hideHeading?: boolean;
}> = ({
  label,
  items,
  selected,
  onToggle,
  onSelectAll,
  selectAllLabel,
  transfer,
  hint,
  trailing,
  hideHeading = false,
}) => {
  let lastGroup = '';
  return (
    <div className="hc-carry-block">
      {hideHeading ? null : (
        <div className="hc-includes-head">
          <p className="hc-form-section">{label}</p>
          {onSelectAll && selectAllLabel ? (
            <button type="button" className="money-text-link" onClick={onSelectAll}>
              {selectAllLabel}
            </button>
          ) : null}
        </div>
      )}
      <div className="hc-carry-list" role="group" aria-label={label}>
        {items.map((item) => {
          const on = selected.includes(item.id);
          const showGroup = Boolean(item.group) && item.group !== lastGroup;
          if (item.group) lastGroup = item.group;
          const lead = item.colors[0] || '#c4a35a';
          const barColors = [...new Set(item.colors.filter(Boolean))].slice(0, 3);
          const stripes = barColors.length > 0 ? barColors : [lead];
          return (
            <React.Fragment key={item.id}>
              {showGroup ? <p className="hc-carry-group">{item.group}</p> : null}
              <button
                type="button"
                className={`hc-carry${on ? ' is-on' : ''}${item.disabled ? ' is-sold' : ''}`}
                style={{
                  ['--carry' as string]: lead,
                  ['--carry-ink' as string]: inkOn(lead),
                }}
                aria-pressed={on}
                aria-disabled={item.disabled || undefined}
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  onToggle(item.id);
                }}
              >
                <span className="hc-carry-bar" aria-hidden>
                  {stripes.map((color, index) => (
                    <i key={`${item.id}-${index}`} style={{ background: color }} />
                  ))}
                </span>
                <span className="hc-carry-copy">
                  <strong>{item.title}</strong>
                  {item.detail ? <span>{item.detail}</span> : null}
                </span>
                {item.badge ? <em className="hc-carry-badge">{item.badge}</em> : null}
                <span className="hc-carry-mark" aria-hidden>
                  {on ? <Check size={14} strokeWidth={2.8} /> : null}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
      {transfer ? (
        <p className="hc-carry-transfer" style={{ ['--carry' as string]: transfer.color || 'var(--harvest-gold-deep, #6b5424)' }}>
          <span className="hc-carry-from">{transfer.from}</span>
          <span className="hc-carry-arrow" aria-hidden>
            →
          </span>
          <span>{transfer.to}</span>
        </p>
      ) : hint ? (
        <p className="hc-carry-hint">{hint}</p>
      ) : null}
      {trailing}
    </div>
  );
};
