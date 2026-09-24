import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';

type Option = { value: string; label: string };

type Props = {
  id: string;
  name: string;
  value: string;
  options: Option[];
  placeholder: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
};

const VarietySelect: React.FC<Props> = ({ id, name, value, options, placeholder, onChange }) => {
  const { t } = useTranslation('fields');
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = options.find((o) => o.value === value);
  const items = useMemo(
    () => [{ value: '', label: placeholder }, ...options],
    [options, placeholder]
  );

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = items.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, value, items]);

  const pick = (next: string) => {
    onChange({ target: { name, value: next } });
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (activeIndex >= 0 && items[activeIndex]) pick(items[activeIndex].value);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((i) => (i + 1) % items.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
    }
  };

  return (
    <div className={`variety-select${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        className="variety-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? 'variety-select-value' : 'variety-select-placeholder'}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={18} className="variety-select-chevron" aria-hidden />
      </button>
      {open ? (
        <ul
          id={listId}
          className="variety-select-list"
          role="listbox"
          aria-label={t('addField.oliveVariety')}
        >
          {items.map((item, idx) => {
            const active = idx === activeIndex;
            const isSelected = item.value === value;
            return (
              <li key={item.value || '__empty'} role="presentation">
                <button
                  type="button"
                  role="option"
                  className={`variety-select-option${active ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}`}
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(item.value)}
                >
                  <span>{item.label}</span>
                  {isSelected ? <Check size={16} strokeWidth={2.4} aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

export default VarietySelect;
