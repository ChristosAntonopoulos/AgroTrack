import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/** Zoom the map with the mouse wheel while the pointer is over it. */
const MapWheelZoom: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    map.scrollWheelZoom.enable();
  }, [map]);

  return null;
};

export default MapWheelZoom;
