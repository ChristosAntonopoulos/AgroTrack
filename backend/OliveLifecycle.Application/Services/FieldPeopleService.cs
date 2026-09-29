using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Application.DTOs.Partners;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class FieldPeopleService : IFieldPeopleService
{
    private readonly IFieldRepository _fieldRepository;
    private readonly IUserRepository _userRepository;
    private readonly IFieldTaskRepository _fieldTasks;
    private readonly IActivityRepository _activityRepository;
    private readonly IFieldInviteRepository _inviteRepository;
    private readonly IFieldAccessService _fieldAccessService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ISavedContactService _savedContacts;
    private readonly IEmailSender? _emailSender;
    private readonly ILogger<FieldPeopleService> _logger;

    public FieldPeopleService(
        IFieldRepository fieldRepository,
        IUserRepository userRepository,
        IFieldTaskRepository fieldTasks,
        IActivityRepository activityRepository,
        IFieldInviteRepository inviteRepository,
        IFieldAccessService fieldAccessService,
        IDateTimeProvider dateTimeProvider,
        ISavedContactService savedContacts,
        ILogger<FieldPeopleService> logger,
        IEmailSender? emailSender = null)
    {
        _fieldRepository = fieldRepository;
        _userRepository = userRepository;
        _fieldTasks = fieldTasks;
        _activityRepository = activityRepository;
        _inviteRepository = inviteRepository;
        _fieldAccessService = fieldAccessService;
        _dateTimeProvider = dateTimeProvider;
        _savedContacts = savedContacts;
        _logger = logger;
        _emailSender = emailSender;
    }

    public async Task EnsureAdminSeatOnCreateAsync(Field field, string adminUserId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(adminUserId, cancellationToken);
        FieldPeopleRules.AddOrReplaceSeat(
            field,
            FieldPersonRole.Admin,
            adminUserId,
            FamilyModules.All,
            FamilyAccessLevels.Work,
            invitedBy: adminUserId,
            displayName: user == null ? null : DisplayName(user),
            email: user?.Email,
            status: FamilyMemberStatuses.Active);
        await Task.CompletedTask;
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
        FieldPeopleRules.EnsureNormalized(field);
        return await EnrichPeopleAsync(
            FieldPeopleRules.OccupiedSeats(field)
                .Where(p => string.Equals(p.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase)
                            || string.Equals(p.Status, FamilyMemberStatuses.Pending, StringComparison.OrdinalIgnoreCase)),
            cancellationToken);
    }

    public async Task<FieldMembershipDto> UpsertMembershipAsync(
        string fieldId,
        string actorId,
        string targetUserId,
        UpsertFieldMembershipDto dto,
        CancellationToken cancellationToken = default)
    {
        var field = await RequireAdminAsync(fieldId, actorId, cancellationToken);
        var target = await _userRepository.GetByIdAsync(targetUserId, cancellationToken)
            ?? throw new ValidationException("User not found.");

        FieldPerson person;
        try
        {
            if (!Enum.TryParse<FieldPersonRole>(dto.Role, ignoreCase: true, out var role)
                || role == FieldPersonRole.Admin)
            {
                throw new ValidationException("Role must be Partner or Family.");
            }

            person = FieldPeopleRules.AddOrReplaceSeat(
                field,
                role,
                targetUserId,
                dto.Modules ?? FamilyModules.DefaultOnInvite.ToList(),
                dto.AccessLevel ?? FamilyAccessLevels.Work,
                actorId,
                DisplayName(target),
                target.Email,
                status: FamilyMemberStatuses.Active);
        }
        catch (InvalidOperationException ex)
        {
            throw new ValidationException(ex.Message);
        }

        field.UpdatedAt = _dateTimeProvider.UtcNow;
        await _fieldRepository.UpdateAsync(field, cancellationToken);
        _logger.LogInformation("Seat upserted for {UserId} on field {FieldId}", targetUserId, fieldId);

        var dtoOut = ToPersonDto(person);
        dtoOut.DisplayName = DisplayName(target);
        dtoOut.Email = target.Email;
        return dtoOut;
    }

    public async Task<FieldMembershipDto> UpdatePersonAsync(
        string fieldId,
        string actorId,
        string targetUserId,
        UpdateFieldPersonDto dto,
        CancellationToken cancellationToken = default)
    {
        var field = await RequireAdminAsync(fieldId, actorId, cancellationToken);
        var seat = FieldPeopleRules.GetActiveOrPendingByUserId(field, targetUserId)
            ?? FieldPeopleRules.OccupiedSeats(field).FirstOrDefault(p =>
                string.Equals(p.InviteId, targetUserId, StringComparison.Ordinal))
            ?? throw new NotFoundException("Person not found on this field.");

        if (!string.IsNullOrWhiteSpace(dto.Role))
        {
            if (seat.Role == FieldPersonRole.Admin)
            {
                throw new ValidationException("Owner access is not edited here. Transfer ownership instead.");
            }

            if (!FieldPeopleRules.TryParseRelationship(dto.Role, out var relationship))
            {
                throw new ValidationException("Relationship must be Family or Collaborator.");
            }

            seat.Role = relationship;
        }

        FieldPeopleRules.UpdateSeatAccess(seat, dto.Modules, dto.AccessLevel);
        field.UpdatedAt = _dateTimeProvider.UtcNow;
        await _fieldRepository.UpdateAsync(field, cancellationToken);
        return await EnrichOneAsync(seat, cancellationToken);
    }

    public async Task RemoveMembershipAsync(
        string fieldId,
        string actorId,
        string targetUserId,
        CancellationToken cancellationToken = default)
    {
        var field = await RequireAdminAsync(fieldId, actorId, cancellationToken);
        try
        {
            FieldPeopleRules.RemoveSeat(field, targetUserId);
        }
        catch (InvalidOperationException ex)
        {
            throw new ValidationException(ex.Message);
        }

        field.UpdatedAt = _dateTimeProvider.UtcNow;
        await _fieldRepository.UpdateAsync(field, cancellationToken);
    }

    public async Task RevokePersonAsync(
        string fieldId,
        string actorId,
        string targetUserIdOrInviteId,
        CancellationToken cancellationToken = default)
    {
        var field = await RequireAdminAsync(fieldId, actorId, cancellationToken);
        var seat = FieldPeopleRules.GetActiveOrPendingByUserId(field, targetUserIdOrInviteId)
            ?? FieldPeopleRules.OccupiedSeats(field).FirstOrDefault(p =>
                string.Equals(p.InviteId, targetUserIdOrInviteId, StringComparison.Ordinal))
            ?? throw new NotFoundException("Person not found on this field.");
        try
        {
            FieldPeopleRules.RevokeSeat(field, seat);
        }
        catch (InvalidOperationException ex)
        {
            throw new ValidationException(ex.Message);
        }

        if (!string.IsNullOrWhiteSpace(seat.InviteId))
        {
            var invites = await _inviteRepository.GetByFieldIdAsync(fieldId, cancellationToken);
            var match = invites.FirstOrDefault(i => i.Id == seat.InviteId || i.Token == seat.InviteId);
            if (match != null && string.Equals(match.Status, FamilyInviteStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            {
                match.Status = FamilyInviteStatuses.Revoked;
                await _inviteRepository.UpdateAsync(match, cancellationToken);
            }
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
        var field = await RequireAdminAsync(fieldId, actorId, cancellationToken);
        var role = ResolveInviteRole(dto);
        if (role == FieldPersonRole.Admin)
        {
            throw new ValidationException("Cannot invite another admin. Transfer is not supported yet.");
        }

        var modules = (dto.Modules ?? new List<string>())
            .Select(FamilyModules.Normalize)
            .Where(FamilyModules.IsKnown)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (modules.Count == 0)
        {
            modules = FamilyModules.DefaultOnInvite.ToList();
        }

        var level = string.IsNullOrWhiteSpace(dto.AccessLevel)
            ? FamilyAccessLevels.Work
            : FamilyAccessLevels.Normalize(dto.AccessLevel);

        try
        {
            FieldPeopleRules.EnsureSeatAvailable(field, role);
        }
        catch (InvalidOperationException ex)
        {
            throw new ValidationException(ex.Message);
        }

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        var code = await AllocateInviteCodeAsync(cancellationToken);
        var invite = new FieldInvite
        {
            Token = token,
            Code = code,
            FieldId = field.Id,
            FieldName = field.Name,
            InvitedBy = actorId,
            Role = role,
            Modules = modules,
            AccessLevel = level,
            Phone = dto.Phone,
            Email = dto.Email?.Trim().ToLowerInvariant(),
            DisplayName = dto.DisplayName,
            Status = FamilyInviteStatuses.Pending,
            ExpiresAt = _dateTimeProvider.UtcNow.AddDays(14),
            CreatedAt = _dateTimeProvider.UtcNow,
            UpdatedAt = _dateTimeProvider.UtcNow
        };

        invite = await _inviteRepository.CreateAsync(invite, cancellationToken);

        FieldPeopleRules.AddOrReplaceSeat(
            field,
            role,
            userId: null,
            modules,
            level,
            actorId,
            dto.DisplayName,
            invite.Email,
            inviteId: invite.Id,
            status: FamilyMemberStatuses.Pending);
        field.UpdatedAt = _dateTimeProvider.UtcNow;
        await _fieldRepository.UpdateAsync(field, cancellationToken);

        string? invitedByName = null;
        if (!string.IsNullOrWhiteSpace(actorId))
        {
            var inviter = await _userRepository.GetByIdAsync(actorId, cancellationToken);
            invitedByName = inviter == null ? null : DisplayName(inviter);
        }

        var dtoOut = ToInviteDto(invite, publicAppBaseUrl, invitedByName);
        dtoOut.EmailSent = await TrySendInviteEmailAsync(invite, dtoOut, invitedByName, cancellationToken);
        return dtoOut;
    }

    public async Task<IReadOnlyList<FieldInviteDto>> CreateInvitesAsync(
        string actorId,
        CreateMultiFieldInviteDto dto,
        string? publicAppBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var fieldIds = (dto.FieldIds ?? new List<string>())
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();
        if (fieldIds.Count == 0)
        {
            throw new ValidationException("Choose at least one grove.");
        }

        if (!FieldPeopleRules.TryParseRelationship(dto.Relationship, out _))
        {
            throw new ValidationException("Relationship must be Family or Collaborator.");
        }

        var created = new List<FieldInviteDto>();
        foreach (var fieldId in fieldIds)
        {
            created.Add(await CreateInviteAsync(
                fieldId,
                actorId,
                new CreateFieldInviteDto
                {
                    Role = dto.Relationship,
                    AccessLevel = string.IsNullOrWhiteSpace(dto.AccessPreset) ? FamilyAccessLevels.View : dto.AccessPreset,
                    Modules = dto.Modules ?? new List<string>(),
                    Email = dto.Email,
                    Phone = dto.Phone,
                    DisplayName = dto.DisplayName
                },
                publicAppBaseUrl,
                cancellationToken));
        }

        return created;
    }

    public async Task<ManagedPeopleDto> GetManagedPeopleAsync(
        string userId,
        string? publicAppBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var owned = (await _fieldRepository.GetByOwnerIdAsync(userId, cancellationToken)).ToList();
        var manageable = new List<Field>();
        foreach (var field in owned)
        {
            FieldPeopleRules.EnsureNormalized(field);
            if (FieldPeopleRules.IsAdmin(field, userId))
            {
                manageable.Add(field);
            }
        }

        User? owner = null;
        if (manageable.Count > 0)
        {
            owner = await _userRepository.GetByIdAsync(userId, cancellationToken);
        }

        var ownerName = owner == null ? null : DisplayName(owner);
        var people = new Dictionary<string, PersonAccessDto>(StringComparer.OrdinalIgnoreCase);
        var pending = new List<FieldInviteDto>();

        foreach (var field in manageable.OrderBy(item => item.Name, StringComparer.CurrentCultureIgnoreCase))
        {
            foreach (var seat in FieldPeopleRules.OccupiedSeats(field))
            {
                if (seat.Role == FieldPersonRole.Admin)
                {
                    continue;
                }

                if (!string.Equals(seat.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var enriched = await EnrichOneAsync(seat, cancellationToken);
                var key = MembershipKey(enriched);
                if (!people.TryGetValue(key, out var person))
                {
                    person = new PersonAccessDto
                    {
                        UserId = enriched.UserId,
                        DisplayName = enriched.DisplayName ?? string.Empty,
                        Email = enriched.Email
                    };
                    people[key] = person;
                }
                else if (string.IsNullOrWhiteSpace(person.DisplayName) && !string.IsNullOrWhiteSpace(enriched.DisplayName))
                {
                    person.DisplayName = enriched.DisplayName;
                    person.Email ??= enriched.Email;
                }

                person.Memberships.Add(new PersonFieldAccessDto
                {
                    FieldId = field.Id,
                    FieldName = field.Name,
                    Relationship = enriched.Role,
                    AccessPreset = enriched.AccessLevel,
                    Modules = enriched.Modules,
                    Status = enriched.Status
                });
            }

            var invites = await _inviteRepository.GetByFieldIdAsync(field.Id, cancellationToken);
            foreach (var invite in invites)
            {
                if (!string.Equals(invite.Status, FamilyInviteStatuses.Pending, StringComparison.OrdinalIgnoreCase)
                    && !string.Equals(invite.Status, FamilyInviteStatuses.Expired, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                string? invitedByName = ownerName;
                if (!string.IsNullOrWhiteSpace(invite.InvitedBy)
                    && !string.Equals(invite.InvitedBy, userId, StringComparison.Ordinal))
                {
                    var inviter = await _userRepository.GetByIdAsync(invite.InvitedBy, cancellationToken);
                    invitedByName = inviter == null ? invitedByName : DisplayName(inviter);
                }

                pending.Add(ToInviteDto(invite, publicAppBaseUrl, invitedByName));
            }
        }

        var contacts = await _savedContacts.GetMineAsync(userId, null, includeUnassigned: true, cancellationToken);

        return new ManagedPeopleDto
        {
            People = people.Values
                .OrderBy(person => person.DisplayName, StringComparer.CurrentCultureIgnoreCase)
                .ToList(),
            PendingInvites = pending
                .OrderByDescending(invite => invite.CreatedAt)
                .ToList(),
            Contacts = contacts.ToList(),
            ManageableFields = manageable
                .OrderBy(field => field.Name, StringComparer.CurrentCultureIgnoreCase)
                .Select(field => new ManageableFieldDto
                {
                    Id = field.Id,
                    Name = field.Name,
                    OwnerUserId = userId,
                    OwnerDisplayName = ownerName,
                    OwnerEmail = owner?.Email
                })
                .ToList()
        };
    }

    public async Task<IReadOnlyList<FieldInviteDto>> GetInvitesAsync(
        string fieldId,
        string actorId,
        string? publicAppBaseUrl,
        CancellationToken cancellationToken = default)
    {
        await RequireAdminAsync(fieldId, actorId, cancellationToken);
        var invites = (await _inviteRepository.GetByFieldIdAsync(fieldId, cancellationToken)).ToList();
        var result = new List<FieldInviteDto>();
        foreach (var invite in invites)
        {
            string? invitedByName = null;
            if (!string.IsNullOrWhiteSpace(invite.InvitedBy))
            {
                var inviter = await _userRepository.GetByIdAsync(invite.InvitedBy, cancellationToken);
                invitedByName = inviter == null ? null : DisplayName(inviter);
            }

            result.Add(ToInviteDto(invite, publicAppBaseUrl, invitedByName));
        }

        return result;
    }

    public async Task<FieldInviteDto> ResendInviteAsync(
        string fieldId,
        string actorId,
        string inviteId,
        string? publicAppBaseUrl,
        CancellationToken cancellationToken = default)
    {
        await RequireAdminAsync(fieldId, actorId, cancellationToken);
        var invites = await _inviteRepository.GetByFieldIdAsync(fieldId, cancellationToken);
        var invite = invites.FirstOrDefault(item =>
            string.Equals(item.Id, inviteId, StringComparison.Ordinal)
            || string.Equals(item.Token, inviteId, StringComparison.Ordinal))
            ?? throw new NotFoundException("Invite not found.");

        if (string.Equals(invite.Status, FamilyInviteStatuses.Accepted, StringComparison.OrdinalIgnoreCase)
            || string.Equals(invite.Status, FamilyInviteStatuses.Revoked, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("This invitation can no longer be resent.");
        }

        invite.Status = FamilyInviteStatuses.Pending;
        invite.ExpiresAt = _dateTimeProvider.UtcNow.AddDays(14);
        invite.UpdatedAt = _dateTimeProvider.UtcNow;
        await _inviteRepository.UpdateAsync(invite, cancellationToken);

        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
        FieldPeopleRules.EnsureNormalized(field);
        var seat = field.People.FirstOrDefault(person =>
            string.Equals(person.InviteId, invite.Id, StringComparison.Ordinal));
        if (seat != null && string.Equals(seat.Status, FamilyMemberStatuses.Revoked, StringComparison.OrdinalIgnoreCase))
        {
            seat.Status = FamilyMemberStatuses.Pending;
            field.UpdatedAt = _dateTimeProvider.UtcNow;
            await _fieldRepository.UpdateAsync(field, cancellationToken);
        }

        string? invitedByName = null;
        if (!string.IsNullOrWhiteSpace(invite.InvitedBy))
        {
            var inviter = await _userRepository.GetByIdAsync(invite.InvitedBy, cancellationToken);
            invitedByName = inviter == null ? null : DisplayName(inviter);
        }

        var dtoOut = ToInviteDto(invite, publicAppBaseUrl, invitedByName);
        dtoOut.EmailSent = await TrySendInviteEmailAsync(invite, dtoOut, invitedByName, cancellationToken);
        return dtoOut;
    }

    public async Task<FieldInviteDto?> GetInviteAsync(string tokenOrCode, CancellationToken cancellationToken = default)
    {
        var invite = await ResolveInviteAsync(tokenOrCode, cancellationToken);
        if (invite == null)
        {
            return null;
        }

        string? invitedByName = null;
        if (!string.IsNullOrWhiteSpace(invite.InvitedBy))
        {
            var inviter = await _userRepository.GetByIdAsync(invite.InvitedBy, cancellationToken);
            if (inviter != null)
            {
                invitedByName = DisplayName(inviter);
            }
        }

        return ToInviteDto(invite, null, invitedByName);
    }

    public async Task<FieldMembershipDto> AcceptInviteAsync(
        string tokenOrCode,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var invite = await ResolveInviteAsync(tokenOrCode, cancellationToken)
            ?? throw new NotFoundException("Invite not found.");

        if (!string.Equals(invite.Status, FamilyInviteStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("This invite is no longer valid.");
        }

        if (invite.ExpiresAt < _dateTimeProvider.UtcNow)
        {
            invite.Status = FamilyInviteStatuses.Expired;
            await _inviteRepository.UpdateAsync(invite, cancellationToken);
            throw new ValidationException("This invite has expired.");
        }

        var field = await _fieldRepository.GetByIdAsync(invite.FieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
        FieldPeopleRules.EnsureNormalized(field);

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException("User not found.");

        var existing = FieldPeopleRules.GetActiveByUserId(field, userId);
        if (existing != null && existing.Role != invite.Role)
        {
            throw new ValidationException("You already have a different seat on this field.");
        }

        var seat = field.People.FirstOrDefault(p =>
            string.Equals(p.InviteId, invite.Id, StringComparison.Ordinal)
            && string.Equals(p.Status, FamilyMemberStatuses.Pending, StringComparison.OrdinalIgnoreCase));

        if (seat == null)
        {
            try
            {
                seat = FieldPeopleRules.AddOrReplaceSeat(
                    field,
                    invite.Role,
                    userId,
                    invite.Modules,
                    invite.AccessLevel,
                    invite.InvitedBy,
                    DisplayName(user),
                    user.Email,
                    invite.Id,
                    FamilyMemberStatuses.Active);
            }
            catch (InvalidOperationException ex)
            {
                throw new ValidationException(ex.Message);
            }
        }
        else
        {
            FieldPeopleRules.AcceptSeat(seat, userId, DisplayName(user), user.Email);
            FieldPeopleRules.SyncDerivedIds(field);
        }

        field.UpdatedAt = _dateTimeProvider.UtcNow;
        await _fieldRepository.UpdateAsync(field, cancellationToken);

        invite.Status = FamilyInviteStatuses.Accepted;
        invite.AcceptedBy = userId;
        await _inviteRepository.UpdateAsync(invite, cancellationToken);

        await _savedContacts.LinkOnInviteAcceptedAsync(
            invite.InvitedBy,
            userId,
            invite.Phone,
            invite.Email ?? user.Email,
            cancellationToken);

        return ToPersonDto(seat);
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
        FieldPeopleRules.EnsureNormalized(field);

        if (!FieldPeopleRules.IsAdmin(field, userId)
            && !FieldPeopleRules.HasModule(field, userId, FamilyModules.Fields))
        {
            throw new ForbiddenException("Only admins or advisors can comment.");
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
        FieldPeopleRules.EnsureNormalized(field);

        var tasks = (await _fieldTasks.QueryAsync(
            new FieldTaskQuery { FieldId = fieldId },
            cancellationToken)).ToList();
        var activities = (await _activityRepository.GetByFieldIdAsync(fieldId, 100, cancellationToken)).ToList();
        var today = _dateTimeProvider.UtcNow.Date;

        var people = new List<PersonWorkStatsDto>();
        foreach (var person in FieldPeopleRules.OccupiedSeats(field)
                     .Where(p => string.Equals(p.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase)
                                 && !string.IsNullOrWhiteSpace(p.UserId)))
        {
            var user = await _userRepository.GetByIdAsync(person.UserId, cancellationToken);
            var userTasks = tasks.Where(t =>
                string.Equals(t.AssignedUserId, person.UserId, StringComparison.Ordinal)).ToList();
            people.Add(new PersonWorkStatsDto
            {
                UserId = person.UserId,
                DisplayName = user == null
                    ? (string.IsNullOrWhiteSpace(person.DisplayName) ? person.UserId : person.DisplayName)
                    : DisplayName(user),
                Role = person.Role.ToString(),
                Modules = person.Modules.ToList(),
                AccessLevel = person.AccessLevel,
                CompletedTasks = userTasks.Count(t => t.Status == FieldTaskStatus.Completed),
                OverdueTasks = userTasks.Count(t =>
                    t.Status != FieldTaskStatus.Completed
                    && t.Status != FieldTaskStatus.Cancelled
                    && t.PlannedEnd.HasValue
                    && t.PlannedEnd.Value.Date < today),
                OpenTasks = userTasks.Count(t =>
                    t.Status != FieldTaskStatus.Completed
                    && t.Status != FieldTaskStatus.Cancelled),
                LastActivityAt = activities
                    .Where(a => a.ActorUserId == person.UserId)
                    .Select(a => (DateTime?)a.Timestamp)
                    .DefaultIfEmpty(null)
                    .Max()
            });
        }

        return new FieldPeopleStatsDto { FieldId = fieldId, People = people };
    }

    public async Task<IReadOnlyList<FieldAccessSnapshotDto>> GetMyFieldAccessAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var memberFields = await _fieldRepository.GetByMemberUserIdAsync(userId, cancellationToken);
        var ownedFields = await _fieldRepository.GetByOwnerIdAsync(userId, cancellationToken);
        var fields = memberFields.Concat(ownedFields).DistinctBy(f => f.Id).ToList();
        var result = new List<FieldAccessSnapshotDto>();
        foreach (var field in fields)
        {
            FieldPeopleRules.EnsureNormalized(field);
            var seat = FieldPeopleRules.GetActiveByUserId(field, userId);
            // OwnerId still counts as admin when the seat row was never written.
            if (seat == null && !FieldPeopleRules.IsAdmin(field, userId))
            {
                continue;
            }

            var role = seat?.Role ?? FieldPersonRole.Admin;
            var admin = FieldPeopleRules.GetAdmin(field);
            result.Add(new FieldAccessSnapshotDto
            {
                FieldId = field.Id,
                FieldName = field.Name,
                Role = role.ToString(),
                Modules = role == FieldPersonRole.Admin
                    ? FamilyModules.All.ToList()
                    : seat!.Modules.ToList(),
                AccessLevel = seat?.AccessLevel ?? FamilyAccessLevels.Work,
                AdminUserId = admin?.UserId ?? field.OwnerId,
                Capabilities = FieldCapabilitiesResolver.Resolve(field, userId)
            });
        }

        return result;
    }

    private async Task<FieldInvite?> ResolveInviteAsync(string tokenOrCode, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(tokenOrCode))
        {
            return null;
        }

        var byToken = await _inviteRepository.GetByTokenAsync(tokenOrCode.Trim(), cancellationToken);
        if (byToken != null)
        {
            return byToken;
        }

        return await _inviteRepository.GetByCodeAsync(tokenOrCode.Trim(), cancellationToken);
    }

    private async Task<string> AllocateInviteCodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 20; attempt++)
        {
            var code = FamilyInviteCodes.Generate();
            var existing = await _inviteRepository.GetByCodeAsync(code, cancellationToken);
            if (existing == null)
            {
                return code;
            }
        }

        throw new InvalidOperationException("Could not allocate a unique invite code.");
    }

    private static FieldPersonRole ResolveInviteRole(CreateFieldInviteDto dto)
    {
        if (FieldPeopleRules.TryParseRelationship(dto.Role, out var role))
        {
            return role;
        }

        return FieldPersonRole.Partner;
    }

    private static string MembershipKey(FieldMembershipDto membership)
    {
        if (!string.IsNullOrWhiteSpace(membership.UserId))
        {
            return "user:" + membership.UserId;
        }

        if (!string.IsNullOrWhiteSpace(membership.Email))
        {
            return "email:" + membership.Email.Trim().ToLowerInvariant();
        }

        return "name:" + (membership.DisplayName ?? string.Empty).Trim().ToLowerInvariant();
    }

    private async Task<Field> RequireAdminAsync(string fieldId, string actorId, CancellationToken cancellationToken)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
        FieldPeopleRules.EnsureNormalized(field);
        if (!FieldPeopleRules.IsAdmin(field, actorId))
        {
            throw new ForbiddenException("Only the field admin can manage people.");
        }

        return field;
    }

    private async Task<IEnumerable<FieldMembershipDto>> EnrichPeopleAsync(
        IEnumerable<FieldPerson> people,
        CancellationToken cancellationToken)
    {
        var list = new List<FieldMembershipDto>();
        foreach (var person in people)
        {
            list.Add(await EnrichOneAsync(person, cancellationToken));
        }

        return list;
    }

    private async Task<FieldMembershipDto> EnrichOneAsync(FieldPerson person, CancellationToken cancellationToken)
    {
        var dto = ToPersonDto(person);
        if (!string.IsNullOrWhiteSpace(person.UserId))
        {
            var user = await _userRepository.GetByIdAsync(person.UserId, cancellationToken);
            if (user != null)
            {
                dto.DisplayName = DisplayName(user);
                dto.Email = user.Email;
            }
        }

        return dto;
    }

    private static FieldMembershipDto ToPersonDto(FieldPerson person) => new()
    {
        UserId = person.UserId,
        DisplayName = string.IsNullOrWhiteSpace(person.DisplayName) ? null : person.DisplayName,
        Email = person.Email,
        Role = person.Role.ToString(),
        Modules = person.Modules.ToList(),
        AccessLevel = person.AccessLevel,
        Status = person.Status,
        InviteId = person.InviteId,
        InvitedBy = person.InvitedBy,
        CreatedAt = person.CreatedAt
    };

    private static string DisplayName(User user)
    {
        var name = $"{user.FirstName} {user.LastName}".Trim();
        return string.IsNullOrWhiteSpace(name) ? user.Email : name;
    }

    private async Task<bool> TrySendInviteEmailAsync(
        FieldInvite invite,
        FieldInviteDto dto,
        string? invitedByName,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(invite.Email) || _emailSender == null || !_emailSender.IsConfigured)
        {
            return false;
        }

        try
        {
            var who = string.IsNullOrWhiteSpace(invitedByName) ? "OleaChron" : invitedByName;
            var subject = $"Πρόσκληση στο {invite.FieldName} — Oleachron";
            var body =
                $"{who} σε προσκαλεί στο {invite.FieldName} στο Oleachron.\n\n" +
                $"Άνοιξε: {dto.ShareUrl}\n" +
                (string.IsNullOrWhiteSpace(invite.Code) ? "" : $"Κωδικός πρόσκλησης: {invite.Code}\n");
            await _emailSender.SendAsync(invite.Email, subject, body.Trim(), cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Invite email to {Email} failed for field {FieldId}", invite.Email, invite.FieldId);
            return false;
        }
    }

    private static FieldInviteDto ToInviteDto(FieldInvite invite, string? publicAppBaseUrl, string? invitedByName = null)
    {
        var baseUrl = string.IsNullOrWhiteSpace(publicAppBaseUrl) ? "https://app.oleachron.local" : publicAppBaseUrl.TrimEnd('/');
        var shareUrl = $"{baseUrl}/invite/{invite.Token}";
        var message = string.IsNullOrWhiteSpace(invitedByName)
            ? $"Σε προσκάλεσαν στο {invite.FieldName} στο Oleachron. Άνοιξε: {shareUrl}"
            : $"{invitedByName} σε προσκαλεί στο {invite.FieldName} στο Oleachron. Άνοιξε: {shareUrl}";
        if (!string.IsNullOrWhiteSpace(invite.Code))
        {
            message += $" Κωδικός: {invite.Code}";
        }

        var whatsApp = $"https://wa.me/?text={Uri.EscapeDataString(message)}";
        string? mailto = null;
        if (!string.IsNullOrWhiteSpace(invite.Email))
        {
            mailto =
                $"mailto:{Uri.EscapeDataString(invite.Email)}?subject={Uri.EscapeDataString($"Πρόσκληση στο {invite.FieldName} — Oleachron")}&body={Uri.EscapeDataString(message)}";
        }

        return new FieldInviteDto
        {
            Id = invite.Id,
            Token = invite.Token,
            Code = invite.Code,
            FieldId = invite.FieldId,
            FieldName = invite.FieldName,
            InvitedBy = invite.InvitedBy,
            InvitedByName = invitedByName,
            Role = invite.Role.ToString(),
            Modules = invite.Modules
                .Select(FamilyModules.Normalize)
                .Where(FamilyModules.IsKnown)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList(),
            AccessLevel = invite.AccessLevel,
            Phone = invite.Phone,
            Email = invite.Email,
            DisplayName = invite.DisplayName,
            Status = invite.Status,
            ExpiresAt = invite.ExpiresAt,
            CreatedAt = invite.CreatedAt,
            AcceptedBy = invite.AcceptedBy,
            ShareUrl = shareUrl,
            WhatsAppUrl = whatsApp,
            MailtoUrl = mailto
        };
    }
}
