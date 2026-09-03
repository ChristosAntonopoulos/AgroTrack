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
        <span aria-hidden="true">▤</span> {t('fields:mapLayers.title')}
        {activeDefinition ? <em>{t(`fields:mapLayers.names.${activeDefinition.id}`, activeDefinition.name)}</em> : null}
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
                {t('fields:addField.mapLayerSatellite')}
              </button>
              <button
                type="button"
                className={baseLayer === 'street' ? 'active' : ''}
                onClick={() => onBaseLayerChange('street')}
              >
                {t('fields:addField.mapLayerStreet')}
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend>{t('fields:mapLayers.dataOverlay')}</legend>
            <label className="map-layer-panel-option">
              <input
                type="radio"
                name="field-map-overlay"
                checked={!activeLayerId}
                onChange={() => onActiveLayerChange(undefined)}
              />
              <span>{t('fields:mapLayers.none')}</span>
            </label>

            {overlays.map((overlay) => (
              <div className="map-layer-panel-row" key={overlay.id}>
                <label className="map-layer-panel-option">
                  <input
                    type="radio"
                    name="field-map-overlay"
                    checked={activeLayerId === overlay.id}
                    onChange={() => onActiveLayerChange(overlay.id)}
                  />
                  <span>{t(`fields:mapLayers.names.${overlay.id}`, overlay.name)}</span>
                </label>
                <button
                  type="button"
                  className="map-layer-panel-info"
                  onClick={() => onShowInfo(overlay, activeLayerId === overlay.id ? activeLayer : undefined)}
                  aria-label={t('fields:mapLayers.aboutLayer', {
                    layer: t(`fields:mapLayers.names.${overlay.id}`, overlay.name),
                  })}
                >
                  i
                </button>
              </div>
            ))}

            {overlays.length === 0 ? (
              <p className="map-layer-panel-note">{t('fields:mapLayers.noOverlays')}</p>
            ) : null}
          </fieldset>

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
