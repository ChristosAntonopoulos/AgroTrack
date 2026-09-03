using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Application.DTOs.Geospatial;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests.Geospatial;

public class TaskConditionEvaluatorTests
{
    private static readonly DateTime Now = new(2026, 5, 10, 8, 0, 0, DateTimeKind.Utc);

    private readonly Mock<IFieldEnvironmentalAlertRepository> _alertRepository = new();
    private readonly Mock<ITaskRepository> _taskRepository = new();
    private readonly Mock<IWeatherIntelligenceService> _weatherService = new();
    private readonly Mock<IDateTimeProvider> _dateTimeProvider = new();
    private readonly GeospatialOptions _options = new();
    private readonly List<FieldEnvironmentalAlert> _raised = [];
    private readonly List<string> _deactivated = [];

    public TaskConditionEvaluatorTests()
    {
        _dateTimeProvider.SetupGet(d => d.UtcNow).Returns(Now);

        _alertRepository.Setup(r => r.GetByDedupKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldEnvironmentalAlert?)null);
        _alertRepository.Setup(r => r.GetActiveByFieldIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FieldEnvironmentalAlert>());
        _alertRepository.Setup(r => r.UpsertAsync(It.IsAny<FieldEnvironmentalAlert>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldEnvironmentalAlert a, CancellationToken _) => a)
            .Callback((FieldEnvironmentalAlert a, CancellationToken _) => _raised.Add(a));
        _alertRepository.Setup(r => r.DeactivateAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask)
            .Callback((string id, CancellationToken _) => _deactivated.Add(id));

