import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import type { Field } from '../../services/fieldService';
import { isListedGrove } from '../../utils/fieldDisplay';
import { friendlyFieldLabel } from '../../utils/fieldLabels';

type Props = {
  fields: Field[];
  value: string;
  onChange: (fieldId: string) => void;
  counts?: Record<string, number>;
};

const FieldSwatch: React.FC<{ color?: string; size?: 'md' | 'sm' }> = ({ color, size = 'md' }) => (
  <span
    className={size === 'sm' ? 'partners-field-swatch-sm' : 'partners-field-swatch'}
    style={{ '--field-accent': color || '#8a9188' } as React.CSSProperties}
    aria-hidden
  />
);

const PartnersFieldPicker: React.FC<Props> = ({ fields, value, onChange, counts = {} }) => {
  const { t } = useTranslation(['partners']);
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

  const selected = options.find((field) => field.id === value);
  const viewingAll = !value;
  const accent = selected?.color || options[0]?.color;
  const selectedCount = selected ? counts[selected.id] : undefined;
  const allCount = options.reduce((sum, field) => sum + (counts[field.id] || 0), 0);

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

  const countLabel = (n?: number) =>
    typeof n === 'number' ? t('partners:peopleOnField', { count: n }) : null;

  return (
    <div className={`partners-field-picker${open ? ' is-open' : ''}`} ref={rootRef}>
      <p className="partners-field-picker-label" id="partners-field-picker-label">
        {t('partners:fieldScope')}
      </p>
      <button
        type="button"
        className="partners-field-trigger"
        style={{ '--field-accent': accent || '#8a9188' } as React.CSSProperties}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="partners-field-picker-label partners-field-trigger-name"
        onClick={() => setOpen((next) => !next)}
      >
        {viewingAll ? (
          <span className="partners-field-cluster">
            {options.slice(0, 4).map((field) => (
              <FieldSwatch key={field.id} color={field.color} size="sm" />
            ))}
          </span>
        ) : (
          <FieldSwatch color={selected?.color} />
        )}
        <span className="partners-field-trigger-copy">
          <span id="partners-field-trigger-name" className="partners-field-trigger-name">
            {viewingAll ? t('partners:allFields') : friendlyFieldLabel(selected?.name)}
          </span>
          <span className="partners-field-trigger-meta">
            {viewingAll
              ? t('partners:fieldScopeAllHint')
              : countLabel(selectedCount) || t('partners:fieldScopeOneHint')}
          </span>
        </span>
        <ChevronDown size={18} aria-hidden />
      </button>
      {open ? (
        <ul className="partners-field-menu" role="listbox" aria-labelledby="partners-field-picker-label">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={viewingAll}
              className={`partners-field-option${viewingAll ? ' is-selected' : ''}`}
              onClick={() => choose('')}
            >
              <span className="partners-field-cluster">
                {options.slice(0, 4).map((field) => (
                  <FieldSwatch key={field.id} color={field.color} size="sm" />
                ))}
              </span>
              <span className="partners-field-option-copy">
                <span className="partners-field-option-name">{t('partners:allFields')}</span>
                <span className="partners-field-option-hint">{t('partners:fieldScopeAllHint')}</span>
              </span>
              {allCount > 0 ? <span className="partners-field-option-count">{allCount}</span> : null}
            </button>
          </li>
          {options.map((field) => {
            const active = field.id === value;
            const count = counts[field.id] || 0;
            return (
              <li key={field.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`partners-field-option${active ? ' is-selected' : ''}`}
                  style={{ '--field-accent': field.color || '#8a9188' } as React.CSSProperties}
                  onClick={() => choose(field.id)}
                >
                  <FieldSwatch color={field.color} />
                  <span className="partners-field-option-copy">
                    <span className="partners-field-option-name">{friendlyFieldLabel(field.name)}</span>
                  </span>
                  {count > 0 ? <span className="partners-field-option-count">{count}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

export default PartnersFieldPicker;
