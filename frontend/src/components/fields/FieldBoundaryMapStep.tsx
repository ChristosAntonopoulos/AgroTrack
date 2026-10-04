import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Polygon, Marker, useMap, useMapEvents } from 'react-leaflet';
import MapWheelZoom from '../maps/MapWheelZoom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Crosshair, LocateFixed, Undo2, Trash2, Check, MapPin } from 'lucide-react';
import { GeoJsonPolygon, GreekCadastreInfo } from '../../services/fieldService';
import AreaComparisonCard from './AreaComparisonCard';
import LocationSearchField from './LocationSearchField';
import { locationService } from '../../services/locationService';
import {
  GREECE_CENTER,
  GREECE_REGION_ZOOM,
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
  onPlaceChange?: (place: { locationText: string; latitude: number; longitude: number }) => void;
  /** First boundary is required — one CTA beside the measured area. */
  onContinue?: () => void;
  continueLoading?: boolean;
  /** First-run: locate via search, then auto-start marking when a place is chosen. */
  activationGuide?: boolean;
  /** Grove steps, drawn on the map when the boundary fills the screen. */
  setupRail?: React.ReactNode;
  /** Leave the full-screen map. The page behind it is hidden, so this is the only way back. */
  onBack?: () => void;
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

const FitStage: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const fit = () => map.invalidateSize();
    fit();
    const id = window.setTimeout(fit, 60);
    window.addEventListener('resize', fit);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', fit);
    };
  }, [map]);
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
  onPlaceChange,
  onContinue,
  continueLoading = false,
  activationGuide = false,
  setupRail,
  onBack,
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
  const [mapZoom, setMapZoom] = useState(hasCoords(latitude, longitude) ? PLACE_ZOOM : GREECE_REGION_ZOOM);
  const [liveZoom, setLiveZoom] = useState(mapZoom);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('satellite');
  const [corners, setCorners] = useState<Corner[]>(initialCorners);
  const [phase, setPhase] = useState<DrawPhase>(initialCorners.length >= 3 ? 'done' : 'locate');
  const [localMeasured, setLocalMeasured] = useState<number | undefined>(measuredAreaSqm);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'found' | 'missing'>('idle');
  const [drawError, setDrawError] = useState<string | null>(null);

  const zoomTooLow = liveZoom < MIN_DRAW_ZOOM;

  const validationMessage = useCallback(
    (code: BoundaryValidationCode): string => t(`addField.boundaryValidation.${code}`),
    [t]
  );

  const showGreece = useCallback(() => {
    setCenter(GREECE_CENTER);
    setMapZoom(GREECE_REGION_ZOOM);
    setLocationStatus('missing');
  }, []);

  useEffect(() => {
    if (hasCoords(latitude, longitude)) {
      setCenter([latitude as number, longitude as number]);
      setMapZoom(PLACE_ZOOM);
      setLocationStatus('found');
      return;
    }
    // Cadastre-only: resolve once into the map. Free-text typing uses the dropdown pick.
    if (cadastreSearch?.trim()) {
      let cancelled = false;
      void searchPlaces(cadastreSearch, 1).then((places) => {
        if (cancelled) return;
        if (places[0]) {
          setCenter([places[0].latitude, places[0].longitude]);
          setMapZoom(PLACE_ZOOM);
          setLocationStatus('found');
          setSearch(places[0].label);
          return;
        }
        showGreece();
      });
      return () => {
        cancelled = true;
      };
    }
    showGreece();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadastre?.municipality, cadastre?.prefecture, cadastre?.postalCode, latitude, longitude]);

  const applyPlace = useCallback((label: string, lat: number, lng: number) => {
    setSearch(label);
    setCenter([lat, lng]);
    setMapZoom(PLACE_ZOOM);
    setLocationStatus('found');
    onPlaceChange?.({ locationText: label, latitude: lat, longitude: lng });
  }, [onPlaceChange]);

  const handleCurrentLocation = async () => {
    try {
      const loc = await locationService.getCurrentLocation();
      applyPlace(t('addField.useCurrentLocation'), loc.latitude, loc.longitude);
    } catch {
      /* ignore */
    }
  };

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

  useEffect(() => {
    if (!activationGuide) return;
    if (locationStatus !== 'found' || phase !== 'locate') return;
    if (zoomTooLow) return;
    setDrawError(null);
    setPhase('drawing');
  }, [activationGuide, locationStatus, phase, zoomTooLow]);

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

  const placeQuestion = phase === 'locate' || (phase === 'drawing' && corners.length === 0);
  const coachText =
    phase === 'locate'
      ? t('addField.boundaryCoachLocate')
      : phase === 'drawing'
        ? corners.length === 0 && locationStatus === 'found'
          ? t('addField.boundaryCoachFound')
          : corners.length === 0
            ? t('addField.boundaryCoachFirst')
            : corners.length < 3
              ? t('addField.boundaryCoachMore', { count: corners.length })
              : t('addField.boundaryCoachFinish')
        : t('addField.boundaryCoachDone');

  const canDragCorners = phase === 'drawing' || phase === 'done';
  const stage = Boolean(onContinue);
  const sheetLine =
    phase === 'locate'
      ? t('addField.boundarySheet.locate')
      : phase === 'drawing'
        ? corners.length < 3
          ? t('addField.boundarySheet.corners', { count: corners.length })
          : t('addField.boundarySheet.ready')
        : liveAreaLabel
          ? t('addField.boundaryAreaExplained', { area: liveAreaLabel })
          : t('addField.boundarySheet.saved');

  const searchTools = (
    <div
      className={`boundary-search-block boundary-search-block--typeahead${stage ? ' is-in-stage' : ''}`}
      data-onboarding-target="boundary-search"
    >
      <div className="boundary-toolbar boundary-toolbar--typeahead">
        <div className="boundary-typeahead">
          <LocationSearchField
            value={search}
            hideHint
            embed
            onChange={(next) => {
              setSearch(next.locationText);
              if (
                next.latitude != null &&
                next.longitude != null &&
                Number.isFinite(next.latitude) &&
                Number.isFinite(next.longitude)
              ) {
                applyPlace(next.locationText, next.latitude, next.longitude);
              } else if (!next.locationText.trim()) {
                showGreece();
              } else {
                setLocationStatus('idle');
              }
            }}
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary boundary-tool-btn boundary-locate-btn"
          onClick={() => void handleCurrentLocation()}
          aria-label={t('addField.useCurrentLocation')}
        >
          <LocateFixed size={18} aria-hidden />
          {stage ? null : <span>{t('addField.useCurrentLocation')}</span>}
        </button>
      </div>
    </div>
  );

  const stageView = (
    <div
      className={`field-boundary-step is-handoff is-stage${phase === 'done' ? ' is-ready' : ''}${onBack ? ' has-back' : ''}`}
      data-onboarding-boundary-phase={phase}
      data-onboarding-located={locationStatus === 'found' || hasCoords(latitude, longitude) ? 'true' : 'false'}
    >
      <div
        className={`field-boundary-map${phase === 'drawing' ? ' is-drawing' : ''}`}
        data-onboarding-target="boundary-map"
      >
        <MapContainer
          center={center}
          zoom={Math.min(mapZoom, MAP_MAX_ZOOM)}
          minZoom={MAP_MIN_ZOOM}
          maxZoom={MAP_MAX_ZOOM}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <MapWheelZoom />
          <FitStage />
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

        <div className="boundary-stage-top">
          {onBack ? (
            <button type="button" className="boundary-stage-back" onClick={onBack}>
              <ArrowLeft size={18} aria-hidden />
              {t('form.back')}
            </button>
          ) : null}
          {setupRail}
          {searchTools}
          {locationStatus === 'missing' && search.trim() ? (
            <p className="boundary-location-status" role="status">
              {t('addField.locationNotFound')}
            </p>
          ) : null}
        </div>

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
        </div>

        <div className="boundary-stage-sheet" role="region" aria-label={sheetLine}>
          <p className="boundary-stage-line">{sheetLine}</p>
          {drawError || (zoomTooLow && phase !== 'done') ? (
            <p className="boundary-location-status field-boundary-error" role="alert">
              {drawError || t('addField.boundaryValidation.zoomTooLow')}
            </p>
          ) : null}
          <div className="boundary-stage-actions">
            {corners.length > 0 && phase === 'drawing' ? (
              <button
                type="button"
                className="boundary-sheet-icon"
                onClick={undoCorner}
                aria-label={t('addField.boundaryUndo')}
              >
                <Undo2 size={18} aria-hidden />
              </button>
            ) : null}
            {corners.length > 0 ? (
              <button
                type="button"
                className="boundary-sheet-icon"
                onClick={clearCorners}
                aria-label={phase === 'done' ? t('addField.boundaryRedraw') : t('addField.boundaryClear')}
              >
                <Trash2 size={18} aria-hidden />
              </button>
            ) : null}
            {phase === 'done' ? (
              <button
                type="button"
                className="boundary-sheet-primary"
                onClick={onContinue}
                disabled={continueLoading}
                data-onboarding-target="boundary-save"
              >
                {t('addField.continueToChronologio')}
              </button>
            ) : phase === 'locate' ? (
              <button
                type="button"
                className="boundary-sheet-primary"
                onClick={startDrawing}
                disabled={zoomTooLow}
              >
                <Crosshair size={18} aria-hidden />
                {t('addField.boundaryStartMarking')}
              </button>
            ) : (
              <button
                type="button"
                className="boundary-sheet-primary"
                onClick={finishShape}
                disabled={corners.length < 3 || zoomTooLow}
              >
                <Check size={18} aria-hidden />
                {t('addField.boundaryFinish')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (stage) return createPortal(stageView, document.body);

  return (
    <div
      className={`field-form-panel field-boundary-step${phase === 'done' ? ' is-ready' : ''}`}
      data-onboarding-boundary-phase={phase}
      data-onboarding-located={locationStatus === 'found' || hasCoords(latitude, longitude) ? 'true' : 'false'}
    >
      <h2>{placeQuestion ? t('createGrove.placeHeading') : t('addField.steps.boundary')}</h2>
      <p className="field-form-panel-desc">{t('addField.boundaryDescFriendly')}</p>

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

      <div className="boundary-search-block boundary-search-block--typeahead" data-onboarding-target="boundary-search">
        <div className="boundary-toolbar boundary-toolbar--typeahead">
          <div className="boundary-typeahead">
            <LocationSearchField
              value={search}
              hideHint
              embed
              onChange={(next) => {
                setSearch(next.locationText);
                if (
                  next.latitude != null &&
                  next.longitude != null &&
                  Number.isFinite(next.latitude) &&
                  Number.isFinite(next.longitude)
                ) {
                  applyPlace(next.locationText, next.latitude, next.longitude);
                } else if (!next.locationText.trim()) {
                  showGreece();
                } else {
                  setLocationStatus('idle');
                }
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary boundary-tool-btn"
            onClick={() => void handleCurrentLocation()}
          >
            <LocateFixed size={18} aria-hidden />
            {t('addField.useCurrentLocation')}
          </button>
        </div>
      </div>
      {locationStatus === 'missing' && search.trim() ? (
        <p className="boundary-location-status" role="status">
          {t('addField.locationNotFound')}
        </p>
      ) : null}

      <div
        className={`field-boundary-map${phase === 'drawing' ? ' is-drawing' : ''}`}
        data-onboarding-target="boundary-map"
      >
        <MapContainer
          center={center}
          zoom={Math.min(mapZoom, MAP_MAX_ZOOM)}
          minZoom={MAP_MIN_ZOOM}
          maxZoom={MAP_MAX_ZOOM}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <MapWheelZoom />
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
        </div>

        <div className="boundary-map-actions" role="toolbar" aria-label={t('addField.boundaryGuide2')}>
          {phase === 'locate' ? (
            <button
              type="button"
              className="btn btn-primary boundary-primary-action"
              onClick={() => {
                startDrawing();
              }}
            >
              <Crosshair size={16} aria-hidden />
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
                <Undo2 size={16} aria-hidden />
                {t('addField.boundaryUndo')}
              </button>
              <button
                type="button"
                className="btn btn-secondary boundary-tool-btn"
                onClick={clearCorners}
                disabled={corners.length === 0}
              >
                <Trash2 size={16} aria-hidden />
                {t('addField.boundaryClear')}
              </button>
              <button
                type="button"
                className="btn btn-primary boundary-primary-action"
                onClick={finishShape}
                disabled={corners.length < 3 || zoomTooLow}
                title={
                  corners.length < 3
                    ? t('addField.boundaryValidation.tooFewPoints')
                    : zoomTooLow
                      ? t('addField.boundaryValidation.zoomTooLow')
                      : undefined
                }
              >
                <Check size={16} aria-hidden />
                {t('addField.boundaryFinish')}
              </button>
            </>
          ) : null}

          {phase === 'done' ? (
            <>
              <button type="button" className="btn btn-secondary boundary-tool-btn" onClick={clearCorners}>
                <Trash2 size={16} aria-hidden />
                {t('addField.boundaryRedraw')}
              </button>
              {onContinue ? null : (
                <p className="boundary-done-note">{t('addField.boundarySavedHint')}</p>
              )}
            </>
          ) : null}

          {phase === 'drawing' && corners.length > 0 && corners.length < 3 ? (
            <p className="boundary-location-status" role="status">
              {t('addField.boundaryValidation.tooFewPoints')}
            </p>
          ) : null}
        </div>
      </div>

      {corners.length > 0 ? (
        <p className="boundary-corner-count">
          {liveAreaLabel
            ? t('addField.boundaryCornerArea', { count: corners.length, area: liveAreaLabel })
            : t('addField.boundaryCornerCount', { count: corners.length })}
        </p>
      ) : null}

      {onContinue ? null : <AreaComparisonCard measuredAreaSqm={localMeasured} />}

      {phase === 'done' && liveAreaLabel && !onContinue ? (
        <div className="boundary-result">
          <p>{t('addField.boundaryAreaExplained', { area: liveAreaLabel })}</p>
        </div>
      ) : null}

      {phase === 'done' && onContinue ? (
        <div className="boundary-continue-dock" role="region">
          <p>
            {liveAreaLabel
              ? t('addField.boundaryAreaExplained', { area: liveAreaLabel })
              : t('addField.boundaryCoachDone')}
          </p>
          <button
            type="button"
            className="btn btn-primary boundary-primary-action"
            onClick={onContinue}
            disabled={continueLoading}
            data-onboarding-target="boundary-save"
          >
            {t('addField.continueToChronologio')}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default FieldBoundaryMapStep;
