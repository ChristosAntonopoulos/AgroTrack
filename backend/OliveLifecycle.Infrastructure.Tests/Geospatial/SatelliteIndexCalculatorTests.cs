using OliveLifecycle.Infrastructure.Geospatial.Processing;
using Xunit;

namespace OliveLifecycle.Infrastructure.Tests.Geospatial;

public class SatelliteIndexCalculatorTests
{
    private static double[] SceneClasses(params SceneClass[] classes)
        => classes.Select(c => (double)(int)c).ToArray();

    [Fact]
    public void BuildMask_ExcludesPixelsOutsideTheField()
    {
        var inside = new[] { true, false, true, false };

        var mask = SatelliteIndexCalculator.BuildMask(inside, null);

        Assert.Equal(2, mask.InsideFieldPixels);
        Assert.Equal(2, mask.UsablePixels);
        Assert.Equal(new[] { true, false, true, false }, mask.Usable);
    }

    [Fact]
    public void BuildMask_ExcludesCloudShadowAndSnow()
    {
        var inside = Enumerable.Repeat(true, 6).ToArray();
        var scl = SceneClasses(
            SceneClass.Vegetation,
            SceneClass.CloudHighProbability,
            SceneClass.CloudShadow,
            SceneClass.SnowOrIce,
            SceneClass.NotVegetated,
            SceneClass.ThinCirrus);

        var mask = SatelliteIndexCalculator.BuildMask(inside, scl);

        Assert.Equal(new[] { true, false, false, false, true, false }, mask.Usable);
        Assert.Equal(2, mask.UsablePixels);
        Assert.Equal(4, mask.ObscuredPixels);
        Assert.Equal(33.3, mask.UsablePercent);
        Assert.Equal(66.7, mask.ObscuredPercent);
    }

    [Fact]
    public void BuildMask_KeepsWaterAndUnclassifiedPixels()
    {
        var inside = new[] { true, true };
        var scl = SceneClasses(SceneClass.Water, SceneClass.Unclassified);

        var mask = SatelliteIndexCalculator.BuildMask(inside, scl);

        // Water is a real observation, not an obstruction, and matters for NDWI.
        Assert.Equal(new[] { true, true }, mask.Usable);
        Assert.Equal(0, mask.ObscuredPixels);
    }

    [Fact]
    public void BuildMask_CountsCloudOnlyWithinTheField()
    {
        var inside = new[] { false, true };
        var scl = SceneClasses(SceneClass.CloudHighProbability, SceneClass.CloudHighProbability);

        var mask = SatelliteIndexCalculator.BuildMask(inside, scl);

        Assert.Equal(1, mask.InsideFieldPixels);
        Assert.Equal(1, mask.ObscuredPixels);
        Assert.Equal(100, mask.ObscuredPercent);
    }

    [Fact]
    public void BuildMask_ReportsNothingUsableForAnEmptyBoundary()
    {
        var mask = SatelliteIndexCalculator.BuildMask([false, false], null);

        Assert.Equal(0, mask.InsideFieldPixels);
        Assert.Equal(0, mask.UsablePercent);
        Assert.Equal(0, mask.ObscuredPercent);
    }

    [Fact]
    public void ToReflectance_AppliesTheBaselineOffsetAndScale()
    {
        var reflectance = SatelliteIndexCalculator.ToReflectance([3000, 1500], 10000, -1000);

        Assert.Equal(0.2, reflectance[0], 6);
        Assert.Equal(0.05, reflectance[1], 6);
    }

    [Fact]
    public void ToReflectance_TreatsNonPositiveDigitalNumbersAsMissing()
    {
        var reflectance = SatelliteIndexCalculator.ToReflectance([0, -5, double.NaN, 2000], 10000, -1000);

        Assert.True(double.IsNaN(reflectance[0]));
        Assert.True(double.IsNaN(reflectance[1]));
        Assert.True(double.IsNaN(reflectance[2]));
        Assert.Equal(0.1, reflectance[3], 6);
    }

    [Fact]
    public void Ndvi_MatchesTheNormalisedDifferenceFormula()
    {
        var ndvi = SatelliteIndexCalculator.Ndvi([0.4], [0.1], [true]);

        Assert.Equal(0.6, ndvi[0], 6);
    }

    [Fact]
    public void Ndvi_ExcludesMaskedAndMissingPixels()
    {
        var nir = new[] { 0.4, 0.4, double.NaN };
        var red = new[] { 0.1, 0.1, 0.1 };

        var ndvi = SatelliteIndexCalculator.Ndvi(nir, red, [true, false, true]);

        Assert.Equal(0.6, ndvi[0], 6);
        Assert.True(double.IsNaN(ndvi[1]));
        Assert.True(double.IsNaN(ndvi[2]));
    }

    [Fact]
    public void NormalisedDifference_RejectsAZeroSumDenominator()
    {
        var result = SatelliteIndexCalculator.NormalisedDifference([0.2], [-0.2], [true]);

        Assert.True(double.IsNaN(result[0]));
    }

    [Fact]
    public void Ndwi_IsPositiveOverWater()
    {
        // Water reflects visible green but absorbs near-infrared.
        var ndwi = SatelliteIndexCalculator.Ndwi([0.08], [0.02], [true]);

        Assert.True(ndwi[0] > 0);
    }

    [Fact]
    public void Savi_IsLowerThanNdviForTheSameReflectance()
    {
        var nir = new[] { 0.35 };
        var red = new[] { 0.12 };
        var usable = new[] { true };

        var ndvi = SatelliteIndexCalculator.Ndvi(nir, red, usable)[0];
        var savi = SatelliteIndexCalculator.Savi(nir, red, usable)[0];

        // The soil adjustment damps the index on sparse canopies such as olive groves.
        Assert.True(savi < ndvi);
        Assert.Equal(0.23 / (0.35 + 0.12 + 0.5) * 1.5, savi, 6);
    }

    [Fact]
    public void Difference_ProducesMissingValuesWhereEitherDateIsMissing()
    {
        var difference = SatelliteIndexCalculator.Difference([0.6, 0.5, double.NaN], [0.4, double.NaN, 0.3]);

        Assert.Equal(0.2, difference[0], 6);
        Assert.True(double.IsNaN(difference[1]));
        Assert.True(double.IsNaN(difference[2]));
    }

    [Fact]
    public void Difference_StopsAtTheShorterGrid()
    {
        var difference = SatelliteIndexCalculator.Difference([0.6, 0.5], [0.4]);

        Assert.Single(difference);
    }
}
