using OliveLifecycle.Infrastructure.Geospatial.Providers;
using Xunit;

namespace OliveLifecycle.Infrastructure.Tests.Geospatial;

public class NasaFirmsProviderTests
{
    private const string ViirsCsv =
        "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n" +
        "37.98380,23.72750,330.5,0.4,0.36,2026-03-15,1042,N,VIIRS,n,2.0NRT,290.1,5.4,D\n" +
        "38.10000,23.90000,350.2,0.4,0.36,2026-03-15,0130,N,VIIRS,h,2.0NRT,295.0,12.8,N\n";

    [Fact]
    public void ParseCsv_ReadsEveryDetection()
    {
        var detections = NasaFirmsProvider.ParseCsv(ViirsCsv);

        Assert.Equal(2, detections.Count);
    }

    [Fact]
    public void ParseCsv_ReadsCoordinatesUsingInvariantCulture()
    {
        var detection = NasaFirmsProvider.ParseCsv(ViirsCsv)[0];

        Assert.Equal(37.9838, detection.Latitude, 4);
        Assert.Equal(23.7275, detection.Longitude, 4);
    }

    [Fact]
    public void ParseCsv_CombinesAcquisitionDateAndTimeAsUtc()
    {
        var detection = NasaFirmsProvider.ParseCsv(ViirsCsv)[0];

        Assert.Equal(new DateTime(2026, 3, 15, 10, 42, 0, DateTimeKind.Utc), detection.DetectedAt);
        Assert.Equal(DateTimeKind.Utc, detection.DetectedAt.Kind);
    }

    [Fact]
    public void ParseCsv_HandlesTimesBeforeNoon()
    {
        var detection = NasaFirmsProvider.ParseCsv(ViirsCsv)[1];

        Assert.Equal(new DateTime(2026, 3, 15, 1, 30, 0, DateTimeKind.Utc), detection.DetectedAt);
    }

    [Fact]
    public void ParseCsv_NormalizesViirsConfidenceCodes()
    {
        var detections = NasaFirmsProvider.ParseCsv(ViirsCsv);

        Assert.Equal("Nominal", detections[0].Confidence);
        Assert.Equal("High", detections[1].Confidence);
    }

    [Fact]
    public void ParseCsv_NormalizesModisNumericConfidence()
    {
        var csv = "latitude,longitude,brightness,acq_date,acq_time,confidence,frp\n" +
                  "37.5,23.5,320.0,2026-03-15,0900,95,4.0\n" +
                  "37.6,23.6,315.0,2026-03-15,0900,50,4.0\n" +
                  "37.7,23.7,310.0,2026-03-15,0900,10,4.0\n";

        var detections = NasaFirmsProvider.ParseCsv(csv);

        Assert.Equal("High", detections[0].Confidence);
        Assert.Equal("Nominal", detections[1].Confidence);
        Assert.Equal("Low", detections[2].Confidence);
    }

    [Fact]
    public void ParseCsv_ResolvesColumnsByHeaderNotPosition()
    {
        // Same data with longitude before latitude.
        var csv = "longitude,latitude,acq_date,acq_time,confidence\n" +
                  "23.72750,37.98380,2026-03-15,1042,h\n";

        var detection = NasaFirmsProvider.ParseCsv(csv)[0];

        Assert.Equal(37.9838, detection.Latitude, 4);
        Assert.Equal(23.7275, detection.Longitude, 4);
    }

    [Fact]
    public void ParseCsv_AssignsStableIdsSoRefreshesDoNotDuplicate()
    {
        var first = NasaFirmsProvider.ParseCsv(ViirsCsv);
        var second = NasaFirmsProvider.ParseCsv(ViirsCsv);

        Assert.Equal(first.Select(d => d.Id), second.Select(d => d.Id));
        Assert.Equal(2, first.Select(d => d.Id).Distinct().Count());
    }

    [Fact]
    public void ParseCsv_ReadsBrightnessAndRadiativePower()
    {
        var detection = NasaFirmsProvider.ParseCsv(ViirsCsv)[0];

        Assert.Equal(330.5, detection.BrightnessKelvin);
        Assert.Equal(5.4, detection.FireRadiativePowerMw);
        Assert.Equal("D", detection.DayNight);
    }

    [Fact]
    public void ParseCsv_SkipsRowsWithUnparseableCoordinates()
    {
        var csv = "latitude,longitude,acq_date,acq_time\n" +
                  "not-a-number,23.7,2026-03-15,1000\n" +
                  "37.9,23.7,2026-03-15,1000\n";

        Assert.Single(NasaFirmsProvider.ParseCsv(csv));
    }

    [Fact]
    public void ParseCsv_ReturnsEmptyForMissingCoordinateColumns()
    {
        Assert.Empty(NasaFirmsProvider.ParseCsv("acq_date,confidence\n2026-03-15,h\n"));
    }

    [Fact]
    public void ParseCsv_ReturnsEmptyForHeaderOnlyOrBlankInput()
    {
        Assert.Empty(NasaFirmsProvider.ParseCsv("latitude,longitude\n"));
        Assert.Empty(NasaFirmsProvider.ParseCsv(string.Empty));
    }
}
