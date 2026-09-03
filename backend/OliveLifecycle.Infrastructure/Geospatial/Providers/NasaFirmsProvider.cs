using System.Globalization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Core.Entities.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Providers;

/// <summary>
/// Reads active fire detections from NASA FIRMS (VIIRS, near real time).
/// Requires a free FIRMS map key; without one the provider stays silent rather
/// than reporting "no fires", which would be misleading.
/// </summary>
public class NasaFirmsProvider : IFireDetectionProvider
{
    private readonly HttpClient _httpClient;
    private readonly FireOptions _options;
    private readonly ILogger<NasaFirmsProvider> _logger;

    public string ProviderName => "NASA FIRMS VIIRS";

    public NasaFirmsProvider(HttpClient httpClient, IOptions<GeospatialOptions> options, ILogger<NasaFirmsProvider> logger)
    {
        _httpClient = httpClient;
        _options = options.Value.Fires;
        _logger = logger;
    }

    public async Task<IReadOnlyList<FireDetection>> FetchActiveFiresAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.MapKey))
        {
            _logger.LogInformation("FIRMS map key is not configured; skipping fire refresh");
            return [];
        }

        try
        {
            var url = $"{_options.FirmsBaseUrl.TrimEnd('/')}/{_options.MapKey}/{_options.SourceDataset}/{_options.CountryCode}/{_options.DayRange}";
            var csv = await _httpClient.GetStringAsync(url, cancellationToken);
            var detections = ParseCsv(csv);
            _logger.LogInformation("FIRMS returned {Count} active fire detections", detections.Count);
            return detections;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "FIRMS fetch failed");
            return [];
        }
    }

    /// <summary>
    /// Columns are resolved from the CSV header rather than by position, because
    /// FIRMS column order differs between VIIRS and MODIS datasets.
    /// </summary>
    internal static List<FireDetection> ParseCsv(string csv)
    {
        var detections = new List<FireDetection>();
        var lines = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        if (lines.Length < 2) return detections;

        var header = lines[0].Split(',').Select(h => h.Trim().ToLowerInvariant()).ToList();
        var latitudeIndex = header.IndexOf("latitude");
        var longitudeIndex = header.IndexOf("longitude");
        if (latitudeIndex < 0 || longitudeIndex < 0)
        {
            return detections;
        }

        var dateIndex = header.IndexOf("acq_date");
        var timeIndex = header.IndexOf("acq_time");
        var confidenceIndex = header.IndexOf("confidence");
        var brightnessIndex = header.FindIndex(h => h is "bright_ti4" or "brightness");
        var powerIndex = header.IndexOf("frp");
        var satelliteIndex = header.IndexOf("satellite");
        var dayNightIndex = header.IndexOf("daynight");

        for (var lineNumber = 1; lineNumber < lines.Length; lineNumber++)
        {
            var parts = lines[lineNumber].Split(',');
            if (parts.Length <= Math.Max(latitudeIndex, longitudeIndex)) continue;

            if (!TryReadDouble(parts, latitudeIndex, out var latitude) ||
                !TryReadDouble(parts, longitudeIndex, out var longitude))
            {
                continue;
            }

            TryReadDouble(parts, brightnessIndex, out var brightness);
            TryReadDouble(parts, powerIndex, out var power);

            detections.Add(new FireDetection
            {
                Id = BuildDeterministicId(latitude, longitude, Read(parts, dateIndex), Read(parts, timeIndex)),
                Latitude = latitude,
                Longitude = longitude,
                DetectedAt = ParseAcquisitionTime(Read(parts, dateIndex), Read(parts, timeIndex)),
                Confidence = NormalizeConfidence(Read(parts, confidenceIndex)),
                BrightnessKelvin = brightness > 0 ? brightness : null,
                FireRadiativePowerMw = power > 0 ? power : null,
                Satellite = Read(parts, satelliteIndex),
                DayNight = Read(parts, dayNightIndex),
                Source = "VIIRS",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        return detections;
    }

    /// <summary>
    /// A stable id per detection means repeated refreshes of an overlapping day
    /// range cannot create duplicate rows for the same fire.
    /// </summary>
    private static string BuildDeterministicId(double latitude, double longitude, string? date, string? time)
        => $"{latitude.ToString("F5", CultureInfo.InvariantCulture)}_" +
           $"{longitude.ToString("F5", CultureInfo.InvariantCulture)}_{date}_{time}";

    /// <summary>FIRMS reports acq_date as yyyy-MM-dd and acq_time as UTC HHmm.</summary>
    private static DateTime ParseAcquisitionTime(string? date, string? time)
    {
        if (!DateTime.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
        {
            return DateTime.UtcNow;
        }

        var minutes = 0;
        if (int.TryParse(time, NumberStyles.Integer, CultureInfo.InvariantCulture, out var hhmm))
        {
            minutes = hhmm / 100 * 60 + hhmm % 100;
        }

        return DateTime.SpecifyKind(parsedDate.AddMinutes(minutes), DateTimeKind.Utc);
    }

    /// <summary>VIIRS reports l/n/h; MODIS reports a 0-100 number. Both map to one vocabulary.</summary>
    private static string? NormalizeConfidence(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var value = raw.Trim().ToLowerInvariant();
        return value switch
        {
            "l" or "low" => "Low",
            "n" or "nominal" => "Nominal",
            "h" or "high" => "High",
            _ when int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var percent) =>
                percent >= 80 ? "High" : percent >= 30 ? "Nominal" : "Low",
            _ => null
        };
    }

    private static string? Read(string[] parts, int index)
        => index >= 0 && index < parts.Length && !string.IsNullOrWhiteSpace(parts[index]) ? parts[index].Trim() : null;

    private static bool TryReadDouble(string[] parts, int index, out double value)
    {
        value = 0;
        var raw = Read(parts, index);
        return raw != null && double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out value);
    }
}
