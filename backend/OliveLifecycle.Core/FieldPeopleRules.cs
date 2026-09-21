using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core;

/// <summary>
/// Invariants and helpers for per-field Admin / Partner / Family seats.
/// </summary>
public static class FieldPeopleRules
{
    public const int MaxPartners = 1;
    public const int MaxFamily = 2;

    public static void EnsureNormalized(Field field)
    {
        if (field.People.Count == 0)
        {
            BackfillFromOwnerId(field);
            return;
        }

        foreach (var person in field.People)
        {
            NormalizePerson(person);
        }

        SyncDerivedIds(field);
    }

    /// <summary>Compatibility alias used by older call sites during the cutover.</summary>
    public static void EnsureBackfilled(Field field) => EnsureNormalized(field);

    public static FieldPerson CreateAdminSeat(string userId, string? displayName = null, string? email = null)
    {
        return new FieldPerson
        {
            UserId = userId,
            Role = FieldPersonRole.Admin,
            Modules = FamilyModules.All.ToList(),
            AccessLevel = FamilyAccessLevels.Work,
            Status = FamilyMemberStatuses.Active,
            DisplayName = displayName ?? string.Empty,
            Email = email,
            CreatedAt = DateTime.UtcNow
        };
    }

    public static FieldPerson AddOrReplaceSeat(
        Field field,
        FieldPersonRole role,
        string? userId,
        IEnumerable<string> modules,
        string accessLevel,
        string? invitedBy,
        string? displayName = null,
        string? email = null,
        string? inviteId = null,
        string status = FamilyMemberStatuses.Pending)
    {
        EnsureNormalized(field);
        EnsureSeatAvailable(field, role, excludeUserId: userId);

        if (!string.IsNullOrWhiteSpace(userId))
        {
            var existingForUser = field.People.FirstOrDefault(p =>
                !string.IsNullOrWhiteSpace(p.UserId) &&
                string.Equals(p.UserId, userId, StringComparison.Ordinal) &&
                !string.Equals(p.Status, FamilyMemberStatuses.Revoked, StringComparison.OrdinalIgnoreCase));
            if (existingForUser != null && existingForUser.Role != role)
            {
                throw new InvalidOperationException("A user cannot hold two seats on the same field.");
            }
        }

        FieldPerson? seat = null;
        if (!string.IsNullOrWhiteSpace(userId))
        {
            seat = field.People.FirstOrDefault(p =>
                string.Equals(p.UserId, userId, StringComparison.Ordinal) &&
                !string.Equals(p.Status, FamilyMemberStatuses.Revoked, StringComparison.OrdinalIgnoreCase));
        }

        if (seat == null && !string.IsNullOrWhiteSpace(inviteId))
        {
            seat = field.People.FirstOrDefault(p =>
                string.Equals(p.InviteId, inviteId, StringComparison.Ordinal));
        }

        if (seat == null)
        {
            seat = new FieldPerson { CreatedAt = DateTime.UtcNow };
            field.People.Add(seat);
        }

        seat.UserId = userId ?? string.Empty;
        seat.Role = role;
        seat.Modules = NormalizeModules(role, modules);
        seat.AccessLevel = role == FieldPersonRole.Admin
            ? FamilyAccessLevels.Work
            : FamilyAccessLevels.Normalize(accessLevel);
        seat.Status = status;
        seat.InvitedBy = invitedBy;
        seat.InviteId = inviteId;
        seat.DisplayName = displayName?.Trim() ?? seat.DisplayName;
        seat.Email = email?.Trim() ?? seat.Email;

        SyncDerivedIds(field);
        return seat;
    }

