import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { Crosshair, LocateFixed, Undo2, Trash2, Check, MapPin } from 'lucide-react';
import { GeoJsonPolygon, GreekCadastreInfo } from '../../services/fieldService';
import AreaComparisonCard from './AreaComparisonCard';
import { locationService } from '../../services/locationService';
import {
  FIELD_POLYGON_STYLE,
  MapLayerType,
  SATELLITE_LABELS_TILE,
  SATELLITE_PLACES_TILE,
  SATELLITE_TILE,
  STREET_TILE,
} from '../../utils/mapLayers';

interface Props {
  boundary?: GeoJsonPolygon;
  officialAreaSqm?: number;
  cadastre?: GreekCadastreInfo;
  measuredAreaSqm?: number;
  onBoundaryChange: (boundary: GeoJsonPolygon | undefined, areaSqm?: number) => void;
}

type DrawPhase = 'locate' | 'drawing' | 'done';

type Corner = { lat: number; lng: number };

const polygonToGeoJson = (corners: Corner[]): GeoJsonPolygon => {
  const ring = corners.map((c) => [c.lng, c.lat]);
  if (ring.length > 0) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
  }
  return { type: 'Polygon', coordinates: [ring] };
};

const estimateAreaSqm = (ring: number[][]): number => {
  const rad = Math.PI / 180;
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    total += (lon2 * rad - lon1 * rad) * (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad));
  }
  return Math.abs((total * 6378137 * 6378137) / 2);
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
    map.setView(center, zoom);
  }, [map, center, zoom]);
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

const FieldBoundaryMapStep: React.FC<Props> = ({
  boundary,
  officialAreaSqm,
  cadastre,
  measuredAreaSqm,
  onBoundaryChange,
}) => {
  const { t } = useTranslation('fields');
  const cadastreSearch = buildCadastreSearchQuery(cadastre);
  const initialCorners = useMemo(() => boundaryToCorners(boundary), [boundary]);
  const [search, setSearch] = useState(cadastreSearch ?? '');
  const [center, setCenter] = useState<[number, number]>([37.05, 21.85]);
  const [mapZoom, setMapZoom] = useState(18);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('satellite');
  const [corners, setCorners] = useState<Corner[]>(initialCorners);
  const [phase, setPhase] = useState<DrawPhase>(initialCorners.length >= 3 ? 'done' : 'locate');
  const [localMeasured, setLocalMeasured] = useState<number | undefined>(measuredAreaSqm);

  const geocodeSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'Accept-Language': 'el,en' } }
      );
      const data = await res.json();
      if (data[0]) {
        setCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        setMapZoom(18);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (cadastreSearch) void geocodeSearch(cadastreSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadastre?.municipality, cadastre?.prefecture, cadastre?.postalCode]);

  const publishPolygon = useCallback(
    (nextCorners: Corner[]) => {
      if (nextCorners.length < 3) {
        setLocalMeasured(undefined);
        onBoundaryChange(undefined);
        return;
      }
      const geo = polygonToGeoJson(nextCorners);
      const area = estimateAreaSqm(geo.coordinates[0]);
      setLocalMeasured(area);
      onBoundaryChange(geo, area);
    },
    [onBoundaryChange]
  );

  const addCorner = (corner: Corner) => {
    setCorners((prev) => {
      const next = [...prev, corner];
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
  };

  const finishShape = () => {
    if (corners.length < 3) return;
    setPhase('done');
    publishPolygon(corners);
  };

  const startDrawing = () => {
    setPhase('drawing');
  };

  const handleSearch = async () => {
    await geocodeSearch(search);
  };

  const handleCurrentLocation = async () => {
    try {
      const loc = await locationService.getCurrentLocation();
      setCenter([loc.latitude, loc.longitude]);
      setMapZoom(19);
    } catch {
      /* ignore */
    }
  };

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

  return (
    <div className="field-form-panel field-boundary-step">
      <h2>{t('addField.steps.boundary')}</h2>
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

      <div className={`field-boundary-map${phase === 'drawing' ? ' is-drawing' : ''}`}>
        <MapContainer center={center} zoom={mapZoom} style={{ height: 460, width: '100%' }}>
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
          <MapViewUpdater center={center} zoom={mapZoom} />
          <TapCorners enabled={phase === 'drawing'} onAdd={addCorner} />
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
            <CircleMarker
              key={`${corner.lat}-${corner.lng}-${index}`}
              center={[corner.lat, corner.lng]}
              radius={12}
              pathOptions={{
                color: '#1C1A14',
                fillColor: '#F5C842',
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -8]} className="boundary-corner-tip">
                {index + 1}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
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
              disabled={corners.length < 3}
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

      {corners.length > 0 ? (
        <p className="boundary-corner-count">
          {t('addField.boundaryCornerCount', { count: corners.length })}
        </p>
      ) : null}

      <AreaComparisonCard
        officialAreaSqm={officialAreaSqm ?? cadastre?.officialAreaSqm}
        measuredAreaSqm={localMeasured}
      />
    </div>
  );
};

export default FieldBoundaryMapStep;
