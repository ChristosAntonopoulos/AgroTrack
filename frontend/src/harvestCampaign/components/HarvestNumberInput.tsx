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
  /** QA-052: shown (aria-live) when the typed value exceeds `max`; receives the max. */
  overMaxMessage?: (max: number) => string;
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
  overMaxMessage,
}) => {
  const [draft, setDraft] = useState(() => String(value));
  // Remembers that a blur clamped the typed number, so the user is told why it changed.
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const typed = parseHarvestDecimal(draft);
  const overMax = max != null && ((typed != null && typed > max) || clamped);

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
    setClamped(max != null && parsed > max);
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
            onChange={(e) => {
              setClamped(false);
              setDraft(e.target.value);
            }}
            onBlur={() => commitDraft(draft)}
            aria-label={label}
            aria-invalid={overMax && Boolean(overMaxMessage)}
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
      {overMax && overMaxMessage && max != null ? (
        <span className="capture-hint money-warn" role="status" aria-live="polite">
          {overMaxMessage(max)}
        </span>
      ) : null}
    </label>
  );
};

/** @deprecated Prefer HarvestNumberStepper; kept for barrel/page compatibility. */
export const NumberStepper = HarvestNumberStepper;
