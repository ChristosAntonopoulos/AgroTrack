using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class FieldPeopleService : IFieldPeopleService
{
    private readonly IFieldRepository _fieldRepository;
    private readonly IUserRepository _userRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly IActivityRepository _activityRepository;
    private readonly IFieldInviteRepository _inviteRepository;
    private readonly IFieldAccessService _fieldAccessService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ILogger<FieldPeopleService> _logger;

    public FieldPeopleService(
        IFieldRepository fieldRepository,
        IUserRepository userRepository,
        ITaskRepository taskRepository,
        IActivityRepository activityRepository,
        IFieldInviteRepository inviteRepository,
        IFieldAccessService fieldAccessService,
        IDateTimeProvider dateTimeProvider,
        ILogger<FieldPeopleService> logger)
    {
        _fieldRepository = fieldRepository;
        _userRepository = userRepository;
        _taskRepository = taskRepository;
        _activityRepository = activityRepository;
        _inviteRepository = inviteRepository;
        _fieldAccessService = fieldAccessService;
        _dateTimeProvider = dateTimeProvider;
        _logger = logger;
    }

    public async Task<IEnumerable<FieldMembershipDto>> GetPeopleAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
        FieldMembershipSync.EnsureBackfilled(field);
        return await EnrichMembershipsAsync(field.Memberships.Where(m => m.Status == "active"), cancellationToken);
    }

    public async Task<FieldMembershipDto> UpsertMembershipAsync(
        string fieldId,
        string actorId,
        string targetUserId,
        UpsertFieldMembershipDto dto,
        CancellationToken cancellationToken = default)
    {
        var field = await RequireOwnAsync(fieldId, actorId, cancellationToken);
        var target = await _userRepository.GetByIdAsync(targetUserId, cancellationToken)
            ?? throw new ValidationException("User not found.");

        var membership = FieldMembershipSync.Upsert(field, targetUserId, dto.Capacities, actorId);
        field.UpdatedAt = _dateTimeProvider.UtcNow;
        await _fieldRepository.UpdateAsync(field, cancellationToken);
        _logger.LogInformation("Membership upserted for {UserId} on field {FieldId}", targetUserId, fieldId);

        var dtoOut = FieldMapper.ToMembershipDto(membership);
        dtoOut.DisplayName = DisplayName(target);
        dtoOut.Email = target.Email;
        return dtoOut;
    }

    public async Task RemoveMembershipAsync(
        string fieldId,
        string actorId,
        string targetUserId,
        CancellationToken cancellationToken = default)
    {
        var field = await RequireOwnAsync(fieldId, actorId, cancellationToken);
        try
        {
            FieldMembershipSync.Remove(field, targetUserId);
        }
        catch (InvalidOperationException ex)
        {
            throw new ValidationException(ex.Message);
        }

        field.UpdatedAt = _dateTimeProvider.UtcNow;
        await _fieldRepository.UpdateAsync(field, cancellationToken);
    }

    public async Task<FieldInviteDto> CreateInviteAsync(
        string fieldId,
        string actorId,
        CreateFieldInviteDto dto,
        string? publicAppBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var field = await RequireOwnAsync(fieldId, actorId, cancellationToken);
        var capacities = (dto.Capacities ?? new List<string> { FieldCapacities.Work })
            .Select(FieldCapacities.Normalize)
            .Where(FieldCapacities.IsKnown)
            .Distinct()
            .ToList();
        if (capacities.Count == 0)
        {
            capacities.Add(FieldCapacities.Work);
        }

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        var invite = new FieldInvite
        {
            Token = token,
            FieldId = field.Id,
            FieldName = field.Name,
            InvitedBy = actorId,
            Capacities = capacities,
            Phone = dto.Phone,
            Email = dto.Email,
            DisplayName = dto.DisplayName,
            Status = "pending",
            ExpiresAt = _dateTimeProvider.UtcNow.AddDays(14),
            CreatedAt = _dateTimeProvider.UtcNow,
            UpdatedAt = _dateTimeProvider.UtcNow
        };

        await _inviteRepository.CreateAsync(invite, cancellationToken);
        return ToInviteDto(invite, publicAppBaseUrl);
    }

    public async Task<FieldInviteDto?> GetInviteAsync(string token, CancellationToken cancellationToken = default)
    {
        var invite = await _inviteRepository.GetByTokenAsync(token, cancellationToken);
        if (invite == null)
        {
            return null;
        }

        return ToInviteDto(invite, null);
    }

    public async Task<FieldMembershipDto> AcceptInviteAsync(
        string token,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var invite = await _inviteRepository.GetByTokenAsync(token, cancellationToken)
            ?? throw new NotFoundException("Invite not found.");

        if (!string.Equals(invite.Status, "pending", StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("This invite is no longer valid.");
        }

        if (invite.ExpiresAt < _dateTimeProvider.UtcNow)
        {
            invite.Status = "expired";
            await _inviteRepository.UpdateAsync(invite, cancellationToken);
            throw new ValidationException("This invite has expired.");
        }

        var field = await _fieldRepository.GetByIdAsync(invite.FieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        var membership = FieldMembershipSync.Upsert(field, userId, invite.Capacities, invite.InvitedBy);
        field.UpdatedAt = _dateTimeProvider.UtcNow;
        await _fieldRepository.UpdateAsync(field, cancellationToken);

        invite.Status = "accepted";
        invite.AcceptedBy = userId;
        await _inviteRepository.UpdateAsync(invite, cancellationToken);

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        var dto = FieldMapper.ToMembershipDto(membership);
        if (user != null)
        {
            dto.DisplayName = DisplayName(user);
            dto.Email = user.Email;
        }

        return dto;
    }

    public async Task<AdvisorCommentDto> AddAdvisorCommentAsync(
        string fieldId,
        string userId,
        CreateAdvisorCommentDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Body))
        {
            throw new ValidationException("Comment cannot be empty.");
        }

        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
        FieldMembershipSync.EnsureBackfilled(field);

        if (!FieldMembershipSync.HasCapacity(field, userId, FieldCapacities.Advise)
            && !FieldMembershipSync.HasCapacity(field, userId, FieldCapacities.Own))
        {
            throw new ForbiddenException("Only advisors or owners can comment.");
        }

        var comment = new AdvisorComment
        {
            UserId = userId,
            Body = dto.Body.Trim(),
            CreatedAt = _dateTimeProvider.UtcNow
        };
        field.AdvisorComments.Add(comment);
        field.UpdatedAt = _dateTimeProvider.UtcNow;
        await _fieldRepository.UpdateAsync(field, cancellationToken);

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        var outDto = FieldMapper.ToAdvisorCommentDto(comment);
        outDto.DisplayName = user == null ? null : DisplayName(user);
        return outDto;
    }

    public async Task<FieldPeopleStatsDto> GetPeopleStatsAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
        FieldMembershipSync.EnsureBackfilled(field);

        var tasks = (await _taskRepository.GetByFieldIdAsync(fieldId, cancellationToken)).ToList();
        var activities = (await _activityRepository.GetByFieldIdAsync(fieldId, 100, cancellationToken)).ToList();
        var today = _dateTimeProvider.UtcNow.Date;

        var people = new List<PersonWorkStatsDto>();
        foreach (var membership in field.Memberships.Where(m => m.Status == "active"))
        {
            var user = await _userRepository.GetByIdAsync(membership.UserId, cancellationToken);
            var userTasks = tasks.Where(t => t.AssignedTo == membership.UserId).ToList();
            people.Add(new PersonWorkStatsDto
            {
                UserId = membership.UserId,
                DisplayName = user == null ? membership.UserId : DisplayName(user),
                Capacities = membership.Capacities,
                CompletedTasks = userTasks.Count(t => t.Status == Core.Enums.WorkTaskStatus.Completed),
                OverdueTasks = userTasks.Count(t =>
                    t.Status != Core.Enums.WorkTaskStatus.Completed
                    && t.ScheduledEnd.HasValue
                    && t.ScheduledEnd.Value.Date < today),
                OpenTasks = userTasks.Count(t => t.Status != Core.Enums.WorkTaskStatus.Completed),
                LastActivityAt = activities
                    .Where(a => a.ActorUserId == membership.UserId)
                    .Select(a => (DateTime?)a.Timestamp)
                    .DefaultIfEmpty(null)
                    .Max()
            });
        }

        return new FieldPeopleStatsDto { FieldId = fieldId, People = people };
    }

    private async Task<Field> RequireOwnAsync(string fieldId, string actorId, CancellationToken cancellationToken)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
        FieldMembershipSync.EnsureBackfilled(field);
        if (!FieldMembershipSync.HasCapacity(field, actorId, FieldCapacities.Own) && field.OwnerId != actorId)
        {
            throw new ForbiddenException("Only people who look after this field can manage people.");
        }

        return field;
    }

    private async Task<IEnumerable<FieldMembershipDto>> EnrichMembershipsAsync(
        IEnumerable<FieldMembership> memberships,
        CancellationToken cancellationToken)
    {
        var list = new List<FieldMembershipDto>();
        foreach (var membership in memberships)
        {
            var dto = FieldMapper.ToMembershipDto(membership);
            var user = await _userRepository.GetByIdAsync(membership.UserId, cancellationToken);
            if (user != null)
            {
                dto.DisplayName = DisplayName(user);
                dto.Email = user.Email;
            }

            list.Add(dto);
        }

        return list;
    }

    private static string DisplayName(User user)
    {
        var name = $"{user.FirstName} {user.LastName}".Trim();
        return string.IsNullOrWhiteSpace(name) ? user.Email : name;
    }

    private static FieldInviteDto ToInviteDto(FieldInvite invite, string? publicAppBaseUrl)
    {
        var baseUrl = string.IsNullOrWhiteSpace(publicAppBaseUrl) ? "https://app.olivecycle.local" : publicAppBaseUrl.TrimEnd('/');
        var shareUrl = $"{baseUrl}/invite/{invite.Token}";
        var message = $"You were invited to {invite.FieldName} on OliveCycle. Open: {shareUrl}";
        var whatsApp = $"https://wa.me/?text={Uri.EscapeDataString(message)}";
        return new FieldInviteDto
        {
            Id = invite.Id,
            Token = invite.Token,
            FieldId = invite.FieldId,
            FieldName = invite.FieldName,
            InvitedBy = invite.InvitedBy,
            Capacities = invite.Capacities,
            Phone = invite.Phone,
            Email = invite.Email,
            DisplayName = invite.DisplayName,
            Status = invite.Status,
            ExpiresAt = invite.ExpiresAt,
            ShareUrl = shareUrl,
            WhatsAppUrl = whatsApp
        };
    }
}
