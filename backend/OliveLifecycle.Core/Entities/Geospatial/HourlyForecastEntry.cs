namespace OliveLifecycle.Core.Entities.Geospatial;

public class HourlyForecastEntry
{
    public DateTime Time { get; set; }
    public double? TemperatureC { get; set; }
    public double? ApparentTemperatureC { get; set; }
    public double? HumidityPercent { get; set; }
    public double? DewPointC { get; set; }
    public double? PrecipitationMm { get; set; }
    public double? RainMm { get; set; }
    public double? ShowersMm { get; set; }
    public double? PrecipitationProbabilityPercent { get; set; }
    public double? WindSpeedKmh { get; set; }
    public double? WindDirectionDegrees { get; set; }
    public double? WindGustKmh { get; set; }
    public double? CloudCoverPercent { get; set; }
    public double? SurfacePressureHpa { get; set; }
    public double? SolarRadiationWm2 { get; set; }
    public double? Et0Mm { get; set; }
    public double? SoilTemperatureC { get; set; }
    public double? SoilMoisture { get; set; }
    public int? WeatherCode { get; set; }
}
