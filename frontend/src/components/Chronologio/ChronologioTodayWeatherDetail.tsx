import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Field, FieldStatus } from '../../services/fieldService';
import type { FieldWeather } from '../../services/geospatialService';
import { geospatialService } from '../../services/geospatialService';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import { presentGroveWeather } from '../../weather/presentGroveWeather';
import { mergeGroveOutlook, presentGroveOutlook } from '../../weather/presentGroveOutlook';
import GroveWeatherCard from '../weather/GroveWeatherCard';

export type TodayWeatherField = Pick<Field, 'id' | 'name'> & {
  color?: string | null;
  status?: FieldStatus;
  hasPlace?: boolean;
};

type Props = {
  fields: TodayWeatherField[];
  primaryFieldId?: string;
  seed?: { fieldId: string; weather: FieldWeather };
};

const ChronologioTodayWeatherDetail: React.FC<Props> = ({ fields, primaryFieldId, seed }) => {
  const { t } = useTranslation('chronologio');
  const [byId, setById] = useState<Record<string, FieldWeather | null>>(() =>
    seed?.weather ? { [seed.fieldId]: seed.weather } : {}
  );
  const [loading, setLoading] = useState(fields.length > 0);
  const [selectedId, setSelectedId] = useState(primaryFieldId || fields[0]?.id);
  const fieldKey = fields.map((field) => field.id).join(',');

  useEffect(() => {
    if (!fields.length) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void Promise.all(fields.map((field) => geospatialService.getFieldWeather(field.id).catch(() => null))).then(
      (rows) => {
        if (cancelled) return;
        const next: Record<string, FieldWeather | null> = {};
        fields.forEach((field, index) => {
          next[field.id] = rows[index];
        });
        setById(next);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
    // fieldKey is the stable identity of this grove set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey]);

  const shownFields = fields.filter((field) => {
    if (!(field.id in byId)) return field.id === selectedId || field.id === primaryFieldId;
    return Boolean(byId[field.id]?.current);
  });
  const shownKey = shownFields.map((field) => field.id).join(',');

  useEffect(() => {
    if (selectedId && shownKey.split(',').includes(selectedId)) return;
    const next = primaryFieldId || shownKey.split(',')[0];
    if (next) setSelectedId(next);
  }, [primaryFieldId, selectedId, shownKey]);

  const selected = shownFields.find((field) => field.id === selectedId) || shownFields[0];
  const selectedWeather = (selected && byId[selected.id]) || seed?.weather || null;

  const problems = useMemo(
    () =>
      mergeGroveOutlook(
        shownFields.map((field) => ({
          fieldId: field.id,
          items: presentGroveOutlook(byId[field.id]),
        }))
      ),
    [byId, shownFields]
  );

  if (!fields.length) {
    return <p className="chrono-drawer-notes">{t('weatherPeek.empty')}</p>;
  }

  return (
    <div className="chrono-grove-peek">
      {shownFields.length > 1 ? (
        <div className="chrono-grove-peek-fields" role="tablist" aria-label={t('weatherPeek.fields')}>
          {shownFields.map((field) => {
            const view = presentGroveWeather({ field: byId[field.id] });
            const selectedField = field.id === selected?.id;
            return (
              <button
                key={field.id}
                type="button"
                role="tab"
                aria-selected={selectedField}
                className={selectedField ? 'is-selected' : undefined}
                onClick={() => setSelectedId(field.id)}
              >
                <span
                  className="chrono-drawer-field-dot"
                  style={{ background: resolveFieldColor(field.color, field.id) }}
                  aria-hidden
                />
                <span className="chrono-grove-peek-field-name">{friendlyFieldLabel(field.name)}</span>
                <span className="chrono-grove-peek-field-temp">
                  {view.temperature != null ? `${view.temperature}°` : '—'}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <GroveWeatherCard
        embedded
        fieldWeather={selectedWeather}
        fieldName={selected?.name}
      />

      <section className="chrono-grove-peek-outlook">
        <h3>{t('weatherPeek.problems')}</h3>
        {loading && problems.length === 0 ? (
          <p className="chrono-grove-peek-calm">{t('weatherPeek.loading')}</p>
        ) : problems.length === 0 ? (
          <p className="chrono-grove-peek-calm">{t('weatherPeek.calm')}</p>
        ) : (
          <ul>
            {problems.map(({ item, fieldIds }) => (
              <li key={`${item.id}-${item.window}`} className={item.harsh ? 'is-harsh' : undefined}>
                <span className="chrono-grove-peek-window">{t(`weatherPeek.window.${item.window}`)}</span>
                <div>
                  <p>{t(`weatherPeek.${item.labelKey}`, item.params)}</p>
                  {shownFields.length > 1 && fieldIds.length < shownFields.length ? (
                    <em>
                      {fieldIds
                        .map((id) => friendlyFieldLabel(shownFields.find((field) => field.id === id)?.name))
                        .join(' · ')}
                    </em>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ChronologioTodayWeatherDetail;
