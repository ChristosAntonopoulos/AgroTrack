import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { searchPlaces, type GeocodedPlace } from '../../utils/geocodeLocation';

type Props = {
  value: string;
  onChange: (next: { locationText: string; latitude?: number; longitude?: number }) => void;
};

const LocationSearchField: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation('fields');
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void searchPlaces(q)
        .then((places) => {
          if (!cancelled) setSuggestions(places);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  const pick = (place: GeocodedPlace) => {
    onChange({
      locationText: place.label,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="location-search" ref={rootRef}>
      <label htmlFor="locationText">{t('addField.locationText')}</label>
      <div className="location-search-input-wrap">
        <MapPin size={18} className="location-search-icon" aria-hidden />
        <input
          type="search"
          id="locationText"
          name="locationText"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          value={value}
          onChange={(e) => {
            onChange({ locationText: e.target.value });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t('addField.locationPlaceholder')}
        />
      </div>
      <p className="field-form-hint">{t('addField.locationHint')}</p>
      {open && (loading || suggestions.length > 0) ? (
        <ul id={listId} className="location-search-results" role="listbox">
          {loading && suggestions.length === 0 ? (
            <li className="location-search-status">{t('addField.locationSearching')}</li>
          ) : (
            suggestions.map((place) => (
              <li key={`${place.latitude},${place.longitude},${place.label}`}>
                <button
                  type="button"
                  role="option"
                  className="location-search-option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(place)}
                >
                  <MapPin size={16} aria-hidden />
                  <span>{place.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
};

export default LocationSearchField;
