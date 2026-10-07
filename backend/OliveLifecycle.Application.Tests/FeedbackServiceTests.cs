using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Abstractions.Storage;
using OliveLifecycle.Application.DTOs.Feedback;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Exceptions;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FeedbackServiceTests
{
    private readonly Mock<IUserFeedbackRepository> _feedback = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IFileStorageService> _files = new();
    private readonly Mock<IEmailSender> _email = new();
    private readonly Mock<IDateTimeProvider> _clock = new();
    private readonly FeedbackService _service;
    private readonly DateTime _now = new(2026, 9, 11, 18, 0, 0, DateTimeKind.Utc);

    public FeedbackServiceTests()
    {
        _clock.Setup(c => c.UtcNow).Returns(_now);
        _users.Setup(r => r.GetByIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User
            {
                Id = "user-1",
                Email = "grower@test.com",
                FirstName = "Maria",
                LastName = "Grove"
            });
        _feedback.Setup(r => r.CreateAsync(It.IsAny<UserFeedback>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserFeedback entity, CancellationToken _) =>
            {
                entity.Id = "fb-1";
                return entity;
            });
        _email.SetupGet(e => e.IsConfigured).Returns(true);
        _email.Setup(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Feedback:InboxEmail"] = "product@theolivelot.com",
                ["Email:FromAddress"] = "support@theolivelot.com"
            })
            .Build();

        _service = new FeedbackService(
            _feedback.Object,
            _users.Object,
            _files.Object,
            _email.Object,
            _clock.Object,
            config,
            NullLogger<FeedbackService>.Instance);
    }

    [Fact]
    public async Task SubmitAsync_SavesCommentAndEmailsInbox()
    {
        var result = await _service.SubmitAsync("user-1", "FieldOwner", new SubmitFeedbackRequest
        {
            Comment = "The harvest map is hard to read on a phone.",
            PageUrl = "https://theolivelot.com/harvest"
        });

        Assert.Equal("fb-1", result.Id);
        Assert.Equal(_now, result.CreatedAt);
        _feedback.Verify(r => r.CreateAsync(It.Is<UserFeedback>(f =>
            f.UserId == "user-1" &&
            f.UserEmail == "grower@test.com" &&
            f.UserName == "Maria Grove" &&
            f.Comment.Contains("harvest map") &&
            f.PageUrl!.Contains("/harvest")), It.IsAny<CancellationToken>()), Times.Once);
        _email.Verify(e => e.SendAsync(
            "product@theolivelot.com",
            It.Is<string>(s => s.Contains("Maria Grove")),
            It.Is<string>(b => b.Contains("harvest map") && b.Contains("grower@test.com")),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SubmitAsync_SavesScreenshot()
    {
        await using var stream = new MemoryStream(new byte[] { 1, 2, 3, 4 });
        _files.Setup(f => f.SaveAsync(stream, "screen.png", "image/png", It.IsAny<CancellationToken>()))
            .ReturnsAsync("/uploads/screen.png");

        var result = await _service.SubmitAsync("user-1", "Producer", new SubmitFeedbackRequest
        {
            Screenshot = new FeedbackFile
            {
                Content = stream,
                FileName = "screen.png",
                ContentType = "image/png"
            }
        });

        Assert.Equal("fb-1", result.Id);
        _feedback.Verify(r => r.CreateAsync(It.Is<UserFeedback>(f =>
            f.ScreenshotUrl == "/uploads/screen.png" &&
            f.Comment == string.Empty), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SubmitAsync_EmptyPayload_Throws()
    {
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.SubmitAsync("user-1", "FieldOwner", new SubmitFeedbackRequest()));
    }

    [Fact]
    public async Task SubmitAsync_CommentTooLong_Throws()
    {
        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.SubmitAsync("user-1", "FieldOwner", new SubmitFeedbackRequest
            {
                Comment = new string('x', FeedbackService.MaxCommentLength + 1)
            }));
    }

    [Fact]
    public async Task SubmitAsync_EmailFailure_StillSaves()
    {
        _email.Setup(e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("SMTP down"));

        var result = await _service.SubmitAsync("user-1", "FieldOwner", new SubmitFeedbackRequest
        {
            Comment = "Still worth keeping."
        });

        Assert.Equal("fb-1", result.Id);
        _feedback.Verify(r => r.CreateAsync(It.IsAny<UserFeedback>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
