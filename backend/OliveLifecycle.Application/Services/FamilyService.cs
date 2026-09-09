using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Family;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class FamilyService : IFamilyService
{
    private readonly IFamilyCircleRepository _circles;
    private readonly IFamilyMemberRepository _members;
    private readonly IFamilyInviteRepository _invites;
    private readonly IFieldRepository _fields;
    private readonly IUserRepository _users;
    private readonly IDateTimeProvider _clock;
    private readonly ILogger<FamilyService> _logger;

    public FamilyService(
        IFamilyCircleRepository circles,
        IFamilyMemberRepository members,
        IFamilyInviteRepository invites,
        IFieldRepository fields,
        IUserRepository users,
        IDateTimeProvider clock,
        ILogger<FamilyService> logger)
    {
        _circles = circles;
        _members = members;
        _invites = invites;
        _fields = fields;
        _users = users;
        _clock = clock;
        _logger = logger;
    }

    public async Task<FamilyCircleDto> GetMineAsync(
        string ownerUserId,
        string? publicAppBaseUrl = null,
        CancellationToken cancellationToken = default)
    {
        await EnsureCanManageFamilyAsync(ownerUserId, cancellationToken);
        var circle = await EnsureCircleAsync(ownerUserId, cancellationToken);
        await ExpireStaleInvitesAsync(circle.Id, cancellationToken);
        return await ToCircleDtoAsync(circle, publicAppBaseUrl, cancellationToken);
    }

    public async Task<FamilyInviteShareDto> CreateInviteAsync(
        string ownerUserId,
        CreateFamilyInviteDto dto,
        string? publicAppBaseUrl,
        CancellationToken cancellationToken = default)
    {
        await EnsureCanManageFamilyAsync(ownerUserId, cancellationToken);
        var circle = await EnsureCircleAsync(ownerUserId, cancellationToken);
        await ExpireStaleInvitesAsync(circle.Id, cancellationToken);

        var seats = await _members.CountOccupiedSeatsAsync(ownerUserId, cancellationToken);
        if (seats >= FamilyCircle.MaxExtraMembers)
        {
            throw new ValidationException("You can add up to 2 family members.");
        }

        var displayName = (dto.DisplayName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(displayName))
        {
            throw new ValidationException("Name is required.");
        }

        var phone = NormalizeOptional(dto.Phone);
        var email = NormalizeOptional(dto.Email)?.ToLowerInvariant();
        if (phone == null && email == null)
        {
            throw new ValidationException("Phone or email is required.");
        }

        var modules = NormalizeModules(dto.Modules);
        if (modules.Count == 0)
        {
            throw new ValidationException("Select at least one part they can access.");
        }

        var level = NormalizeLevel(dto.AccessLevel);
        var now = _clock.UtcNow;
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();

        var member = await _members.CreateAsync(new FamilyMember
        {
            CircleId = circle.Id,
            OwnerUserId = ownerUserId,
            DisplayName = displayName,
            Phone = phone,
            Email = email,
            Modules = modules,
            AccessLevel = level,
            Status = FamilyMemberStatuses.Pending,
            CreatedAt = now,
            UpdatedAt = now
        }, cancellationToken);

        var invite = await _invites.CreateAsync(new FamilyInvite
        {
            Token = token,
            CircleId = circle.Id,
            MemberId = member.Id,
            OwnerUserId = ownerUserId,
            InvitedBy = ownerUserId,
            DisplayName = displayName,
            Phone = phone,
            Email = email,
            Modules = modules,
            AccessLevel = level,
            Status = FamilyInviteStatuses.Pending,
            ExpiresAt = now.AddDays(14),
            CreatedAt = now,
            UpdatedAt = now
        }, cancellationToken);

        member.InviteId = invite.Id;
        member.UpdatedAt = now;
        await _members.UpdateAsync(member, cancellationToken);

        _logger.LogInformation(
            "Family invite {InviteId} created for circle {CircleId} by {OwnerUserId}",
            invite.Id,
            circle.Id,
            ownerUserId);

        var owner = await _users.GetByIdAsync(ownerUserId, cancellationToken);
        return ToInviteShareDto(invite, publicAppBaseUrl, OwnerDisplayName(owner));
    }

    public async Task<FamilyMemberDto> UpdateMemberAsync(
        string ownerUserId,
        string memberId,
        UpdateFamilyMemberDto dto,
        string? publicAppBaseUrl = null,
        CancellationToken cancellationToken = default)
    {
        await EnsureCanManageFamilyAsync(ownerUserId, cancellationToken);
        var member = await _members.GetByIdAsync(memberId, cancellationToken)
            ?? throw new NotFoundException("Family member not found.");

        if (member.OwnerUserId != ownerUserId)
        {
            throw new ForbiddenException("You can only manage your own family members.");
        }

        if (string.Equals(member.Status, FamilyMemberStatuses.Revoked, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("This family seat was revoked.");
        }

        if (dto.DisplayName != null)
        {
            var name = dto.DisplayName.Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ValidationException("Name is required.");
            }

            member.DisplayName = name;
        }

        if (dto.Phone != null)
        {
            member.Phone = NormalizeOptional(dto.Phone);
        }

        if (dto.Email != null)
        {
            member.Email = NormalizeOptional(dto.Email)?.ToLowerInvariant();
        }

        if (dto.Modules != null)
        {
            var modules = NormalizeModules(dto.Modules);
            if (modules.Count == 0)
            {
                throw new ValidationException("Select at least one part they can access.");
            }

            member.Modules = modules;
        }

        if (dto.AccessLevel != null)
        {
            member.AccessLevel = NormalizeLevel(dto.AccessLevel);
        }

        if (string.IsNullOrWhiteSpace(member.Phone) && string.IsNullOrWhiteSpace(member.Email))
        {
            throw new ValidationException("Phone or email is required.");
        }

        member.UpdatedAt = _clock.UtcNow;
        await _members.UpdateAsync(member, cancellationToken);

        FamilyInvite? pendingInvite = null;
        if (!string.IsNullOrEmpty(member.InviteId)
            && string.Equals(member.Status, FamilyMemberStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            pendingInvite = await _invites.GetByIdAsync(member.InviteId, cancellationToken);
            if (pendingInvite != null
                && string.Equals(pendingInvite.Status, FamilyInviteStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            {
                pendingInvite.DisplayName = member.DisplayName;
                pendingInvite.Phone = member.Phone;
                pendingInvite.Email = member.Email;
                pendingInvite.Modules = member.Modules;
                pendingInvite.AccessLevel = member.AccessLevel;
                pendingInvite.UpdatedAt = member.UpdatedAt;
                await _invites.UpdateAsync(pendingInvite, cancellationToken);
            }
        }

        var owner = await _users.GetByIdAsync(ownerUserId, cancellationToken);
        return ToMemberDto(member, pendingInvite, publicAppBaseUrl, OwnerDisplayName(owner));
    }

    public async Task RevokeMemberAsync(
        string ownerUserId,
        string memberId,
        CancellationToken cancellationToken = default)
    {
        await EnsureCanManageFamilyAsync(ownerUserId, cancellationToken);
        var member = await _members.GetByIdAsync(memberId, cancellationToken)
            ?? throw new NotFoundException("Family member not found.");

        if (member.OwnerUserId != ownerUserId)
        {
            throw new ForbiddenException("You can only manage your own family members.");
        }

        if (string.Equals(member.Status, FamilyMemberStatuses.Revoked, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var now = _clock.UtcNow;
        member.Status = FamilyMemberStatuses.Revoked;
        member.UpdatedAt = now;
        await _members.UpdateAsync(member, cancellationToken);

        if (!string.IsNullOrEmpty(member.InviteId))
        {
            var invite = await _invites.GetByIdAsync(member.InviteId, cancellationToken);
            if (invite != null
                && string.Equals(invite.Status, FamilyInviteStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            {
                invite.Status = FamilyInviteStatuses.Revoked;
                invite.UpdatedAt = now;
                await _invites.UpdateAsync(invite, cancellationToken);
            }
        }

        _logger.LogInformation("Family member {MemberId} revoked by {OwnerUserId}", memberId, ownerUserId);
    }

    public async Task<FamilyInviteShareDto?> GetInviteAsync(
        string token,
        string? publicAppBaseUrl = null,
        CancellationToken cancellationToken = default)
    {
        var invite = await _invites.GetByTokenAsync(token, cancellationToken);
        if (invite == null)
        {
            return null;
        }

        if (string.Equals(invite.Status, FamilyInviteStatuses.Pending, StringComparison.OrdinalIgnoreCase)
            && invite.ExpiresAt < _clock.UtcNow)
        {
            invite.Status = FamilyInviteStatuses.Expired;
            invite.UpdatedAt = _clock.UtcNow;
            await _invites.UpdateAsync(invite, cancellationToken);

            var member = await _members.GetByIdAsync(invite.MemberId, cancellationToken);
            if (member != null
                && string.Equals(member.Status, FamilyMemberStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            {
                member.Status = FamilyMemberStatuses.Revoked;
                member.UpdatedAt = invite.UpdatedAt;
                await _members.UpdateAsync(member, cancellationToken);
            }
        }

        var owner = await _users.GetByIdAsync(invite.OwnerUserId, cancellationToken);
        return ToInviteShareDto(invite, publicAppBaseUrl, OwnerDisplayName(owner));
    }

    public async Task<FamilyMemberDto> AcceptInviteAsync(
        string token,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var invite = await _invites.GetByTokenAsync(token, cancellationToken)
            ?? throw new NotFoundException("Invite not found.");

        if (!string.Equals(invite.Status, FamilyInviteStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("This invite is no longer valid.");
        }

        if (invite.ExpiresAt < _clock.UtcNow)
        {
            invite.Status = FamilyInviteStatuses.Expired;
            invite.UpdatedAt = _clock.UtcNow;
            await _invites.UpdateAsync(invite, cancellationToken);
            throw new ValidationException("This invite has expired.");
        }

        if (string.Equals(invite.OwnerUserId, userId, StringComparison.Ordinal))
        {
            throw new ValidationException("You cannot accept your own family invite.");
        }

        var member = await _members.GetByIdAsync(invite.MemberId, cancellationToken)
            ?? throw new NotFoundException("Family member not found.");

        if (!string.Equals(member.Status, FamilyMemberStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("This family seat is no longer pending.");
        }

        var existing = await _members.GetActiveByLinkedUserIdAsync(userId, cancellationToken);
        if (existing != null && existing.Id != member.Id)
        {
            throw new ValidationException("You are already linked to a family circle.");
        }

        var now = _clock.UtcNow;
        member.Status = FamilyMemberStatuses.Active;
        member.LinkedUserId = userId;
        member.Modules = invite.Modules;
        member.AccessLevel = invite.AccessLevel;
        member.UpdatedAt = now;
        await _members.UpdateAsync(member, cancellationToken);

        invite.Status = FamilyInviteStatuses.Accepted;
        invite.AcceptedBy = userId;
        invite.UpdatedAt = now;
        await _invites.UpdateAsync(invite, cancellationToken);

        _logger.LogInformation(
            "Family invite {InviteId} accepted by {UserId} for owner {OwnerUserId}",
            invite.Id,
            userId,
            invite.OwnerUserId);

        return ToMemberDto(member, null, null, null);
    }

    public async Task<FamilyAccessSnapshot?> GetActiveAccessByLinkedUserAsync(
        string linkedUserId,
        CancellationToken cancellationToken = default)
    {
        var member = await _members.GetActiveByLinkedUserIdAsync(linkedUserId, cancellationToken);
        return member == null ? null : ToAccessSnapshot(member);
    }

    public async Task<IReadOnlyList<FamilyAccessSnapshot>> GetActiveAccessesByLinkedUserAsync(
        string linkedUserId,
        CancellationToken cancellationToken = default)
    {
        var members = await _members.GetActiveByLinkedUserIdAllAsync(linkedUserId, cancellationToken);
        return members.Select(ToAccessSnapshot).ToList();
    }

    public Task<IReadOnlyList<FamilyAccessSnapshot>> GetMyMembershipAccessAsync(
        string userId,
        CancellationToken cancellationToken = default) =>
        GetActiveAccessesByLinkedUserAsync(userId, cancellationToken);

    private async Task EnsureCanManageFamilyAsync(string ownerUserId, CancellationToken cancellationToken)
    {
        var owned = (await _fields.GetByOwnerIdAsync(ownerUserId, cancellationToken)).ToList();
        if (owned.Count > 0)
        {
            return;
        }

        var memberFields = (await _fields.GetByMemberUserIdAsync(ownerUserId, cancellationToken)).ToList();
        foreach (var field in memberFields)
        {
            FieldMembershipSync.EnsureBackfilled(field);
            if (FieldMembershipSync.HasCapacity(field, ownerUserId, FieldCapacities.Own))
            {
                return;
            }
        }

        throw new ForbiddenException("Only grove owners can manage family members.");
    }

    private async Task<FamilyCircle> EnsureCircleAsync(string ownerUserId, CancellationToken cancellationToken)
    {
        var existing = await _circles.GetByOwnerUserIdAsync(ownerUserId, cancellationToken);
        if (existing != null)
        {
            return existing;
        }

        var now = _clock.UtcNow;
        return await _circles.CreateAsync(new FamilyCircle
        {
            OwnerUserId = ownerUserId,
            CreatedAt = now,
            UpdatedAt = now
        }, cancellationToken);
    }

    private async Task ExpireStaleInvitesAsync(string circleId, CancellationToken cancellationToken)
    {
        var pending = await _invites.GetPendingByCircleIdAsync(circleId, cancellationToken);
        var now = _clock.UtcNow;
        foreach (var invite in pending.Where(i => i.ExpiresAt < now))
        {
            invite.Status = FamilyInviteStatuses.Expired;
            invite.UpdatedAt = now;
            await _invites.UpdateAsync(invite, cancellationToken);

            var member = await _members.GetByIdAsync(invite.MemberId, cancellationToken);
            if (member != null
                && string.Equals(member.Status, FamilyMemberStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            {
                member.Status = FamilyMemberStatuses.Revoked;
                member.UpdatedAt = now;
                await _members.UpdateAsync(member, cancellationToken);
            }
        }
    }

    private async Task<FamilyCircleDto> ToCircleDtoAsync(
        FamilyCircle circle,
        string? publicAppBaseUrl,
        CancellationToken cancellationToken)
    {
        var members = await _members.GetByOwnerUserIdAsync(circle.OwnerUserId, cancellationToken);
        var visible = members
            .Where(m => !string.Equals(m.Status, FamilyMemberStatuses.Revoked, StringComparison.OrdinalIgnoreCase))
            .ToList();

        var owner = await _users.GetByIdAsync(circle.OwnerUserId, cancellationToken);
        var ownerName = OwnerDisplayName(owner);
        var dtos = new List<FamilyMemberDto>();
        foreach (var member in visible)
        {
            FamilyInvite? pending = null;
            if (string.Equals(member.Status, FamilyMemberStatuses.Pending, StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrEmpty(member.InviteId))
            {
                pending = await _invites.GetByIdAsync(member.InviteId, cancellationToken);
            }

            dtos.Add(ToMemberDto(member, pending, publicAppBaseUrl, ownerName));
        }

        return new FamilyCircleDto
        {
            Id = circle.Id,
            OwnerUserId = circle.OwnerUserId,
            SeatsUsed = visible.Count,
            SeatsMax = FamilyCircle.MaxExtraMembers,
            Members = dtos
        };
    }

    private static FamilyMemberDto ToMemberDto(
        FamilyMember member,
        FamilyInvite? pendingInvite,
        string? publicAppBaseUrl,
        string? ownerDisplayName)
    {
        return new FamilyMemberDto
        {
            Id = member.Id,
            CircleId = member.CircleId,
            DisplayName = member.DisplayName,
            Phone = member.Phone,
            Email = member.Email,
            LinkedUserId = member.LinkedUserId,
            Modules = member.Modules,
            AccessLevel = member.AccessLevel,
            Status = member.Status,
            InviteId = member.InviteId,
            PendingInvite = pendingInvite == null
                ? null
                : ToInviteShareDto(pendingInvite, publicAppBaseUrl, ownerDisplayName),
            Checklist = BuildChecklist(member)
        };
    }

    private static FamilyMemberChecklistDto BuildChecklist(FamilyMember member) => new()
    {
        HasContact = !string.IsNullOrWhiteSpace(member.DisplayName)
                     && (!string.IsNullOrWhiteSpace(member.Phone) || !string.IsNullOrWhiteSpace(member.Email)),
        InviteSent = !string.IsNullOrEmpty(member.InviteId)
                     || string.Equals(member.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase),
        Accepted = string.Equals(member.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase)
                   && !string.IsNullOrEmpty(member.LinkedUserId),
        HasModules = member.Modules.Count > 0,
        CanCallOrMessage = !string.IsNullOrWhiteSpace(member.Phone)
    };

    private static FamilyInviteShareDto ToInviteShareDto(
        FamilyInvite invite,
        string? publicAppBaseUrl,
        string? ownerDisplayName)
    {
        var baseUrl = string.IsNullOrWhiteSpace(publicAppBaseUrl)
            ? "https://app.oleachron.local"
            : publicAppBaseUrl.TrimEnd('/');
        var shareUrl = $"{baseUrl}/family-invite/{invite.Token}";
        var ownerLabel = string.IsNullOrWhiteSpace(ownerDisplayName) ? "Oleachron" : ownerDisplayName.Trim();
        var message =
            $"Σε προσκάλεσαν στην οικογένεια του {ownerLabel} στο Oleachron. Άνοιξε: {shareUrl}";
        var subject = "Πρόσκληση οικογένειας Oleachron";
        var mailto = string.IsNullOrWhiteSpace(invite.Email)
            ? $"mailto:?subject={Uri.EscapeDataString(subject)}&body={Uri.EscapeDataString(message)}"
            : $"mailto:{Uri.EscapeDataString(invite.Email)}?subject={Uri.EscapeDataString(subject)}&body={Uri.EscapeDataString(message)}";
        var sms = string.IsNullOrWhiteSpace(invite.Phone)
            ? $"sms:?body={Uri.EscapeDataString(message)}"
            : $"sms:{invite.Phone}?body={Uri.EscapeDataString(message)}";

        return new FamilyInviteShareDto
        {
            Id = invite.Id,
            Token = invite.Token,
            MemberId = invite.MemberId,
            DisplayName = invite.DisplayName,
            Phone = invite.Phone,
            Email = invite.Email,
            Modules = invite.Modules,
            AccessLevel = invite.AccessLevel,
            Status = invite.Status,
            ExpiresAt = invite.ExpiresAt,
            OwnerDisplayName = ownerDisplayName,
            ShareUrl = shareUrl,
            WhatsAppUrl = $"https://wa.me/?text={Uri.EscapeDataString(message)}",
            MailtoUrl = mailto,
            SmsUrl = sms
        };
    }

    private static FamilyAccessSnapshot ToAccessSnapshot(FamilyMember member) =>
        new(member.OwnerUserId, member.Id, member.Modules, member.AccessLevel);

    private static List<string> NormalizeModules(IEnumerable<string>? modules)
    {
        if (modules == null)
        {
            return FamilyModules.DefaultOnInvite.ToList();
        }

        return modules
            .Where(m => !string.IsNullOrWhiteSpace(m))
            .Select(FamilyModules.Normalize)
            .Where(FamilyModules.IsKnown)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string NormalizeLevel(string? level)
    {
        if (string.IsNullOrWhiteSpace(level))
        {
            return FamilyAccessLevels.View;
        }

        var normalized = FamilyAccessLevels.Normalize(level);
        if (!FamilyAccessLevels.IsKnown(normalized))
        {
            throw new ValidationException("Access level must be view, help, or work.");
        }

        return normalized;
    }

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static string? OwnerDisplayName(User? user)
    {
        if (user == null)
        {
            return null;
        }

        var name = $"{user.FirstName} {user.LastName}".Trim();
        return string.IsNullOrWhiteSpace(name) ? user.Email : name;
    }
}
