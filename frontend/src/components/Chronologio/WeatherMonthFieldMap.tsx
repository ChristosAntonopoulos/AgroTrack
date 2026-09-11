import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, Polygon, TileLayer, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getFieldService } from '../../services/serviceFactory';
import { geospatialService, type FieldMapData } from '../../services/geospatialService';
import type { Field } from '../../services/fieldService';
import type { ChronologioWeatherScene } from '../../services/chronologioService';
import { SATELLITE_TILE, fieldPolygonStyle } from '../../utils/mapLayers';
import { resolveFieldCenter, resolveFieldPolygon } from '../../utils/fieldGeo';
import FieldMapOverlay, { type OverlayBounds } from '../fields/FieldMapOverlay';

type Props = {
  fieldId: string;
  opening?: ChronologioWeatherScene;
  closing?: ChronologioWeatherScene;
};

const toLeafletBounds = (bounds?: number[]): OverlayBounds | undefined => {
  if (!bounds || bounds.length < 4) return undefined;
  return [
    [bounds[1], bounds[0]],
    [bounds[3], bounds[2]],
  ];
};

const FitField: React.FC<{ polygon?: [number, number][]; center: [number, number] }> = ({
  polygon,
  center,
}) => {
  const map = useMap();
  useEffect(() => {
    if (polygon?.length) {
      map.fitBounds(polygon, { padding: [18, 18], maxZoom: 18, animate: false });
    } else {
      map.setView(center, 16);
    }
  }, [center, map, polygon]);
  return null;
};

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
    return () => observer.disconnect();
  }, [map]);
  return null;
};

const layerOf = (data?: FieldMapData) => data?.layers.find((layer) => layer.available && layer.imageUrl);

const WeatherMonthFieldMap: React.FC<Props> = ({ fieldId, opening, closing }) => {
  const { t, i18n } = useTranslation(['chronologio']);
  const navigate = useNavigate();
  const [field, setField] = useState<Field | null>(null);
  const [startData, setStartData] = useState<FieldMapData>();
  const [endData, setEndData] = useState<FieldMapData>();

  useEffect(() => {
    let cancelled = false;
    void getFieldService()
      .getField(fieldId)
      .then((next) => {
        if (!cancelled) setField(next);
      })
      .catch(() => {
        if (!cancelled) setField(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [start, end] = await Promise.all([
          opening?.observationId
            ? geospatialService.getMapData(fieldId, ['ndvi'], opening.observationId)
            : Promise.resolve(undefined),
          closing?.observationId
            ? geospatialService.getMapData(fieldId, ['ndvi'], closing.observationId)
            : Promise.resolve(undefined),
        ]);
        if (cancelled) return;
        setStartData(start);
        setEndData(end);
      } catch {
        if (!cancelled) {
          setStartData(undefined);
          setEndData(undefined);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [closing?.observationId, fieldId, opening?.observationId]);

  const center = useMemo(() => (field ? resolveFieldCenter(field) : null), [field]);
  const polygon = useMemo(() => (field ? resolveFieldPolygon(field) : undefined), [field]);
  const startLayer = layerOf(startData);
  const endLayer = layerOf(endData);
  const leftLayer = startLayer || endLayer;
  const rightLayer =
    startLayer && endLayer && startLayer.imageUrl !== endLayer.imageUrl ? endLayer : undefined;
  const bounds = toLeafletBounds(leftLayer?.bounds);
  const compareBounds = toLeafletBounds(rightLayer?.bounds);
  const formatDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
      : undefined;

  if (!center) return null;

  return (
    <div
      className="weather-snap-map"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="weather-snap-map-frame">
        <MapContainer
          center={center}
          zoom={16}
          className="weather-snap-map-leaflet"
          zoomControl={false}
          attributionControl={false}
          dragging
          scrollWheelZoom={false}
        >
          <EnsureMapPanes />
          <TileLayer url={SATELLITE_TILE} />
          <FitField polygon={polygon} center={center} />
          <InvalidateOnResize />
          {leftLayer?.imageUrl && bounds ? (
            <FieldMapOverlay
              imageUrl={leftLayer.imageUrl}
              bounds={bounds}
              opacity={0.78}
              compareImageUrl={rightLayer?.imageUrl}
              compareBounds={compareBounds}
              leftLabel={formatDate(opening?.observationDate)}
              rightLabel={formatDate(closing?.observationDate)}
            />
          ) : null}
          {polygon ? (
            <Polygon
              positions={polygon}
              pathOptions={fieldPolygonStyle(field?.color, fieldId, 'outline')}
            />
          ) : null}
        </MapContainer>
      </div>
      <div className="weather-snap-map-footer">
        <p>{t('chronologio:weatherReview.mapHint')}</p>
        <button
          type="button"
          className="weather-snap-map-open"
          onClick={() => navigate(`/fields/${fieldId}?tab=map`)}
        >
          {t('chronologio:weatherReview.openMap')}
        </button>
      </div>
    </div>
  );
};

export default WeatherMonthFieldMap;
