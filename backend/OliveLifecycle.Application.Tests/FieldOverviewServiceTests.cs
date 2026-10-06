using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Chronologio;
using OliveLifecycle.Application.DTOs.FieldWork;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.DTOs.OilStock;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FieldOverviewServiceTests
{
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldAccessService> _access = new();
    private readonly Mock<IFieldYearSummaryService> _yearSummary = new();
    private readonly Mock<IOilStockService> _oil = new();
    private readonly Mock<IChronologioService> _chronologio = new();
    private readonly Mock<ITaskProposalService> _proposals = new();
    private readonly Mock<IWeatherIntelligenceService> _weather = new();
    private readonly Mock<IMediaAttachmentRepository> _media = new();
    private readonly Mock<IPhotoContentUrlSigner> _photoUrlSigner = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly FieldOverviewService _service;

    public FieldOverviewServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 10, 6, 12, 0, 0, DateTimeKind.Utc));
        _access.Setup(a => a.CanUserAccessFieldAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _proposals.Setup(p => p.ListAsync(It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _media.Setup(m => m.QueryAsync(It.IsAny<MediaAttachmentQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Array.Empty<MediaAttachment>(), 0));
        _photoUrlSigner
            .Setup(s => s.CreateUrl(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan?>()))
            .Returns((string id, string variant, string _, TimeSpan? __) => $"/api/v1/photos/{id}/content?v={variant}");
        _weather.Setup(w => w.GetFieldWeatherAsync(It.IsAny<Field>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("skip"));
        _chronologio.Setup(c => c.GetForFieldAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<ChronologioQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        _service = new FieldOverviewService(
            _fields.Object,
            _access.Object,
            _yearSummary.Object,
            _oil.Object,
            _chronologio.Object,
            _proposals.Object,
            _weather.Object,
            _media.Object,
            _photoUrlSigner.Object,
            _clock.Object);
    }

    [Fact]
    public async Task Overview_WhenHarvestOilExists_ProducedLitresGreaterThanZero()
    {
        SetupField();
        SetupYear(producedLitres: 54.6m, oliveKg: 50m, income: 0, expense: 0);
        SetupOilLots([]);

        var dto = await _service.GetAsync("field-a", 2026, "owner", Roles.FieldOwner);

        Assert.True(dto.Production.OilProducedLitres > 0);
        Assert.Equal(54.6m, dto.Production.OilProducedLitres);
        Assert.True(dto.Production.HasOilEntries);
    }

    [Fact]
    public async Task Overview_WhenFieldProvenanceStockRemains_CellarLitresGreaterThanZero()
    {
        SetupField();
        SetupYear(producedLitres: 54.6m, oliveKg: 50m, income: 0, expense: 0);
        SetupOilLots([
            Lot("lot-1", "field-a", 1m, available: 39.6m, reserved: 0m)
        ]);

        var dto = await _service.GetAsync("field-a", 2026, "owner", Roles.FieldOwner);

        Assert.True(dto.Production.OilCurrentlyInCellarLitres > 0);
        Assert.Equal(39.6m, dto.Production.OilCurrentlyInCellarLitres);
    }

    [Fact]
    public async Task Overview_AfterSale_ProducedUnchanged_CellarDown_IncomeOnce()
    {
        SetupField();
        SetupYear(producedLitres: 54.6m, oliveKg: 50m, income: 2004m, expense: 0);
        SetupOilLots([
            Lot("lot-1", "field-a", 1m, available: 39.6m, reserved: 0m)
        ]);
        _chronologio.Setup(c => c.GetForFieldAsync(
                "field-a", "owner", Roles.FieldOwner, It.IsAny<ChronologioQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new ChronologioEntryDto
                {
                    Id = "sale-1",
                    FieldId = "field-a",
                    Category = "money",
                    Title = "Πώληση λαδιού",
                    OccurredAt = new DateTime(2026, 10, 4, 10, 0, 0, DateTimeKind.Utc),
                    Amount = new ChronologioAmountDto { Value = 2004m, Currency = "EUR" }
                }
            ]);

        var dto = await _service.GetAsync("field-a", 2026, "owner", Roles.FieldOwner);

        Assert.Equal(54.6m, dto.Production.OilProducedLitres);
        Assert.Equal(39.6m, dto.Production.OilCurrentlyInCellarLitres);
        Assert.Equal(2004m, dto.Money.PostedIncome);
        Assert.Single(dto.RecentHistory);
        Assert.Equal("sale-1", dto.RecentHistory[0].Id);
    }

    [Fact]
    public async Task Overview_MixedProvenance_UsesShareNotWholeLot()
    {
        SetupField();
        SetupYear(producedLitres: 100m, oliveKg: 200m, income: 0, expense: 0);
        SetupOilLots([
            new OilLotDto
            {
                Id = "mixed",
                FieldIds = ["field-a", "field-b"],
                Provenance =
                [
                    new OilProvenanceEntryDto { FieldId = "field-a", Share = 0.4m },
                    new OilProvenanceEntryDto { FieldId = "field-b", Share = 0.6m }
                ],
                Available = new OilPackDto { Litres = 100m },
                Reserved = new OilPackDto { Litres = 0m }
            }
        ]);

        var dto = await _service.GetAsync("field-a", 2026, "owner", Roles.FieldOwner);

        Assert.Equal(40.0m, dto.Production.OilCurrentlyInCellarLitres);
    }

    private void SetupField()
    {
        _fields.Setup(r => r.GetByIdAsync("field-a", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field
            {
                Id = "field-a",
                OwnerId = "owner",
                Name = "Φιλιατρών 088",
                Status = FieldStatus.Active,
                LocationText = "Φιλιατρών",
                Variety = "Μεγαρίτικη",
                Area = 0.319
            });
    }

    private void SetupYear(decimal producedLitres, decimal oliveKg, decimal income, decimal expense)
    {
        _yearSummary.Setup(s => s.GetAsync(
                "field-a", 2026, "owner", Roles.FieldOwner, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldYearSummaryDto
            {
                FieldId = "field-a",
                FieldName = "Φιλιατρών 088",
                ResultYear = 2026,
                Currency = "EUR",
                OliveKilograms = oliveKg,
                TotalIncome = income,
                TotalExpenses = expense,
                NetResult = income - expense,
                OliveOil = new OliveOilEconomicsDto
                {
                    ProducedLitres = producedLitres,
                    ProducedLitresAreEstimated = false
                }
            });
    }

    private void SetupOilLots(IReadOnlyList<OilLotDto> lots)
    {
        _oil.Setup(o => o.GetSummaryAsync("owner", 2026, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OilStockSummaryDto
            {
                Lots = lots.ToList(),
                Available = new OilPackDto { Litres = lots.Sum(l => l.Available.Litres) },
                OnHand = new OilPackDto { Litres = lots.Sum(l => l.Available.Litres + l.Reserved.Litres) },
                Held = new OilPackDto { Litres = lots.Sum(l => l.Reserved.Litres) }
            });
    }

    private static OilLotDto Lot(string id, string fieldId, decimal share, decimal available, decimal reserved) =>
        new()
        {
            Id = id,
            FieldIds = [fieldId],
            Provenance = [new OilProvenanceEntryDto { FieldId = fieldId, Share = share }],
            Available = new OilPackDto { Litres = available },
            Reserved = new OilPackDto { Litres = reserved }
        };
}
