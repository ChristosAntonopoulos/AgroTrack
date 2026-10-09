import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import type { Field } from '../../services/fieldService';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import { readLastCaptureFieldId } from '../../capture/recentActions';
import {
  dateInputValueFromOccurredAt,
  formatCaptureDateChip,
  toDateTimeLocalFromDay,
} from '../../capture/dateLabel';

type Props = {
  fields: Field[];
  fieldId: string;
  occurredAtLocal: string;
  onFieldChange: (id: string) => void;
  onOccurredAtChange: (localDateTime: string) => void;
  /** Compact form header (field · date) without the eyebrow block. */
  compact?: boolean;
};

const CaptureContextChips: React.FC<Props> = ({
  fields,
  fieldId,
  occurredAtLocal,
  onFieldChange,
  onOccurredAtChange,
  compact = false,
}) => {
  const { t, i18n } = useTranslation(['capture']);
  const dateRef = useRef<HTMLInputElement>(null);
  const [fieldOpen, setFieldOpen] = useState(false);
  const selected = fields.find((f) => f.id === fieldId);
  const dateLabel = (() => {
    const label = formatCaptureDateChip(occurredAtLocal, i18n.language);
    const todayWord = t('capture:today');
    if (
      label === 'Σήμερα' ||
      label === 'Today' ||
      label === 'Oggi'
    ) {
      return todayWord;
    }
    return label;
  })();
  const dateValue = dateInputValueFromOccurredAt(occurredAtLocal);

  const orderedFields = useMemo(() => {
    const last = readLastCaptureFieldId();
    if (!last) return fields;
    const head = fields.filter((f) => f.id === last);
    const rest = fields.filter((f) => f.id !== last);
    return [...head, ...rest];
  }, [fields]);

  const fieldLabel =
    friendlyFieldLabel(selected?.name || fieldId) || t('capture:fieldPrompt');

  const fieldAccent = selected
    ? resolveFieldColor(selected.color, selected.id)
    : fieldId
      ? resolveFieldColor(undefined, fieldId)
      : null;

  return (
    <div className={`capture-context-chips${compact ? ' is-compact' : ''}`}>
      <div className="capture-context-chips-row">
        <div className="capture-context-chip-wrap">
          <button
            type="button"
            className={`capture-context-chip${fieldId ? '' : ' is-empty'}`}
            aria-expanded={fieldOpen}
            aria-haspopup="listbox"
            onClick={() => setFieldOpen((v) => !v)}
          >
            {fieldAccent ? (
              <span
                className="capture-context-chip-swatch"
                style={{ background: fieldAccent }}
                aria-hidden
              />
            ) : null}
            <span className="capture-context-chip-label">{fieldLabel}</span>
            <ChevronDown size={16} aria-hidden />
          </button>
          {fieldOpen ? (
            <div className="capture-context-field-menu" role="listbox">
              <p className="capture-context-field-prompt">{t('capture:fieldPrompt')}</p>
              {orderedFields.map((f) => {
                const active = f.id === fieldId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`capture-context-field-option${active ? ' is-active' : ''}`}
                    onClick={() => {
                      onFieldChange(f.id);
                      setFieldOpen(false);
                    }}
                  >
                    <span
                      className="capture-context-field-swatch"
                      style={{ background: resolveFieldColor(f.color, f.id) }}
                      aria-hidden
                    />
                    {friendlyFieldLabel(f.name)}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="capture-context-chip-wrap">
          <button
            type="button"
            className="capture-context-chip"
            onClick={() => {
              const el = dateRef.current;
              if (!el) return;
              try {
                el.showPicker?.();
              } catch {
                el.click();
              }
            }}
          >
            <span className="capture-context-chip-label">{dateLabel}</span>
            <ChevronDown size={16} aria-hidden />
          </button>
          <input
            ref={dateRef}
            type="date"
            className="capture-context-date-input"
            value={dateValue}
            aria-label={t('capture:dateChip')}
            onChange={(e) => {
              const ymd = e.target.value;
              if (!ymd) return;
              onOccurredAtChange(toDateTimeLocalFromDay(ymd, occurredAtLocal));
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CaptureContextChips;
