import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { useTranslation } from 'react-i18next';
import { GeoJsonPolygon, GreekCadastreInfo } from '../../services/fieldService';
import AreaComparisonCard from './AreaComparisonCard';
import { locationService } from '../../services/locationService';

import {
  FIELD_POLYGON_STYLE,
  MapLayerType,
  SATELLITE_LABELS_TILE,
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

const DrawControl: React.FC<{
  onCreated: (layer: L.Polygon) => void;
  onEdited: (layer: L.Polygon) => void;
  onDeleted: () => void;
  initialBoundary?: GeoJsonPolygon;
}> = ({ onCreated, onEdited, onDeleted, initialBoundary }) => {
  const map = useMap();
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());

  useEffect(() => {
    const drawnItems = drawnItemsRef.current;
    map.addLayer(drawnItems);

    if (initialBoundary?.coordinates?.[0]?.length) {
      const latlngs = initialBoundary.coordinates[0].map((c) => L.latLng(c[1], c[0]));
      const polygon = L.polygon(latlngs, FIELD_POLYGON_STYLE);
      drawnItems.addLayer(polygon);
      map.fitBounds(polygon.getBounds(), { padding: [20, 20], maxZoom: 19 });
    }

    const drawControl = new L.Control.Draw({
      draw: {
        marker: false,
        circle: false,
        circlemarker: false,
        polyline: false,
        rectangle: false,
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: FIELD_POLYGON_STYLE,
        },
      },
      edit: { featureGroup: drawnItems },
    });
    map.addControl(drawControl);

    const handleCreated = (e: L.LeafletEvent) => {
      const event = e as L.DrawEvents.Created;
      drawnItems.clearLayers();
      if (event.layer instanceof L.Polygon) {
        event.layer.setStyle(FIELD_POLYGON_STYLE);
      }
      drawnItems.addLayer(event.layer);
      if (event.layer instanceof L.Polygon) onCreated(event.layer);
    };

    const handleEdited = (e: L.LeafletEvent) => {
      const event = e as L.DrawEvents.Edited;
      event.layers.eachLayer((layer) => {
        if (layer instanceof L.Polygon) onEdited(layer);
      });
    };

    const handleDeleted = () => onDeleted();

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, [map, initialBoundary, onCreated, onEdited, onDeleted]);

  return null;
};

const polygonToGeoJson = (polygon: L.Polygon): GeoJsonPolygon => {
  const latlngs = polygon.getLatLngs()[0] as L.LatLng[];
  const ring = latlngs.map((ll) => [ll.lng, ll.lat]);
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

const MapViewUpdater: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom = 18 }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
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
  const [search, setSearch] = useState(cadastreSearch ?? '');
  const [center, setCenter] = useState<[number, number]>([37.05, 21.85]);
  const [mapZoom, setMapZoom] = useState(18);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('satellite');
  const [localMeasured, setLocalMeasured] = useState<number | undefined>(measuredAreaSqm);

  const geocodeSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
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
    if (cadastreSearch) {
      void geocodeSearch(cadastreSearch);
    }
    // Only auto-center once when cadastre reference first becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadastre?.municipality, cadastre?.prefecture, cadastre?.postalCode]);

  const handlePolygon = useCallback(
    (polygon: L.Polygon) => {
      const geo = polygonToGeoJson(polygon);
      const area = estimateAreaSqm(geo.coordinates[0]);
      setLocalMeasured(area);
      onBoundaryChange(geo, area);
    },
    [onBoundaryChange]
  );

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

  return (
    <div className="field-form-panel field-boundary-step">
      <h2>{t('addField.steps.boundary')}</h2>
      <p className="field-form-panel-desc">{t('addField.boundaryDesc')}</p>

      <div className="boundary-toolbar">
        <input
          type="text"
          className="boundary-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('addField.searchLocation')}
        />
        <button type="button" className="btn btn-outline" onClick={handleSearch}>
          {t('addField.search')}
        </button>
        <button type="button" className="btn btn-outline" onClick={handleCurrentLocation}>
          {t('addField.useCurrentLocation')}
        </button>
      </div>

      <div className="boundary-layer-toggle" role="group" aria-label="Map layer">
        <button
          type="button"
          className={`boundary-layer-btn ${mapLayer === 'satellite' ? 'active' : ''}`}
          onClick={() => setMapLayer('satellite')}
        >
          {t('addField.mapLayerSatellite')}
        </button>
        <button
          type="button"
          className={`boundary-layer-btn ${mapLayer === 'street' ? 'active' : ''}`}
          onClick={() => setMapLayer('street')}
        >
          {t('addField.mapLayerStreet')}
        </button>
      </div>

      <div className="field-boundary-map">
        <MapContainer center={center} zoom={mapZoom} style={{ height: 440, width: '100%' }}>
          {mapLayer === 'satellite' ? (
            <>
              <TileLayer
                attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
                url={SATELLITE_TILE}
              />
              <TileLayer
                attribution=""
                url={SATELLITE_LABELS_TILE}
                opacity={0.65}
              />
            </>
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={STREET_TILE}
            />
          )}
          <MapViewUpdater center={center} zoom={mapZoom} />
          <FeatureGroup>
            <DrawControl
              initialBoundary={boundary}
              onCreated={handlePolygon}
              onEdited={handlePolygon}
              onDeleted={() => {
                setLocalMeasured(undefined);
                onBoundaryChange(undefined);
              }}
            />
          </FeatureGroup>
        </MapContainer>
      </div>

      <AreaComparisonCard
        officialAreaSqm={officialAreaSqm ?? cadastre?.officialAreaSqm}
        measuredAreaSqm={localMeasured}
      />
    </div>
  );
};

export default FieldBoundaryMapStep;
