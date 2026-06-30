using OliveLifecycle.Application.Services.Cadastre;
using OliveLifecycle.Application.Services.Fields;
using OliveLifecycle.Core.ValueObjects;
using Xunit;

namespace OliveLifecycle.Application.Tests.Cadastre;

public class GreekCadastrePdfParserTests
{
    private readonly GreekCadastrePdfParser _parser = new(new KaekNormalizer());

    [Fact]
    public async Task ParseAsync_RealFixtures_ExtractsExpectedFields()
    {
        var fixtureDir = Path.Combine(AppContext.BaseDirectory, "Fixtures", "Cadastre");
        var kdPath = Path.Combine(fixtureDir, "362621142088-0-0-KD.pdf");
        var kfPath = Path.Combine(fixtureDir, "362621142088-0-0-KF.pdf");

        if (!File.Exists(kdPath) || !File.Exists(kfPath))
        {
            // Fallback to repo-relative path during development
            kdPath = Path.GetFullPath(Path.Combine("..", "..", "..", "Fixtures", "Cadastre", "362621142088-0-0-KD.pdf"));
            kfPath = Path.GetFullPath(Path.Combine("..", "..", "..", "Fixtures", "Cadastre", "362621142088-0-0-KF.pdf"));
        }

        await using var kd = File.OpenRead(kdPath);
        await using var kf = File.OpenRead(kfPath);

        var result = await _parser.ParseAsync(kd, kf);

        Assert.Equal("362621142088/0/0", result.NormalizedKaek);
        Assert.Equal(127, result.OfficialAreaSqm);
        Assert.Equal("EGSA87", result.CoordinateSystem);
        Assert.NotNull(result.ExtractPrintDate);
        Assert.NotEmpty(result.Warnings);
    }

    [Fact]
    public async Task ParseAsync_RealFixtures_LocationIsStructuredNotHeaderGarbage()
    {
        var (kdPath, kfPath) = GetFixturePaths();
        if (!File.Exists(kdPath))
        {
            return;
        }

        await using var kd = File.OpenRead(kdPath);
        await using var kf = File.OpenRead(kfPath);
        var result = await _parser.ParseAsync(kd, kf);

        Assert.False(string.IsNullOrWhiteSpace(result.LocationText));
        Assert.Equal("11206", result.PostalCode);
        Assert.Equal("ΦΙΛΙΑΤΡΩΝ", result.Municipality);
        Assert.Equal("Μεσσηνίας", result.Prefecture);
        Assert.Contains("ΦΙΛΙΑΤΡΩΝ", result.LocationText, StringComparison.Ordinal);
        Assert.DoesNotContain("ΚΤΗΜΑΤΟΛΟΓΙΟ", result.LocationText, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ParseAsync_RealFixtures_PrintDateMatchesExtractFooter()
    {
        var (kdPath, kfPath) = GetFixturePaths();
        if (!File.Exists(kdPath))
        {
            return;
        }

        await using var kd = File.OpenRead(kdPath);
        await using var kf = File.OpenRead(kfPath);
        var result = await _parser.ParseAsync(kd, kf);

        Assert.NotNull(result.ExtractPrintDate);
        Assert.Equal(2026, result.ExtractPrintDate!.Value.Year);
        Assert.Equal(6, result.ExtractPrintDate.Value.Month);
        Assert.Equal(30, result.ExtractPrintDate.Value.Day);
    }

    private static (string KdPath, string KfPath) GetFixturePaths()
    {
        var fixtureDir = Path.Combine(AppContext.BaseDirectory, "Fixtures", "Cadastre");
        var kdPath = Path.Combine(fixtureDir, "362621142088-0-0-KD.pdf");
        var kfPath = Path.Combine(fixtureDir, "362621142088-0-0-KF.pdf");
        if (!File.Exists(kdPath))
        {
            kdPath = Path.GetFullPath(Path.Combine("..", "..", "..", "Fixtures", "Cadastre", "362621142088-0-0-KD.pdf"));
            kfPath = Path.GetFullPath(Path.Combine("..", "..", "..", "Fixtures", "Cadastre", "362621142088-0-0-KF.pdf"));
        }

        return (kdPath, kfPath);
    }

    [Fact]
    public async Task ParseAsync_DoesNotReturnPiiFields()
    {
        var fixtureDir = Path.GetFullPath(Path.Combine("..", "..", "..", "Fixtures", "Cadastre"));
        var kdPath = Path.Combine(fixtureDir, "362621142088-0-0-KD.pdf");
        var kfPath = Path.Combine(fixtureDir, "362621142088-0-0-KF.pdf");
        if (!File.Exists(kdPath))
        {
            return;
        }

        await using var kd = File.OpenRead(kdPath);
        await using var kf = File.OpenRead(kfPath);
        var result = await _parser.ParseAsync(kd, kf);

        var serialized = System.Text.Json.JsonSerializer.Serialize(result);
        Assert.DoesNotContain("ΑΦΜ", serialized, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("ΑΔΤ", serialized, StringComparison.OrdinalIgnoreCase);
    }
}

public class FieldAreaCalculatorTests
{
    private readonly FieldAreaCalculator _calculator = new();

    [Fact]
    public void Calculate_SmallPolygon_ReturnsPositiveArea()
    {
        var boundary = new GeoJsonPolygon
        {
            Coordinates = new List<List<List<double>>>
            {
                new()
                {
                    new List<double> { 21.5, 37.0 },
                    new List<double> { 21.501, 37.0 },
                    new List<double> { 21.501, 37.001 },
                    new List<double> { 21.5, 37.001 },
                    new List<double> { 21.5, 37.0 }
                }
            }
        };

        var result = _calculator.Calculate(boundary);
        Assert.True(result.AreaSqm > 1);
        Assert.Equal(2, result.CenterPoint.Coordinates.Count);
    }
}

public class FieldAreaValidationServiceTests
{
    private readonly FieldAreaValidationService _service = new();

    [Fact]
    public void Validate_LargeDifference_ReturnsCritical()
    {
        var result = _service.Validate(2400, 127);
        Assert.Equal("Critical", result.Severity);
    }

    [Fact]
    public void Validate_SmallDifference_ReturnsOk()
    {
        var result = _service.Validate(125, 127);
        Assert.Equal("Ok", result.Severity);
    }
}
