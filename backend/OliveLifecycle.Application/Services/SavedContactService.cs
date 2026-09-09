using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Partners;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class SavedContactService : ISavedContactService
{
    private readonly ISavedContactRepository _contacts;
    private readonly IFieldAccessService _fieldAccess;
    private readonly IDateTimeProvider _clock;
    private readonly IFieldRepository _fields;
    private readonly IUserRepository _users;
    private readonly IFieldInviteRepository _invites;
    private readonly IServiceContactRequestRepository _requests;
    private readonly IServiceProviderProfileRepository _profiles;

    public SavedContactService(
        ISavedContactRepository contacts,
        IFieldAccessService fieldAccess,
        IDateTimeProvider clock,
        IFieldRepository fields,
        IUserRepository users,
        IFieldInviteRepository invites,
        IServiceContactRequestRepository requests,
        IServiceProviderProfileRepository profiles)
    {
        _contacts = contacts;
        _fieldAccess = fieldAccess;
        _clock = clock;
        _fields = fields;
        _users = users;
        _invites = invites;
        _requests = requests;
        _profiles = profiles;
    }

    public async Task<IReadOnlyList<SavedContactDto>> GetMineAsync(
        string userId,
        string? fieldId,
        bool includeUnassigned,
        CancellationToken cancellationToken = default)
    {
        var mine = await _contacts.GetByOwnerUserIdAsync(userId, cancellationToken);
        IEnumerable<SavedContact> filtered = mine;

        if (!string.IsNullOrWhiteSpace(fieldId))
        {
            filtered = includeUnassigned
                ? mine.Where(c => c.FieldIds.Contains(fieldId) || c.FieldIds.Count == 0)
                : mine.Where(c => c.FieldIds.Contains(fieldId));
        }
        else if (includeUnassigned)
        {
            filtered = mine.Where(c => c.FieldIds.Count == 0);
        }

        return filtered
            .OrderBy(c => c.DisplayName, StringComparer.CurrentCultureIgnoreCase)
            .ThenBy(c => c.CreatedAt)
            .Select(ToDto)
            .ToList();
    }

    public async Task<SavedContactDto> CreateAsync(
        string userId,
        string userRole,
        UpsertSavedContactDto dto,
        CancellationToken cancellationToken = default)
    {
        var fieldIds = await NormalizeFieldIdsAsync(userId, userRole, dto.FieldIds, cancellationToken);
        var displayName = (dto.DisplayName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(displayName))
        {
            throw new ValidationException("A name is required.");
        }

        var phone = NormalizeOptional(dto.Phone);
        var email = NormalizeOptional(dto.Email);
        var now = _clock.UtcNow;
        var contact = new SavedContact
        {
            OwnerUserId = userId,
            DisplayName = displayName,
            Phone = phone,
            Email = email,
            Notes = NormalizeOptional(dto.Notes),
            ServiceCategoryIds = DistinctIds(dto.ServiceCategoryIds),
            FieldIds = fieldIds,
            // LinkedUserId is never taken from the client. See TryMatchKnownUserAsync.
            LinkedUserId = await TryMatchKnownUserAsync(userId, phone, email, cancellationToken),
            Source = ParseSource(dto.Source),
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _contacts.CreateAsync(contact, cancellationToken);
        return ToDto(created);
    }

    public async Task<SavedContactDto> UpdateAsync(
        string userId,
        string userRole,
        string id,
        UpsertSavedContactDto dto,
        CancellationToken cancellationToken = default)
    {
        var contact = await RequireOwnedAsync(id, userId, cancellationToken);
        var displayName = (dto.DisplayName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(displayName))
        {
            throw new ValidationException("A name is required.");
        }

        contact.DisplayName = displayName;
        contact.Phone = NormalizeOptional(dto.Phone);
        contact.Email = NormalizeOptional(dto.Email);
        contact.Notes = NormalizeOptional(dto.Notes);
        contact.ServiceCategoryIds = DistinctIds(dto.ServiceCategoryIds);
        contact.FieldIds = await NormalizeFieldIdsAsync(userId, userRole, dto.FieldIds, cancellationToken);
        contact.LinkedUserId = await TryMatchKnownUserAsync(
            userId,
            contact.Phone,
            contact.Email,
            cancellationToken,
            contact.LinkedUserId);
        if (!string.IsNullOrWhiteSpace(dto.Source))
        {
            contact.Source = ParseSource(dto.Source);
        }

        contact.UpdatedAt = _clock.UtcNow;
        var updated = await _contacts.UpdateAsync(contact, cancellationToken);
        return ToDto(updated);
    }

    public async Task DeleteAsync(string userId, string id, CancellationToken cancellationToken = default)
    {
        await RequireOwnedAsync(id, userId, cancellationToken);
        await _contacts.DeleteAsync(id, cancellationToken);
    }

    public async Task LinkOnInviteAcceptedAsync(
        string inviterUserId,
        string acceptedUserId,
        string? invitePhone,
        string? inviteEmail,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(inviterUserId) || string.IsNullOrWhiteSpace(acceptedUserId))
        {
            return;
        }

        var mine = await _contacts.GetByOwnerUserIdAsync(inviterUserId, cancellationToken);
        foreach (var contact in mine)
        {
            if (!string.IsNullOrWhiteSpace(contact.LinkedUserId))
            {
                continue;
            }

            var emailMatch = EmailsMatch(contact.Email, inviteEmail);
            var phoneMatch = PhonesMatch(contact.Phone, invitePhone);
            if (!emailMatch && !phoneMatch)
            {
                continue;
            }

            contact.LinkedUserId = acceptedUserId;
            contact.UpdatedAt = _clock.UtcNow;
            await _contacts.UpdateAsync(contact, cancellationToken);
        }
    }

    private async Task<SavedContact> RequireOwnedAsync(string id, string userId, CancellationToken cancellationToken)
    {
        var contact = await _contacts.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Contact not found.");
        if (contact.OwnerUserId != userId)
        {
            throw new ForbiddenException("You cannot access this contact.");
        }

        return contact;
    }

    private async Task<List<string>> NormalizeFieldIdsAsync(
        string userId,
        string userRole,
        IEnumerable<string>? fieldIds,
        CancellationToken cancellationToken)
    {
        var ids = DistinctIds(fieldIds);
        foreach (var fieldId in ids)
        {
            if (!await _fieldAccess.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
            {
                throw new ForbiddenException("You can only connect contacts to fields you can access.");
            }
        }

        return ids;
    }

    /// <summary>
    /// Link only to people the farmer already knows: members of fields they can see,
    /// users they invited who accepted (phone/email on that invite), and providers they
    /// already messaged. Never a global user-directory search by phone or email.
    /// </summary>
    private async Task<string?> TryMatchKnownUserAsync(
        string ownerUserId,
        string? phone,
        string? email,
        CancellationToken cancellationToken,
        string? existingLinkedUserId = null)
    {
        var known = await LoadKnownPeopleAsync(ownerUserId, cancellationToken);
        if (!string.IsNullOrWhiteSpace(existingLinkedUserId)
            && known.Any(p => p.UserId == existingLinkedUserId))
        {
            return existingLinkedUserId;
        }

        foreach (var person in known)
        {
            if (person.UserId == ownerUserId)
            {
                continue;
            }

            if (EmailsMatch(email, person.Email) || PhonesMatch(phone, person.Phone))
            {
                return person.UserId;
            }
        }

        return null;
    }

    private async Task<List<KnownPerson>> LoadKnownPeopleAsync(string ownerUserId, CancellationToken cancellationToken)
    {
        var byId = new Dictionary<string, KnownPerson>(StringComparer.Ordinal);

        void Remember(string userId, string? personEmail, string? personPhone)
        {
            if (string.IsNullOrWhiteSpace(userId) || userId == ownerUserId)
            {
                return;
            }

            if (byId.TryGetValue(userId, out var existing))
            {
                byId[userId] = existing with
                {
                    Email = existing.Email ?? NormalizeOptional(personEmail),
                    Phone = existing.Phone ?? NormalizeOptional(personPhone)
                };
                return;
            }

            byId[userId] = new KnownPerson(userId, NormalizeOptional(personEmail), NormalizeOptional(personPhone));
        }

        var memberFields = await _fields.GetByMemberUserIdAsync(ownerUserId, cancellationToken);
        var ownedFields = await _fields.GetByOwnerIdAsync(ownerUserId, cancellationToken);
        var fields = memberFields
            .Concat(ownedFields)
            .GroupBy(f => f.Id)
            .Select(g => g.First());

        foreach (var field in fields)
        {
            FieldMembershipSync.EnsureBackfilled(field);
            foreach (var membership in field.Memberships.Where(m => m.Status != "removed"))
            {
                var user = await _users.GetByIdAsync(membership.UserId, cancellationToken);
                Remember(membership.UserId, user?.Email, null);
            }
        }

        var invites = await _invites.GetByInvitedByAsync(ownerUserId, cancellationToken);
        foreach (var invite in invites.Where(i =>
                     string.Equals(i.Status, "accepted", StringComparison.OrdinalIgnoreCase)
                     && !string.IsNullOrWhiteSpace(i.AcceptedBy)))
        {
            var accepted = await _users.GetByIdAsync(invite.AcceptedBy!, cancellationToken);
            Remember(invite.AcceptedBy!, accepted?.Email ?? invite.Email, invite.Phone);
        }

        var outgoing = await _requests.GetByRequesterUserIdAsync(ownerUserId, cancellationToken);
        foreach (var request in outgoing)
        {
            var provider = await _users.GetByIdAsync(request.ProviderUserId, cancellationToken);
            var profile = await _profiles.GetByUserIdAsync(request.ProviderUserId, cancellationToken);
            Remember(request.ProviderUserId, provider?.Email, profile?.PhoneNumber);
        }

        return byId.Values.ToList();
    }

    private static List<string> DistinctIds(IEnumerable<string>? ids) =>
        (ids ?? Enumerable.Empty<string>())
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static SavedContactSource ParseSource(string? source) =>
        Enum.TryParse<SavedContactSource>(source, true, out var parsed)
            ? parsed
            : SavedContactSource.Manual;

    internal static bool EmailsMatch(string? left, string? right)
    {
        if (string.IsNullOrWhiteSpace(left) || string.IsNullOrWhiteSpace(right))
        {
            return false;
        }

        return string.Equals(left.Trim(), right.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    internal static bool PhonesMatch(string? left, string? right)
    {
        var a = Digits(left);
        var b = Digits(right);
        if (a is null || b is null)
        {
            return false;
        }

        if (a == b)
        {
            return true;
        }

        var shorter = a.Length <= b.Length ? a : b;
        var longer = a.Length <= b.Length ? b : a;
        return shorter.Length >= 8 && longer.EndsWith(shorter, StringComparison.Ordinal);
    }

    private static string? Digits(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var digits = new string(value.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("00", StringComparison.Ordinal))
        {
            digits = digits[2..];
        }

        if (digits.StartsWith("30", StringComparison.Ordinal) && digits.Length >= 12)
        {
            digits = digits[2..];
        }

        return digits.Length >= 8 ? digits : null;
    }

    private static SavedContactDto ToDto(SavedContact contact) => new()
    {
        Id = contact.Id,
        DisplayName = contact.DisplayName,
        Phone = contact.Phone,
        Email = contact.Email,
        Notes = contact.Notes,
        ServiceCategoryIds = contact.ServiceCategoryIds,
        FieldIds = contact.FieldIds,
        LinkedUserId = contact.LinkedUserId,
        Source = contact.Source.ToString(),
        CreatedAt = contact.CreatedAt,
        UpdatedAt = contact.UpdatedAt
    };

    private sealed record KnownPerson(string UserId, string? Email, string? Phone);
}
