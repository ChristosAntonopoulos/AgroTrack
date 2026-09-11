import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import type { Field } from '../../services/fieldService';
import { isListedGrove } from '../../utils/fieldDisplay';
import { friendlyFieldLabel } from '../../utils/fieldLabels';

export type FieldScopeExtra = { value: string; label: string };

type Props = {
  fields: Field[];
  value?: string;
  onChange: (fieldId: string) => void;
  id?: string;
  extras?: FieldScopeExtra[];
};

const FieldScopeSelector: React.FC<Props> = ({
  fields,
  value,
  onChange,
  id = 'chrono-field-select',
  extras = [],
}) => {
  const { t } = useTranslation('chronologio');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    const listed = fields.filter(isListedGrove);
    if (value && !listed.some((field) => field.id === value)) {
      const selected = fields.find((field) => field.id === value);
      if (selected) return [selected, ...listed];
    }
    return listed;
  }, [fields, value]);

  const extra = extras.find((item) => item.value === value);
  const selected = options.find((field) => field.id === value);
  const label = extra
    ? extra.label
    : selected
      ? friendlyFieldLabel(selected.name)
      : t('allFields');

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (fieldId: string) => {
    onChange(fieldId);
    setOpen(false);
  };

  return (
    <div className={`chrono-field-scope${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        className="chrono-field-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('living.field')}
        onClick={() => setOpen((next) => !next)}
      >
        <span
          className="chrono-field-dot"
          style={selected?.color ? { background: selected.color } : undefined}
          aria-hidden
        />
        <span className="chrono-field-trigger-label">{label}</span>
        <ChevronDown size={16} aria-hidden />
      </button>
      {open ? (
        <ul className="chrono-field-menu" role="listbox" aria-labelledby={id}>
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className={!value ? 'is-selected' : undefined}
              onClick={() => choose('')}
            >
              <span className="chrono-field-dot" aria-hidden />
              {t('allFields')}
            </button>
          </li>
          {extras.map((item) => {
            const active = item.value === value;
            return (
              <li key={item.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={active ? 'is-selected' : undefined}
                  onClick={() => choose(item.value)}
                >
                  <span className="chrono-field-dot" aria-hidden />
                  {item.label}
                </button>
              </li>
            );
          })}
          {options.map((field) => {
            const active = field.id === value;
            return (
              <li key={field.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={active ? 'is-selected' : undefined}
                  onClick={() => choose(field.id)}
                >
                  <span
                    className="chrono-field-dot"
                    style={field.color ? { background: field.color } : undefined}
                    aria-hidden
                  />
                  {friendlyFieldLabel(field.name)}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

export default FieldScopeSelector;
