// GPS helpers. Denied or unavailable location fails closed — never a stand-in city.

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Directions {
  distance: number; // in km
  duration: number; // in minutes
  route: Location[];
}

export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const validateCoordinates = (lat: number, lng: number): boolean =>
  typeof lat === 'number' &&
  typeof lng === 'number' &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180 &&
  !Number.isNaN(lat) &&
  !Number.isNaN(lng);

export interface LocationService {
  getCurrentLocation(): Promise<Location>;
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
  /** Straight-line distance to a real field center. Same MVP as the web client. */
  getDirectionsToField(fieldLocation: Location, currentLocation?: Location): Promise<Directions>;
  validateCoordinates(lat: number, lng: number): boolean;
}

class LocationServiceImpl implements LocationService {
  async getCurrentLocation(): Promise<Location> {
    const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = require('expo-location');
    const { status } = await requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }
    const location = await getCurrentPositionAsync({});
    const next = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    if (!validateCoordinates(next.latitude, next.longitude)) {
      throw new Error('Location unavailable');
    }
    return next;
  }

  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return calculateDistance(lat1, lng1, lat2, lng2);
  }

  async getDirectionsToField(fieldLocation: Location, currentLocation?: Location): Promise<Directions> {
    if (!validateCoordinates(fieldLocation.latitude, fieldLocation.longitude)) {
      throw new Error('Field location is missing');
    }
    const current = currentLocation ?? (await this.getCurrentLocation());
    const distance = this.calculateDistance(
      current.latitude,
      current.longitude,
      fieldLocation.latitude,
      fieldLocation.longitude
    );
    const duration = Math.round((distance / 50) * 60);
    return {
      distance: Math.round(distance * 10) / 10,
      duration,
      route: [current, fieldLocation],
    };
  }

  validateCoordinates(lat: number, lng: number): boolean {
    return validateCoordinates(lat, lng);
  }
}

export const locationService: LocationService = new LocationServiceImpl();
