using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Admin;
using OliveLifecycle.Application.Extensions;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public interface IAdminOpsService
{
    Task<AdminOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default);

    Task<AdminUserPageDto> ListUsersAsync(
        string? search,
        string? role,
        int page,
        int pageSize,
        string? sortBy,
        CancellationToken cancellationToken = default);

    Task<AdminUserDetailDto> GetUserAsync(string id, CancellationToken cancellationToken = default);

    Task<AdminErrorPageDto> ListErrorsAsync(
        int page,
        int pageSize,
        DateTime? sinceUtc,
        string? pathPrefix,
        int? statusCode,
        bool? unacknowledgedOnly,
        CancellationToken cancellationToken = default);

    Task<AdminErrorDetailDto> GetErrorAsync(string id, CancellationToken cancellationToken = default);

    Task AcknowledgeErrorAsync(string id, CancellationToken cancellationToken = default);
}

public class AdminOpsService : IAdminOpsService
{
    private readonly IUserRepository _users;
    private readonly IUserFeedbackRepository _feedback;
    private readonly IApiErrorEventRepository _errors;
    private readonly IDateTimeProvider _clock;

    public AdminOpsService(
        IUserRepository users,
        IUserFeedbackRepository feedback,
        IApiErrorEventRepository errors,
        IDateTimeProvider clock)
    {
        _users = users;
        _feedback = feedback;
        _errors = errors;
        _clock = clock;
    }

    public async Task<AdminOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default)
    {
        var now = _clock.UtcNow;
        var dayAgo = now.AddDays(-1);
        var weekAgo = now.AddDays(-7);
        var monthAgo = now.AddDays(-30);

        var totalUsers = await _users.CountActiveAsync(cancellationToken);
        var new24h = await _users.CountCreatedSinceAsync(dayAgo, cancellationToken);
        var new7d = await _users.CountCreatedSinceAsync(weekAgo, cancellationToken);
        var dau = await _users.CountSeenSinceAsync(dayAgo, cancellationToken);
        var wau = await _users.CountSeenSinceAsync(weekAgo, cancellationToken);
        var mau = await _users.CountSeenSinceAsync(monthAgo, cancellationToken);
        var unseenFeedback = await _feedback.CountUnseenAsync(cancellationToken);
        var errors24h = await _errors.CountSinceAsync(dayAgo, cancellationToken);
        var unackedErrors = await _errors.CountUnacknowledgedAsync(cancellationToken);

        var newestUsers = await _users.GetNewestAsync(10, cancellationToken);
        var (feedbackItems, _) = await _feedback.GetNewestPageAsync(1, 5, cancellationToken);
        var (errorItems, _) = await _errors.GetPageAsync(1, 10, null, null, null, true, cancellationToken);

        return new AdminOverviewDto
        {
            Kpis = new AdminOverviewKpisDto
            {
                TotalUsers = totalUsers,
                NewUsers24h = new24h,
                NewUsers7d = new7d,
                ActiveUsers24h = dau,
                ActiveUsers7d = wau,
                ActiveUsers30d = mau,
                UnseenFeedback = unseenFeedback,
                Errors24h = errors24h,
                UnacknowledgedErrors = unackedErrors
            },
            HealthStatus = "Unknown",
            NewestUsers = newestUsers.Select(ToUserListItem).ToList(),
            RecentFeedback = feedbackItems.Select(f => new AdminFeedbackAttentionDto
            {
                Id = f.Id,
                UserEmail = f.UserEmail,
                UserName = f.UserName,
                CommentExcerpt = Excerpt(f.Comment, 120),
                SeenAt = f.SeenAt,
                CreatedAt = f.CreatedAt
            }).ToList(),
            RecentErrors = errorItems.Select(ToErrorListItem).ToList()
        };
    }

    public async Task<AdminUserPageDto> ListUsersAsync(
        string? search,
        string? role,
        int page,
        int pageSize,
        string? sortBy,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var sort = string.IsNullOrWhiteSpace(sortBy) ? "createdAt" : sortBy.Trim();
        var (items, total) = await _users.SearchPageAsync(search, role, page, pageSize, sort, cancellationToken);
        return new AdminUserPageDto
        {
            Items = items.Select(ToUserListItem).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AdminUserDetailDto> GetUserAsync(string id, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("User not found.");

        return new AdminUserDetailDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role.ToRoleName(),
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            LastSeenAt = user.LastSeenAt,
            IsDeleted = user.DeletedAt != null,
            PendingEmail = user.PendingEmail,
            ExperienceMode = user.Preferences.ExperienceMode,
            Language = user.Preferences.Language
        };
    }

    public async Task<AdminErrorPageDto> ListErrorsAsync(
        int page,
        int pageSize,
        DateTime? sinceUtc,
        string? pathPrefix,
        int? statusCode,
        bool? unacknowledgedOnly,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var (items, total) = await _errors.GetPageAsync(
            page, pageSize, sinceUtc, pathPrefix, statusCode, unacknowledgedOnly, cancellationToken);
        return new AdminErrorPageDto
        {
            Items = items.Select(ToErrorListItem).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AdminErrorDetailDto> GetErrorAsync(string id, CancellationToken cancellationToken = default)
    {
        var item = await _errors.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Error event not found.");

        var list = ToErrorListItem(item);
        return new AdminErrorDetailDto
        {
            Id = list.Id,
            OccurredAt = list.OccurredAt,
            Method = list.Method,
            Path = list.Path,
            StatusCode = list.StatusCode,
            ErrorCode = list.ErrorCode,
            ExceptionType = list.ExceptionType,
            MessageExcerpt = list.MessageExcerpt,
            UserId = list.UserId,
            AcknowledgedAt = list.AcknowledgedAt,
            Message = item.Message,
            StackTrace = item.StackTrace,
            RequestId = item.RequestId
        };
    }

    public async Task AcknowledgeErrorAsync(string id, CancellationToken cancellationToken = default)
    {
        var item = await _errors.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Error event not found.");

        if (item.AcknowledgedAt != null)
        {
            return;
        }

        item.AcknowledgedAt = _clock.UtcNow;
        await _errors.UpdateAsync(item, cancellationToken);
    }

    private static AdminUserListItemDto ToUserListItem(User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Role = user.Role.ToRoleName(),
        CreatedAt = user.CreatedAt,
        LastLoginAt = user.LastLoginAt,
        LastSeenAt = user.LastSeenAt,
        IsDeleted = user.DeletedAt != null
    };

    private static AdminErrorListItemDto ToErrorListItem(ApiErrorEvent item) => new()
    {
        Id = item.Id,
        OccurredAt = item.OccurredAt,
        Method = item.Method,
        Path = item.Path,
        StatusCode = item.StatusCode,
        ErrorCode = item.ErrorCode,
        ExceptionType = item.ExceptionType,
        MessageExcerpt = Excerpt(item.Message, 160),
        UserId = item.UserId,
        AcknowledgedAt = item.AcknowledgedAt
    };

    private static string Excerpt(string? text, int max)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        var trimmed = text.Trim();
        return trimmed.Length <= max ? trimmed : trimmed[..(max - 1)] + "…";
    }
}
