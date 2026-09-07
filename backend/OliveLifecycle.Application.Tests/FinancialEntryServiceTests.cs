using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FinancialEntryServiceTests
{
    private readonly Mock<IFinancialEntryRepository> _entries = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<ITaskRepository> _tasks = new();
    private readonly Mock<IFieldAccessService> _access = new();
    private readonly Mock<IActivityService> _activities = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly FinancialEntryService _service;

    public FinancialEntryServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2026, 9, 7, 12, 0, 0, DateTimeKind.Utc));
        _service = new FinancialEntryService(
            _entries.Object,
            _fields.Object,
            _tasks.Object,
            _access.Object,
            _activities.Object,
            _clock.Object,
            NullLogger<FinancialEntryService>.Instance);
    }

    [Fact]
    public async Task CreateAsync_StampsLifecycleYearAndRecordsActivity()
    {
        AllowAccess("field-1", "producer-1", Roles.Producer);
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", CurrentLifecycleYear = "high" });
        _entries.Setup(r => r.CreateAsync(It.IsAny<FinancialEntry>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FinancialEntry e, CancellationToken _) =>
            {
                e.Id = "entry-1";
                return e;
            });

        var result = await _service.CreateAsync(
            new CreateFinancialEntryDto
            {
                FieldId = "field-1",
                Amount = 80,
                Description = "diesel",
                Bucket = "inputs"
            },
            "producer-1",
            Roles.Producer);

        Assert.Equal("entry-1", result.Id);
        Assert.Equal("high", result.LifecycleYear);
        Assert.Equal("EUR", result.Currency);
        Assert.Equal("expense", result.Kind);
        Assert.Equal("inputs", result.Bucket);
        Assert.Equal(80, result.Amount);
        _activities.Verify(a => a.RecordAsync(
            "field-1",
            "expense_logged",
            It.Is<string>(m => m.Contains("80") && m.Contains("diesel")),
            "producer-1",
            null,
            It.IsAny<Dictionary<string, string>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_ComputesAmountFromQuantityAndUnitPrice()
    {
        AllowAccess("field-1", "owner-1", Roles.FieldOwner);
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", CurrentLifecycleYear = "low" });
        _entries.Setup(r => r.CreateAsync(It.IsAny<FinancialEntry>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FinancialEntry e, CancellationToken _) =>
            {
                e.Id = "entry-2";
                return e;
            });

        var result = await _service.CreateAsync(
            new CreateFinancialEntryDto
            {
                FieldId = "field-1",
                Description = "diesel",
                Quantity = 40,
                UnitPrice = 2,
                Unit = "L"
            },
            "owner-1",
            Roles.FieldOwner);

        Assert.Equal(80, result.Amount);
    }

    [Fact]
    public async Task CreateAsync_RejectsStranger()
    {
        _access.Setup(a => a.CanUserAccessFieldAsync("field-1", "stranger", Roles.Producer, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<ForbiddenException>(() => _service.CreateAsync(
            new CreateFinancialEntryDto { FieldId = "field-1", Amount = 10, Description = "oil" },
            "stranger",
            Roles.Producer));
    }

    [Fact]
    public async Task CreateAsync_MirrorsTaskCost()
    {
        AllowAccess("field-1", "owner-1", Roles.FieldOwner);
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", CurrentLifecycleYear = "low" });
        var task = new TaskItem { Id = "task-1", FieldId = "field-1" };
        _tasks.Setup(r => r.GetByIdAsync("task-1", It.IsAny<CancellationToken>())).ReturnsAsync(task);
        _entries.Setup(r => r.CreateAsync(It.IsAny<FinancialEntry>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FinancialEntry e, CancellationToken _) =>
            {
                e.Id = "entry-3";
                return e;
            });

        await _service.CreateAsync(
            new CreateFinancialEntryDto
            {
                FieldId = "field-1",
                Amount = 25,
                Description = "pruning labor",
                TaskId = "task-1"
            },
            "owner-1",
            Roles.FieldOwner);

        _tasks.Verify(r => r.UpdateAsync(It.Is<TaskItem>(t => t.Id == "task-1" && t.Cost == 25), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task VoidAsync_OwnerOnly()
    {
        AllowAccess("field-1", "producer-1", Roles.Producer);
        _access.Setup(a => a.CanUserModifyFieldAsync("field-1", "producer-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _entries.Setup(r => r.GetByIdAsync("entry-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FinancialEntry
            {
                Id = "entry-1",
                FieldId = "field-1",
                RecordedBy = "producer-1",
                Status = FinancialEntryStatus.Posted,
                Amount = 10,
                Description = "fuel",
                Currency = "EUR"
            });

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.VoidAsync("entry-1", new VoidFinancialEntryDto(), "producer-1", Roles.Producer));
    }

    [Fact]
    public async Task VoidAsync_OwnerVoidsPostedEntry()
    {
        AllowAccess("field-1", "owner-1", Roles.FieldOwner);
        _access.Setup(a => a.CanUserModifyFieldAsync("field-1", "owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _entries.Setup(r => r.GetByIdAsync("entry-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FinancialEntry
            {
                Id = "entry-1",
                FieldId = "field-1",
                RecordedBy = "producer-1",
                Status = FinancialEntryStatus.Posted,
                Amount = 10,
                Description = "fuel",
                Currency = "EUR",
                Kind = FinancialEntryKind.Expense
            });
        _entries.Setup(r => r.UpdateAsync(It.IsAny<FinancialEntry>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FinancialEntry e, CancellationToken _) => e);

        var result = await _service.VoidAsync("entry-1", new VoidFinancialEntryDto { Reason = "duplicate" }, "owner-1", Roles.FieldOwner);

        Assert.Equal("voided", result.Status);
        Assert.Equal("duplicate", result.VoidReason);
        Assert.Equal("owner-1", result.VoidedBy);
    }

    [Fact]
    public async Task GetFieldSummaryAsync_UsesPostedExpensesAndThisWeekWindow()
    {
        AllowAccess("field-1", "owner-1", Roles.FieldOwner);
        var now = new DateTime(2026, 9, 7, 12, 0, 0, DateTimeKind.Utc);
        _entries.Setup(r => r.GetByFieldIdAsync("field-1", false, 500, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FinancialEntry { Kind = FinancialEntryKind.Expense, Status = FinancialEntryStatus.Posted, Amount = 80, OccurredOn = now.AddDays(-1), Currency = "EUR", Bucket = FinancialCategoryBucket.Inputs },
                new FinancialEntry { Kind = FinancialEntryKind.Expense, Status = FinancialEntryStatus.Posted, Amount = 20, OccurredOn = now.AddDays(-10), Currency = "EUR", Bucket = FinancialCategoryBucket.Labor },
                new FinancialEntry { Kind = FinancialEntryKind.Income, Status = FinancialEntryStatus.Posted, Amount = 50, OccurredOn = now, Currency = "EUR" }
            });

        var summary = await _service.GetFieldSummaryAsync("field-1", "owner-1", Roles.FieldOwner);

        Assert.Equal(100, summary.TotalExpenses);
        Assert.Equal(50, summary.TotalIncome);
        Assert.Equal(-50, summary.Net);
        Assert.Equal(80, summary.ThisWeekExpenses);
        Assert.Equal(80, summary.ExpensesByBucket["inputs"]);
        Assert.Equal(20, summary.ExpensesByBucket["labor"]);
    }

    [Fact]
    public async Task GetOverviewAsync_SumsThisWeekAcrossFields()
    {
        var now = new DateTime(2026, 9, 7, 12, 0, 0, DateTimeKind.Utc);
        _fields.Setup(r => r.GetByOwnerIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new Field { Id = "field-1", Name = "North" },
                new Field { Id = "field-2", Name = "South" }
            });
        _fields.Setup(r => r.GetByAssignedProducerIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());
        _fields.Setup(r => r.GetByMemberUserIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());
        _entries.Setup(r => r.GetByFieldIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FinancialEntry { FieldId = "field-1", Kind = FinancialEntryKind.Expense, Status = FinancialEntryStatus.Posted, Amount = 80, OccurredOn = now.AddDays(-1), Currency = "EUR" },
                new FinancialEntry { FieldId = "field-2", Kind = FinancialEntryKind.Expense, Status = FinancialEntryStatus.Posted, Amount = 20, OccurredOn = now.AddDays(-10), Currency = "EUR" },
                new FinancialEntry { FieldId = "field-1", Kind = FinancialEntryKind.Income, Status = FinancialEntryStatus.Posted, Amount = 50, OccurredOn = now, Currency = "EUR" }
            });

        var overview = await _service.GetOverviewAsync("owner-1", Roles.FieldOwner);

        Assert.Equal(100, overview.TotalExpenses);
        Assert.Equal(80, overview.ThisWeekExpenses);
        Assert.Equal(50, overview.TotalIncome);
        Assert.Equal(-50, overview.Net);
        Assert.Equal(2, overview.FieldCount);
        Assert.Single(overview.TopFields);
        Assert.Equal("North", overview.TopFields[0].FieldName);
        Assert.Equal(80, overview.TopFields[0].ThisWeekExpenses);
    }

    private void AllowAccess(string fieldId, string userId, string role)
    {
        _access.Setup(a => a.CanUserAccessFieldAsync(fieldId, userId, role, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
    }
}
