import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { FIELD_BOUNDARY_OUTLINE, FIELD_POLYGON_STYLE, MapLayerType, SATELLITE_LABELS_TILE, SATELLITE_PLACES_TILE, SATELLITE_TILE, STREET_TILE } from '../../utils/mapLayers';
import { resolveFieldCenter, resolveFieldPolygon } from '../../utils/fieldGeo';
import { MapLayerData, MapLayerDefinition } from '../../services/geospatialService';
import { SATELLITE_LAYER_IDS, useFieldMapLayers } from '../../hooks/useFieldMapLayers';
import DataSourceInfoModal, { DataSourceInfo } from '../Common/DataSourceInfoModal';
import FieldMapOverlay, { OverlayBounds } from './FieldMapOverlay';
import MapLayerPanel from './MapLayerPanel';
import MapLayerLegend from './MapLayerLegend';
import SatelliteDateSelector from './SatelliteDateSelector';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import './FieldDetailMap.css';

interface Props {
  field: Field;
  heightPx?: number;
  /** Set to false for contexts where only the boundary matters, such as previews. */
  showDataLayers?: boolean;
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
      map.fitBounds(polygon, { padding: [16, 16], maxZoom: 18 });
    } else {
      map.setView(center, 16);
    }
  }, [map, polygon, center]);
  return null;
};

/** Backend bounds arrive as [minLng, minLat, maxLng, maxLat]; Leaflet wants lat/lng corners. */
const toLeafletBounds = (bounds?: number[]): OverlayBounds | undefined => {
  if (!bounds || bounds.length < 4) return undefined;
  return [
    [bounds[1], bounds[0]],
    [bounds[3], bounds[2]],
  ];
};

const FieldDetailMap: React.FC<Props> = ({ field, heightPx = 240, showDataLayers }) => {
  const { t } = useTranslation(['fields', 'common', 'settings']);
  const { showWidget, isEveryday, setExperienceMode } = useExperienceMode();
  const allowDataLayers =
    showDataLayers ?? showWidget('mapLayerPanel');
  const [baseLayer, setBaseLayer] = useState<MapLayerType>('satellite');
  const [opacity, setOpacity] = useState(0.5);
  const [layerInfo, setLayerInfo] = useState<DataSourceInfo>();
  const center = useMemo(() => resolveFieldCenter(field), [field]);
  const polygon = useMemo(() => resolveFieldPolygon(field), [field]);

  const mapLayers = useFieldMapLayers(allowDataLayers ? field.id : undefined);
  const {
    definitions,
    activeLayer,
    activeLayerId,
    compareLayer,
    compareDateId,
    dates,
    selectedDateId,
    loading,
    selectLayer,
    selectDate,
    selectCompareDate,
  } = mapLayers;

  const overlayBounds = toLeafletBounds(activeLayer?.bounds);
  const compareBounds = toLeafletBounds(compareLayer?.bounds);
  const satelliteLayerActive = Boolean(activeLayerId && SATELLITE_LAYER_IDS.includes(activeLayerId));
  const activeDefinition = definitions.find((d) => d.id === activeLayerId);

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

  if (!center) {
    return (
      <div className="field-detail-map field-detail-map--empty" style={{ height: heightPx }}>
        <p>{t('fields:controlRoom.noGpsDescription')}</p>
      </div>
    );
  }

  return (
    <div className="field-detail-map-wrap">
      <div className="field-detail-map" style={{ minHeight: heightPx }}>
        {allowDataLayers ? (
          <MapLayerPanel
            baseLayer={baseLayer}
            onBaseLayerChange={setBaseLayer}
            overlays={definitions}
            activeLayerId={activeLayerId}
            onActiveLayerChange={selectLayer}
            activeLayer={activeLayer}
            opacity={opacity}
            onOpacityChange={setOpacity}
            onShowInfo={showInfo}
            loading={loading}
          />
        ) : (
          <div className="field-detail-map-layer-toggle" role="group" aria-label={t('fields:mapLayers.baseLayer')}>
            <button
              type="button"
              className={baseLayer === 'satellite' ? 'active' : ''}
              onClick={() => setBaseLayer('satellite')}
            >
              {t('fields:addField.mapLayerSatellite')}
            </button>
            <button
              type="button"
              className={baseLayer === 'street' ? 'active' : ''}
              onClick={() => setBaseLayer('street')}
            >
              {t('fields:addField.mapLayerStreet')}
            </button>
            {isEveryday ? (
              <button
                type="button"
                className="field-detail-map-full-hint"
                onClick={() => setExperienceMode('full')}
              >
                {t('settings:experience.switchForDetails')}
              </button>
            ) : null}
          </div>
        )}

        <div className="field-detail-map-canvas">
        <MapContainer center={center} zoom={16} scrollWheelZoom className="field-detail-map-leaflet">
          <EnsureMapPanes />
          {baseLayer === 'satellite' ? (
            <>
              <TileLayer attribution="Tiles &copy; Esri" url={SATELLITE_TILE} />
              <TileLayer url={SATELLITE_PLACES_TILE} opacity={0.92} />
              <TileLayer url={SATELLITE_LABELS_TILE} opacity={0.55} />
            </>
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={STREET_TILE}
            />
          )}

          {activeLayer?.available && activeLayer.imageUrl && overlayBounds ? (
            <FieldMapOverlay
              imageUrl={activeLayer.imageUrl}
              bounds={overlayBounds}
              opacity={opacity}
              compareImageUrl={compareLayer?.available ? compareLayer.imageUrl : undefined}
              compareBounds={compareBounds}
            />
          ) : null}

          {activeLayer?.available && activeLayer.tileUrlTemplate && !activeLayer.imageUrl ? (
            <TileLayer
              url={activeLayer.tileUrlTemplate}
              opacity={opacity}
              attribution={activeLayer.attribution}
              pane="field-overlay"
            />
          ) : null}

          <FitFieldBounds polygon={polygon} center={center} />
          {polygon?.length ? (
            <Polygon
              positions={polygon}
              pane="field-boundary"
              pathOptions={activeLayerId ? FIELD_BOUNDARY_OUTLINE : FIELD_POLYGON_STYLE}
            />
          ) : null}
        </MapContainer>
        {activeLayer?.legend && activeDefinition ? (
          <MapLayerLegend
            legend={activeLayer.legend}
            label={t(`fields:mapLayers.names.${activeDefinition.id}`, activeDefinition.name)}
            attribution={activeLayer.attribution}
          />
        ) : null}
        </div>

        {allowDataLayers && definitions.length > 0 ? (
          <div className="field-detail-map-dock">
            <div className="field-detail-map-overlays" role="group" aria-label={t('fields:mapLayers.dataOverlay')}>
              <button
                type="button"
                className={!activeLayerId ? 'active' : ''}
                onClick={() => selectLayer(undefined)}
              >
                {t('fields:mapLayers.none')}
              </button>
              {definitions.map((definition) => (
                <button
                  type="button"
                  key={definition.id}
                  className={activeLayerId === definition.id ? 'active' : ''}
                  onClick={() => selectLayer(definition.id)}
                >
                  {t(`fields:mapLayers.names.${definition.id}`, definition.name)}
                </button>
              ))}
            </div>
            {satelliteLayerActive ? (
              <SatelliteDateSelector
                dates={dates}
                selectedId={selectedDateId}
                onSelect={selectDate}
                compareId={compareDateId}
                onCompareSelect={selectCompareDate}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {layerInfo ? <DataSourceInfoModal info={layerInfo} onClose={() => setLayerInfo(undefined)} /> : null}
    </div>
  );
};

export default FieldDetailMap;
