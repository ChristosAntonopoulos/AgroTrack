using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.DTOs.Harvest;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class HarvestServiceTests
{
    private readonly Mock<IHarvestRecordRepository> _harvests = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldAccessService> _access = new();
    private readonly Mock<IFinancialEntryService> _finance = new();
    private readonly Mock<IActivityService> _activities = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly HarvestService _service;

    public HarvestServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 9, 7, 12, 0, 0, DateTimeKind.Utc));
        _service = new HarvestService(
            _harvests.Object,
            _fields.Object,
            _access.Object,
            _finance.Object,
            _activities.Object,
            _clock.Object,
            NullLogger<HarvestService>.Instance);
    }

    [Fact]
    public async Task CreateAsync_WritesSaleAndMillOntoLedger()
    {
        AllowAccess("field-1", "owner-1", Roles.FieldOwner, canModify: true);
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1" });
        _harvests.Setup(r => r.CreateAsync(It.IsAny<HarvestRecord>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((HarvestRecord record, CancellationToken _) =>
            {
                record.Id = "harvest-1";
                return record;
            });
        _finance.Setup(s => s.CreateAsync(It.IsAny<CreateFinancialEntryDto>(), "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FinancialEntryDto { Id = "entry-1" });

        var result = await _service.CreateAsync(
            new CreateHarvestRecordDto
            {
                FieldId = "field-1",
                OliveKg = 1000,
                OilKg = 180,
                SaleAmount = 2400,
                MillCost = 180,
                MillName = "Local mill"
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("harvest-1", result.Id);
        Assert.Equal("posted", result.Status);
        Assert.Equal(18, result.OilYieldPercent);
        _finance.Verify(s => s.CreateAsync(
            It.Is<CreateFinancialEntryDto>(d =>
                d.Kind == "income" &&
                d.Amount == 2400 &&
                d.HarvestId == "harvest-1" &&
                d.FieldId == "field-1"),
            "owner-1",
            Roles.FieldOwner,
            It.IsAny<CancellationToken>()), Times.Once);
        _finance.Verify(s => s.CreateAsync(
            It.Is<CreateFinancialEntryDto>(d =>
                d.Kind == "expense" &&
                d.Amount == 180 &&
                d.Category == "mill_cost" &&
                d.Bucket == "harvest" &&
                d.HarvestId == "harvest-1"),
            "owner-1",
            Roles.FieldOwner,
            It.IsAny<CancellationToken>()), Times.Once);
        _activities.Verify(a => a.RecordAsync(
            "field-1",
            "harvest_recorded",
            It.Is<string>(m => m.Contains("1000")),
            "owner-1",
            null,
            It.IsAny<Dictionary<string, string>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_AssignedProducerCanRecordHarvest()
    {
        AllowAccess("field-1", "producer-1", Roles.Producer, canModify: false);
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1" });
        _harvests.Setup(r => r.CreateAsync(It.IsAny<HarvestRecord>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((HarvestRecord record, CancellationToken _) =>
            {
                record.Id = "harvest-p1";
                return record;
            });

        var result = await _service.CreateAsync(
            new CreateHarvestRecordDto { FieldId = "field-1", OliveKg = 250 },
            "producer-1",
            Roles.Producer);

        Assert.Equal("harvest-p1", result.Id);
        Assert.Equal(250, result.OliveKg);
        Assert.Equal("posted", result.Status);
        _harvests.Verify(r => r.CreateAsync(It.IsAny<HarvestRecord>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task VoidAsync_OwnerVoidsPostedHarvestAndLinkedLedger()
    {
        AllowAccess("field-1", "owner-1", Roles.FieldOwner, canModify: true);
        _harvests.Setup(r => r.GetByIdAsync("harvest-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HarvestRecord
            {
                Id = "harvest-1",
                FieldId = "field-1",
                OliveKg = 400,
                Status = OliveLifecycle.Core.Enums.FinancialEntryStatus.Posted
            });
        _harvests.Setup(r => r.UpdateAsync(It.IsAny<HarvestRecord>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((HarvestRecord record, CancellationToken _) => record);
        _finance.Setup(s => s.GetByFieldIdAsync("field-1", "owner-1", Roles.FieldOwner, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FinancialEntryDto { Id = "entry-sale", HarvestId = "harvest-1", Status = "posted" },
                new FinancialEntryDto { Id = "entry-other", HarvestId = null, Status = "posted" }
            });
        _finance.Setup(s => s.VoidAsync("entry-sale", It.IsAny<VoidFinancialEntryDto>(), "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FinancialEntryDto { Id = "entry-sale", Status = "voided" });

        var result = await _service.VoidAsync(
            "harvest-1",
            new VoidHarvestRecordDto { Reason = "wrong kilos" },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal("voided", result.Status);
        Assert.Equal("wrong kilos", result.VoidReason);
        _finance.Verify(s => s.VoidAsync(
            "entry-sale",
            It.IsAny<VoidFinancialEntryDto>(),
            "owner-1",
            Roles.FieldOwner,
            It.IsAny<CancellationToken>()), Times.Once);
        _finance.Verify(s => s.VoidAsync(
            "entry-other",
            It.IsAny<VoidFinancialEntryDto>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task VoidAsync_ProducerCannotVoid()
    {
        AllowAccess("field-1", "producer-1", Roles.Producer, canModify: false);
        _harvests.Setup(r => r.GetByIdAsync("harvest-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HarvestRecord
            {
                Id = "harvest-1",
                FieldId = "field-1",
                OliveKg = 100,
                Status = OliveLifecycle.Core.Enums.FinancialEntryStatus.Posted
            });

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.VoidAsync("harvest-1", new VoidHarvestRecordDto(), "producer-1", Roles.Producer));

        _harvests.Verify(r => r.UpdateAsync(It.IsAny<HarvestRecord>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetByFieldIdAsync_ReturnsFieldRecords()
    {
        AllowAccess("field-1", "owner-1", Roles.FieldOwner, canModify: true);
        _harvests.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new HarvestRecord { Id = "harvest-1", FieldId = "field-1", OliveKg = 400, OilKg = 72 }
            });

        var records = (await _service.GetByFieldIdAsync("field-1", "owner-1", Roles.FieldOwner)).ToList();

        Assert.Single(records);
        Assert.Equal(400, records[0].OliveKg);
        Assert.Equal(72, records[0].OilKg);
    }

    private void AllowAccess(string fieldId, string userId, string role, bool canModify)
    {
        _access.Setup(a => a.CanUserAccessFieldAsync(fieldId, userId, role, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _access.Setup(a => a.CanUserModifyFieldAsync(fieldId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(canModify);
    }
}
