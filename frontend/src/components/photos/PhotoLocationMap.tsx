import React from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { STREET_TILE } from '../../utils/mapLayers';

const pinIcon = L.divIcon({
  className: 'photo-map-pin-icon',
  html: '<span class="photo-map-pin-dot"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

type Props = {
  latitude: number;
  longitude: number;
};

const PhotoLocationMap: React.FC<Props> = ({ latitude, longitude }) => (
  <div className="photo-location-map" aria-hidden>
    <MapContainer
      center={[latitude, longitude]}
      zoom={16}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      zoomControl={false}
      attributionControl={false}
      style={{ height: 180, width: '100%', borderRadius: 8 }}
    >
      <TileLayer url={STREET_TILE} />
      <Marker position={[latitude, longitude]} icon={pinIcon} />
    </MapContainer>
  </div>
);

export default PhotoLocationMap;
