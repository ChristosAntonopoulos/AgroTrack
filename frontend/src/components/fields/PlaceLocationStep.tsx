import React, { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import LocationSearchField from './LocationSearchField';
import {
  GREECE_CENTER,
  GREECE_REGION_ZOOM,
  PLACE_ZOOM,
} from '../../utils/geocodeLocation';
import {
  MAP_MAX_ZOOM,
  SATELLITE_LABELS_TILE,
  SATELLITE_PLACES_TILE,
  SATELLITE_TILE,
} from '../../utils/mapLayers';
import 'leaflet/dist/leaflet.css';

type Props = {
  locationText: string;
  latitude?: number;
  longitude?: number;
  mode: 'search' | 'myLocation';
  onChange: (next: { locationText: string; latitude?: number; longitude?: number }) => void;
};

const pinIcon = L.divIcon({
  className: 'place-location-pin',
  html: '<span class="place-location-pin-dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const ClickToPlace: React.FC<{
  onPick: (lat: number, lng: number) => void;
}> = ({ onPick }) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const hasCoords = (lat?: number, lng?: number) =>
  lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

const PlaceLocationStep: React.FC<Props> = ({
  locationText,
  latitude,
  longitude,
  mode,
  onChange,
}) => {
  const { t } = useTranslation('fields');
  const [center, setCenter] = useState<[number, number]>(
    hasCoords(latitude, longitude) ? [latitude as number, longitude as number] : GREECE_CENTER
  );
  const [zoom, setZoom] = useState(hasCoords(latitude, longitude) ? PLACE_ZOOM : GREECE_REGION_ZOOM);
  const [geoError, setGeoError] = useState<string | null>(null);

  const applyCoords = useCallback(
    (lat: number, lng: number, label?: string) => {
      setCenter([lat, lng]);
      setZoom(PLACE_ZOOM);
      onChange({
        locationText: label ?? locationText,
        latitude: lat,
        longitude: lng,
      });
    },
    [locationText, onChange]
  );

  useEffect(() => {
    if (mode !== 'myLocation' || hasCoords(latitude, longitude)) return;
    if (!navigator.geolocation) {
      setGeoError(t('createGrove.placement.geoUnavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoords(pos.coords.latitude, pos.coords.longitude, locationText || t('createGrove.placement.nearMe'));
      },
      () => setGeoError(t('createGrove.placement.geoDenied')),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [mode, latitude, longitude, applyCoords, locationText, t]);

  return (
    <div className="field-form-panel place-location-step">
      <h2>{t('createGrove.place.title')}</h2>
      <p className="field-form-panel-desc">{t('createGrove.place.subtitle')}</p>
      <p className="field-form-hint place-location-can-wait">{t('createGrove.place.canWait')}</p>

      {mode === 'search' ? (
        <div className="form-group place-location-search">
          <LocationSearchField
            value={locationText}
            hideHint
            onChange={(next) => {
              onChange(next);
              if (hasCoords(next.latitude, next.longitude)) {
                setCenter([next.latitude as number, next.longitude as number]);
                setZoom(PLACE_ZOOM);
              }
            }}
          />
        </div>
      ) : (
        <p className="field-form-hint">{t('createGrove.placement.myLocationDesc')}</p>
      )}

      {geoError ? <p className="field-form-error" role="alert">{geoError}</p> : null}

      <div className="place-location-map" aria-label={t('createGrove.place.mapAria')}>
        <MapContainer
          key={`${center[0]}-${center[1]}-${zoom}`}
          center={center}
          zoom={zoom}
          className="place-location-leaflet"
          scrollWheelZoom
        >
          <TileLayer url={SATELLITE_TILE} attribution="Esri" maxZoom={MAP_MAX_ZOOM} maxNativeZoom={18} />
          <TileLayer url={SATELLITE_PLACES_TILE} attribution="" maxZoom={MAP_MAX_ZOOM} maxNativeZoom={18} />
          <TileLayer url={SATELLITE_LABELS_TILE} attribution="" maxZoom={MAP_MAX_ZOOM} maxNativeZoom={18} />
          <ClickToPlace
            onPick={(lat, lng) => {
              applyCoords(lat, lng, locationText || t('createGrove.placement.pickedOnMap'));
            }}
          />
          {hasCoords(latitude, longitude) ? (
            <Marker position={[latitude as number, longitude as number]} icon={pinIcon} />
          ) : null}
        </MapContainer>
      </div>
      <p className="field-form-hint">
        <MapPin size={14} aria-hidden /> {t('createGrove.place.tapHint')}
      </p>
    </div>
  );
};

export default PlaceLocationStep;
