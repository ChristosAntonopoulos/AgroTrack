import React, { useEffect, useMemo } from 'react';
import { MapContainer, Polygon, TileLayer, useMap } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import { Field } from '../../services/fieldService';
import { resolveFieldPolygon } from '../../utils/fieldGeo';
import { FIELD_POLYGON_STYLE, SATELLITE_TILE } from '../../utils/mapLayers';
import './FieldPolygonThumbnail.css';

type Props = {
  field: Field;
  className?: string;
};

const FitPreview: React.FC<{ polygon: [number, number][] }> = ({ polygon }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(polygon, { padding: [10, 10], maxZoom: 18, animate: false });
    const id = window.setTimeout(() => map.invalidateSize({ animate: false }), 40);
    return () => window.clearTimeout(id);
  }, [map, polygon]);
  return null;
};

const FieldPolygonThumbnail: React.FC<Props> = ({ field, className }) => {
  const polygon = useMemo(() => resolveFieldPolygon(field), [field]);

  if (!polygon?.length) {
    return (
      <div className={`field-poly-thumb field-poly-thumb--empty ${className || ''}`} aria-hidden>
        <MapPin size={22} strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className={`field-poly-thumb ${className || ''}`} aria-hidden>
      <MapContainer
        className="field-poly-thumb-map"
        center={polygon[0]}
        zoom={16}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        trackResize
      >
        <TileLayer url={SATELLITE_TILE} />
        <Polygon positions={polygon} pathOptions={FIELD_POLYGON_STYLE} />
        <FitPreview polygon={polygon} />
      </MapContainer>
    </div>
  );
};

export default React.memo(FieldPolygonThumbnail);
