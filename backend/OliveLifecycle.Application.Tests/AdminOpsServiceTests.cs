using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class AdminOpsServiceTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IUserFeedbackRepository> _feedback = new();
    private readonly Mock<IApiErrorEventRepository> _errors = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly DateTime _now = new(2026, 10, 7, 12, 0, 0, DateTimeKind.Utc);
    private readonly AdminOpsService _ops;

    public AdminOpsServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(_now);
        _ops = new AdminOpsService(_users.Object, _feedback.Object, _errors.Object, _clock.Object);
    }

    [Fact]
    public async Task GetOverviewAsync_AggregatesKpis()
    {
        _users.Setup(r => r.CountActiveAsync(It.IsAny<CancellationToken>())).ReturnsAsync(40);
        _users.Setup(r => r.CountCreatedSinceAsync(_now.AddDays(-1), It.IsAny<CancellationToken>())).ReturnsAsync(2);
        _users.Setup(r => r.CountCreatedSinceAsync(_now.AddDays(-7), It.IsAny<CancellationToken>())).ReturnsAsync(5);
        _users.Setup(r => r.CountSeenSinceAsync(_now.AddDays(-1), It.IsAny<CancellationToken>())).ReturnsAsync(8);
        _users.Setup(r => r.CountSeenSinceAsync(_now.AddDays(-7), It.IsAny<CancellationToken>())).ReturnsAsync(15);
        _users.Setup(r => r.CountSeenSinceAsync(_now.AddDays(-30), It.IsAny<CancellationToken>())).ReturnsAsync(22);
        _users.Setup(r => r.GetNewestAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<User>
            {
                new()
                {
                    Id = "u1",
                    Email = "a@test.com",
                    Role = UserRole.FieldOwner,
                    CreatedAt = _now.AddHours(-2)
                }
            });
        _feedback.Setup(r => r.CountUnseenAsync(It.IsAny<CancellationToken>())).ReturnsAsync(3);
        _feedback.Setup(r => r.GetNewestPageAsync(1, 5, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<UserFeedback>(), 0));
        _errors.Setup(r => r.CountSinceAsync(_now.AddDays(-1), It.IsAny<CancellationToken>())).ReturnsAsync(4);
        _errors.Setup(r => r.CountUnacknowledgedAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);
        _errors.Setup(r => r.GetPageAsync(1, 10, null, null, null, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<ApiErrorEvent>(), 0));

        var overview = await _ops.GetOverviewAsync();

        Assert.Equal(40, overview.Kpis.TotalUsers);
        Assert.Equal(2, overview.Kpis.NewUsers24h);
        Assert.Equal(8, overview.Kpis.ActiveUsers24h);
        Assert.Equal(3, overview.Kpis.UnseenFeedback);
        Assert.Equal(4, overview.Kpis.Errors24h);
        Assert.Equal(1, overview.Kpis.UnacknowledgedErrors);
        Assert.Single(overview.NewestUsers);
    }

    [Fact]
    public async Task AcknowledgeErrorAsync_SetsAcknowledgedAtOnce()
    {
        var entity = new ApiErrorEvent
        {
            Id = "err-1",
            OccurredAt = _now.AddMinutes(-5),
            Method = "GET",
            Path = "/api/v1/fields",
            StatusCode = 500,
            Message = "boom"
        };
        _errors.Setup(r => r.GetByIdAsync("err-1", It.IsAny<CancellationToken>())).ReturnsAsync(entity);
        _errors.Setup(r => r.UpdateAsync(It.IsAny<ApiErrorEvent>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ApiErrorEvent e, CancellationToken _) => e);

        await _ops.AcknowledgeErrorAsync("err-1");
        await _ops.AcknowledgeErrorAsync("err-1");

        _errors.Verify(r => r.UpdateAsync(It.Is<ApiErrorEvent>(e => e.AcknowledgedAt == _now), It.IsAny<CancellationToken>()), Times.Once);
    }
}

public class ApiErrorRecorderTests
{
    [Theory]
    [InlineData("/health", true)]
    [InlineData("/api/v1/admin/errors", true)]
    [InlineData("/api/v1/admin/errors/x", true)]
    [InlineData("/api/v1/fields", false)]
    public void ShouldSkipPath_FiltersNoise(string path, bool expected)
    {
        Assert.Equal(expected, ApiErrorRecorder.ShouldSkipPath(path));
    }

    [Fact]
    public void SanitizePath_StripsQueryAndFragment()
    {
        Assert.Equal("/api/v1/me", ApiErrorRecorder.SanitizePath("/api/v1/me?token=abc#frag"));
    }

    [Fact]
    public async Task RecordUnhandledAsync_PersistsSanitizedEvent()
    {
        var repo = new Mock<IApiErrorEventRepository>();
        var clock = new Mock<IDateTimeProvider>();
        var now = new DateTime(2026, 10, 7, 12, 0, 0, DateTimeKind.Utc);
        clock.Setup(c => c.UtcNow).Returns(now);
        ApiErrorEvent? saved = null;
        repo.Setup(r => r.CreateAsync(It.IsAny<ApiErrorEvent>(), It.IsAny<CancellationToken>()))
            .Callback<ApiErrorEvent, CancellationToken>((e, _) => saved = e)
            .ReturnsAsync((ApiErrorEvent e, CancellationToken _) => e);

        var recorder = new ApiErrorRecorder(repo.Object, clock.Object, NullLogger<ApiErrorRecorder>.Instance);
        await recorder.RecordUnhandledAsync(
            "get",
            "/api/v1/fields?pwd=secret",
            "user-1",
            "trace-1",
            new InvalidOperationException("db password=leak failed"),
            CancellationToken.None);

        Assert.NotNull(saved);
        Assert.Equal("GET", saved!.Method);
        Assert.Equal("/api/v1/fields", saved.Path);
        Assert.Equal(500, saved.StatusCode);
        Assert.Contains("password=***", saved.Message);
        Assert.DoesNotContain("password=leak", saved.Message);
        Assert.Equal("user-1", saved.UserId);
    }
}
