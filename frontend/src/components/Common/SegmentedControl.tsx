import React, { ReactNode } from 'react';
import './SegmentedControl.css';

export type SegmentedOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  'aria-controls'?: string;
};

type SegmentedControlProps<T extends string = string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  fullWidth?: boolean;
  className?: string;
  /** Use tablist semantics (Calendar) or radiogroup (default). */
  role?: 'tablist' | 'group';
};

function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  fullWidth = false,
  className = '',
  role = 'group',
}: SegmentedControlProps<T>) {
  const classes = ['view-tabs', fullWidth && 'view-tabs--full', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role={role} aria-label={ariaLabel}>
      {options.map((opt) => {
        const selected = opt.value === value;
        const tabProps =
          role === 'tablist'
            ? {
                role: 'tab' as const,
                'aria-selected': selected,
                'aria-controls': opt['aria-controls'],
              }
            : {
                'aria-pressed': selected,
              };

        return (
          <button
            key={opt.value}
            type="button"
            className={`view-tab${selected ? ' is-active' : ''}`}
            disabled={opt.disabled}
            onClick={() => {
              if (!selected && !opt.disabled) onChange(opt.value);
            }}
            {...tabProps}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
