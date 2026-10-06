import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Droplets, GitCompare, Image, Layers, Leaf, MapPinned, Sprout, Waves } from 'lucide-react';
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
  error?: string;
  onRetryError?: () => void;
}

/** Farmer-facing defaults; technical layers stay behind "More". */
const PRIMARY_LAYER_IDS = ['truecolor', 'ndvi', 'ndmi', 'ndwi', 'savi'];
const MORE_LAYER_IDS = ['ndvi-change', 'ndre'];
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
  error,
  onRetryError,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeLayerId = activeLayerIds[0];
  const activeDefinition = overlays.find((o) => o.id === activeLayerId);
  const overlayUnavailable = Boolean(activeLayerId) && activeLayer?.available === false;

  const { primary, more } = useMemo(() => {
    const byId = new Map(overlays.map((layer) => [layer.id, layer]));
    const primaryLayers = PRIMARY_LAYER_IDS.map((id) => byId.get(id)).filter(
      (layer): layer is MapLayerDefinition => Boolean(layer)
    );
    const moreLayers = [
      ...MORE_LAYER_IDS.map((id) => byId.get(id)).filter((layer): layer is MapLayerDefinition => Boolean(layer)),
      ...overlays.filter(
        (layer) =>
          !PRIMARY_LAYER_IDS.includes(layer.id) &&
          !MORE_LAYER_IDS.includes(layer.id) &&
          !HIDDEN_LOOK_IDS.has(layer.id)
      ),
    ];
    return { primary: primaryLayers, more: moreLayers };
  }, [overlays]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const activeLabel = activeDefinition
    ? t(`fields:mapLayers.looks.${activeDefinition.id}`, t(`fields:mapLayers.names.${activeDefinition.id}`, activeDefinition.name))
    : t('fields:mapLayers.looks.none');

  const renderOption = (id: string, definition?: MapLayerDefinition) => {
    const selected = definition ? activeLayerId === definition.id : !activeLayerId;
    const Icon = LOOK_ICON[id] ?? Leaf;
    const label = definition
      ? t(`fields:mapLayers.looks.${definition.id}`, t(`fields:mapLayers.names.${definition.id}`, definition.name))
      : t('fields:mapLayers.looks.none');
    return (
      <button
        key={id}
        type="button"
        role="radio"
        aria-checked={selected}
        className={`map-look-option${selected ? ' is-selected' : ''}`}
        onClick={() => {
          onSelectOverlay(definition?.id);
          setOpen(false);
        }}
      >
        <span className="map-look-option-row">
          <span className="map-look-radio" aria-hidden>
            {selected ? '●' : '○'}
          </span>
          <Icon size={16} strokeWidth={2.1} aria-hidden />
          <span>{label}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="map-look map-look--dock" ref={wrapRef}>
      <button
        type="button"
        className={`map-look-trigger${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <Layers size={15} strokeWidth={2.2} aria-hidden />
        <span>{t('fields:mapWorkspace.layers', { defaultValue: 'Επίπεδα' })}</span>
        <span className="map-look-trigger-active">{activeLabel}</span>
        <ChevronDown size={14} aria-hidden />
      </button>

      {open ? (
        <div className="map-look-sheet" role="dialog" aria-labelledby="field-map-look-label">
          <p className="map-look-question" id="field-map-look-label">
            {t('fields:mapWorkspace.whatToSee')}
          </p>

          <div className="map-look-options" role="radiogroup" aria-labelledby="field-map-look-label">
            {renderOption('none')}
            {primary.map((definition) => renderOption(definition.id, definition))}
            {showMore ? more.map((definition) => renderOption(definition.id, definition)) : null}
          </div>

          {more.length > 0 && !showMore ? (
            <button type="button" className="map-look-more" onClick={() => setShowMore(true)}>
              {t('fields:mapWorkspace.moreLayers', { defaultValue: 'Περισσότερα' })}
            </button>
          ) : null}

          <div className="map-look-base" role="group" aria-label={t('fields:mapLayers.baseLayer')}>
            <button
              type="button"
              className={baseLayer === 'satellite' ? 'is-active' : ''}
              aria-pressed={baseLayer === 'satellite'}
              onClick={() => onBaseLayerChange('satellite')}
            >
              {t('fields:mapLayerSatellite')}
            </button>
            <button
              type="button"
              className={baseLayer === 'street' ? 'is-active' : ''}
              aria-pressed={baseLayer === 'street'}
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

          {error ? (
            <div className="map-look-note map-look-note--warn" role="alert">
              <p>{error}</p>
              {onRetryError ? (
                <button type="button" className="map-look-about" onClick={onRetryError}>
                  {t('common:retry', { defaultValue: 'Retry' })}
                </button>
              ) : null}
            </div>
          ) : null}

          {overlayUnavailable ? (
            <p className="map-look-note map-look-note--warn">
              {activeLayer?.unavailableReason ?? t('fields:mapLayers.unavailable')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default MapLayerPanel;
