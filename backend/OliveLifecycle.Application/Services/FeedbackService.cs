using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Abstractions.Storage;
using OliveLifecycle.Application.DTOs.Feedback;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class FeedbackService : IFeedbackService
{
    public const int MaxCommentLength = 4000;
    public const int MaxFileBytes = 6 * 1024 * 1024;

    private readonly IUserFeedbackRepository _feedback;
    private readonly IUserRepository _users;
    private readonly IFileStorageService _files;
    private readonly IEmailSender _email;
    private readonly IDateTimeProvider _clock;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FeedbackService> _logger;

    public FeedbackService(
        IUserFeedbackRepository feedback,
        IUserRepository users,
        IFileStorageService files,
        IEmailSender email,
        IDateTimeProvider clock,
        IConfiguration configuration,
        ILogger<FeedbackService> logger)
    {
        _feedback = feedback;
        _users = users;
        _files = files;
        _email = email;
        _clock = clock;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<FeedbackSubmittedDto> SubmitAsync(
        string userId,
        string role,
        SubmitFeedbackRequest request,
        CancellationToken cancellationToken = default)
    {
        var comment = (request.Comment ?? string.Empty).Trim();
        if (comment.Length > MaxCommentLength)
        {
            throw new ValidationException($"Comment must be at most {MaxCommentLength} characters.");
        }

        if (comment.Length == 0 && request.Screenshot == null && request.Photo == null)
        {
            throw new ValidationException("Add a comment, a screenshot, or a photo so we can help.");
        }

        var screenshotUrl = await SaveImageAsync(request.Screenshot, cancellationToken);
        var photoUrl = await SaveImageAsync(request.Photo, cancellationToken);

        var user = await _users.GetByIdAsync(userId, cancellationToken);
        var displayName = string.Join(
            " ",
            new[] { user?.FirstName, user?.LastName }.Where(part => !string.IsNullOrWhiteSpace(part)))
            .Trim();
        if (displayName.Length == 0)
        {
            displayName = user?.Email ?? userId;
        }

        var now = _clock.UtcNow;
        var entity = new UserFeedback
        {
            UserId = userId,
            UserEmail = user?.Email,
            UserName = displayName,
            Role = role ?? string.Empty,
            Comment = comment,
            PageUrl = TrimTo(request.PageUrl, 2000),
            UserAgent = TrimTo(request.UserAgent, 500),
            ScreenshotUrl = screenshotUrl,
            PhotoUrl = photoUrl,
            CreatedAt = now,
            UpdatedAt = now
        };

        var saved = await _feedback.CreateAsync(entity, cancellationToken);
        await NotifyInboxAsync(saved, cancellationToken);

        return new FeedbackSubmittedDto
        {
            Id = saved.Id,
            CreatedAt = saved.CreatedAt
        };
    }

    private async Task<string?> SaveImageAsync(FeedbackFile? file, CancellationToken cancellationToken)
    {
        if (file == null)
        {
            return null;
        }

        if (file.Content.CanSeek)
        {
            if (file.Content.Length > MaxFileBytes)
            {
                throw new ValidationException("Each image must be 6 MB or smaller.");
            }
        }

        try
        {
            return await _files.SaveAsync(file.Content, file.FileName, file.ContentType, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            throw new ValidationException(ex.Message);
        }
    }

    private async Task NotifyInboxAsync(UserFeedback feedback, CancellationToken cancellationToken)
    {
        var inbox = _configuration["Feedback:InboxEmail"];
        if (string.IsNullOrWhiteSpace(inbox))
        {
            inbox = _configuration["Email:FromAddress"];
        }

        if (string.IsNullOrWhiteSpace(inbox))
        {
            inbox = "hello@theolivelot.com";
        }

        var subject = $"The Olive Lot feedback from {feedback.UserName}";
        var body =
            $"Someone took time to help us improve The Olive Lot. Treat this with care.\n\n" +
            $"From: {feedback.UserName}\n" +
            $"Email: {feedback.UserEmail ?? "—"}\n" +
            $"Role: {feedback.Role}\n" +
            $"User id: {feedback.UserId}\n" +
            $"Page: {feedback.PageUrl ?? "—"}\n" +
            $"When (UTC): {feedback.CreatedAt:yyyy-MM-dd HH:mm}\n" +
            $"User agent: {feedback.UserAgent ?? "—"}\n\n" +
            $"Comment:\n{(string.IsNullOrWhiteSpace(feedback.Comment) ? "(none — they sent an image)" : feedback.Comment)}\n\n" +
            $"Screenshot: {feedback.ScreenshotUrl ?? "—"}\n" +
            $"Photo: {feedback.PhotoUrl ?? "—"}\n";

        try
        {
            await _email.SendAsync(inbox, subject, body, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Feedback {Id} was saved but the inbox email failed.", feedback.Id);
        }
    }

    private static string? TrimTo(string? value, int max)
    {
        var trimmed = (value ?? string.Empty).Trim();
        if (trimmed.Length == 0)
        {
            return null;
        }

        return trimmed.Length <= max ? trimmed : trimmed[..max];
    }
}
