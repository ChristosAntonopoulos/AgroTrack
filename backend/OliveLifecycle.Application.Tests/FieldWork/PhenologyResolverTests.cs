using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class PhenologyResolverTests
{
    [Fact]
    public void Resolve_EmptyObservations_IsUnknown()
    {
        var snapshot = PhenologyResolver.Resolve([]);
        Assert.False(snapshot.IsKnown);
        Assert.Equal(OliveBbchStage.Unknown, snapshot.StageCode);
        Assert.Equal(FieldWorkDisplayLabels.UnknownPhenologyEl, FieldWorkDisplayLabels.UnknownPhenology("el"));
    }

    [Fact]
    public void Resolve_UserObservation_OverridesSystemEstimate()
    {
        var observations = new List<FieldPhenologyObservation>
        {
            new()
            {
                Id = "sys-1",
                FieldId = "field-1",
                StageCode = OliveBbchStage.Flowering,
                Source = PhenologySource.SystemEstimate,
                ObservedOn = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc),
                CreatedAt = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new()
            {
                Id = "user-1",
                FieldId = "field-1",
                StageCode = OliveBbchStage.FruitDevelopment,
                Source = PhenologySource.User,
                ObservedOn = new DateTime(2026, 4, 20, 0, 0, 0, DateTimeKind.Utc),
                CreatedAt = new DateTime(2026, 4, 20, 0, 0, 0, DateTimeKind.Utc)
            }
        };

        var snapshot = PhenologyResolver.Resolve(observations);
        Assert.True(snapshot.IsKnown);
        Assert.Equal(OliveBbchStage.FruitDevelopment, snapshot.StageCode);
        Assert.Equal(PhenologySource.User, snapshot.Source);
        Assert.Equal("user-1", snapshot.ObservationId);
    }

    [Fact]
    public void Resolve_AgronomistObservation_OverridesWeatherModel()
    {
        var observations = new List<FieldPhenologyObservation>
        {
            new()
            {
                Id = "wx-1",
                FieldId = "field-1",
                StageCode = OliveBbchStage.InflorescenceDevelopment,
                Source = PhenologySource.WeatherModel,
                ObservedOn = new DateTime(2026, 4, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new()
            {
                Id = "agro-1",
                FieldId = "field-1",
                StageCode = OliveBbchStage.Flowering,
                Source = PhenologySource.Agronomist,
                ObservedOn = new DateTime(2026, 4, 10, 0, 0, 0, DateTimeKind.Utc)
            }
        };

        var snapshot = PhenologyResolver.Resolve(observations);
        Assert.Equal(OliveBbchStage.Flowering, snapshot.StageCode);
        Assert.Equal(PhenologySource.Agronomist, snapshot.Source);
    }

    [Fact]
    public void Resolve_DoesNotInferStageFromMonthAlone()
    {
        // No observation means unknown — calendar month is irrelevant.
        var snapshot = PhenologyResolver.Resolve([]);
        Assert.False(snapshot.IsKnown);
        Assert.Contains("στάδιο", FieldWorkDisplayLabels.UnknownPhenology("el"));
    }
}