    public static void AcceptSeat(FieldPerson seat, string userId, string? displayName = null, string? email = null)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new InvalidOperationException("User id is required to accept a seat.");
        }

        seat.UserId = userId;
        seat.Status = FamilyMemberStatuses.Active;
        if (!string.IsNullOrWhiteSpace(displayName))
        {
            seat.DisplayName = displayName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            seat.Email = email.Trim();
        }

        NormalizePerson(seat);
    }

    public static void RevokeSeat(Field field, FieldPerson seat)
    {
        EnsureNormalized(field);
        if (seat.Role == FieldPersonRole.Admin)
        {
            throw new InvalidOperationException("Cannot revoke the field admin. Transfer admin or delete the field.");
        }

        seat.Status = FamilyMemberStatuses.Revoked;
        SyncDerivedIds(field);
    }

    public static void RemoveSeat(Field field, string userId)
    {
        EnsureNormalized(field);
        var seat = GetActiveOrPendingByUserId(field, userId);
        if (seat == null)
        {
            return;
        }

        if (seat.Role == FieldPersonRole.Admin)
        {
            throw new InvalidOperationException("A field must keep at least one admin.");
        }

        field.People.Remove(seat);
        SyncDerivedIds(field);
    }

    public static void UpdateSeatAccess(
        FieldPerson seat,
        IEnumerable<string>? modules,
        string? accessLevel)
    {
        if (seat.Role == FieldPersonRole.Admin)
        {
            seat.Modules = FamilyModules.All.ToList();
            seat.AccessLevel = FamilyAccessLevels.Work;
            return;
        }

        if (modules != null)
        {
            seat.Modules = NormalizeModules(seat.Role, modules);
        }

        if (!string.IsNullOrWhiteSpace(accessLevel))
        {
            seat.AccessLevel = FamilyAccessLevels.Normalize(accessLevel);
        }
    }

    public static void EnsureSeatAvailable(Field field, FieldPersonRole role, string? excludeUserId = null)
    {
        EnsureNormalized(field);
        var occupied = OccupiedSeats(field)
            .Where(p => p.Role == role)
            .Where(p => string.IsNullOrWhiteSpace(excludeUserId)
                        || !string.Equals(p.UserId, excludeUserId, StringComparison.Ordinal))
            .ToList();

        var limit = role switch
        {
            FieldPersonRole.Admin => 1,
            FieldPersonRole.Partner => MaxPartners,
            FieldPersonRole.Family => MaxFamily,
            _ => 0
        };

        if (occupied.Count >= limit)
        {
            throw new InvalidOperationException(role switch
            {
                FieldPersonRole.Admin => "A field already has an admin.",
                FieldPersonRole.Partner => "This field already has a partner seat.",
                FieldPersonRole.Family => "This field already has the maximum of two family members.",
                _ => "Seat limit reached."
            });
        }
    }

    public static IEnumerable<FieldPerson> OccupiedSeats(Field field) =>
        field.People.Where(IsOccupied);

    public static bool IsOccupied(FieldPerson person) =>
        string.Equals(person.Status, FamilyMemberStatuses.Pending, StringComparison.OrdinalIgnoreCase)
        || string.Equals(person.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase);

    public static bool IsActiveMember(Field field, string userId)
    {
        EnsureNormalized(field);
        return GetActiveByUserId(field, userId) != null;
    }

    /// <summary>Compatibility alias.</summary>
    public static bool IsMember(Field field, string userId) => IsActiveMember(field, userId);

    public static FieldPerson? GetActiveByUserId(Field field, string userId)
    {
        EnsureNormalized(field);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return null;
        }

        return field.People.FirstOrDefault(p =>
            string.Equals(p.UserId, userId, StringComparison.Ordinal) &&
            string.Equals(p.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase));
    }

    public static FieldPerson? GetActiveOrPendingByUserId(Field field, string userId)
    {
        EnsureNormalized(field);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return null;
        }

        return field.People.FirstOrDefault(p =>
            string.Equals(p.UserId, userId, StringComparison.Ordinal) &&
            IsOccupied(p));
    }

    public static FieldPerson? GetAdmin(Field field)
    {
        EnsureNormalized(field);
        return OccupiedSeats(field).FirstOrDefault(p => p.Role == FieldPersonRole.Admin);
    }

    public static bool IsAdmin(Field field, string userId)
    {
        var seat = GetActiveByUserId(field, userId);
        if (seat?.Role == FieldPersonRole.Admin)
        {
            return true;
        }

        // Dual-read: OwnerId fallback until seats are fully migrated.
        return !string.IsNullOrWhiteSpace(field.OwnerId)
               && string.Equals(field.OwnerId, userId, StringComparison.Ordinal)
               && (seat == null || seat.Role == FieldPersonRole.Admin);
    }

    public static bool HasModule(Field field, string userId, string module)
    {
        var seat = GetActiveByUserId(field, userId);
        if (seat == null)
        {
            return false;
        }

        if (seat.Role == FieldPersonRole.Admin)
        {
            return true;
        }

        var normalized = FamilyModules.Normalize(module);
        return seat.Modules.Any(m => string.Equals(m, normalized, StringComparison.OrdinalIgnoreCase));
    }

    public static bool CanWriteModule(Field field, string userId, string module, bool requireCreateLevel = false)
    {
        var seat = GetActiveByUserId(field, userId);
        if (seat == null)
        {
            return false;
        }

        if (seat.Role == FieldPersonRole.Admin)
        {
            return true;
        }

        if (!HasModule(field, userId, module))
        {
            return false;
        }

        return requireCreateLevel
            ? FamilyAccessLevels.CanCreateContent(seat.AccessLevel)
            : FamilyAccessLevels.CanWrite(seat.AccessLevel);
    }

    public static void Remove(Field field, string userId) => RemoveSeat(field, userId);

    public static void SyncDerivedIds(Field field)
    {
        // Do not call EnsureNormalized here — it would recurse via OccupiedSeats.
        var occupied = field.People.Where(IsOccupied).ToList();

        var admin = occupied
            .FirstOrDefault(p => p.Role == FieldPersonRole.Admin && !string.IsNullOrWhiteSpace(p.UserId));
        if (admin != null)
        {
            field.OwnerId = admin.UserId;
        }
    }

    private static void BackfillFromOwnerId(Field field)
    {
        if (string.IsNullOrWhiteSpace(field.OwnerId))
        {
            return;
        }

        field.People.Add(CreateAdminSeat(field.OwnerId));
        SyncDerivedIds(field);
    }

    private static void NormalizePerson(FieldPerson person)
    {
        if (person.Role == FieldPersonRole.Admin)
        {
            person.Modules = FamilyModules.All.ToList();
            person.AccessLevel = FamilyAccessLevels.Work;
            return;
        }

        if (string.IsNullOrWhiteSpace(person.AccessLevel))
        {
            person.AccessLevel = FamilyAccessLevels.View;
        }
        else
        {
            person.AccessLevel = FamilyAccessLevels.Normalize(person.AccessLevel);
        }

        if (person.Modules.Count == 0)
        {
            person.Modules = FamilyModules.DefaultOnInvite.ToList();
        }
        else
        {
            person.Modules = person.Modules
                .Select(FamilyModules.Normalize)
                .Where(FamilyModules.IsKnown)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
    }

    private static List<string> NormalizeModules(FieldPersonRole role, IEnumerable<string> modules)
    {
        if (role == FieldPersonRole.Admin)
        {
            return FamilyModules.All.ToList();
        }

        var normalized = modules
            .Select(FamilyModules.Normalize)
            .Where(FamilyModules.IsKnown)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        return normalized.Count > 0 ? normalized : FamilyModules.DefaultOnInvite.ToList();
    }
}
