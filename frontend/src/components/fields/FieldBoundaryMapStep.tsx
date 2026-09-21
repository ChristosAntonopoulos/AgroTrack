import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { Crosshair, LocateFixed, Undo2, Trash2, Check, MapPin } from 'lucide-react';
import { GeoJsonPolygon, GreekCadastreInfo } from '../../services/fieldService';
import AreaComparisonCard from './AreaComparisonCard';
import { locationService } from '../../services/locationService';
import {
  GREECE_CENTER,
  GREECE_OVERVIEW_ZOOM,
  PLACE_ZOOM,
  searchPlaces,
} from '../../utils/geocodeLocation';
import {
  FIELD_POLYGON_STYLE,
  MapLayerType,
  MAP_MAX_ZOOM,
  MAP_MAX_NATIVE_ZOOM,
  MAP_MIN_ZOOM,
  SATELLITE_LABELS_TILE,
  SATELLITE_PLACES_TILE,
  SATELLITE_TILE,
  STREET_TILE,
} from '../../utils/mapLayers';
import {
  estimateGeodesicAreaSqm,
  MIN_DRAW_ZOOM,
  validateBoundaryPolygon,
  type BoundaryValidationCode,
} from '../../utils/boundaryValidation';
import { formatAreaFromSqm } from '../../utils/area';
import { normalizeLocale } from '../../i18n/config';

interface Props {
  boundary?: GeoJsonPolygon;
  cadastre?: GreekCadastreInfo;
  measuredAreaSqm?: number;
  locationQuery?: string;
  latitude?: number;
  longitude?: number;
  onBoundaryChange: (boundary: GeoJsonPolygon | undefined, areaSqm?: number) => void;
  onSkipBoundary?: () => void;
}

type DrawPhase = 'locate' | 'drawing' | 'done';

type Corner = { lat: number; lng: number };