        SetWeather(new FieldWeatherDto());
    }

    private void SetWeather(FieldWeatherDto weather) =>
        _weatherService.Setup(s => s.GetFieldWeatherAsync(It.IsAny<Field>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(weather);

    private static FieldWeatherDto Weather(
        double rain3h = 0,
        double rain24h = 0,
        double maxWind6h = 0,
        double gust = 0,
        double humidity = 60,
        double temperature = 22,
        double previous24hRain = 0,
        double waterBalance = 0) => new()
    {
        FieldId = "field-1",
        Current = new CurrentWeatherDto { TemperatureC = temperature, HumidityPercent = humidity },
        Rain = new RainIntelligenceDto
        {
            Forecast3hMm = rain3h,
            Forecast6hMm = rain3h,
            Forecast12hMm = rain24h,
            Forecast24hMm = rain24h,
            Forecast48hMm = rain24h,
            Previous24hMm = previous24hRain
        },
        Wind = new WindIntelligenceDto
        {
            CurrentGustKmh = gust,
            MaxNext6hKmh = maxWind6h,
            MaxNext12hKmh = maxWind6h,
            MaxNext24hKmh = maxWind6h
        },
        WaterBalance = new WaterBalanceDto { BalanceMm = waterBalance }
    };

    private static Field Field() => new() { Id = "field-1", OwnerId = "owner-1" };

    private static TaskItem NewTask(
        string type,
        string title = "",
        DateTime? scheduledStart = null,
        WorkTaskStatus status = WorkTaskStatus.Pending,
        DateTime? actualEnd = null) => new()
    {
        Id = "task-1",
        FieldId = "field-1",
        Type = type,
        Title = title,
        Status = status,
        ScheduledStart = scheduledStart,
        ActualEnd = actualEnd
    };

    private TaskConditionEvaluator CreateEvaluator() => new(
        _alertRepository.Object,
        _taskRepository.Object,
        _weatherService.Object,
        _dateTimeProvider.Object,
        Options.Create(_options),
        NullLogger<TaskConditionEvaluator>.Instance);

    [Fact]
    public async Task EvaluateTaskAsync_WarnsWhenSprayingWindExceedsTheDriftGuideline()
    {
        SetWeather(Weather(maxWind6h: 26));

        await CreateEvaluator().EvaluateTaskAsync(NewTask("spraying", scheduledStart: Now.AddHours(2)), Field());

        var alert = Assert.Single(_raised);
        Assert.Equal("task_task-1_wind", alert.DedupKey);
        Assert.Equal(EnvironmentalAlertType.TaskWarning, alert.AlertType);
        Assert.Equal(DataConfidenceLevel.High, alert.Confidence);
        Assert.Contains("26 km/h", alert.Message);
        Assert.Contains("the next 3 hours", alert.Message);
    }

    [Fact]
    public async Task EvaluateTaskAsync_ScalesSeverityWithHowFarPastTheThresholdTheWindIs()
    {
        SetWeather(Weather(maxWind6h: 40));

        await CreateEvaluator().EvaluateTaskAsync(NewTask("spraying", scheduledStart: Now.AddHours(1)), Field());

        Assert.Equal("high", Assert.Single(_raised).Severity);
    }

    [Fact]
    public async Task EvaluateTaskAsync_ClassifiesGreekTaskTitles()
    {
        SetWeather(Weather(maxWind6h: 26));

        await CreateEvaluator().EvaluateTaskAsync(NewTask("other", "Ψεκασμός δάκου", Now.AddHours(2)), Field());

        Assert.Single(_raised);
    }

    [Fact]
    public async Task EvaluateTaskAsync_LowersConfidenceForTasksFurtherOut()
    {
        SetWeather(Weather(rain24h: 12));

        await CreateEvaluator().EvaluateTaskAsync(NewTask("fertilization", scheduledStart: Now.AddHours(40)), Field());

        Assert.Equal(DataConfidenceLevel.Low, Assert.Single(_raised).Confidence);
    }

    [Fact]
    public async Task EvaluateTaskAsync_IgnoresTasksBeyondTheForecastHorizon()
    {
        SetWeather(Weather(maxWind6h: 60, rain24h: 40));

        await CreateEvaluator().EvaluateTaskAsync(NewTask("spraying", scheduledStart: Now.AddDays(5)), Field());

        Assert.Empty(_raised);
    }

    [Fact]
    public async Task EvaluateTaskAsync_LeavesWeatherInsensitiveTasksAlone()
    {
        SetWeather(Weather(maxWind6h: 60, rain24h: 40));

        await CreateEvaluator().EvaluateTaskAsync(NewTask("pruning", scheduledStart: Now.AddHours(2)), Field());

        Assert.Empty(_raised);
    }

    [Fact]
    public async Task EvaluateTaskAsync_SuggestsReducingIrrigationWhenRainIsForecast()
    {
        SetWeather(Weather(rain3h: 8, waterBalance: 3.5));

        await CreateEvaluator().EvaluateTaskAsync(NewTask("irrigation", scheduledStart: Now.AddHours(1)), Field());

        var alert = Assert.Single(_raised);
        Assert.Contains("water balance", alert.Message);
        Assert.Contains("+3.5", alert.Message);
    }

    [Fact]
    public async Task EvaluateTaskAsync_ReportsHarvestConditionsAsPoorWhenSeveralFactorsCombine()
    {
        SetWeather(Weather(rain3h: 9, maxWind6h: 40, temperature: 36));

        await CreateEvaluator().EvaluateTaskAsync(NewTask("harvest", scheduledStart: Now.AddHours(1)), Field());

        var alert = Assert.Single(_raised);
        Assert.Equal("high", alert.Severity);
        Assert.Contains("9.0 mm rain", alert.Message);
        Assert.Contains("wind to 40 km/h", alert.Message);
        Assert.Contains("36°C heat", alert.Message);
    }

    [Fact]
    public async Task EvaluateTaskAsync_AsksForAReviewWhenRainFollowsCompletedSpraying()
    {
        SetWeather(Weather(previous24hRain: 8));

        await CreateEvaluator().EvaluateTaskAsync(
            NewTask("spraying", status: WorkTaskStatus.Completed, actualEnd: Now.AddHours(-6)), Field());

        var alert = Assert.Single(_raised);
        Assert.Equal("task_task-1_post-spray-rain", alert.DedupKey);
        Assert.Contains("Review whether the treatment needs repeating", alert.Message);
    }

    [Fact]
    public async Task EvaluateTaskAsync_IgnoresRainThatFellOutsideTheMeasuredWindow()
    {
        SetWeather(Weather(previous24hRain: 8));

        await CreateEvaluator().EvaluateTaskAsync(
            NewTask("spraying", status: WorkTaskStatus.Completed, actualEnd: Now.AddDays(-3)), Field());

        Assert.Empty(_raised);
    }

    [Fact]
    public async Task EvaluateFieldWeatherChangeAsync_ReevaluatesEveryUpcomingTask()
    {
        SetWeather(Weather(maxWind6h: 26));
        _taskRepository.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TaskItem>
            {
                NewTask("spraying", scheduledStart: Now.AddHours(2)),
                new()
                {
                    Id = "task-2", FieldId = "field-1", Type = "spraying",
                    Status = WorkTaskStatus.Pending, ScheduledStart = Now.AddDays(6)
                }
            });

        await CreateEvaluator().EvaluateFieldWeatherChangeAsync(Field());

        Assert.Equal(["task_task-1_wind"], _raised.Select(a => a.DedupKey));
    }

    [Fact]
    public async Task EvaluateFieldWeatherChangeAsync_WithdrawsWarningsWhoseConditionHasPassed()
    {
        SetWeather(Weather(maxWind6h: 5));
        _taskRepository.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TaskItem> { NewTask("spraying", scheduledStart: Now.AddHours(2)) });
        _alertRepository.Setup(r => r.GetActiveByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FieldEnvironmentalAlert>
            {
                new()
                {
                    Id = "alert-1", FieldId = "field-1", DedupKey = "task_task-1_wind",
                    AlertType = EnvironmentalAlertType.TaskWarning, IsActive = true
                },
                new()
                {
                    Id = "alert-2", FieldId = "field-1", DedupKey = "frost_field-1_20260510",
                    AlertType = EnvironmentalAlertType.Frost, IsActive = true
                }
            });

        await CreateEvaluator().EvaluateFieldWeatherChangeAsync(Field());

        // Only the stale task warning is cleared; the frost alert is not ours to touch.
        Assert.Equal(["alert-1"], _deactivated);
    }

    [Fact]
    public async Task EvaluateTaskAsync_DoesNothingWhenTheForecastIsUnavailable()
    {
        _weatherService.Setup(s => s.GetFieldWeatherAsync(It.IsAny<Field>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("provider down"));

        await CreateEvaluator().EvaluateTaskAsync(NewTask("spraying", scheduledStart: Now.AddHours(1)), Field());

        Assert.Empty(_raised);
    }
}
