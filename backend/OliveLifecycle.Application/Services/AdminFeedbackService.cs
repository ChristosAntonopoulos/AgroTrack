using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Feedback;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public interface IAdminFeedbackService
{
    Task<AdminFeedbackPageDto> ListAsync(int page, int pageSize, CancellationToken cancellationToken = default);
    Task<AdminFeedbackDetailDto> GetAsync(string id, CancellationToken cancellationToken = default);
    Task MarkSeenAsync(string id, CancellationToken cancellationToken = default);
}

public class AdminFeedbackService : IAdminFeedbackService
{
    private readonly IUserFeedbackRepository _feedback;
    private readonly IDateTimeProvider _clock;

    public AdminFeedbackService(IUserFeedbackRepository feedback, IDateTimeProvider clock)
    {
        _feedback = feedback;
        _clock = clock;
    }

    public async Task<AdminFeedbackPageDto> ListAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var (items, total) = await _feedback.GetNewestPageAsync(page, pageSize, cancellationToken);
        var unseen = await _feedback.CountUnseenAsync(cancellationToken);
        return new AdminFeedbackPageDto
        {
            Items = items.Select(f => new AdminFeedbackListItemDto
            {
                Id = f.Id,
                UserId = f.UserId,
                UserEmail = f.UserEmail,
                UserName = f.UserName,
                Role = f.Role,
                CommentExcerpt = Excerpt(f.Comment, 160),
                PageUrl = f.PageUrl,
                HasScreenshot = !string.IsNullOrWhiteSpace(f.ScreenshotUrl),
                HasPhoto = !string.IsNullOrWhiteSpace(f.PhotoUrl),
                SeenAt = f.SeenAt,
                CreatedAt = f.CreatedAt
            }).ToList(),
            Total = total,
            UnseenCount = unseen,
            Page = Math.Max(1, page),
            PageSize = Math.Clamp(pageSize, 1, 100)
        };
    }

    public async Task<AdminFeedbackDetailDto> GetAsync(string id, CancellationToken cancellationToken = default)
    {
        var item = await _feedback.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Feedback not found.");

        return new AdminFeedbackDetailDto
        {
            Id = item.Id,
            UserId = item.UserId,
            UserEmail = item.UserEmail,
            UserName = item.UserName,
            Role = item.Role,
            Comment = item.Comment,
            PageUrl = item.PageUrl,
            UserAgent = item.UserAgent,
            ScreenshotUrl = item.ScreenshotUrl,
            PhotoUrl = item.PhotoUrl,
            SeenAt = item.SeenAt,
            CreatedAt = item.CreatedAt
        };
    }

    public async Task MarkSeenAsync(string id, CancellationToken cancellationToken = default)
    {
        var item = await _feedback.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Feedback not found.");

        if (item.SeenAt != null)
        {
            return;
        }

        item.SeenAt = _clock.UtcNow;
        await _feedback.UpdateAsync(item, cancellationToken);
    }

    private static string Excerpt(string comment, int max)
    {
        if (string.IsNullOrWhiteSpace(comment))
        {
            return string.Empty;
        }

        var trimmed = comment.Trim();
        return trimmed.Length <= max ? trimmed : trimmed[..(max - 1)] + "…";
    }
}
