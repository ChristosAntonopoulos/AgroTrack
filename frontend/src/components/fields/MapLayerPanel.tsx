import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapLayerData, MapLayerDefinition } from '../../services/geospatialService';
import { MapLayerType } from '../../utils/mapLayers';
import './MapLayerPanel.css';

interface Props {
  baseLayer: MapLayerType;
  onBaseLayerChange: (layer: MapLayerType) => void;
  overlays: MapLayerDefinition[];
  activeLayerId?: string;
  onActiveLayerChange: (layerId: string | undefined) => void;
  activeLayer?: MapLayerData;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  onShowInfo: (definition: MapLayerDefinition, data?: MapLayerData) => void;
  loading?: boolean;
}

/**
 * Collapsible layer picker for the field map. Only one data overlay can be active
 * at a time: stacked index rasters cover each other and would misrepresent values.
 */
const MapLayerPanel: React.FC<Props> = ({
  baseLayer,
  onBaseLayerChange,
  overlays,
  activeLayerId,
  onActiveLayerChange,
  activeLayer,
  opacity,
  onOpacityChange,
  onShowInfo,
  loading,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const [open, setOpen] = React.useState(false);

  const activeDefinition = overlays.find((o) => o.id === activeLayerId);
  const overlayUnavailable = Boolean(activeLayerId) && activeLayer?.available === false;

  return (
    <div className={`map-layer-panel${open ? ' map-layer-panel--open' : ''}`}>
      <button
        type="button"
        className="map-layer-panel-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span aria-hidden="true">▤</span> {t('fields:mapLayers.baseLayer')}
      </button>

      {open ? (
        <div className="map-layer-panel-body">
          <fieldset>
            <legend>{t('fields:mapLayers.baseLayer')}</legend>
            <div className="map-layer-panel-segmented">
              <button
                type="button"
                className={baseLayer === 'satellite' ? 'active' : ''}
                onClick={() => onBaseLayerChange('satellite')}
              >
                {t('fields:mapLayerSatellite')}
              </button>
              <button
                type="button"
                className={baseLayer === 'street' ? 'active' : ''}
                onClick={() => onBaseLayerChange('street')}
              >
                {t('fields:mapLayerStreet')}
              </button>
            </div>
          </fieldset>

          {activeDefinition ? (
            <button
              type="button"
              className="map-layer-panel-info"
              onClick={() => onShowInfo(activeDefinition, activeLayer)}
              aria-label={t('fields:mapLayers.aboutLayer', {
                layer: t(`fields:mapLayers.names.${activeDefinition.id}`, activeDefinition.name),
              })}
            >
              i
            </button>
          ) : null}

          {activeLayerId ? (
            <div className="map-layer-panel-opacity">
              <label htmlFor="field-map-opacity">
                {t('fields:mapLayers.opacity')} <strong>{Math.round(opacity * 100)}%</strong>
              </label>
              <input
                id="field-map-opacity"
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(opacity * 100)}
                onChange={(event) => onOpacityChange(Number(event.target.value) / 100)}
              />
            </div>
          ) : null}

          {loading ? <p className="map-layer-panel-note">{t('common:loading')}</p> : null}

          {overlayUnavailable ? (
            <p className="map-layer-panel-note map-layer-panel-note--warn">
              {activeLayer?.unavailableReason ?? t('fields:mapLayers.unavailable')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default MapLayerPanel;
