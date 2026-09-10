namespace OliveLifecycle.Application.DTOs.Geospatial;

public class FieldWeatherDto
{
    public string FieldId { get; set; } = string.Empty;
    public bool Stale { get; set; }
    public DateTime? LastUpdatedAt { get; set; }
    public CurrentWeatherDto? Current { get; set; }
    public RainIntelligenceDto Rain { get; set; } = new();
    public WindIntelligenceDto Wind { get; set; } = new();
    public FrostRiskDto Frost { get; set; } = new();
    public EvapotranspirationDto Evapotranspiration { get; set; } = new();
    public WaterBalanceDto WaterBalance { get; set; } = new();
    public DataSourceMetadataDto Metadata { get; set; } = new();
}

public class CurrentWeatherDto
{
    public double TemperatureC { get; set; }
    public double ApparentTemperatureC { get; set; }
    public double HumidityPercent { get; set; }
    public double WindSpeedKmh { get; set; }
    public double WindGustKmh { get; set; }
    public double PrecipitationMm { get; set; }
    public int WeatherCode { get; set; }
    public string Description { get; set; } = string.Empty;
    public double HighC { get; set; }
    public double LowC { get; set; }
}

public class RainIntelligenceDto
{
    public double Previous1hMm { get; set; }
    public double Previous6hMm { get; set; }
    public double Previous12hMm { get; set; }
    public double Previous24hMm { get; set; }
    public double Previous48hMm { get; set; }
    public double Previous7dMm { get; set; }
    public double Forecast3hMm { get; set; }
    public double Forecast6hMm { get; set; }
    public double Forecast12hMm { get; set; }
    public double Forecast24hMm { get; set; }
    public double Forecast48hMm { get; set; }
    public double Forecast72hMm { get; set; }
    public double Forecast7dMm { get; set; }
}

public class WindIntelligenceDto
{
    public double CurrentSpeedKmh { get; set; }
    public double CurrentGustKmh { get; set; }
    public double MaxNext6hKmh { get; set; }
    public double MaxNext12hKmh { get; set; }
    public double MaxNext24hKmh { get; set; }
    public double MaxNext72hKmh { get; set; }
    public double MaxNext7dKmh { get; set; }
    public string? DominantDirection { get; set; }
}

public class FrostRiskDto
{
    public string Level { get; set; } = "None";
    public string? Window { get; set; }
    public double? ForecastMinTempC { get; set; }
    public string? WeatherSourceResolution { get; set; }
    public string? TerrainResolution { get; set; }
    public string Confidence { get; set; } = "Medium";
}

public class EvapotranspirationDto
{
    public double TodayMm { get; set; }
    public double Last7DaysMm { get; set; }
}

public class WaterBalanceDto
{
    public double RainMm { get; set; }
    public double Et0Mm { get; set; }
    public double IrrigationMm { get; set; }
    public double BalanceMm { get; set; }
    public string Label { get; set; } = "Estimated field water balance";
}

public class FieldWeatherHistoryDto
{
    public string FieldId { get; set; } = string.Empty;
    public IReadOnlyList<DailyWeatherSnapshotDto> Snapshots { get; set; } = Array.Empty<DailyWeatherSnapshotDto>();
}

public class DailyWeatherSnapshotDto
{
    public DateOnly Date { get; set; }
    public double? MinTemperatureC { get; set; }
    public double? MaxTemperatureC { get; set; }
    public double? RainTotalMm { get; set; }
    public double? Et0Mm { get; set; }
}
