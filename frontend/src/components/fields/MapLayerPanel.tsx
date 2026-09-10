import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers } from 'lucide-react';
import { MapLayerData, MapLayerDefinition } from '../../services/geospatialService';
import { MapLayerType } from '../../utils/mapLayers';
import './MapLayerPanel.css';

interface Props {
  baseLayer: MapLayerType;
  onBaseLayerChange: (layer: MapLayerType) => void;
  overlays: MapLayerDefinition[];
  activeLayerIds: string[];
  onToggleOverlay: (layerId: string | undefined) => void;
  activeLayer?: MapLayerData;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  onShowInfo: (definition: MapLayerDefinition, data?: MapLayerData) => void;
  loading?: boolean;
  capReached?: boolean;
}

/** First-look layers, in the order a grower typically wants (photo → greenness → change → moisture). */
const PRIMARY_LAYER_IDS = ['truecolor', 'ndvi', 'ndvi-change', 'ndmi'];

const splitOverlays = (overlays: MapLayerDefinition[]) => {
  const byId = new Map(overlays.map((layer) => [layer.id, layer]));
  const primary = PRIMARY_LAYER_IDS.map((id) => byId.get(id)).filter(
    (layer): layer is MapLayerDefinition => Boolean(layer)
  );
  const more = overlays.filter((layer) => !PRIMARY_LAYER_IDS.includes(layer.id));
  return { primary, more };
};

/**
 * On-map layer picker. One data overlay at a time — stacked index rasters would
 * cover each other and misrepresent values.
 */
const MapLayerPanel: React.FC<Props> = ({
  baseLayer,
  onBaseLayerChange,
  overlays,
  activeLayerIds,
  onToggleOverlay,
  activeLayer,
  opacity,
  onOpacityChange,
  onShowInfo,
  loading,
  capReached,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeLayerId = activeLayerIds[0];
  const activeDefinition = overlays.find((o) => o.id === activeLayerId);
  const overlayUnavailable = Boolean(activeLayerId) && activeLayer?.available === false;
  const { primary, more } = useMemo(() => splitOverlays(overlays), [overlays]);

  useEffect(() => {
    if (activeLayerId && more.some((layer) => layer.id === activeLayerId)) {
      setShowMore(true);
    }
  }, [activeLayerId, more]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const currentLabel = activeDefinition
    ? t(`fields:mapLayers.names.${activeDefinition.id}`, activeDefinition.name)
    : t('fields:mapLayers.none');

  const renderOption = (definition: MapLayerDefinition | undefined, id: string, label: string) => {
    const selected = definition ? activeLayerIds.includes(definition.id) : activeLayerIds.length === 0;
    return (
      <label key={id} className={`map-layer-panel-option${selected ? ' is-selected' : ''}`}>
        <input
          type={definition ? 'checkbox' : 'radio'}
          name={definition ? `overlay-${id}` : 'field-map-overlay-none'}
          checked={selected}
          onChange={() => onToggleOverlay(definition?.id)}
        />
        <span>{label}</span>
      </label>
    );
  };

  return (
    <div ref={rootRef} className={`map-layer-panel${open ? ' map-layer-panel--open' : ''}`}>
      <button
        type="button"
        className="map-layer-panel-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={t('fields:mapLayers.title')}
      >
        <Layers size={15} strokeWidth={2} aria-hidden />
        <span>{t('fields:mapLayers.layers')}</span>
        <em>{currentLabel}</em>
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
                className={baseLayer === 'terrain' ? 'active' : ''}
                onClick={() => onBaseLayerChange('terrain')}
              >
                {t('fields:mapWorkspace.terrain')}
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

          <fieldset>
            <legend>{t('fields:mapLayers.dataOverlay')}</legend>
            {renderOption(undefined, 'none', t('fields:mapLayers.none'))}
            {primary.map((definition) =>
              renderOption(
                definition,
                definition.id,
                t(`fields:mapLayers.names.${definition.id}`, definition.name)
              )
            )}
            {more.length > 0 && showMore
              ? more.map((definition) =>
                  renderOption(
                    definition,
                    definition.id,
                    t(`fields:mapLayers.names.${definition.id}`, definition.name)
                  )
                )
              : null}
            {more.length > 0 ? (
              <button
                type="button"
                className="map-layer-panel-more"
                onClick={() => setShowMore((value) => !value)}
              >
                {showMore ? t('fields:mapLayers.lessLayers') : t('fields:mapLayers.moreLayers')}
              </button>
            ) : null}
          </fieldset>

          {activeDefinition ? (
            <button
              type="button"
              className="map-layer-panel-about"
              onClick={() => onShowInfo(activeDefinition, activeLayer)}
            >
              {t('fields:mapLayers.aboutLayer', {
                layer: t(`fields:mapLayers.names.${activeDefinition.id}`, activeDefinition.name),
              })}
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

          {capReached ? (
            <p className="map-layer-panel-note map-layer-panel-note--warn">
              {t('fields:mapWorkspace.overlayCap')}
            </p>
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
