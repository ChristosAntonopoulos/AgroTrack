import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Search } from 'lucide-react';
import { getFieldService } from '../../services/serviceFactory';
import type { Field } from '../../services/fieldService';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import { parseFieldPageTab } from '../../utils/fieldPageQuery';
import './FieldGroveSwitcher.css';

type Props = {
  field: Field;
};

const FieldGroveSwitcher: React.FC<Props> = ({ field }) => {
  const { t } = useTranslation('fields');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = parseFieldPageTab(searchParams);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const accent = resolveFieldColor(field.color, field.id);
  const displayName = friendlyFieldLabel(field.name);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void getFieldService()
      .getFields(undefined, 'active')
      .then((list) => {
        if (!cancelled) setFields(list);
      })
      .catch(() => {
        if (!cancelled) setFields([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter((item) => {
      const name = friendlyFieldLabel(item.name).toLowerCase();
      const place = (getFieldShortLocation(item) || '').toLowerCase();
      return name.includes(q) || place.includes(q);
    });
  }, [fields, query]);

  const switchTo = (next: Field) => {
    if (next.id === field.id) {
      setOpen(false);
      return;
    }
    const params = new URLSearchParams();
    if (tab !== 'overview') params.set('tab', tab);
    const year = searchParams.get('year');
    if (year) params.set('year', year);
    const qs = params.toString();
    setOpen(false);
    navigate(`/fields/${next.id}${qs ? `?${qs}` : ''}`);
  };

  const panel = open ? (
    <div className="field-grove-switcher-panel" role="dialog" aria-label={t('switcher.title')}>
      <p className="field-grove-switcher-title">{t('switcher.title')}</p>
      <label className="field-grove-switcher-search">
        <Search size={16} aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('switcher.search')}
          autoComplete="off"
        />
      </label>
      {loading ? <p className="field-grove-switcher-note">{t('switcher.loading')}</p> : null}
      {!loading && filtered.length === 0 ? (
        <p className="field-grove-switcher-note">{t('switcher.empty')}</p>
      ) : null}
      <ul className="field-grove-switcher-list" role="listbox">
        {filtered.map((item) => {
          const selected = item.id === field.id;
          const area = formatFieldArea(item);
          const place = getFieldShortLocation(item);
          const meta = [area, place].filter(Boolean).join(' · ');
          return (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                className={selected ? 'is-selected' : undefined}
                onClick={() => switchTo(item)}
              >
                <span
                  className="field-grove-switcher-dot"
                  style={{ background: resolveFieldColor(item.color, item.id) }}
                  aria-hidden
                />
                <span className="field-grove-switcher-body">
                  <strong>{friendlyFieldLabel(item.name)}</strong>
                  {meta ? <span>{meta}</span> : null}
                </span>
                {selected ? <Check size={16} aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  ) : null;

  return (
    <div className="field-grove-switcher" ref={wrapRef}>
      <button
        type="button"
        className="field-grove-switcher-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        style={{ ['--field-accent' as string]: accent }}
      >
        <span className="field-grove-switcher-swatch" aria-hidden />
        <span className="field-grove-switcher-name">{displayName}</span>
        <ChevronDown size={18} strokeWidth={2.2} aria-hidden />
      </button>
      {typeof document !== 'undefined' && open
        ? createPortal(
            <div className="field-grove-switcher-backdrop" onClick={() => setOpen(false)} aria-hidden />,
            document.body
          )
        : null}
      {panel}
    </div>
  );
};

export default FieldGroveSwitcher;
