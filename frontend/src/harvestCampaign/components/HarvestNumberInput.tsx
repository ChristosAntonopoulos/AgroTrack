import React, { useEffect, useState } from 'react';
import { clampMin, parseHarvestDecimal } from '../utils/harvestValidation';

export type HarvestNumberInputProps = {
  label: string;
  value: string;
  onChange: (raw: string) => void;
  /** Called with parsed number (or null) when the field blurs. */
  onCommit?: (parsed: number | null) => void;
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  inputMode?: 'decimal' | 'numeric';
  autoFocus?: boolean;
  error?: string | null;
  disabled?: boolean;
  /** Keep the name for assistive tech, but let a step title show it instead. */
  hideLabel?: boolean;
};

export const HarvestNumberInput: React.FC<HarvestNumberInputProps> = ({
  label,
  value,
  onChange,
  onCommit,
  suffix,
  placeholder = '0',
  min,
  max,
  inputMode = 'decimal',
  autoFocus,
  error,
  disabled,
  hideLabel,
}) => {
  const commit = () => {
    if (!onCommit) return;
    let parsed = parseHarvestDecimal(value);
    if (parsed != null && min != null) parsed = clampMin(parsed, min);
    if (parsed != null && max != null) parsed = Math.min(max, parsed);
    onCommit(parsed);
  };

  return (
    <label className="hc-amount-field">
      <span className={`hc-amount-label${hideLabel ? ' is-sr' : ''}`}>{label}</span>
      <div className={`hc-amount-input${error ? ' is-invalid' : ''}`}>
        <input
          inputMode={inputMode}
          enterKeyHint="done"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={commit}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-label={label}
          aria-invalid={Boolean(error)}
        />
        {suffix ? <span className="hc-amount-suffix" aria-hidden>{suffix}</span> : null}
      </div>
      {error ? <span className="capture-hint money-warn">{error}</span> : null}
    </label>
  );
};

type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix: string;
  label: string;
};

/**
 * Integer/decimal stepper that keeps a draft string while typing.
 * Empty is allowed mid-edit; blur and ± commit a clamped number.
 */
export const HarvestNumberStepper: React.FC<StepperProps> = ({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
  label,
}) => {
  const [draft, setDraft] = useState(() => String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const clamp = (raw: number) => {
    const next = clampMin(raw, min);
    return max == null ? next : Math.min(max, next);
  };

  const commitDraft = (raw: string) => {
    if (raw.trim() === '') {
      onChange(min);
      setDraft(String(min));
      return;
    }
    const parsed = parseHarvestDecimal(raw);
    if (parsed == null) {
      setDraft(String(value));
      return;
    }
    const next = clamp(parsed);
    onChange(next);
    setDraft(String(next));
  };

  return (
    <label className="hc-amount-field">
      <span className="hc-amount-label">{label}</span>
      <div className="hc-amount-input hc-stepper">
        <button
          type="button"
          className="hc-stepper-btn"
          onClick={() => {
            const next = clamp(value - step);
            onChange(next);
            setDraft(String(next));
          }}
          disabled={value <= min}
          aria-label="-"
        >
          −
        </button>
        <span className="hc-stepper-value">
          <input
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commitDraft(draft)}
            aria-label={label}
          />
          <span className="hc-amount-suffix" aria-hidden>
            {suffix}
          </span>
        </span>
        <button
          type="button"
          className="hc-stepper-btn"
          onClick={() => {
            const next = clamp(value + step);
            onChange(next);
            setDraft(String(next));
          }}
          disabled={max != null && value >= max}
          aria-label="+"
        >
          +
        </button>
      </div>
    </label>
  );
};

/** @deprecated Prefer HarvestNumberStepper; kept for barrel/page compatibility. */
export const NumberStepper = HarvestNumberStepper;
