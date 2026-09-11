using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.OwnerPartner;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class OwnerPartnerService : IOwnerPartnerService
{
    private readonly IOwnerPartnerLinkRepository _links;
    private readonly IOwnerPartnerInviteRepository _invites;
    private readonly IFamilyInviteRepository _familyInvites;
    private readonly IFieldRepository _fields;
    private readonly IUserRepository _users;
    private readonly IDateTimeProvider _clock;
    private readonly ILogger<OwnerPartnerService> _logger;

    public OwnerPartnerService(
        IOwnerPartnerLinkRepository links,
        IOwnerPartnerInviteRepository invites,
        IFamilyInviteRepository familyInvites,
        IFieldRepository fields,
        IUserRepository users,
        IDateTimeProvider clock,
        ILogger<OwnerPartnerService> logger)
    {
        _links = links;
        _invites = invites;
        _familyInvites = familyInvites;
        _fields = fields;
        _users = users;
        _clock = clock;
        _logger = logger;
    }

    public async Task<OwnerPartnerSeatDto> GetMineAsync(
        string ownerUserId,
        string? publicAppBaseUrl = null,
        CancellationToken cancellationToken = default)
    {
        await EnsureCanManagePartnerAsync(ownerUserId, cancellationToken);
        await ExpireStaleInvitesAsync(ownerUserId, cancellationToken);
        return await ToSeatDtoAsync(ownerUserId, publicAppBaseUrl, cancellationToken);
    }

    public async Task<OwnerPartnerInviteShareDto> CreateInviteAsync(
        string ownerUserId,
        CreateOwnerPartnerInviteDto dto,
        string? publicAppBaseUrl,
        CancellationToken cancellationToken = default)
    {
        await EnsureCanManagePartnerAsync(ownerUserId, cancellationToken);
        await ExpireStaleInvitesAsync(ownerUserId, cancellationToken);

        var seats = await _links.CountOccupiedSeatsAsync(ownerUserId, cancellationToken);
        if (seats >= OwnerPartnerLink.MaxPartners)
        {
            throw new ValidationException("You can add 1 partner.");
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
        var code = await AllocateInviteCodeAsync(cancellationToken);

        var link = await _links.CreateAsync(new OwnerPartnerLink
        {
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

        var invite = await _invites.CreateAsync(new OwnerPartnerInvite
        {
            Token = token,
            Code = code,
            LinkId = link.Id,
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

        link.InviteId = invite.Id;
        link.UpdatedAt = now;
        await _links.UpdateAsync(link, cancellationToken);

        _logger.LogInformation(
            "Owner partner invite {InviteId} created by {OwnerUserId}",
            invite.Id,
            ownerUserId);

        var owner = await _users.GetByIdAsync(ownerUserId, cancellationToken);
        return ToInviteShareDto(invite, publicAppBaseUrl, OwnerDisplayName(owner));
    }

    public async Task<OwnerPartnerLinkDto> UpdateLinkAsync(
        string ownerUserId,
        string linkId,
        UpdateOwnerPartnerLinkDto dto,
        string? publicAppBaseUrl = null,
        CancellationToken cancellationToken = default)
    {
        await EnsureCanManagePartnerAsync(ownerUserId, cancellationToken);
        var link = await _links.GetByIdAsync(linkId, cancellationToken)
            ?? throw new NotFoundException("Partner seat not found.");

        if (link.OwnerUserId != ownerUserId)
        {
            throw new ForbiddenException("You can only manage your own partner seat.");
        }

        if (string.Equals(link.Status, FamilyMemberStatuses.Revoked, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("This partner seat was revoked.");
        }

        if (dto.DisplayName != null)
        {
            var name = dto.DisplayName.Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ValidationException("Name is required.");
            }

            link.DisplayName = name;
        }

        if (dto.Phone != null)
        {
            link.Phone = NormalizeOptional(dto.Phone);
        }

        if (dto.Email != null)
        {
            link.Email = NormalizeOptional(dto.Email)?.ToLowerInvariant();
        }

        if (dto.Modules != null)
        {
            var modules = NormalizeModules(dto.Modules);
            if (modules.Count == 0)
            {
                throw new ValidationException("Select at least one part they can access.");
            }

            link.Modules = modules;
        }

        if (dto.AccessLevel != null)
        {
            link.AccessLevel = NormalizeLevel(dto.AccessLevel);
        }

        if (string.IsNullOrWhiteSpace(link.Phone) && string.IsNullOrWhiteSpace(link.Email))
        {
            throw new ValidationException("Phone or email is required.");
        }

        link.UpdatedAt = _clock.UtcNow;
        await _links.UpdateAsync(link, cancellationToken);

        OwnerPartnerInvite? pendingInvite = null;
        if (!string.IsNullOrEmpty(link.InviteId)
            && string.Equals(link.Status, FamilyMemberStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            pendingInvite = await _invites.GetByIdAsync(link.InviteId, cancellationToken);
            if (pendingInvite != null
                && string.Equals(pendingInvite.Status, FamilyInviteStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            {
                pendingInvite.DisplayName = link.DisplayName;
                pendingInvite.Phone = link.Phone;
                pendingInvite.Email = link.Email;
                pendingInvite.Modules = link.Modules;
                pendingInvite.AccessLevel = link.AccessLevel;
                pendingInvite.UpdatedAt = link.UpdatedAt;
                await _invites.UpdateAsync(pendingInvite, cancellationToken);
            }
        }

        var owner = await _users.GetByIdAsync(ownerUserId, cancellationToken);
        return ToLinkDto(link, pendingInvite, publicAppBaseUrl, OwnerDisplayName(owner));
    }

    public async Task RevokeLinkAsync(
        string ownerUserId,
        string linkId,
        CancellationToken cancellationToken = default)
    {
        await EnsureCanManagePartnerAsync(ownerUserId, cancellationToken);
        var link = await _links.GetByIdAsync(linkId, cancellationToken)
            ?? throw new NotFoundException("Partner seat not found.");

        if (link.OwnerUserId != ownerUserId)
        {
            throw new ForbiddenException("You can only manage your own partner seat.");
        }

        if (string.Equals(link.Status, FamilyMemberStatuses.Revoked, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var now = _clock.UtcNow;
        link.Status = FamilyMemberStatuses.Revoked;
        link.UpdatedAt = now;
        await _links.UpdateAsync(link, cancellationToken);

        if (!string.IsNullOrEmpty(link.InviteId))
        {
            var invite = await _invites.GetByIdAsync(link.InviteId, cancellationToken);
            if (invite != null
                && string.Equals(invite.Status, FamilyInviteStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            {
                invite.Status = FamilyInviteStatuses.Revoked;
                invite.UpdatedAt = now;
                await _invites.UpdateAsync(invite, cancellationToken);
            }
        }

        _logger.LogInformation("Owner partner link {LinkId} revoked by {OwnerUserId}", linkId, ownerUserId);
    }

    public async Task<OwnerPartnerInviteShareDto?> GetInviteAsync(
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

            var link = await _links.GetByIdAsync(invite.LinkId, cancellationToken);
            if (link != null
                && string.Equals(link.Status, FamilyMemberStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            {
                link.Status = FamilyMemberStatuses.Revoked;
                link.UpdatedAt = invite.UpdatedAt;
                await _links.UpdateAsync(link, cancellationToken);
            }
        }

        var owner = await _users.GetByIdAsync(invite.OwnerUserId, cancellationToken);
        return ToInviteShareDto(invite, publicAppBaseUrl, OwnerDisplayName(owner));
    }

    public async Task<OwnerPartnerLinkDto> AcceptInviteAsync(
        string token,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var invite = await _invites.GetByTokenAsync(token, cancellationToken)
            ?? throw new NotFoundException("Invite not found.");

        var link = await _links.GetByIdAsync(invite.LinkId, cancellationToken)
            ?? throw new NotFoundException("Partner seat not found.");

        if (string.Equals(invite.Status, FamilyInviteStatuses.Accepted, StringComparison.OrdinalIgnoreCase)
            && string.Equals(invite.AcceptedBy, userId, StringComparison.Ordinal))
        {
            return ToLinkDto(link, null, null, null);
        }

        if (string.Equals(link.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase)
            && string.Equals(link.LinkedUserId, userId, StringComparison.Ordinal))
        {
            return ToLinkDto(link, null, null, null);
        }

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
            throw new ValidationException("You cannot accept your own partner invite.");
        }

        if (!string.Equals(link.Status, FamilyMemberStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            throw new ValidationException("This partner seat is no longer pending.");
        }

        var existingForOwner = (await _links.GetByOwnerUserIdAsync(invite.OwnerUserId, cancellationToken))
            .FirstOrDefault(l =>
                string.Equals(l.LinkedUserId, userId, StringComparison.Ordinal)
                && string.Equals(l.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase)
                && l.Id != link.Id);
        if (existingForOwner != null)
        {
            throw new ValidationException("You are already linked as a partner for this grove owner.");
        }

        var now = _clock.UtcNow;
        link.Status = FamilyMemberStatuses.Active;
        link.LinkedUserId = userId;
        link.Modules = invite.Modules;
        link.AccessLevel = invite.AccessLevel;
        link.UpdatedAt = now;
        await _links.UpdateAsync(link, cancellationToken);

        invite.Status = FamilyInviteStatuses.Accepted;
        invite.AcceptedBy = userId;
        invite.UpdatedAt = now;
        await _invites.UpdateAsync(invite, cancellationToken);

        _logger.LogInformation(
            "Owner partner invite {InviteId} accepted by {UserId} for owner {OwnerUserId}",
            invite.Id,
            userId,
            invite.OwnerUserId);

        return ToLinkDto(link, null, null, null);
    }

    public async Task<IReadOnlyList<OwnerPartnerAccessSnapshot>> GetActiveAccessesByLinkedUserAsync(
        string linkedUserId,
        CancellationToken cancellationToken = default)
    {
        var links = await _links.GetActiveByLinkedUserIdAllAsync(linkedUserId, cancellationToken);
        return links.Select(ToAccessSnapshot).ToList();
    }

    public Task<IReadOnlyList<OwnerPartnerAccessSnapshot>> GetMyMembershipAccessAsync(
        string userId,
        CancellationToken cancellationToken = default) =>
        GetActiveAccessesByLinkedUserAsync(userId, cancellationToken);

    private async Task EnsureCanManagePartnerAsync(string ownerUserId, CancellationToken cancellationToken)
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

        throw new ForbiddenException("Only grove owners can manage a partner seat.");
    }

    private async Task ExpireStaleInvitesAsync(string ownerUserId, CancellationToken cancellationToken)
    {
        var pending = await _invites.GetPendingByOwnerUserIdAsync(ownerUserId, cancellationToken);
        var now = _clock.UtcNow;
        foreach (var invite in pending.Where(i => i.ExpiresAt < now))
        {
            invite.Status = FamilyInviteStatuses.Expired;
            invite.UpdatedAt = now;
            await _invites.UpdateAsync(invite, cancellationToken);

            var link = await _links.GetByIdAsync(invite.LinkId, cancellationToken);
            if (link != null
                && string.Equals(link.Status, FamilyMemberStatuses.Pending, StringComparison.OrdinalIgnoreCase))
            {
                link.Status = FamilyMemberStatuses.Revoked;
                link.UpdatedAt = now;
                await _links.UpdateAsync(link, cancellationToken);
            }
        }
    }

    private async Task<OwnerPartnerSeatDto> ToSeatDtoAsync(
        string ownerUserId,
        string? publicAppBaseUrl,
        CancellationToken cancellationToken)
    {
        var links = await _links.GetByOwnerUserIdAsync(ownerUserId, cancellationToken);
        var visible = links
            .Where(m => !string.Equals(m.Status, FamilyMemberStatuses.Revoked, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefault();

        var owner = await _users.GetByIdAsync(ownerUserId, cancellationToken);
        var ownerName = OwnerDisplayName(owner);
        OwnerPartnerLinkDto? partnerDto = null;
        if (visible != null)
        {
            OwnerPartnerInvite? pending = null;
            if (string.Equals(visible.Status, FamilyMemberStatuses.Pending, StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrEmpty(visible.InviteId))
            {
                pending = await _invites.GetByIdAsync(visible.InviteId, cancellationToken);
                if (pending != null
                    && string.Equals(pending.Status, FamilyInviteStatuses.Pending, StringComparison.OrdinalIgnoreCase)
                    && string.IsNullOrWhiteSpace(pending.Code))
                {
                    pending.Code = await AllocateInviteCodeAsync(cancellationToken);
                    pending.UpdatedAt = _clock.UtcNow;
                    await _invites.UpdateAsync(pending, cancellationToken);
                }
            }

            partnerDto = ToLinkDto(visible, pending, publicAppBaseUrl, ownerName);
        }

        return new OwnerPartnerSeatDto
        {
            OwnerUserId = ownerUserId,
            SeatsUsed = visible == null ? 0 : 1,
            SeatsMax = OwnerPartnerLink.MaxPartners,
            Partner = partnerDto
        };
    }

    private static OwnerPartnerLinkDto ToLinkDto(
        OwnerPartnerLink link,
        OwnerPartnerInvite? pendingInvite,
        string? publicAppBaseUrl,
        string? ownerDisplayName)
    {
        return new OwnerPartnerLinkDto
        {
            Id = link.Id,
            DisplayName = link.DisplayName,
            Phone = link.Phone,
            Email = link.Email,
            LinkedUserId = link.LinkedUserId,
            Modules = link.Modules,
            AccessLevel = link.AccessLevel,
            Status = link.Status,
            InviteId = link.InviteId,
            PendingInvite = pendingInvite == null
                ? null
                : ToInviteShareDto(pendingInvite, publicAppBaseUrl, ownerDisplayName),
            Checklist = BuildChecklist(link)
        };
    }

    private static OwnerPartnerChecklistDto BuildChecklist(OwnerPartnerLink link) => new()
    {
        HasContact = !string.IsNullOrWhiteSpace(link.DisplayName)
                     && (!string.IsNullOrWhiteSpace(link.Phone) || !string.IsNullOrWhiteSpace(link.Email)),
        InviteSent = !string.IsNullOrEmpty(link.InviteId)
                     || string.Equals(link.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase),
        Accepted = string.Equals(link.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase)
                   && !string.IsNullOrEmpty(link.LinkedUserId),
        HasModules = link.Modules.Count > 0,
        CanCallOrMessage = !string.IsNullOrWhiteSpace(link.Phone)
    };

    private static OwnerPartnerInviteShareDto ToInviteShareDto(
        OwnerPartnerInvite invite,
        string? publicAppBaseUrl,
        string? ownerDisplayName)
    {
        var baseUrl = string.IsNullOrWhiteSpace(publicAppBaseUrl)
            ? "https://app.oleachron.local"
            : publicAppBaseUrl.TrimEnd('/');
        var shareUrl = $"{baseUrl}/partner-invite/{invite.Token}";
        var code = FamilyInviteCodes.FormatDisplay(invite.Code);
        var ownerLabel = string.IsNullOrWhiteSpace(ownerDisplayName) ? "Oleachron" : ownerDisplayName.Trim();
        var message = string.IsNullOrWhiteSpace(code)
            ? $"Σε προσκάλεσαν ως συνεργάτη του {ownerLabel} στο Oleachron. Άνοιξε: {shareUrl}"
            : $"Σε προσκάλεσαν ως συνεργάτη του {ownerLabel} στο Oleachron. Κωδικός πρόσκλησης: {code}. Άνοιξε: {shareUrl} ή γράψε τον κωδικό στην εγγραφή.";
        var subject = "Πρόσκληση συνεργάτη Oleachron";
        var mailto = string.IsNullOrWhiteSpace(invite.Email)
            ? $"mailto:?subject={Uri.EscapeDataString(subject)}&body={Uri.EscapeDataString(message)}"
            : $"mailto:{Uri.EscapeDataString(invite.Email)}?subject={Uri.EscapeDataString(subject)}&body={Uri.EscapeDataString(message)}";
        var sms = string.IsNullOrWhiteSpace(invite.Phone)
            ? $"sms:?body={Uri.EscapeDataString(message)}"
            : $"sms:{invite.Phone}?body={Uri.EscapeDataString(message)}";

        return new OwnerPartnerInviteShareDto
        {
            Id = invite.Id,
            Token = invite.Token,
            Code = FamilyInviteCodes.FormatDisplay(invite.Code),
            LinkId = invite.LinkId,
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

    private static OwnerPartnerAccessSnapshot ToAccessSnapshot(OwnerPartnerLink link) =>
        new(link.OwnerUserId, link.Id, link.Modules, link.AccessLevel);

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

    private async Task<string> AllocateInviteCodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 8; attempt++)
        {
            var code = FamilyInviteCodes.Generate();
            var familyHit = await _familyInvites.GetByTokenAsync(code, cancellationToken);
            if (familyHit != null)
            {
                continue;
            }

            var partnerHit = await _invites.GetByTokenAsync(code, cancellationToken);
            if (partnerHit == null)
            {
                return code;
            }
        }

        throw new InvalidOperationException("Could not allocate a unique invitation code.");
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
