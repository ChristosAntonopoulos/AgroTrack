import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import {
  MapLayerType,
  MAP_FIT_MAX_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MAX_NATIVE_ZOOM,
  MAP_MIN_ZOOM,
  SATELLITE_LABELS_TILE,
  SATELLITE_PLACES_TILE,
  SATELLITE_TILE,
  STREET_TILE,
  fieldPolygonStyle,
} from '../../utils/mapLayers';
import { resolveFieldCenter, resolveFieldPolygon } from '../../utils/fieldGeo';
import { MapLayerData, MapLayerDefinition } from '../../services/geospatialService';
import { useFieldMapLayers } from '../../hooks/useFieldMapLayers';
import DataSourceInfoModal, { DataSourceInfo } from '../Common/DataSourceInfoModal';
import FieldMapOverlay, { OverlayBounds } from './FieldMapOverlay';
import MapLayerPanel from './MapLayerPanel';
import MapLayerLegend from './MapLayerLegend';
import SatelliteDateSelector from './SatelliteDateSelector';
import type { FieldWeather } from '../../services/geospatialService';
import { nextOverlayIds } from '../../utils/fieldMapPresets';
import './FieldDetailMap.css';

export type FieldMapVariant = 'peek' | 'full';

interface Props {
  field: Field;
  heightPx?: number;
  variant?: FieldMapVariant;
  weather?: FieldWeather | null;
  onOpenMapTab?: () => void;
  showDataLayers?: boolean;
  compact?: boolean;
}

const EnsureMapPanes: React.FC = () => {
  const map = useMap();
  if (!map.getPane('field-overlay')) {
    const overlayPane = map.createPane('field-overlay');
    overlayPane.style.zIndex = '450';
  }
  if (!map.getPane('field-boundary')) {
    const boundaryPane = map.createPane('field-boundary');
    boundaryPane.style.zIndex = '650';
    boundaryPane.style.pointerEvents = 'none';
  }
  return null;
};

const FitFieldBounds: React.FC<{ polygon?: [number, number][]; center: [number, number] }> = ({
  polygon,
  center,
}) => {
  const map = useMap();
  useEffect(() => {
    if (polygon?.length) {
      map.fitBounds(polygon, { padding: [16, 16], maxZoom: MAP_FIT_MAX_ZOOM, animate: false });
    } else {
      map.setView(center, Math.min(MAP_FIT_MAX_ZOOM, MAP_MAX_ZOOM));
    }
  }, [map, polygon, center]);
  return null;
};

const InvalidateOnResize: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const invalidate = () => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        map.invalidateSize({ animate: false });
      }
    };
    invalidate();
    const observer = new ResizeObserver(invalidate);
    observer.observe(container);
    if (container.parentElement) observer.observe(container.parentElement);
    return () => observer.disconnect();
  }, [map]);
  return null;
};

const CaptureMap: React.FC<{ onReady: (map: ReturnType<typeof useMap>) => void }> = ({ onReady }) => {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
};

const toLeafletBounds = (bounds?: number[]): OverlayBounds | undefined => {
  if (!bounds || bounds.length < 4) return undefined;
  return [
    [bounds[1], bounds[0]],
    [bounds[3], bounds[2]],
  ];
};

