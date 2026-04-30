import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { Field } from '../../services/fieldService';
import { locationService, Location } from '../../services/locationService';
import './FieldsMap.css';

// Fix default marker icons for bundlers (CRA/Webpack).
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type FieldsMapProps = {
  fields: Field[];
  heightPx?: number;
  onFieldPress?: (fieldId: string) => void;
  onStartNextTask?: (fieldId: string) => void;
  onReportIssue?: (fieldId: string) => void;
};

const FitBounds: React.FC<{ bounds: L.LatLngBoundsExpression }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, bounds]);
  return null;
};

const ASSUMED_TRAVEL_SPEED_KMH = 25;

const FieldsMap: React.FC<FieldsMapProps> = ({ fields, heightPx = 420, onFieldPress, onStartNextTask, onReportIssue }) => {
  const fieldsWithGps = useMemo(
    () => fields.filter((f) => typeof f.latitude === 'number' && typeof f.longitude === 'number'),
    [fields]
  );

  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loc = await locationService.getCurrentLocation({ enableHighAccuracy: false, timeoutMs: 6000 });
        if (!cancelled) setCurrentLocation(loc);
      } catch (e: any) {
        if (!cancelled) setLocationError(e?.message || 'Failed to get current location');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (fieldsWithGps.length === 0) {
    return (
      <div className="fields-map-empty">
        <div className="fields-map-empty-icon" aria-hidden>
          🗺️
        </div>
        <div className="fields-map-empty-title">No fields with GPS coordinates</div>
        <div className="fields-map-empty-subtitle">
          Add latitude/longitude to your fields to view them on the map.
        </div>
      </div>
    );
  }

  const bounds: L.LatLngBoundsExpression = fieldsWithGps.map((f) => [f.latitude!, f.longitude!] as [number, number]);

  // Fallback center: first field.
  const defaultCenter: [number, number] = [fieldsWithGps[0].latitude!, fieldsWithGps[0].longitude!];

  return (
    <div className="fields-map" style={{ height: `${heightPx}px` }}>
      <MapContainer center={defaultCenter} zoom={12} scrollWheelZoom className="fields-map-leaflet">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds bounds={bounds} />

        {currentLocation ? (
          <Marker position={[currentLocation.latitude, currentLocation.longitude]}>
            <Popup>
              <strong>Your location</strong>
            </Popup>
          </Marker>
        ) : null}

        {fieldsWithGps.map((field) => {
          const distanceKm =
            currentLocation && field.latitude != null && field.longitude != null
              ? locationService.calculateDistance(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  field.latitude,
                  field.longitude
                )
              : null;
          const etaMinutes =
            distanceKm != null ? Math.max(1, Math.round((distanceKm / ASSUMED_TRAVEL_SPEED_KMH) * 60)) : null;

          return (
            <Marker
              key={field.id}
              position={[field.latitude!, field.longitude!]}
              eventHandlers={{
                click: () => onFieldPress?.(field.id),
              }}
            >
              <Popup>
                <div className="fields-map-popup">
                  <div className="fields-map-popup-title">{field.name}</div>
                  <div className="fields-map-popup-row">
                    <strong>Area:</strong> {field.area} ha
                  </div>
                  <div className="fields-map-popup-row">
                    <strong>Lifecycle:</strong> {field.currentLifecycleYear}
                  </div>
                  {distanceKm != null ? (
                    <div className="fields-map-popup-row">
                      <strong>Distance:</strong> {Math.round(distanceKm * 10) / 10} km
                    </div>
                  ) : null}
                  {etaMinutes != null ? (
                    <div className="fields-map-popup-row">
                      <strong>ETA:</strong> ~{etaMinutes} min
                    </div>
                  ) : null}

                  <div className="fields-map-popup-actions">
                    <button type="button" onClick={() => onFieldPress?.(field.id)}>
                      Open
                    </button>
                    {onStartNextTask ? (
                      <button type="button" onClick={() => onStartNextTask(field.id)}>
                        Start next task
                      </button>
                    ) : null}
                    {onReportIssue ? (
                      <button type="button" onClick={() => onReportIssue(field.id)}>
                        Report issue
                      </button>
                    ) : null}
                  </div>
                  {locationError ? (
                    <div className="fields-map-popup-hint">Enable location permissions to see distances.</div>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default FieldsMap;

