import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { Field } from '../../services/fieldService';
import { locationService, Location } from '../../services/locationService';
import {
  MapLayerType,
  SATELLITE_LABELS_TILE,
  SATELLITE_PLACES_TILE,
  SATELLITE_TILE,
  STREET_TILE,
  fieldPolygonStyle,
} from '../../utils/mapLayers';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { getFieldStatusLabel } from '../../utils/fieldDisplay';
import './FieldsMap.css';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type FieldsMapProps = {
  fields: Field[];
  heightPx?: number;
  selectedFieldId?: string;
  onFieldSelect?: (fieldId: string) => void;
  onFieldPress?: (fieldId: string) => void;
};

type MappableField = {
  field: Field;
  center: [number, number];
  polygon?: [number, number][];
};

const polygonCentroid = (latlngs: [number, number][]): [number, number] => {
  let latSum = 0;
  let lngSum = 0;
  const count = latlngs.length;
  if (count === 0) return [0, 0];
  latlngs.forEach(([lat, lng]) => {
    latSum += lat;
    lngSum += lng;
  });
  return [latSum / count, lngSum / count];
};

const resolveMappableFields = (fields: Field[]): MappableField[] => {
  const results: MappableField[] = [];

  for (const field of fields) {
    const ring = field.boundary?.coordinates?.[0];
    if (ring?.length) {
      const polygon = ring.map(([lng, lat]) => [lat, lng] as [number, number]);
      const center =
        field.centerPoint?.coordinates?.length === 2
          ? ([field.centerPoint.coordinates[1], field.centerPoint.coordinates[0]] as [number, number])
          : polygonCentroid(polygon);
      results.push({ field, center, polygon });
      continue;
    }

    if (field.centerPoint?.coordinates?.length === 2) {
      results.push({
        field,
        center: [field.centerPoint.coordinates[1], field.centerPoint.coordinates[0]],
      });
      continue;
    }

    if (typeof field.latitude === 'number' && typeof field.longitude === 'number') {
      results.push({ field, center: [field.latitude, field.longitude] });
    }
  }

  return results;
};

const FitBounds: React.FC<{ bounds: L.LatLngBoundsExpression | null }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 17, animate: false });
    }
  }, [map, bounds]);
  return null;
};

const FieldsMap: React.FC<FieldsMapProps> = ({
  fields,
  heightPx = 420,
  selectedFieldId,
  onFieldSelect,
  onFieldPress,
}) => {
  const { t } = useTranslation('fields');
  const mappableFields = useMemo(() => resolveMappableFields(fields), [fields]);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('satellite');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loc = await locationService.getCurrentLocation({ enableHighAccuracy: false, timeoutMs: 6000 });
        if (!cancelled) setCurrentLocation(loc);
      } catch {
        if (!cancelled) setCurrentLocation(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bounds = useMemo((): L.LatLngBoundsExpression | null => {
    if (mappableFields.length === 0) return null;
    const points: [number, number][] = mappableFields.flatMap((item) =>
      item.polygon?.length ? item.polygon : [item.center]
    );
    return points;
  }, [mappableFields]);

  const defaultCenter = mappableFields[0]?.center ?? [37.05, 21.85];
  const selected = fields.find((f) => f.id === selectedFieldId) || null;

  const selectField = (fieldId: string) => {
    onFieldSelect?.(fieldId);
  };

  if (mappableFields.length === 0) {
    return (
      <div className="fields-map-empty">
        <div className="fields-map-empty-title">{t('mapEmptyTitle')}</div>
        <div className="fields-map-empty-subtitle">{t('mapEmptyDescription')}</div>
      </div>
    );
  }

  const polygonStyle = (field: Field) => {
    if (field.id === selectedFieldId) return fieldPolygonStyle(field.color, field.id, 'selected');
    if (field.id === hoveredId) return fieldPolygonStyle(field.color, field.id, 'hover');
    return fieldPolygonStyle(field.color, field.id);
  };

  return (
    <div className="fields-map" style={{ height: `${heightPx}px` }}>
      <div className="fields-map-layer-toggle" role="group" aria-label={t('mapLayers.baseLayer')}>
        <button
          type="button"
          className={`fields-map-layer-btn ${mapLayer === 'satellite' ? 'active' : ''}`}
          onClick={() => setMapLayer('satellite')}
        >
          {t('mapLayerSatellite')}
        </button>
        <button
          type="button"
          className={`fields-map-layer-btn ${mapLayer === 'street' ? 'active' : ''}`}
          onClick={() => setMapLayer('street')}
        >
          {t('mapLayerStreet')}
        </button>
      </div>

      <MapContainer center={defaultCenter} zoom={13} scrollWheelZoom className="fields-map-leaflet">
        {mapLayer === 'satellite' ? (
          <>
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
              url={SATELLITE_TILE}
            />
            <TileLayer attribution="" url={SATELLITE_PLACES_TILE} opacity={0.92} />
            <TileLayer attribution="" url={SATELLITE_LABELS_TILE} opacity={0.65} />
          </>
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={STREET_TILE}
          />
        )}

        <FitBounds bounds={bounds} />

        {currentLocation ? (
          <Marker position={[currentLocation.latitude, currentLocation.longitude]}>
            <Popup>
              <strong>{t('addField.useCurrentLocation', { defaultValue: t('mapLocationHint') })}</strong>
            </Popup>
          </Marker>
        ) : null}

        {mappableFields.map(({ field, center, polygon }) => {
          const handlers = {
            click: () => selectField(field.id),
            mouseover: () => setHoveredId(field.id),
            mouseout: () => setHoveredId((id) => (id === field.id ? null : id)),
          };

          if (polygon?.length) {
            return (
              <Polygon
                key={field.id}
                positions={polygon}
                pathOptions={polygonStyle(field)}
                eventHandlers={handlers}
              />
            );
          }

          return (
            <Marker key={field.id} position={center} eventHandlers={handlers} />
          );
        })}
      </MapContainer>

      {selected ? (
        <button
          type="button"
          className="fields-map-preview"
          onClick={() => onFieldPress?.(selected.id)}
        >
          <div className="fields-map-preview-name">{selected.name}</div>
          {getFieldShortLocation(selected) ? (
            <div className="fields-map-preview-place">{getFieldShortLocation(selected)}</div>
          ) : null}
          <div className="fields-map-preview-meta">
            {[getFieldStatusLabel(selected.status, t), selected.variety, formatFieldArea(selected)]
              .filter(Boolean)
              .join(' · ')}
          </div>
          <span className="fields-map-preview-open">{t('card.open')}</span>
        </button>
      ) : null}
    </div>
  );
};

export default FieldsMap;
