// Weather Service - Provides weather data for fields
// Currently uses mock data, structured for future API integration (OpenWeatherMap)

export interface WeatherData {
  temperature: number; // Celsius
  condition: string; // 'sunny', 'cloudy', 'rainy', 'stormy', etc.
  humidity: number; // 0-100
  windSpeed: number; // km/h
  precipitation: number; // mm
  pressure: number; // hPa
  icon: string; // Emoji or icon identifier
  description: string;
  timestamp: Date;
}

export interface ForecastData {
  date: Date;
  high: number;
  low: number;
  condition: string;
  precipitation: number;
  icon: string;
}

export interface WeatherAlert {
  type: 'frost' | 'drought' | 'storm' | 'wind' | 'heat';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  startDate: Date;
  endDate: Date;
}

export interface IrrigationRecommendation {
  recommended: boolean;
  reason: string;
  amount?: number; // mm of water
  urgency: 'low' | 'medium' | 'high';
}

// Mock weather data generator
const generateMockWeather = (lat: number, lng: number): WeatherData => {
  // Simple variation based on coordinates for realism
  const seed = Math.floor((lat + lng) * 100) % 100;
  const baseTemp = 20 + (seed % 15); // 20-35°C
  
  const conditions = ['sunny', 'cloudy', 'partly_cloudy', 'rainy'];
  const condition = conditions[seed % conditions.length];
  
  return {
    temperature: baseTemp,
    condition,
    humidity: 40 + (seed % 40), // 40-80%
    windSpeed: 5 + (seed % 20), // 5-25 km/h
    precipitation: condition === 'rainy' ? 5 + (seed % 15) : 0,
    pressure: 1010 + (seed % 20), // 1010-1030 hPa
    icon: condition === 'sunny' ? '☀️' : condition === 'cloudy' ? '☁️' : condition === 'rainy' ? '🌧️' : '⛅',
    description: `Partly ${condition}`,
    timestamp: new Date(),
  };
};

const generateMockForecast = (days: number = 7): ForecastData[] => {
  const forecast: ForecastData[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    const seed = (i * 13) % 100;
    const baseTemp = 20 + (seed % 15);
    
    forecast.push({
      date,
      high: baseTemp + 5,
      low: baseTemp - 5,
      condition: i % 3 === 0 ? 'sunny' : i % 3 === 1 ? 'cloudy' : 'partly_cloudy',
      precipitation: i % 4 === 0 ? 2 + (seed % 5) : 0,
      icon: i % 3 === 0 ? '☀️' : i % 3 === 1 ? '☁️' : '⛅',
    });
  }
  
  return forecast;
};

const generateMockAlerts = (lat: number, lng: number): WeatherAlert[] => {
  const alerts: WeatherAlert[] = [];
  const seed = Math.floor((lat + lng) * 100) % 100;
  
  // 30% chance of frost alert
  if (seed % 10 < 3) {
    alerts.push({
      type: 'frost',
      severity: seed % 3 === 0 ? 'high' : 'medium',
      message: 'Frost warning: Temperatures may drop below freezing tonight',
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  }
  
  // 20% chance of storm alert
  if (seed % 10 < 2) {
    alerts.push({
      type: 'storm',
      severity: 'medium',
      message: 'Thunderstorm expected in the next 6 hours',
      startDate: new Date(),
      endDate: new Date(Date.now() + 6 * 60 * 60 * 1000),
    });
  }
  
  return alerts;
};

export interface WeatherService {
  getCurrentWeather(lat: number, lng: number): Promise<WeatherData>;
  getForecast(lat: number, lng: number, days?: number): Promise<ForecastData[]>;
  getWeatherAlerts(lat: number, lng: number): Promise<WeatherAlert[]>;
  getIrrigationRecommendation(field: { irrigationStatus: boolean; currentLifecycleYear: string }, weather: WeatherData): IrrigationRecommendation;
  isWorkable(weather: WeatherData): boolean;
}

class WeatherServiceImpl implements WeatherService {
  private cache: Map<string, { data: WeatherData; timestamp: Date }> = new Map();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
    const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.CACHE_DURATION) {
      return cached.data;
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const weather = generateMockWeather(lat, lng);
    this.cache.set(cacheKey, { data: weather, timestamp: new Date() });
    
    return weather;
  }

  async getForecast(lat: number, lng: number, days: number = 7): Promise<ForecastData[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    return generateMockForecast(days);
  }

  async getWeatherAlerts(lat: number, lng: number): Promise<WeatherAlert[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    return generateMockAlerts(lat, lng);
  }

  getIrrigationRecommendation(
    field: { irrigationStatus: boolean; currentLifecycleYear: string },
    weather: WeatherData
  ): IrrigationRecommendation {
    // Simple logic: recommend irrigation if:
    // - No rain in last 24h (precipitation = 0)
    // - Low humidity (< 50%)
    // - High year (needs more water)
    // - Temperature > 25°C
    
    const needsWater = weather.precipitation === 0 && 
                      weather.humidity < 50 && 
                      (field.currentLifecycleYear === 'high' || weather.temperature > 25);
    
    if (needsWater) {
      const amount = field.currentLifecycleYear === 'high' ? 15 : 10; // mm
      const urgency = weather.temperature > 30 || weather.humidity < 30 ? 'high' : 
                     weather.temperature > 25 ? 'medium' : 'low';
      
      return {
        recommended: true,
        reason: `Low humidity (${weather.humidity}%) and no precipitation. ${field.currentLifecycleYear === 'high' ? 'High year requires more water.' : ''}`,
        amount,
        urgency,
      };
    }
    
    return {
      recommended: false,
      reason: weather.precipitation > 0 
        ? `Recent precipitation (${weather.precipitation}mm)` 
        : `Adequate humidity (${weather.humidity}%)`,
      urgency: 'low',
    };
  }

  isWorkable(weather: WeatherData): boolean {
    // Not workable if:
    // - Heavy rain (precipitation > 10mm)
    // - Storm conditions
    // - Very high wind (> 30 km/h)
    
    return weather.precipitation < 10 && 
           weather.condition !== 'stormy' && 
           weather.windSpeed < 30;
  }
}

// Export singleton instance
export const weatherService: WeatherService = new WeatherServiceImpl();

// Future: Replace with real API implementation
// export const weatherService: WeatherService = new OpenWeatherMapService(API_KEY);
