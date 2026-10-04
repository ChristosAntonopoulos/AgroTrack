import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Loader2 } from 'lucide-react';
import { searchPlaces, type GeocodedPlace } from '../../utils/geocodeLocation';

type Props = {
  value: string;
  onChange: (next: { locationText: string; latitude?: number; longitude?: number }) => void;
  /** Hide the field-level hint when the parent already explains optionality. */
  hideHint?: boolean;
  /** Embed in a parent toolbar — no label/optional chrome. */
  embed?: boolean;
};

type MenuBox = { top: number; left: number; width: number };

const splitPlaceLabel = (label: string): { primary: string; secondary?: string } => {
  const parts = label.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return { primary: label };
  return { primary: parts[0], secondary: parts.slice(1).join(', ') };
};

const LocationSearchField: React.FC<Props> = ({ value, onChange, hideHint = false, embed = false }) => {
  const { t } = useTranslation('fields');
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** Last label chosen from the list — do not search or reopen suggestions for it. */
  const committedQuery = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searched, setSearched] = useState(false);
  const [menuBox, setMenuBox] = useState<MenuBox | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (committedQuery.current && committedQuery.current === q) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      setSearched(false);
      setActiveIndex(-1);
      return;
    }
    if (committedQuery.current && committedQuery.current !== q) {
      committedQuery.current = null;
    }
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setSearched(false);
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSearched(false);
    const timer = window.setTimeout(() => {
      void searchPlaces(q)
        .then((places) => {
          if (!cancelled) {
            setSuggestions(places);
            setActiveIndex(places.length > 0 ? 0 : -1);
            setOpen(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
            setActiveIndex(-1);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
            setSearched(true);
          }
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  const showList = open && value.trim().length >= 2 && (loading || searched);

  useLayoutEffect(() => {
    if (!showList) {
      setMenuBox(null);
      return;
    }
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuBox({
        top: r.bottom + 6,
        left: r.left,
        width: r.width,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [showList, suggestions.length, loading]);

  const pick = (place: GeocodedPlace) => {
    committedQuery.current = place.label.trim();
    onChange({
      locationText: place.label,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList || (!loading && suggestions.length === 0 && !searched)) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (suggestions.length === 0 ? -1 : (i + 1) % suggestions.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) =>
        suggestions.length === 0 ? -1 : i <= 0 ? suggestions.length - 1 : i - 1
      );
      return;
    }
    if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      pick(suggestions[activeIndex]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const results =
    showList && menuBox
      ? createPortal(
          <ul
            id={listId}
            ref={listRef}
            className="location-search-results location-search-results--portal"
            role="listbox"
            style={{
              top: menuBox.top,
              left: menuBox.left,
              width: menuBox.width,
            }}
          >
            {loading && suggestions.length === 0 ? (
              <li className="location-search-status" role="presentation">
                {t('addField.locationSearching')}
              </li>
            ) : null}
            {!loading && searched && suggestions.length === 0 ? (
              <li className="location-search-status" role="presentation">
                {t('createGrove.place.noResults')}
              </li>
            ) : null}
            {suggestions.map((place, idx) => {
              const { primary, secondary } = splitPlaceLabel(place.label);
              const active = idx === activeIndex;
              return (
                <li key={`${place.latitude},${place.longitude},${place.label}`} role="presentation">
                  <button
                    type="button"
                    id={`${listId}-opt-${idx}`}
                    role="option"
                    className={`location-search-option${active ? ' is-active' : ''}`}
                    aria-selected={active}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(place)}
                  >
                    <span className="location-search-option-icon" aria-hidden>
                      <MapPin size={16} strokeWidth={2} />
                    </span>
                    <span className="location-search-option-copy">
                      <span className="location-search-option-primary">{primary}</span>
                      {secondary ? (
                        <span className="location-search-option-secondary">{secondary}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  return (
    <div className={`location-search${showList ? ' is-open' : ''}${embed ? ' is-embed' : ''}`} ref={rootRef}>
      {!embed ? (
        <div className="location-search-label-row">
          <label htmlFor={listId + '-input'}>{t('addField.locationText')}</label>
          <span className="location-search-optional">{t('createGrove.optional')}</span>
        </div>
      ) : null}
      <div ref={wrapRef} className={`location-search-input-wrap${showList ? ' is-open' : ''}`}>
        <MapPin size={18} className="location-search-icon" aria-hidden />
        <input
          type="search"
          id={listId + '-input'}
          name="locationText"
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={t('addField.searchLocation')}
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
          }
          value={value}
          onChange={(e) => {
            onChange({ locationText: e.target.value });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('createGrove.place.placeholder', {
            defaultValue: t('addField.searchLocation'),
          })}
        />
        {loading ? (
          <Loader2 size={16} className="location-search-spinner" aria-hidden />
        ) : null}
      </div>
      {results}
      {!hideHint && !embed ? (
        <p className="field-form-hint location-search-hint">{t('createGrove.place.canWait')}</p>
      ) : null}
    </div>
  );
};

export default LocationSearchField;
