using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FieldYearSummaryServiceTests
{
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFinancialTransactionRepository> _transactions = new();
    private readonly Mock<IHarvestRecordRepository> _harvests = new();
    private readonly Mock<ITaskExecutionRepository> _executions = new();
    private readonly Mock<IFieldPhenologyObservationRepository> _phenology = new();
    private readonly Mock<IFieldWeatherPeriodReviewRepository> _weatherReviews = new();
    private readonly Mock<IOfficialAgriculturalWarningRepository> _warnings = new();
    private readonly Mock<IFinancialAuthorizationService> _auth = new();
    private readonly FieldYearSummaryService _service;

    public FieldYearSummaryServiceTests()
    {
        _service = new FieldYearSummaryService(
            _fields.Object,
            _transactions.Object,
            _harvests.Object,
            _executions.Object,
            _phenology.Object,
            _weatherReviews.Object,
            _warnings.Object,
            _auth.Object);
    }

    [Fact]
    public async Task GetAsync_UsesPostedMoneyAndActiveExecutions_IgnoresEstimates()
    {
        _fields.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field
            {
                Id = "field-1",
                OwnerId = "owner-1",
                Name = "Άλσος",
                Status = FieldStatus.Active,
                Area = 2
            });
        _auth.Setup(a => a.ResolveForFieldAsync("field-1", "owner-1", Roles.FieldOwner, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FinancialAccess
            {
                IsOwner = true,
                Capabilities = FinancialCapabilities.OwnerAll.ToHashSet()
            });
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
                    Amount = 80,
                    ResultYear = 2026,
                    FieldId = "field-1",
                    Currency = "EUR",
                    Category = FinancialTransactionCategory.OtherExpense,
                    OccurredOn = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc),
                    RelatedTaskId = "ft-1"
                }
            });
        _harvests.Setup(r => r.GetByFieldIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new HarvestRecord
                {
                    FieldId = "field-1",
                    Status = FinancialEntryStatus.Posted,
                    HarvestDate = new DateTime(2027, 1, 5, 0, 0, 0, DateTimeKind.Utc),
                    ResultYear = 2026,
                    OilKg = 40,
                    OliveKg = 200
                }
            });
        _executions.Setup(r => r.GetByFieldAndYearAsync("field-1", 2026, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new TaskExecution
                {
                    FieldId = "field-1",
                    ResultYear = 2026,
                    Outcome = TaskExecutionOutcome.Completed
                },
                new TaskExecution
                {
                    FieldId = "field-1",
                    ResultYear = 2026,
                    Outcome = TaskExecutionOutcome.PartiallyCompleted,
                    UndoneAt = DateTime.UtcNow
                }
            });
        _phenology.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FieldPhenologyObservation>());
        _weatherReviews.Setup(r => r.GetByFieldIdsAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FieldWeatherPeriodReview>());
        _warnings.Setup(r => r.GetActiveForFieldAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<OfficialAgriculturalWarning>());

        var summary = await _service.GetAsync("field-1", 2026, "owner-1", Roles.FieldOwner);

        Assert.Equal(80m, summary.TotalExpenses);
        Assert.Equal(40m, summary.OilKilograms);
        Assert.Equal(1, summary.CompletedExecutionCount);
        Assert.Equal(0, summary.PartialExecutionCount);
        Assert.Equal(1, summary.ConfirmedHarvestCount);
        Assert.Equal(2m, summary.CostPerKilogramOfOil);
    }

    [Fact]
    public async Task GetAsync_DraftField_ThrowsValidation()
    {
        _fields.Setup(r => r.GetByIdAsync("draft-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "draft-1", Status = FieldStatus.Draft, OwnerId = "owner-1" });

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.GetAsync("draft-1", 2026, "owner-1", Roles.FieldOwner));
    }
}
