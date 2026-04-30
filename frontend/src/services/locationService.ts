export interface Location {
  latitude: number;
  longitude: number;
}

export interface Directions {
  distance: number; // km
  duration: number; // minutes
  route: Location[];
}

export type GetCurrentLocationOptions = {
  timeoutMs?: number;
  maximumAgeMs?: number;
  enableHighAccuracy?: boolean;
};

// Haversine formula to calculate distance between two coordinates
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
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

export const validateCoordinates = (lat: unknown, lng: unknown): lat is number => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
  );
};

export interface LocationService {
  getCurrentLocation(options?: GetCurrentLocationOptions): Promise<Location>;
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
  getDirectionsToField(fieldLocation: Location, currentLocation?: Location): Promise<Directions>;
  validateCoordinates(lat: unknown, lng: unknown): boolean;
}

class LocationServiceImpl implements LocationService {
  async getCurrentLocation(options?: GetCurrentLocationOptions): Promise<Location> {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation not supported in this browser');
    }

    const timeoutMs = options?.timeoutMs ?? 8000;
    const maximumAgeMs = options?.maximumAgeMs ?? 60_000;
    const enableHighAccuracy = options?.enableHighAccuracy ?? true;

    return await new Promise<Location>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          // Normalize message so UI can show something reasonable.
          const message =
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied'
              : err.code === err.POSITION_UNAVAILABLE
                ? 'Location unavailable'
                : err.code === err.TIMEOUT
                  ? 'Location request timed out'
                  : 'Failed to get current location';
          reject(new Error(message));
        },
        { timeout: timeoutMs, maximumAge: maximumAgeMs, enableHighAccuracy }
      );
    });
  }

  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return calculateDistance(lat1, lng1, lat2, lng2);
  }

  async getDirectionsToField(fieldLocation: Location, currentLocation?: Location): Promise<Directions> {
    // MVP: straight-line distance only (no routing API).
    const current = currentLocation ?? (await this.getCurrentLocation({ enableHighAccuracy: false }));
    const distance = this.calculateDistance(
      current.latitude,
      current.longitude,
      fieldLocation.latitude,
      fieldLocation.longitude
    );
    const duration = Math.round((distance / 50) * 60); // assume 50 km/h
    return {
      distance: Math.round(distance * 10) / 10,
      duration,
      route: [current, fieldLocation],
    };
  }

  validateCoordinates(lat: unknown, lng: unknown): boolean {
    return validateCoordinates(lat, lng);
  }
}

export const locationService: LocationService = new LocationServiceImpl();

