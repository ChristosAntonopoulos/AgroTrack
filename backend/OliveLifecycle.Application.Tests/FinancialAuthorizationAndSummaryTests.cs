using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Family;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FinancialAuthorizationServiceTests
{
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldAccessService> _access = new();
    private readonly FinancialAuthorizationService _service;

    public FinancialAuthorizationServiceTests()
    {
        _service = new FinancialAuthorizationService(_fields.Object, _access.Object);
    }

    [Fact]
    public async Task Professional_HasNoFinancialAccess()
    {
        var field = ActiveField();
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>())).ReturnsAsync(field);
        _access.Setup(a => a.CanUserAccessFieldAsync("field-1", "agro-1", Roles.Agronomist, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _access.Setup(a => a.CanUserModifyFieldAsync("field-1", "agro-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _access.Setup(a => a.GetFamilyAccessForFieldAsync("field-1", "agro-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((FamilyAccessSnapshot?)null);

        var result = await _service.ResolveForFieldAsync("field-1", "agro-1", Roles.Agronomist);

        Assert.True(result.IsProfessional);
        Assert.False(result.Can(FinancialCapabilities.ViewSummary));
        Assert.False(result.Can(FinancialCapabilities.AddExpense));
        Assert.False(_service.CanViewTransaction(result, PostedIncome(), "agro-1"));
    }

    [Fact]
    public async Task Collaborator_CanAddExpense_ButNotSeeIncomeOrYearResult()
    {
        var field = ActiveField();
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>())).ReturnsAsync(field);
        _access.Setup(a => a.CanUserAccessFieldAsync("field-1", "helper-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _access.Setup(a => a.CanUserModifyFieldAsync("field-1", "helper-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _access.Setup(a => a.GetFamilyAccessForFieldAsync("field-1", "helper-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FamilyAccessSnapshot("owner-1", "mem-1", [FamilyModules.Money], FamilyAccessLevels.Work));

        var result = await _service.ResolveForFieldAsync("field-1", "helper-1", Roles.FieldOwner);

        Assert.True(result.Can(FinancialCapabilities.AddExpense));
        Assert.False(result.Can(FinancialCapabilities.AddIncome));
        Assert.False(result.Can(FinancialCapabilities.ViewSummary));
        Assert.False(result.Can(FinancialCapabilities.ViewIncome));
        Assert.True(result.OwnExpensesOnly);
        Assert.True(_service.CanViewTransaction(result, PostedExpense("helper-1"), "helper-1"));
        Assert.False(_service.CanViewTransaction(result, PostedExpense("other"), "helper-1"));
        Assert.False(_service.CanViewTransaction(result, PostedIncome(), "helper-1"));
    }

    [Fact]
    public async Task Owner_HasFullAccess()
    {
        var field = ActiveField();
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>())).ReturnsAsync(field);
        _access.Setup(a => a.CanUserAccessFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _access.Setup(a => a.CanUserModifyFieldAsync("field-1", "owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _service.ResolveForFieldAsync("field-1", "owner-1", Roles.FieldOwner);

        Assert.True(result.IsOwner);
        Assert.True(result.Can(FinancialCapabilities.ViewSummary));
        Assert.True(result.Can(FinancialCapabilities.AddIncome));
        Assert.True(result.Can(FinancialCapabilities.Void));
        Assert.True(_service.CanViewTransaction(result, PostedIncome(), "owner-1"));
    }

    [Fact]
    public async Task ServiceProvider_Unassigned_HasNoAccess()
    {
        var result = await _service.ResolveForUnassignedAsync("pro-1", Roles.ServiceProvider);
        Assert.False(result.Can(FinancialCapabilities.ViewSummary));
        Assert.True(result.IsProfessional);
    }

    private static Field ActiveField() => new()
    {
        Id = "field-1",
        OwnerId = "owner-1",
        Name = "Κτήμα Φιλιατρών",
        Status = FieldStatus.Active
    };

    private static FinancialTransaction PostedExpense(string createdBy) => new()
    {
        Type = FinancialTransactionType.Expense,
        Status = FinancialTransactionStatus.Posted,
        CreatedByUserId = createdBy,
        Amount = 10
    };

    private static FinancialTransaction PostedIncome() => new()
    {
        Type = FinancialTransactionType.Income,
        Status = FinancialTransactionStatus.Posted,
        CreatedByUserId = "owner-1",
        Amount = 100
    };
}

public class FinancialSummaryServiceTests
{
    private readonly Mock<IFinancialTransactionRepository> _transactions = new();
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldTaskRepository> _fieldTasks = new();
    private readonly Mock<IHarvestRecordRepository> _harvests = new();
    private readonly Mock<IFinancialAuthorizationService> _auth = new();
    private readonly FinancialSummaryService _service;

    public FinancialSummaryServiceTests()
    {
        _service = new FinancialSummaryService(
            _transactions.Object,
            _fields.Object,
            _fieldTasks.Object,
            _harvests.Object,
            _auth.Object);
    }

    [Fact]
    public async Task GetYearSummary_UsesCalculatorAndExcludesDraftFields()
    {
        _fields.Setup(r => r.GetByOwnerIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new Field { Id = "field-1", OwnerId = "owner-1", Name = "Ενεργό", Status = FieldStatus.Active, Area = 2 },
                new Field { Id = "draft-1", OwnerId = "owner-1", Name = "Πρόχειρο", Status = FieldStatus.Draft, Area = 4 }
            });
        _auth.Setup(a => a.ResolveForFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(OwnerAccess());
        _auth.Setup(a => a.ResolveForUnassignedAsync("owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(OwnerAccess());
        _harvests.Setup(r => r.GetByFieldIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<HarvestRecord>());
        _transactions.Setup(r => r.GetForYearAsync(
                "owner-1",
                2026,
                It.Is<IReadOnlyList<string>>(ids => ids.SequenceEqual(new[] { "field-1" })),
                null,
                true,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FinancialTransaction
                {
                    Type = FinancialTransactionType.Income,
                    Status = FinancialTransactionStatus.Posted,
                    Amount = 100,
                    ResultYear = 2026,
                    FieldId = "field-1",
                    Currency = "EUR",
                    Category = FinancialTransactionCategory.OliveOilSale,
                    OccurredOn = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new FinancialTransaction
                {
                    Type = FinancialTransactionType.Expense,
                    Status = FinancialTransactionStatus.Posted,
                    Amount = 40,
                    ResultYear = 2026,
                    FieldId = null,
                    Currency = "EUR",
                    Category = FinancialTransactionCategory.OtherExpense,
                    OccurredOn = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            });

        var summary = await _service.GetYearSummaryAsync(2026, null, "owner-1", Roles.FieldOwner);

        Assert.Equal(100m, summary.TotalIncome);
        Assert.Equal(40m, summary.TotalExpenses);
        Assert.Equal(60m, summary.NetResult);
        Assert.Equal("Κέρδος", summary.ResultLabel);
        Assert.DoesNotContain(summary.FieldResults, r => r.FieldId == "draft-1");
        Assert.Contains(summary.FieldResults, r => r.IsUnassigned);
        Assert.NotNull(summary.CostPerKilogramMessage);
        Assert.DoesNotContain("oil", summary.CostPerKilogramMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetYearSummary_ProfessionalForbidden()
    {
        _fields.Setup(r => r.GetByOwnerIdAsync("agro-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());
        _auth.Setup(a => a.ResolveForUnassignedAsync("agro-1", Roles.Agronomist, It.IsAny<CancellationToken>()))
            .ReturnsAsync(FinancialAccess.None);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.GetYearSummaryAsync(2026, null, "agro-1", Roles.Agronomist));
    }

    [Fact]
    public async Task GetYearSummary_CollaboratorCannotReadYearResult()
    {
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1", Status = FieldStatus.Active });
        _auth.Setup(a => a.ResolveForFieldAsync("field-1", "helper-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FinancialAccess
            {
                OwnExpensesOnly = true,
                Capabilities = FinancialCapabilities.CollaboratorExpenseOnly.ToHashSet()
            });

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _service.GetYearSummaryAsync(2026, "field-1", "helper-1", Roles.FieldOwner));
    }

    [Fact]
    public async Task GetTaskSummary_ActualCostIgnoresEstimatedAndDrafts()
    {
        _fieldTasks.Setup(r => r.GetByIdAsync("task-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Core.Entities.FieldWork.FieldTask
            {
                Id = "task-1",
                FieldId = "field-1",
                EstimatedCost = 999
            });
        _auth.Setup(a => a.ResolveForFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(OwnerAccess());
        _transactions.Setup(r => r.GetByRelatedTaskIdAsync("task-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FinancialTransaction
                {
                    RelatedTaskId = "task-1",
                    Type = FinancialTransactionType.Expense,
                    Status = FinancialTransactionStatus.Posted,
                    Amount = 80
                },
                new FinancialTransaction
                {
                    RelatedTaskId = "task-1",
                    Type = FinancialTransactionType.Expense,
                    Status = FinancialTransactionStatus.Draft,
                    Amount = 20
                }
            });

        var summary = await _service.GetTaskSummaryAsync("task-1", "owner-1", Roles.FieldOwner);

        Assert.Equal(80m, summary.ActualCost);
        Assert.Equal(999m, summary.EstimatedCost);
        Assert.Equal(1, summary.TransactionCount);
    }

    [Fact]
    public async Task GetYearSummary_OilKgUsesHarvestResultYear_NotCalendarDate()
    {
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field
            {
                Id = "field-1",
                OwnerId = "owner-1",
                Name = "Grove",
                Status = FieldStatus.Active
            });
        _auth.Setup(a => a.ResolveForFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(OwnerAccess());
        _transactions.Setup(r => r.GetForYearAsync(
                "owner-1",
                2026,
                It.IsAny<IReadOnlyList<string>>(),
                "field-1",
                false,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FinancialTransaction
                {
                    Type = FinancialTransactionType.Expense,
                    Status = FinancialTransactionStatus.Posted,
                    Amount = 200,
                    ResultYear = 2026,
                    FieldId = "field-1",
                    Currency = "EUR",
                    Category = FinancialTransactionCategory.Labor,
                    OccurredOn = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            });
        _harvests.Setup(r => r.GetByFieldIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new HarvestRecord
                {
                    Id = "h-jan",
                    FieldId = "field-1",
                    Status = FinancialEntryStatus.Posted,
                    HarvestDate = new DateTime(2027, 1, 8, 0, 0, 0, DateTimeKind.Utc),
                    ResultYear = 2026,
                    OilKg = 50
                }
            });

        var summary = await _service.GetYearSummaryAsync(2026, "field-1", "owner-1", Roles.FieldOwner);

        Assert.Equal(4m, summary.CostPerKilogramOfOil);
        Assert.Null(summary.OliveOil.ProducedLitres);
        Assert.False(summary.OliveOil.HasProductionOrSales);
    }

    [Fact]
    public async Task GetYearSummary_ConfirmedOilLitres_AreNotInferredFromKilograms()
    {
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field
            {
                Id = "field-1",
                OwnerId = "owner-1",
                Name = "Grove",
                Status = FieldStatus.Active
            });
        _auth.Setup(a => a.ResolveForFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(OwnerAccess());
        _transactions.Setup(r => r.GetForYearAsync(
                "owner-1",
                2026,
                It.IsAny<IReadOnlyList<string>>(),
                "field-1",
                false,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FinancialTransaction
                {
                    Type = FinancialTransactionType.Income,
                    Status = FinancialTransactionStatus.Posted,
                    Amount = 5270m,
                    ResultYear = 2026,
                    FieldId = "field-1",
                    Currency = "EUR",
                    Category = FinancialTransactionCategory.OliveOilSale,
                    Quantity = 850m,
                    QuantityUnit = FinancialQuantityUnit.Litre,
                    UnitPrice = 6.20m,
                    CalculationMode = FinancialCalculationMode.QuantityTimesUnitPrice,
                    OccurredOn = new DateTime(2026, 12, 18, 0, 0, 0, DateTimeKind.Utc)
                },
                new FinancialTransaction
                {
                    Type = FinancialTransactionType.Expense,
                    Status = FinancialTransactionStatus.Posted,
                    Amount = 3782m,
                    ResultYear = 2026,
                    FieldId = "field-1",
                    Currency = "EUR",
                    Category = FinancialTransactionCategory.Labor,
                    OccurredOn = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            });
        _harvests.Setup(r => r.GetByFieldIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new HarvestRecord
                {
                    Id = "h-1",
                    FieldId = "field-1",
                    Status = FinancialEntryStatus.Posted,
                    HarvestDate = new DateTime(2026, 11, 10, 0, 0, 0, DateTimeKind.Utc),
                    ResultYear = 2026,
                    OilKg = 1134,
                    OilLitres = 1240m
                }
            });

        var summary = await _service.GetYearSummaryAsync(2026, "field-1", "owner-1", Roles.FieldOwner);

        Assert.Equal(5270m, summary.TotalIncome);
        Assert.Equal(3782m, summary.TotalExpenses);
        Assert.Equal(1240m, summary.OliveOil.ProducedLitres);
        Assert.Equal(850m, summary.OliveOil.SoldLitres);
        Assert.Equal(390m, summary.OliveOil.RemainingLitres);
        Assert.True(summary.OliveOil.RemainingIsConfirmed);
        Assert.Equal(6.2000m, summary.OliveOil.AverageSalePricePerLitre);
        Assert.Equal(3.05m, summary.OliveOil.ProductionCostPerLitre);
        Assert.Equal(3.1500m, summary.OliveOil.ResultPerLitre);
        Assert.False(summary.OliveOil.ProducedLitresAreEstimated);
    }

    [Fact]
    public async Task GetTaskSummary_FieldTask_ShowsEstimateButActualFromPostedOnly()
    {
        _fieldTasks.Setup(r => r.GetByIdAsync("ft-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Core.Entities.FieldWork.FieldTask
            {
                Id = "ft-1",
                FieldId = "field-1",
                EstimatedCost = 120m
            });
        _auth.Setup(a => a.ResolveForFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(OwnerAccess());
        _transactions.Setup(r => r.GetByRelatedTaskIdAsync("ft-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new FinancialTransaction
                {
                    RelatedTaskId = "ft-1",
                    Type = FinancialTransactionType.Expense,
                    Status = FinancialTransactionStatus.Posted,
                    Amount = 90
                }
            });

        var summary = await _service.GetTaskSummaryAsync("ft-1", "owner-1", Roles.FieldOwner);

        Assert.Equal(120m, summary.EstimatedCost);
        Assert.Equal(90m, summary.ActualCost);
        Assert.Equal(-30m, summary.Difference);
    }

    [Fact]
    public async Task GetHarvestSummary_UnknownIncomeMessageIsGreek()
    {
        _harvests.Setup(r => r.GetByIdAsync("harvest-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HarvestRecord { Id = "harvest-1", FieldId = "field-1" });
        _auth.Setup(a => a.ResolveForFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(OwnerAccess());
        _transactions.Setup(r => r.GetByRelatedHarvestIdAsync("harvest-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FinancialTransaction>());

        var summary = await _service.GetHarvestSummaryAsync("harvest-1", "owner-1", Roles.FieldOwner);

        Assert.Null(summary.Income);
        Assert.Equal("Δεν έχει καταχωρηθεί ακόμη έσοδο", summary.IncomeMessage);
        Assert.True(summary.DataAvailability.IncomeIsUnknown);
    }

    private static FinancialAccess OwnerAccess() => new()
    {
        IsOwner = true,
        Capabilities = FinancialCapabilities.OwnerAll.ToHashSet()
    };
}
