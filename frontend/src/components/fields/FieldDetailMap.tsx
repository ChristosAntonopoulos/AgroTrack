import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { FIELD_POLYGON_STYLE, MapLayerType, SATELLITE_LABELS_TILE, SATELLITE_PLACES_TILE, SATELLITE_TILE, STREET_TILE } from '../../utils/mapLayers';
import { resolveFieldCenter, resolveFieldPolygon } from '../../utils/fieldGeo';
import './FieldDetailMap.css';

interface Props {
  field: Field;
  heightPx?: number;
}

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

const FieldDetailMap: React.FC<Props> = ({ field, heightPx = 240 }) => {
  const { t } = useTranslation('fields');
  const [mapLayer, setMapLayer] = useState<MapLayerType>('satellite');
  const center = useMemo(() => resolveFieldCenter(field), [field]);
  const polygon = useMemo(() => resolveFieldPolygon(field), [field]);

  if (!center) {
    return (
      <div className="field-detail-map field-detail-map--empty" style={{ height: heightPx }}>
        <p>{t('controlRoom.noGpsDescription')}</p>
      </div>
    );
  }

  return (
    <div className="field-detail-map" style={{ height: heightPx }}>
      <div className="field-detail-map-layer-toggle" role="group" aria-label="Map layer">
        <button
          type="button"
          className={mapLayer === 'satellite' ? 'active' : ''}
          onClick={() => setMapLayer('satellite')}
        >
          {t('addField.mapLayerSatellite')}
        </button>
        <button
          type="button"
          className={mapLayer === 'street' ? 'active' : ''}
          onClick={() => setMapLayer('street')}
        >
          {t('addField.mapLayerStreet')}
        </button>
      </div>

      <MapContainer center={center} zoom={16} scrollWheelZoom className="field-detail-map-leaflet">
        {mapLayer === 'satellite' ? (
          <>
            <TileLayer
              attribution="Tiles &copy; Esri"
              url={SATELLITE_TILE}
            />
            <TileLayer url={SATELLITE_PLACES_TILE} opacity={0.92} />
            <TileLayer url={SATELLITE_LABELS_TILE} opacity={0.55} />
          </>
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={STREET_TILE}
          />
        )}
        <FitFieldBounds polygon={polygon} center={center} />
        {polygon?.length ? <Polygon positions={polygon} pathOptions={FIELD_POLYGON_STYLE} /> : null}
      </MapContainer>
    </div>
  );
};

export default FieldDetailMap;
