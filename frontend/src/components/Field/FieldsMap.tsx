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
  FIELD_POLYGON_STYLE,
  MapLayerType,
  SATELLITE_LABELS_TILE,
  SATELLITE_TILE,
  STREET_TILE,
} from '../../utils/mapLayers';
import './FieldsMap.css';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type FieldsMapProps = {
  fields: Field[];
  heightPx?: number;
  onFieldPress?: (fieldId: string) => void;
  onStartNextTask?: (fieldId: string) => void;
  onReportIssue?: (fieldId: string) => void;
};

type MappableField = {
  field: Field;
  center: [number, number];
  polygon?: [number, number][];
};

const ASSUMED_TRAVEL_SPEED_KMH = 25;

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
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 17 });
    }
  }, [map, bounds]);
  return null;
};

const formatArea = (field: Field): string => {
  if (field.appMeasuredAreaSqm != null && field.appMeasuredAreaSqm > 0) {
    return `${Math.round(field.appMeasuredAreaSqm)} m²`;
  }
  if (field.greekCadastre?.officialAreaSqm != null) {
    return `${Math.round(field.greekCadastre.officialAreaSqm)} m²`;
  }
  if (field.area > 0) {
    return field.area < 1000 ? `${Math.round(field.area)} m²` : `${field.area} ha`;
  }
  return '—';
};

const FieldsMap: React.FC<FieldsMapProps> = ({
  fields,
  heightPx = 420,
  onFieldPress,
  onStartNextTask,
  onReportIssue,
}) => {
  const { t } = useTranslation('fields');
  const mappableFields = useMemo(() => resolveMappableFields(fields), [fields]);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('satellite');
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loc = await locationService.getCurrentLocation({ enableHighAccuracy: false, timeoutMs: 6000 });
        if (!cancelled) setCurrentLocation(loc);
      } catch (e: unknown) {
        if (!cancelled) {
          setLocationError(e instanceof Error ? e.message : 'Failed to get current location');
        }
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

  if (mappableFields.length === 0) {
    return (
      <div className="fields-map-empty">
        <div className="fields-map-empty-icon" aria-hidden>
          🗺️
        </div>
        <div className="fields-map-empty-title">{t('mapEmptyTitle')}</div>
        <div className="fields-map-empty-subtitle">{t('mapEmptyDescription')}</div>
      </div>
    );
  }

  const renderPopup = (field: Field, distanceKm: number | null, etaMinutes: number | null) => (
    <Popup>
      <div className="fields-map-popup">
        <div className="fields-map-popup-title">{field.name}</div>
        <div className="fields-map-popup-row">
          <strong>{t('card.area')}:</strong> {formatArea(field)}
        </div>
        {field.locationText ? (
          <div className="fields-map-popup-row">
            <strong>{t('addField.locationText')}:</strong> {field.locationText}
          </div>
        ) : null}
        <div className="fields-map-popup-row">
          <strong>Lifecycle:</strong> {field.currentLifecycleYear}
        </div>
        {distanceKm != null ? (
          <div className="fields-map-popup-row">
            <strong>Distance:</strong> {Math.round(distanceKm * 10) / 10} km
          </div>
        ) : null}
        {etaMinutes != null ? (
          <div className="fields-map-popup-row">
            <strong>ETA:</strong> ~{etaMinutes} min
          </div>
        ) : null}

        <div className="fields-map-popup-actions">
          <button type="button" onClick={() => onFieldPress?.(field.id)}>
            {t('card.view')}
          </button>
          {onStartNextTask ? (
            <button type="button" onClick={() => onStartNextTask(field.id)}>
              Start next task
            </button>
          ) : null}
          {onReportIssue ? (
            <button type="button" onClick={() => onReportIssue(field.id)}>
              Report issue
            </button>
          ) : null}
        </div>
        {locationError ? (
          <div className="fields-map-popup-hint">{t('mapLocationHint')}</div>
        ) : null}
      </div>
    </Popup>
  );

  return (
    <div className="fields-map" style={{ height: `${heightPx}px` }}>
      <div className="fields-map-layer-toggle" role="group" aria-label="Map layer">
        <button
          type="button"
          className={`fields-map-layer-btn ${mapLayer === 'satellite' ? 'active' : ''}`}
          onClick={() => setMapLayer('satellite')}
        >
          {t('addField.mapLayerSatellite')}
        </button>
        <button
          type="button"
          className={`fields-map-layer-btn ${mapLayer === 'street' ? 'active' : ''}`}
          onClick={() => setMapLayer('street')}
        >
          {t('addField.mapLayerStreet')}
        </button>
      </div>

      <MapContainer center={defaultCenter} zoom={13} scrollWheelZoom className="fields-map-leaflet">
        {mapLayer === 'satellite' ? (
          <>
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
              url={SATELLITE_TILE}
            />
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
              <strong>{t('addField.useCurrentLocation')}</strong>
            </Popup>
          </Marker>
        ) : null}

        {mappableFields.map(({ field, center, polygon }) => {
          const distanceKm =
            currentLocation && center
              ? locationService.calculateDistance(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  center[0],
                  center[1]
                )
              : null;
          const etaMinutes =
            distanceKm != null ? Math.max(1, Math.round((distanceKm / ASSUMED_TRAVEL_SPEED_KMH) * 60)) : null;

          if (polygon?.length) {
            return (
              <Polygon
                key={field.id}
                positions={polygon}
                pathOptions={FIELD_POLYGON_STYLE}
                eventHandlers={{ click: () => onFieldPress?.(field.id) }}
              >
                {renderPopup(field, distanceKm, etaMinutes)}
              </Polygon>
            );
          }

          return (
            <Marker
              key={field.id}
              position={center}
              eventHandlers={{ click: () => onFieldPress?.(field.id) }}
            >
              {renderPopup(field, distanceKm, etaMinutes)}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default FieldsMap;
