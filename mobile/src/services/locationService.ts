// Location Service - Provides GPS and location utilities
// Uses expo-location when available, falls back to mock data

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Directions {
  distance: number; // in km
  duration: number; // in minutes
  route: Location[];
}

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

export interface LocationService {
  getCurrentLocation(): Promise<Location>;
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
  getDirectionsToField(fieldId: string, currentLocation?: Location): Promise<Directions>;
  validateCoordinates(lat: number, lng: number): boolean;
}

class LocationServiceImpl implements LocationService {
  private mockCurrentLocation: Location = {
    latitude: 37.7749,
    longitude: -122.4194,
  };

  async getCurrentLocation(): Promise<Location> {
    try {
      // Try to use expo-location if available
      // @ts-ignore - expo-location may not be installed yet
      const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = require('expo-location');
      
      const { status } = await requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const location = await getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      // Fallback to mock location if expo-location is not available or permission denied
      if (__DEV__) {
        console.log('[LocationService] Using mock location (expo-location not available or permission denied)');
      }
      return this.mockCurrentLocation;
    }
  }

  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return calculateDistance(lat1, lng1, lat2, lng2);
  }

  async getDirectionsToField(fieldId: string, currentLocation?: Location): Promise<Directions> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In a real implementation, this would call a directions API (Google Maps, etc.)
    // For now, we'll use mock data and calculate straight-line distance
    
    const current = currentLocation || await this.getCurrentLocation();
    
    // Mock field location (in real app, fetch from field service)
    const fieldLocation: Location = {
      latitude: 37.7849,
      longitude: -122.4094,
    };
    
    const distance = this.calculateDistance(
      current.latitude,
      current.longitude,
      fieldLocation.latitude,
      fieldLocation.longitude
    );
    
    // Estimate duration: assume average speed of 50 km/h
    const duration = Math.round((distance / 50) * 60);
    
    // Generate mock route (simplified - just start and end points)
    const route: Location[] = [current, fieldLocation];
    
    return {
      distance: Math.round(distance * 10) / 10,
      duration,
      route,
    };
  }

  validateCoordinates(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !isNaN(lat) &&
      !isNaN(lng)
    );
  }
}

// Export singleton instance
export const locationService: LocationService = new LocationServiceImpl();
