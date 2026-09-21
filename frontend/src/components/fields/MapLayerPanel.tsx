import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Droplets, GitCompare, Image, Leaf, MapPinned, Sprout, Waves } from 'lucide-react';
import { MapLayerData, MapLayerDefinition } from '../../services/geospatialService';
import { MapLayerType } from '../../utils/mapLayers';
import './MapLayerPanel.css';

interface Props {
  baseLayer: MapLayerType;
  onBaseLayerChange: (layer: MapLayerType) => void;
  overlays: MapLayerDefinition[];
  activeLayerIds: string[];
  onSelectOverlay: (layerId: string | undefined) => void;
  activeLayer?: MapLayerData;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  onShowInfo: (definition: MapLayerDefinition, data?: MapLayerData) => void;
  loading?: boolean;
}

const PRIMARY_LAYER_IDS = ['truecolor', 'ndvi', 'ndvi-change', 'ndmi'];
const HIDDEN_LOOK_IDS = new Set(['land-cover', 'cadastre']);

const LOOK_ICON: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  none: MapPinned,
  truecolor: Image,
  ndvi: Leaf,
  'ndvi-change': GitCompare,
  ndmi: Droplets,
  ndre: Leaf,
  ndwi: Waves,
  savi: Sprout,
};

const splitOverlays = (overlays: MapLayerDefinition[]) => {
  const byId = new Map(overlays.map((layer) => [layer.id, layer]));
  const primary = PRIMARY_LAYER_IDS.map((id) => byId.get(id)).filter(
    (layer): layer is MapLayerDefinition => Boolean(layer)
  );
  const more = overlays.filter(
    (layer) => !PRIMARY_LAYER_IDS.includes(layer.id) && !HIDDEN_LOOK_IDS.has(layer.id)
  );
  return { primary, more };
};

const MapLayerPanel: React.FC<Props> = ({
  baseLayer,
  onBaseLayerChange,
  overlays,
  activeLayerIds,
  onSelectOverlay,
  activeLayer,
  opacity,
  onOpacityChange,
  onShowInfo,
  loading,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const activeLayerId = activeLayerIds[0];
  const activeDefinition = overlays.find((o) => o.id === activeLayerId);
  const overlayUnavailable = Boolean(activeLayerId) && activeLayer?.available === false;
  const { primary, more } = useMemo(() => splitOverlays(overlays), [overlays]);

  const renderOption = (id: string, definition?: MapLayerDefinition) => {
    const selected = definition ? activeLayerId === definition.id : !activeLayerId;
    const Icon = LOOK_ICON[id] ?? Leaf;
    const label = definition
      ? t(`fields:mapLayers.looks.${definition.id}`, t(`fields:mapLayers.names.${definition.id}`, definition.name))
      : t('fields:mapLayers.looks.none');
    const why = selected
      ? definition
        ? t(`fields:mapLayers.notes.${definition.id}`, '')
        : t('fields:mapLayers.looks.noneWhy')
      : '';
    return (
      <button
        key={id}
        type="button"
        role="radio"
        aria-checked={selected}
        className={`map-look-option${selected ? ' is-selected' : ''}`}
        onClick={() => onSelectOverlay(definition?.id)}
      >
        <span className="map-look-option-row">
          <Icon size={16} strokeWidth={2.1} aria-hidden />
          <span>{label}</span>
        </span>
        {why ? <span className="map-look-option-why">{why}</span> : null}
      </button>
    );
  };

  return (
    <aside className="map-look" aria-labelledby="field-map-look-label">
      <p className="map-look-question" id="field-map-look-label">
        {t('fields:mapWorkspace.whatToSee')}
      </p>

      <div className="map-look-options" role="radiogroup" aria-labelledby="field-map-look-label">
        {renderOption('none')}
        {primary.map((definition) => renderOption(definition.id, definition))}
        {more.map((definition) => renderOption(definition.id, definition))}
      </div>

      <div className="map-look-base" role="group" aria-label={t('fields:mapLayers.baseLayer')}>
        <button
          type="button"
          className={baseLayer === 'satellite' ? 'is-active' : ''}
          onClick={() => onBaseLayerChange('satellite')}
        >
          {t('fields:mapLayerSatellite')}
        </button>
        <button
          type="button"
          className={baseLayer === 'street' ? 'is-active' : ''}
          onClick={() => onBaseLayerChange('street')}
        >
          {t('fields:mapLayerStreet')}
        </button>
      </div>

      {activeDefinition ? (
        <div className="map-look-tools">
          <label className="map-look-opacity" htmlFor="field-map-opacity">
            <span>
              {t('fields:mapLayers.looks.intensity')} {Math.round(opacity * 100)}%
            </span>
            <input
              id="field-map-opacity"
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(opacity * 100)}
              onChange={(event) => onOpacityChange(Number(event.target.value) / 100)}
            />
          </label>
          <button
            type="button"
            className="map-look-about"
            onClick={() => onShowInfo(activeDefinition, activeLayer)}
          >
            {t('fields:mapLayers.aboutLayer', {
              layer: t(`fields:mapLayers.looks.${activeDefinition.id}`, activeDefinition.name),
            })}
          </button>
        </div>
      ) : null}

      {loading ? <p className="map-look-note">{t('common:loading')}</p> : null}

      {overlayUnavailable ? (
        <p className="map-look-note map-look-note--warn">
          {activeLayer?.unavailableReason ?? t('fields:mapLayers.unavailable')}
        </p>
      ) : null}
    </aside>
  );
};

export default MapLayerPanel;