const FieldDetailMap: React.FC<Props> = ({
  field,
  heightPx = 240,
  variant = 'full',
  weather,
  onOpenMapTab,
  showDataLayers,
  compact = false,
}) => {
  const mode: FieldMapVariant =
    variant === 'peek' || showDataLayers === false || compact ? 'peek' : 'full';
  const { t, i18n } = useTranslation(['fields', 'common', 'settings']);
  const isPeek = mode === 'peek';
  const isFull = mode === 'full';
  const [baseLayer, setBaseLayer] = useState<MapLayerType>('satellite');
  const [opacity, setOpacity] = useState(0.75);
  const [layerInfo, setLayerInfo] = useState<DataSourceInfo>();
  const [leafletMap, setLeafletMap] = useState<{
    fitBounds: (b: [number, number][], o: object) => void;
    setView: (c: [number, number], z: number) => void;
  } | null>(null);
  const center = useMemo(() => resolveFieldCenter(field), [field]);
  const polygon = useMemo(() => resolveFieldPolygon(field), [field]);

  const mapLayers = useFieldMapLayers(isPeek ? undefined : field.id);
  const {
    definitions,
    activeLayer,
    activeLayers,
    activeLayerId,
    activeLayerIds,
    compareLayer,
    compareDateId,
    dates,
    selectedDateId,
    loading,
    setOverlayIds,
    selectDate,
    selectCompareDate,
  } = mapLayers;

  const overlayBounds = toLeafletBounds(activeLayer?.bounds);
  const compareBounds = toLeafletBounds(compareLayer?.bounds);
  const activeDefinition = definitions.find((d) => d.id === activeLayerId);
  const showDateDock = isFull && dates.length > 0;

  const frostLevel = String(weather?.frost?.level || '').toLowerCase();
  const showFrostNote = isFull && frostLevel && frostLevel !== 'none';

  const formatPassDate = (observationId?: string) => {
    const pass = dates.find((d) => d.observationId === observationId);
    if (!pass) return undefined;
    return new Date(pass.observationDate).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const showInfo = (definition: MapLayerDefinition, data?: MapLayerData) => {
    setLayerInfo({
      title: t(`fields:mapLayers.names.${definition.id}`, definition.name),
      source: definition.provider,
      sourceUrl: definition.sourceUrl,
      attribution: data?.attribution ?? definition.attribution,
      licence: definition.licence,
      spatialResolution: data?.spatialResolution ?? definition.spatialResolution,
      valueType: t(`fields:mapLayers.valueTypes.${definition.layerType}`, definition.layerType),
      note: t(`fields:mapLayers.notes.${definition.id}`, ''),
    });
  };

  const selectOverlay = (layerId: string | undefined) => {
    setOverlayIds(nextOverlayIds(activeLayerIds, layerId).ids);
  };

  const pickDate = (observationId: string) => {
    selectDate(observationId);
  };

  if (!center) {
    return (
      <div className="field-detail-map field-detail-map--empty" style={{ height: heightPx }}>
        <p>{t('fields:controlRoom.noGpsDescription')}</p>
      </div>
    );
  }

  return (
    <div className={`field-detail-map-wrap field-detail-map-wrap--${mode}`}>
      <div
        className={`field-detail-map field-detail-map--${mode}${isPeek ? ' field-detail-map--compact' : ''}`}
        style={isFull ? undefined : { height: heightPx }}
      >
        <div className="field-detail-map-stage">
          <div className="field-detail-map-canvas">
          <MapContainer
            center={center}
            zoom={Math.min(MAP_FIT_MAX_ZOOM, MAP_MAX_ZOOM)}
            minZoom={MAP_MIN_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
            scrollWheelZoom={false}
            className="field-detail-map-leaflet"
          >
            <EnsureMapPanes />
            {baseLayer === 'satellite' ? (
              <>
                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url={SATELLITE_TILE}
                  maxZoom={MAP_MAX_ZOOM}
                  maxNativeZoom={MAP_MAX_NATIVE_ZOOM}
                />
                <TileLayer
                  url={SATELLITE_PLACES_TILE}
                  opacity={0.92}
                  maxZoom={MAP_MAX_ZOOM}
                  maxNativeZoom={MAP_MAX_NATIVE_ZOOM}
                />
                <TileLayer
                  url={SATELLITE_LABELS_TILE}
                  opacity={0.55}
                  maxZoom={MAP_MAX_ZOOM}
                  maxNativeZoom={MAP_MAX_NATIVE_ZOOM}
                />
              </>
            ) : null}
            {baseLayer === 'street' ? (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url={STREET_TILE}
                maxZoom={MAP_MAX_ZOOM}
                maxNativeZoom={MAP_MAX_NATIVE_ZOOM}
              />
            ) : null}

            {activeLayers.map((layer) =>
              layer.available && layer.imageUrl && overlayBounds ? (
                <FieldMapOverlay
                  key={layer.layerId || layer.imageUrl}
                  imageUrl={layer.imageUrl}
                  bounds={overlayBounds}
                  opacity={opacity}
                  compareImageUrl={
                    layer.layerId === activeLayerId && compareLayer?.available
                      ? compareLayer.imageUrl
                      : undefined
                  }
                  compareBounds={compareBounds}
                  leftLabel={formatPassDate(selectedDateId)}
                  rightLabel={formatPassDate(compareDateId)}
                />
              ) : null
            )}

            {activeLayer?.available && activeLayer.tileUrlTemplate && !activeLayer.imageUrl ? (
              <TileLayer
                url={activeLayer.tileUrlTemplate}
                opacity={opacity}
                attribution={activeLayer.attribution}
              />
            ) : null}

            <CaptureMap onReady={setLeafletMap} />
            <FitFieldBounds polygon={polygon} center={center} />
            <InvalidateOnResize />
            {polygon?.length ? (
              <Polygon
                positions={polygon}
                pathOptions={fieldPolygonStyle(field.color, field.id, activeLayerId ? 'outline' : 'default')}
                pane="field-boundary"
              />
            ) : null}
          </MapContainer>

          {showFrostNote ? (
            <p className="field-map-frost-note">
              {t('fields:weather.frostRisk', { level: weather?.frost?.level || t('fields:mapWorkspace.unknownFrost') })}
            </p>
          ) : null}

          {!isPeek && activeLayer?.legend && activeDefinition ? (
            <MapLayerLegend
              legend={activeLayer.legend}
              label={t(
                `fields:mapLayers.looks.${activeDefinition.id}`,
                t(`fields:mapLayers.names.${activeDefinition.id}`, activeDefinition.name)
              )}
              attribution={activeLayer.attribution}
            />
          ) : null}

          <button
            type="button"
            className="field-map-recenter"
            onClick={() => {
              if (polygon?.length) leafletMap?.fitBounds(polygon, { padding: [16, 16], maxZoom: MAP_FIT_MAX_ZOOM });
              else leafletMap?.setView(center, Math.min(MAP_FIT_MAX_ZOOM, MAP_MAX_ZOOM));
            }}
          >
            {t('fields:mapWorkspace.recenter')}
          </button>

          {isPeek && onOpenMapTab ? (
            <button type="button" className="field-map-open-tab" onClick={onOpenMapTab}>
              {t('fields:mapWorkspace.openTab')}
            </button>
          ) : null}
        </div>

        {showDateDock ? (
          <div className="field-detail-map-dock">
            <SatelliteDateSelector
              dates={dates}
              selectedId={selectedDateId}
              onSelect={pickDate}
              compareId={compareDateId}
              onCompareSelect={selectCompareDate}
              idleHint={!activeLayerId}
            />
          </div>
        ) : null}
        </div>

        {isFull ? (
          <MapLayerPanel
            baseLayer={baseLayer}
            onBaseLayerChange={setBaseLayer}
            overlays={definitions}
            activeLayerIds={activeLayerIds}
            onSelectOverlay={selectOverlay}
            activeLayer={activeLayer}
            opacity={opacity}
            onOpacityChange={setOpacity}
            onShowInfo={showInfo}
            loading={loading}
          />
        ) : null}
      </div>

      {layerInfo ? <DataSourceInfoModal info={layerInfo} onClose={() => setLayerInfo(undefined)} /> : null}
    </div>
  );
};

export default FieldDetailMap;
