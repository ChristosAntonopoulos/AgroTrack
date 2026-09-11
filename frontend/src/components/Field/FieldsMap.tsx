import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';
import './FieldsMap.css';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type PinState = 'default' | 'hover' | 'selected';

type FieldsMapProps = {
  fields: Field[];
  heightPx?: number;
  selectedFieldId?: string;
  hoveredFieldId?: string | null;
  onFieldSelect?: (fieldId: string) => void;
  onFieldHover?: (fieldId: string | null) => void;
  onFieldPress?: (fieldId: string) => void;
};

type MappableField = {
  field: Field;
  center: [number, number];
  polygon?: [number, number][];
};

const PIN_PATH =
  'M16 1.8C8.54 1.8 2.5 7.84 2.5 15.3c0 9.86 13.5 24.4 13.5 24.4s13.5-14.54 13.5-24.4C29.5 7.84 23.46 1.8 16 1.8z';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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

const createFieldPinIcon = (name: string, color: string, state: PinState, flipLabel = false): L.DivIcon => {
  const safeName = escapeHtml(name);
  const safeColor = /^#[0-9A-Fa-f]{6}$/i.test(color) ? color : '#2F6B4F';
  const flipClass = flipLabel ? ' fields-map-pin--flip' : '';
  return L.divIcon({
    className: `fields-map-pin-wrap fields-map-pin-wrap--${state}${flipLabel ? ' fields-map-pin-wrap--flip' : ''}`,
    html: `<div class="fields-map-pin fields-map-pin--${state}${flipClass}" style="--pin-color:${safeColor}">
      <span class="fields-map-pin-mark" aria-hidden="true">
        <svg viewBox="0 0 32 42" width="28" height="37" focusable="false">
          <ellipse cx="16" cy="39.2" rx="5.6" ry="1.65" fill="rgba(0,0,0,0.32)"/>
          <path d="${PIN_PATH}" fill="${safeColor}" stroke="rgba(255,255,255,0.78)" stroke-width="1.4"/>
          <circle cx="16" cy="15.2" r="5.45" fill="#fff"/>
          <circle cx="16" cy="15.2" r="2.4" fill="${safeColor}"/>
        </svg>
      </span>
      <span class="fields-map-pin-label">${safeName}</span>
    </div>`,
    iconSize: [28, 38],
    iconAnchor: [14, 37],
    popupAnchor: [0, -34],
  });
};

const youAreHereIcon = L.divIcon({
  className: 'fields-map-you-wrap',
  html: '<div class="fields-map-you"><span class="fields-map-you-pulse"></span><span class="fields-map-you-dot"></span></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FitBounds: React.FC<{ bounds: L.LatLngBoundsExpression | null; fieldsKey: string }> = ({
  bounds,
  fieldsKey,
}) => {
  const map = useMap();
  const lastKey = useRef('');
  useEffect(() => {
    if (!bounds || lastKey.current === fieldsKey) return;
    lastKey.current = fieldsKey;
    map.fitBounds(bounds, {
      paddingTopLeft: [36, 48],
      paddingBottomRight: [48, 88],
      maxZoom: 16,
      animate: false,
    });
  }, [map, bounds, fieldsKey]);
  return null;
};

const FocusField: React.FC<{ item: MappableField | null }> = ({ item }) => {
  const map = useMap();
  const lastId = useRef<string | null>(null);
  useEffect(() => {
    if (!item) {
      lastId.current = null;
      return;
    }
    if (lastId.current === item.field.id) return;
    lastId.current = item.field.id;
    const reduce = prefersReducedMotion();
    if (item.polygon && item.polygon.length >= 3) {
      map.fitBounds(item.polygon, {
        padding: [56, 72],
        maxZoom: 17,
        animate: !reduce,
        duration: 0.45,
      });
      return;
    }
    const zoom = Math.max(map.getZoom(), 15);
    if (reduce) map.setView(item.center, zoom);
    else map.flyTo(item.center, zoom, { duration: 0.45 });
  }, [map, item]);
  return null;
};

const PIN_SPREAD_PX = 46;

type PinLayout = {
  positions: Record<string, [number, number]>;
  flip: Record<string, boolean>;
};

const SpreadPins: React.FC<{
  items: MappableField[];
  onLayout: (layout: PinLayout) => void;
}> = ({ items, onLayout }) => {
  const map = useMap();
  const itemsKey = items.map((item) => `${item.field.id}:${item.center[0]},${item.center[1]}`).join('|');
  const onLayoutRef = useRef(onLayout);
  onLayoutRef.current = onLayout;

  useEffect(() => {
    const compute = () => {
      const points = items.map(({ field, center }) => ({
        id: field.id,
        center,
        pt: map.latLngToLayerPoint(center),
      }));
      const used = new Set<string>();
      const positions: Record<string, [number, number]> = {};
      const flip: Record<string, boolean> = {};

      for (const point of points) {
        if (used.has(point.id)) continue;
        const cluster = points.filter(
          (other) => !used.has(other.id) && point.pt.distanceTo(other.pt) < PIN_SPREAD_PX
        );
        cluster.forEach((member) => used.add(member.id));
        if (cluster.length === 1) {
          positions[point.id] = point.center;
          flip[point.id] = false;
          continue;
        }
        const radius = 26 + (cluster.length - 1) * 8;
        cluster.forEach((member, index) => {
          const angle = (2 * Math.PI * index) / cluster.length - Math.PI / 2;
          const spreadPt = L.point(
            point.pt.x + Math.cos(angle) * radius,
            point.pt.y + Math.sin(angle) * radius
          );
          const latlng = map.layerPointToLatLng(spreadPt);
          positions[member.id] = [latlng.lat, latlng.lng];
          flip[member.id] = index % 2 === 1;
        });
      }
      onLayoutRef.current({ positions, flip });
    };

    map.on('zoomend', compute);
    compute();
    return () => {
      map.off('zoomend', compute);
    };
  }, [map, items, itemsKey]);

  return null;
};