const cornerIcon = (index: number) =>
  L.divIcon({
    className: 'boundary-corner-pin',
    html: `<span class="boundary-corner-pin-dot" aria-hidden="true">${index + 1}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const polygonToGeoJson = (corners: Corner[]): GeoJsonPolygon => {
  const ring = corners.map((c) => [c.lng, c.lat]);
  if (ring.length > 0) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
  }
  return { type: 'Polygon', coordinates: [ring] };
};

const boundaryToCorners = (boundary?: GeoJsonPolygon): Corner[] => {
  const ring = boundary?.coordinates?.[0];
  if (!ring?.length) return [];
  const open =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  return open.map(([lng, lat]) => ({ lat, lng }));
};

const MapViewUpdater: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom = 18 }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
};

const MapZoomWatcher: React.FC<{ onZoom: (zoom: number) => void }> = ({ onZoom }) => {
  const map = useMap();
  useEffect(() => {
    onZoom(map.getZoom());
    const handler = () => onZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => {
      map.off('zoomend', handler);
    };
  }, [map, onZoom]);
  return null;
};

const TapCorners: React.FC<{
  enabled: boolean;
  onAdd: (corner: Corner) => void;
}> = ({ enabled, onAdd }) => {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onAdd({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

const buildCadastreSearchQuery = (cadastre?: GreekCadastreInfo): string | undefined => {
  if (!cadastre) return undefined;
  const parts = [cadastre.municipality, cadastre.prefecture, cadastre.postalCode, 'Greece'].filter(Boolean);
  return parts.length > 1 ? parts.join(', ') : cadastre.locationFromCadastre;
};

const hasCoords = (lat?: number, lng?: number) =>
  lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

const FieldBoundaryMapStep: React.FC<Props> = ({
  boundary,
  cadastre,
  measuredAreaSqm,
  locationQuery,
  latitude,
  longitude,
  onBoundaryChange,
  onSkipBoundary,
}) => {
  const { t, i18n } = useTranslation('fields');
  const locale = normalizeLocale(i18n.language);
  const cadastreSearch = buildCadastreSearchQuery(cadastre);
  const initialQuery = cadastreSearch || locationQuery || '';
  const initialCorners = useMemo(() => boundaryToCorners(boundary), [boundary]);
  const [search, setSearch] = useState(initialQuery);
  const [center, setCenter] = useState<[number, number]>(
    hasCoords(latitude, longitude) ? [latitude as number, longitude as number] : GREECE_CENTER
  );
  const [mapZoom, setMapZoom] = useState(hasCoords(latitude, longitude) ? PLACE_ZOOM : GREECE_OVERVIEW_ZOOM);
  const [liveZoom, setLiveZoom] = useState(mapZoom);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('satellite');
  const [corners, setCorners] = useState<Corner[]>(initialCorners);
  const [phase, setPhase] = useState<DrawPhase>(initialCorners.length >= 3 ? 'done' : 'locate');
  const [localMeasured, setLocalMeasured] = useState<number | undefined>(measuredAreaSqm);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'found' | 'missing'>('idle');
  const [placeSuggestions, setPlaceSuggestions] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const zoomTooLow = liveZoom < MIN_DRAW_ZOOM;

  const validationMessage = useCallback(
    (code: BoundaryValidationCode): string => t(`addField.boundaryValidation.${code}`),
    [t]
  );

  const showGreece = useCallback(() => {
    setCenter(GREECE_CENTER);
    setMapZoom(GREECE_OVERVIEW_ZOOM);
    setLocationStatus('missing');
  }, []);

  const geocodeSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        showGreece();
        setPlaceSuggestions([]);
        return;
      }
      try {
        const places = await searchPlaces(query, 5);
        if (places[0]) {
          setCenter([places[0].latitude, places[0].longitude]);
          setMapZoom(PLACE_ZOOM);
          setLocationStatus('found');
          setPlaceSuggestions(places.slice(1).map((p) => ({ label: p.label, lat: p.latitude, lng: p.longitude })));
          return;
        }
        showGreece();
        setPlaceSuggestions([]);
      } catch {
        showGreece();
        setPlaceSuggestions([]);
      }
    },
    [showGreece]
  );

  useEffect(() => {
    if (hasCoords(latitude, longitude)) {
      setCenter([latitude as number, longitude as number]);
      setMapZoom(PLACE_ZOOM);
      setLocationStatus('found');
      return;
    }
    if (initialQuery.trim()) {
      void geocodeSearch(initialQuery);
      return;
    }
    showGreece();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadastre?.municipality, cadastre?.prefecture, cadastre?.postalCode, locationQuery, latitude, longitude]);

  const publishPolygon = useCallback(
    (nextCorners: Corner[]) => {
      if (nextCorners.length < 3) {
        setLocalMeasured(undefined);
        onBoundaryChange(undefined);
        setDrawError(null);
        return;
      }
      const geo = polygonToGeoJson(nextCorners);
      const result = validateBoundaryPolygon(geo);
      if (!result.ok) {
        setDrawError(validationMessage(result.code));
        setLocalMeasured(result.areaSqm);
        onBoundaryChange(undefined);
        return;
      }
      setLocalMeasured(result.areaSqm);
      setDrawError(result.warnLarge ? t('addField.boundaryValidation.warnLarge') : null);
      onBoundaryChange(geo, result.areaSqm);
    },
    [onBoundaryChange, t, validationMessage]
  );

  const addCorner = (corner: Corner) => {
    if (zoomTooLow) {
      setDrawError(t('addField.boundaryValidation.zoomTooLow'));
      return;
    }
    setDrawError(null);
    setCorners((prev) => [...prev, corner]);
  };

  const moveCorner = (index: number, corner: Corner) => {
    setCorners((prev) => {
      const next = prev.map((c, i) => (i === index ? corner : c));
      if (phase === 'done') {
        publishPolygon(next);
      } else if (next.length >= 3) {
        const geo = polygonToGeoJson(next);
        setLocalMeasured(estimateGeodesicAreaSqm(geo.coordinates[0]));
      }
      return next;
    });
  };

  const undoCorner = () => {
    setCorners((prev) => {
      const next = prev.slice(0, -1);
      if (phase === 'done') {
        setPhase('drawing');
        publishPolygon([]);
      }
      return next;
    });
  };

  const clearCorners = () => {
    setCorners([]);
    setLocalMeasured(undefined);
    onBoundaryChange(undefined);
    setPhase('drawing');
    setDrawError(null);
  };

  const finishShape = () => {
    if (corners.length < 3) return;
    if (zoomTooLow) {
      setDrawError(t('addField.boundaryValidation.zoomTooLow'));
      return;
    }
    const geo = polygonToGeoJson(corners);
    const result = validateBoundaryPolygon(geo, { mapZoom: liveZoom });
    if (!result.ok) {
      setDrawError(validationMessage(result.code));
      return;
    }
    setPhase('done');
    publishPolygon(corners);
  };

  const startDrawing = () => {
    if (zoomTooLow) {
      setDrawError(t('addField.boundaryValidation.zoomTooLow'));
      return;
    }
    setDrawError(null);
    setPhase('drawing');
  };

  const handleSearch = async () => {
    await geocodeSearch(search);
  };

  const handleCurrentLocation = async () => {
    try {
      const loc = await locationService.getCurrentLocation();
      setCenter([loc.latitude, loc.longitude]);
      setMapZoom(PLACE_ZOOM);
      setLocationStatus('found');
    } catch {
      /* ignore */
    }
  };

  const liveAreaLabel =
    corners.length >= 3
      ? formatAreaFromSqm(
          localMeasured ?? estimateGeodesicAreaSqm(polygonToGeoJson(corners).coordinates[0]),
          { locale }
        )
      : null;

  const previewPath = corners.length >= 2 ? corners.map((c) => [c.lat, c.lng] as [number, number]) : [];
  const closedPath =
    phase === 'done' && corners.length >= 3
      ? corners.map((c) => [c.lat, c.lng] as [number, number])
      : null;

  const coachText =
    phase === 'locate'
      ? t('addField.boundaryCoachLocate')
      : phase === 'drawing'
        ? corners.length === 0
          ? t('addField.boundaryCoachFirst')
          : corners.length < 3
            ? t('addField.boundaryCoachMore', { count: corners.length })
            : t('addField.boundaryCoachFinish')
        : t('addField.boundaryCoachDone');

  const canDragCorners = phase === 'drawing' || phase === 'done';

  return (
    <div className="field-form-panel field-boundary-step">
      <h2>{t('addField.steps.boundary')}</h2>
      <p className="field-form-panel-desc">{t('addField.boundaryDescFriendly')}</p>
      <p className="field-form-panel-desc field-boundary-optional-hint">{t('addField.boundaryOptionalHint')}</p>

      <ol className="boundary-steps-guide" aria-hidden={false}>
        <li className={phase === 'locate' ? 'is-current' : 'is-done'}>{t('addField.boundaryGuide1')}</li>
        <li className={phase === 'drawing' ? 'is-current' : phase === 'done' ? 'is-done' : ''}>
          {t('addField.boundaryGuide2')}
        </li>
        <li className={phase === 'done' ? 'is-current is-done' : ''}>{t('addField.boundaryGuide3')}</li>
      </ol>

      <div className="boundary-coach" role="status">
        <MapPin size={20} aria-hidden />
        <p>{coachText}</p>
      </div>

      {zoomTooLow && phase !== 'done' ? (
        <p className="boundary-location-status" role="status">
          {t('addField.boundaryValidation.zoomTooLow')}
        </p>
      ) : null}
      {drawError ? (
        <p className="boundary-location-status field-boundary-error" role="alert">
          {drawError}
        </p>
      ) : null}

      <div className="boundary-toolbar">
        <input
          type="search"
          className="boundary-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleSearch();
            }
          }}
          placeholder={t('addField.searchLocation')}
          aria-label={t('addField.searchLocation')}
        />
        <button type="button" className="btn btn-secondary boundary-tool-btn" onClick={handleSearch}>
          {t('addField.search')}
        </button>
        <button type="button" className="btn btn-secondary boundary-tool-btn" onClick={handleCurrentLocation}>
          <LocateFixed size={18} aria-hidden />
          {t('addField.useCurrentLocation')}
        </button>
      </div>
      {locationStatus === 'missing' && search.trim() ? (
        <p className="boundary-location-status" role="status">
          {t('addField.locationNotFound')}
        </p>
      ) : null}
      {placeSuggestions.length > 0 ? (
        <div className="boundary-place-suggestions">
          {placeSuggestions.map((place) => (
            <button
              key={`${place.lat},${place.lng},${place.label}`}
              type="button"
              className="boundary-place-chip"
              onClick={() => {
                setSearch(place.label);
                setCenter([place.lat, place.lng]);
                setMapZoom(PLACE_ZOOM);
                setLocationStatus('found');
              }}
            >
              {place.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className={`field-boundary-map${phase === 'drawing' ? ' is-drawing' : ''}`}>
        <MapContainer
          center={center}
          zoom={Math.min(mapZoom, MAP_MAX_ZOOM)}
          minZoom={MAP_MIN_ZOOM}
          maxZoom={MAP_MAX_ZOOM}
          style={{ height: '100%', width: '100%' }}
        >
          {mapLayer === 'satellite' ? (
            <>
              <TileLayer
                attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
                url={SATELLITE_TILE}
                maxZoom={MAP_MAX_ZOOM}
                maxNativeZoom={MAP_MAX_NATIVE_ZOOM}
              />
              <TileLayer
                attribution=""
                url={SATELLITE_PLACES_TILE}
                opacity={0.92}
                maxZoom={MAP_MAX_ZOOM}
                maxNativeZoom={MAP_MAX_NATIVE_ZOOM}
              />
              <TileLayer
                attribution=""
                url={SATELLITE_LABELS_TILE}
                opacity={0.65}
                maxZoom={MAP_MAX_ZOOM}
                maxNativeZoom={MAP_MAX_NATIVE_ZOOM}
              />
            </>
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={STREET_TILE}
              maxZoom={MAP_MAX_ZOOM}
              maxNativeZoom={MAP_MAX_NATIVE_ZOOM}
            />
          )}
          <MapViewUpdater center={center} zoom={mapZoom} />
          <MapZoomWatcher onZoom={setLiveZoom} />
          <TapCorners enabled={phase === 'drawing' && !zoomTooLow} onAdd={addCorner} />
          {previewPath.length >= 2 && !closedPath ? (
            <Polygon
              positions={previewPath}
              pathOptions={{
                ...FIELD_POLYGON_STYLE,
                dashArray: '6 8',
                fillOpacity: 0.08,
              }}
            />
          ) : null}
          {closedPath ? <Polygon positions={closedPath} pathOptions={FIELD_POLYGON_STYLE} /> : null}
          {corners.map((corner, index) => (
            <Marker
              key={`corner-${index}`}
              position={[corner.lat, corner.lng]}
              icon={cornerIcon(index)}
              draggable={canDragCorners}
              eventHandlers={{
                click(e) {
                  L.DomEvent.stopPropagation(e.originalEvent);
                },
                dragend(e) {
                  const { lat, lng } = e.target.getLatLng();
                  moveCorner(index, { lat, lng });
                },
              }}
              title={`${index + 1}`}
            />
          ))}
        </MapContainer>

        <div className="boundary-map-overlays">
          <div className="boundary-layer-toggle" role="group" aria-label={t('addField.mapLayerAria')}>
            <button
              type="button"
              className={`boundary-layer-btn ${mapLayer === 'satellite' ? 'active' : ''}`}
              onClick={() => setMapLayer('satellite')}
            >
              {t('mapLayerSatellite')}
            </button>
            <button
              type="button"
              className={`boundary-layer-btn ${mapLayer === 'street' ? 'active' : ''}`}
              onClick={() => setMapLayer('street')}
            >
              {t('mapLayerStreet')}
            </button>
          </div>

          <div className="boundary-action-bar">
            {phase === 'locate' ? (
              <button type="button" className="btn btn-primary boundary-primary-action" onClick={startDrawing}>
                <Crosshair size={20} aria-hidden />
                {t('addField.boundaryStartMarking')}
              </button>
            ) : null}

            {phase === 'drawing' ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary boundary-tool-btn"
                  onClick={undoCorner}
                  disabled={corners.length === 0}
                >
                  <Undo2 size={18} aria-hidden />
                  {t('addField.boundaryUndo')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary boundary-tool-btn"
                  onClick={clearCorners}
                  disabled={corners.length === 0}
                >
                  <Trash2 size={18} aria-hidden />
                  {t('addField.boundaryClear')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary boundary-primary-action"
                  onClick={finishShape}
                  disabled={corners.length < 3 || zoomTooLow}
                >
                  <Check size={20} aria-hidden />
                  {t('addField.boundaryFinish')}
                </button>
              </>
            ) : null}

            {phase === 'done' ? (
              <>
                <button type="button" className="btn btn-secondary boundary-tool-btn" onClick={clearCorners}>
                  <Trash2 size={18} aria-hidden />
                  {t('addField.boundaryRedraw')}
                </button>
                <p className="boundary-done-note">{t('addField.boundarySavedHint')}</p>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {corners.length > 0 ? (
        <p className="boundary-corner-count">
          {liveAreaLabel
            ? t('addField.boundaryCornerArea', { count: corners.length, area: liveAreaLabel })
            : t('addField.boundaryCornerCount', { count: corners.length })}
        </p>
      ) : null}

      <AreaComparisonCard measuredAreaSqm={localMeasured} />

      {onSkipBoundary ? (
        <div className="field-boundary-skip">
          {!showSkipConfirm ? (
            <button type="button" className="btn btn-outline boundary-skip-btn" onClick={() => setShowSkipConfirm(true)}>
              {t('addField.skipBoundary')}
            </button>
          ) : (
            <div className="field-boundary-skip-confirm" role="region" aria-label={t('addField.skipBoundary')}>
              <p>{t('addField.skipBoundaryConsequence')}</p>
              <div className="field-boundary-skip-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSkipConfirm(false)}>
                  {t('form.back')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    clearCorners();
                    setPhase('locate');
                    onSkipBoundary();
                  }}
                >
                  {t('addField.skipBoundaryConfirm')}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default FieldBoundaryMapStep;
