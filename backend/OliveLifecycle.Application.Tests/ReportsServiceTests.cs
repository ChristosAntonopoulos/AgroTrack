using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class ReportsServiceTests
{
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldTaskRepository> _fieldTasks = new();
    private readonly Mock<ITaskExecutionRepository> _executions = new();
    private readonly Mock<IHarvestRecordRepository> _harvests = new();
    private readonly Mock<IFinancialTransactionRepository> _ledger = new();
    private readonly Mock<IFieldDailyWeatherSnapshotRepository> _snapshots = new();
    private readonly Mock<IFieldWeatherPeriodReviewRepository> _reviews = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly ReportsService _service;

    public ReportsServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(new DateTime(2024, 6, 15, 12, 0, 0, DateTimeKind.Utc));
        _fieldTasks.Setup(r => r.QueryAsync(It.IsAny<FieldTaskQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FieldTask>());
        _executions.Setup(r => r.GetByFieldIdsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<TaskExecution>());
        _harvests.Setup(r => r.GetByFieldIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<HarvestRecord>());
        _ledger.Setup(r => r.GetPostedByFieldIdsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FinancialTransaction>());
        _reviews.Setup(r => r.GetByFieldIdsAsync(
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FieldWeatherPeriodReview>());
        _service = new ReportsService(
            _fields.Object,
            _fieldTasks.Object,
            _executions.Object,
            _harvests.Object,
            _ledger.Object,
            _snapshots.Object,
            _reviews.Object,
            _clock.Object);
    }

    [Fact]
    public async Task GetFieldSummariesAsync_RoundsAreaYieldAndMoney()
    {
        var field = new Field
        {
            Id = "f1",
            OwnerId = "owner-1",
            Name = "Grove",
            Area = 3.191456952651759,
            TreeCount = 100,
            LocationText = "Φιλιατρόν"
        };
        _fields.Setup(r => r.GetByOwnerIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([field]);
        _harvests.Setup(r => r.GetByFieldIdsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new HarvestRecord
                {
                    Id = "h1",
                    FieldId = "f1",
                    HarvestDate = new DateTime(2024, 11, 2),
                    OliveKg = 22720.4,
                    OilKg = 4100.2,
                    Status = FinancialEntryStatus.Posted
                }
            ]);
        _ledger.Setup(r => r.GetPostedByFieldIdsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new FinancialTransaction
                {
                    FieldId = "f1",
                    Type = FinancialTransactionType.Expense,
                    Amount = 2844.49m,
                    Status = FinancialTransactionStatus.Posted,
                    OccurredOn = new DateTime(2024, 5, 1),
                    ResultYear = 2024
                },
                new FinancialTransaction
                {
                    FieldId = "f1",
                    Type = FinancialTransactionType.Income,
                    Amount = 1200.2m,
                    Status = FinancialTransactionStatus.Posted,
                    OccurredOn = new DateTime(2024, 12, 1),
                    ResultYear = 2024
                }
            ]);

        var result = (await _service.GetFieldSummariesAsync("owner-1", Roles.FieldOwner, season: "2024")).Single();

        Assert.Equal(3.19, result.AreaHa);
        Assert.Equal(22720, result.TotalProductionKg);
        Assert.Equal(7122, result.YieldPerHa);
        Assert.Equal(227.2, result.YieldPerTree);
        Assert.Equal(2844.49m, result.TotalCost);
        Assert.Equal(891.69m, result.CostPerHa);
        Assert.Equal(1200.2m, result.Revenue);
        Assert.Equal(-1644.29m, result.Profit);
        Assert.Equal(4100, result.OilProducedKg);
        Assert.Equal("Φιλιατρόν", result.Location);
        Assert.Equal("2024-11-02", result.LastHarvestDate);
    }

    [Fact]
    public async Task GetMonthlyWeatherAsync_BuildsAnalyticalMonth()
    {
        var field = new Field { Id = "f1", OwnerId = "owner-1", Name = "Grove", Area = 3.1914 };
        _fields.Setup(r => r.GetByOwnerIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([field]);

        var days = new List<FieldDailyWeatherSnapshot>();
        for (var d = 1; d <= 31; d++)
        {
            days.Add(new FieldDailyWeatherSnapshot
            {
                FieldId = "f1",
                Date = new DateOnly(2024, 1, d),
                MinTemperatureC = d == 3 ? -2 : 6,
                MaxTemperatureC = d == 10 ? 36 : 14,
                RainTotalMm = d is 4 or 5 ? 22 : d == 20 ? 3 : 0,
                Et0Mm = 1.2
            });
        }

        days.Add(new FieldDailyWeatherSnapshot
        {
            FieldId = "f1",
            Date = new DateOnly(2023, 1, 1),
            RainTotalMm = 40
        });

        _snapshots.Setup(r => r.GetHistoryAsync("f1", It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(days);

        var report = await _service.GetMonthlyWeatherAsync("owner-1", Roles.FieldOwner, "2024", 1);

        var row = Assert.Single(report.Fields);
        Assert.Equal(2024, int.Parse(report.Season));
        Assert.Equal(1, report.Month);
        Assert.Equal(3.19, row.AreaHa);
        Assert.Equal(31, row.DayCount);
        Assert.Equal(47, row.RainTotalMm);
        Assert.Equal(1, row.FrostNights);
        Assert.Equal(1, row.HeatDays);
        Assert.Equal(2, row.HeavyRainDays);
        Assert.Equal(31, row.Days.Count);
        Assert.Contains(row.Insights, i => i.Code == "frost" && i.Count == 1);
        Assert.Contains(row.Insights, i => i.Code == "heat");
    }

    [Fact]
    public async Task GetYearlyWeatherAsync_FocusesOnEconomicsAndTasks()
    {
        var field = new Field { Id = "f1", OwnerId = "owner-1", Name = "Grove", Area = 2 };
        _fields.Setup(r => r.GetByOwnerIdAsync("owner-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync([field]);

        var snapshots = Enumerable.Range(1, 28).Select(d => new FieldDailyWeatherSnapshot
        {
            FieldId = "f1",
            Date = new DateOnly(2024, 3, d),
            RainTotalMm = 2,
            MinTemperatureC = 8,
            MaxTemperatureC = 18,
            Et0Mm = 1
        }).ToList();
        _snapshots.Setup(r => r.GetHistoryAsync("f1", It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(snapshots);

        _fieldTasks.Setup(r => r.QueryAsync(It.IsAny<FieldTaskQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new FieldTask
                {
                    Id = "ft-1",
                    FieldId = "f1",
                    TemplateCode = "Pruning",
                    Title = "Main pruning",
                    Status = FieldTaskStatus.Completed,
                    PlannedEnd = new DateTime(2024, 3, 12),
                    ResultYear = 2024
                },
                new FieldTask
                {
                    Id = "ft-2",
                    FieldId = "f1",
                    TemplateCode = "Spray",
                    Title = "Treatment",
                    Status = FieldTaskStatus.Planned,
                    PlannedEnd = new DateTime(2024, 1, 1),
                    ResultYear = 2024
                }
            ]);
        _executions.Setup(r => r.GetByFieldIdsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new TaskExecution
                {
                    Id = "ex-1",
                    TaskId = "ft-1",
                    FieldId = "f1",
                    ResultYear = 2024,
                    CompletedAt = new DateTime(2024, 3, 12)
                }
            ]);
        _ledger.Setup(r => r.GetPostedByFieldIdsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new FinancialTransaction
                {
                    FieldId = "f1",
                    Type = FinancialTransactionType.Expense,
                    Amount = 500,
                    Status = FinancialTransactionStatus.Posted,
                    OccurredOn = new DateTime(2024, 3, 10),
                    ResultYear = 2024
                },
                new FinancialTransaction
                {
                    FieldId = "f1",
                    Type = FinancialTransactionType.Income,
                    Amount = 200,
                    Status = FinancialTransactionStatus.Posted,
                    OccurredOn = new DateTime(2024, 11, 1),
                    ResultYear = 2024
                }
            ]);

        var report = await _service.GetYearlyWeatherAsync("owner-1", Roles.FieldOwner, "2024");
        var row = Assert.Single(report.Fields);

        Assert.Equal(56, row.RainTotalMm);
        Assert.Equal(3, row.WettestMonth);
        Assert.Equal(500m, row.TotalCost);
        Assert.Equal(200m, row.Revenue);
        Assert.Equal(-300m, row.Profit);
        Assert.Equal(250m, row.CostPerHa);
        Assert.Equal(500m, row.MonthlyCost[2]);
        Assert.Equal(200m, row.MonthlyRevenue[10]);
        Assert.Equal(1, row.TasksCompleted);
        Assert.Equal(1, row.TasksPending);
        Assert.Equal(1, row.TasksOverdue);
        Assert.Equal(1, row.MonthlyTasksCompleted[2]);
        Assert.Contains(row.TasksByType, t => t.Type == "Pruning" && t.Completed == 1);
        Assert.Contains(row.Insights, i => i.Code == "overdueTasks");
        Assert.Contains(row.Insights, i => i.Code == "loss");
    }
}