const FieldsMap: React.FC<FieldsMapProps> = ({
  fields,
  heightPx,
  selectedFieldId,
  hoveredFieldId,
  onFieldSelect,
  onFieldHover,
  onFieldPress,
}) => {
  const { t } = useTranslation('fields');
  const mappableFields = useMemo(() => resolveMappableFields(fields), [fields]);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('satellite');
  const [internalHoverId, setInternalHoverId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [pinLayout, setPinLayout] = useState<PinLayout>({ positions: {}, flip: {} });

  const hoveredId = hoveredFieldId ?? internalHoverId;

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

  const fieldsKey = useMemo(() => mappableFields.map((item) => item.field.id).join('|'), [mappableFields]);

  const pinIcons = useMemo(() => {
    const icons = new Map<string, L.DivIcon>();
    for (const { field } of mappableFields) {
      const state: PinState =
        field.id === selectedFieldId ? 'selected' : field.id === hoveredId ? 'hover' : 'default';
      icons.set(
        field.id,
        createFieldPinIcon(
          friendlyFieldLabel(field.name),
          resolveFieldColor(field.color, field.id),
          state,
          Boolean(pinLayout.flip[field.id])
        )
      );
    }
    return icons;
  }, [mappableFields, selectedFieldId, hoveredId, pinLayout.flip]);

  const defaultCenter = mappableFields[0]?.center ?? [37.05, 21.85];
  const selected = fields.find((f) => f.id === selectedFieldId) || null;
  const focusedItem = mappableFields.find((item) => item.field.id === selectedFieldId) || null;

  const selectField = (fieldId: string) => {
    onFieldSelect?.(fieldId);
  };

  const hoverClearRef = useRef<number | undefined>(undefined);

  const hoverField = (fieldId: string | null) => {
    window.clearTimeout(hoverClearRef.current);
    if (fieldId) {
      setInternalHoverId(fieldId);
      onFieldHover?.(fieldId);
      return;
    }
    hoverClearRef.current = window.setTimeout(() => {
      setInternalHoverId(null);
      onFieldHover?.(null);
    }, 50);
  };

  useEffect(() => () => window.clearTimeout(hoverClearRef.current), []);

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
    <div className="fields-map" style={heightPx ? { height: `${heightPx}px` } : undefined}>
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

        <FitBounds bounds={bounds} fieldsKey={fieldsKey} />
        <FocusField item={focusedItem} />
        <SpreadPins
          items={mappableFields}
          onLayout={(layout) => {
            setPinLayout((prev) =>
              JSON.stringify(prev) === JSON.stringify(layout) ? prev : layout
            );
          }}
        />

        {currentLocation ? (
          <Marker
            position={[currentLocation.latitude, currentLocation.longitude]}
            icon={youAreHereIcon}
            zIndexOffset={-200}
            title={t('mapYouAreHere')}
            alt={t('mapYouAreHere')}
          >
            <Popup>
              <strong>{t('mapYouAreHere')}</strong>
            </Popup>
          </Marker>
        ) : null}

        {mappableFields.map(({ field, center, polygon }) => {
          const handlers = {
            click: () => selectField(field.id),
            mouseover: () => hoverField(field.id),
            mouseout: () => hoverField(null),
          };
          const label = friendlyFieldLabel(field.name);
          const state: PinState =
            field.id === selectedFieldId ? 'selected' : field.id === hoveredId ? 'hover' : 'default';

          return (
            <React.Fragment key={field.id}>
              {polygon?.length ? (
                <Polygon
                  positions={polygon}
                  pathOptions={polygonStyle(field)}
                  eventHandlers={handlers}
                />
              ) : null}
              <Marker
                position={pinLayout.positions[field.id] || center}
                icon={pinIcons.get(field.id)}
                zIndexOffset={state === 'selected' ? 800 : state === 'hover' ? 500 : 200}
                riseOnHover
                title={label}
                alt={t('mapPinAria', { name: label })}
                eventHandlers={handlers}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>

      {selected ? (
        <button
          type="button"
          className="fields-map-preview"
          onClick={() => onFieldPress?.(selected.id)}
        >
          <div className="fields-map-preview-name">{friendlyFieldLabel(selected.name)}</div>
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
