import React from 'react';

export type HarvestSegmentOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: HarvestSegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
};

/** Toggle group with aria-pressed (not tablist). */
export function HarvestSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: Props<T>) {
  return (
    <div
      className={`money-type-toggle${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
