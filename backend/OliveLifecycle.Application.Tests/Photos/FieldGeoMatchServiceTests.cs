using OliveLifecycle.Application.Services;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.ValueObjects;
using Xunit;

namespace OliveLifecycle.Application.Tests.Photos;

public class FieldGeoMatchServiceTests
{
    private readonly FieldGeoMatchService _sut = new();

    private static Field FieldWithBoundary(string id, string name, double minLng, double minLat, double maxLng, double maxLat, double areaSqm)
        => new()
        {
            Id = id,
            Name = name,
            AppMeasuredAreaSqm = areaSqm,
            Boundary = new GeoJsonPolygon
            {
                Coordinates =
                [
                    [
                        [minLng, minLat],
                        [maxLng, minLat],
                        [maxLng, maxLat],
                        [minLng, maxLat],
                        [minLng, minLat]
                    ]
                ]
            },
            CenterPoint = new GeoJsonPoint
            {
                Coordinates = [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
            }
        };

    [Fact]
    public void Match_InsideSingleBoundary_AutoMatches()
    {
        var fields = new[]
        {
            FieldWithBoundary("a", "North", 23.70, 37.90, 23.71, 37.91, 5000)
        };

        var result = _sut.Match(37.905, 23.705, fields);

        Assert.Equal(FieldAssignmentStatus.AutoMatched, result.Assignment);
        Assert.Equal("a", result.FieldId);
        Assert.Equal(1.0, result.Score);
    }

    [Fact]
    public void Match_OutsideAll_Unassigned()
    {
        var fields = new[]
        {
            FieldWithBoundary("a", "North", 23.70, 37.90, 23.71, 37.91, 5000)
        };

        var result = _sut.Match(37.95, 23.75, fields);

        Assert.Equal(FieldAssignmentStatus.Unassigned, result.Assignment);
        Assert.Null(result.FieldId);
    }

    [Fact]
    public void Match_OverlappingBoundaries_NeedsReviewSmallestArea()
    {
        var fields = new[]
        {
            FieldWithBoundary("big", "Big", 23.70, 37.90, 23.72, 37.92, 40_000),
            FieldWithBoundary("small", "Small", 23.70, 37.90, 23.71, 37.91, 5_000)
        };

        var result = _sut.Match(37.905, 23.705, fields);

        Assert.Equal(FieldAssignmentStatus.NeedsReview, result.Assignment);
        Assert.Equal("small", result.FieldId);
        Assert.Equal(2, result.Candidates.Count);
    }

    [Fact]
    public void Match_NearCenterWithoutBoundary_NeedsReview()
    {
        var fields = new[]
        {
            new Field
            {
                Id = "pin",
                Name = "Pin only",
                CenterPoint = new GeoJsonPoint { Coordinates = [23.705, 37.905] }
            }
        };

        var result = _sut.Match(37.9051, 23.7051, fields);

        Assert.Equal(FieldAssignmentStatus.NeedsReview, result.Assignment);
        Assert.Equal("pin", result.FieldId);
        Assert.Equal("nearestCenter", result.Candidates[0].Reason);
    }
}
