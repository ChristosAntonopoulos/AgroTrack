using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Core;

public static class FieldMembershipSync
{
    public static void EnsureBackfilled(Field field)
    {
        if (field.Memberships.Count > 0)
        {
            return;
        }

        if (!string.IsNullOrWhiteSpace(field.OwnerId))
        {
            field.Memberships.Add(new FieldMembership
            {
                UserId = field.OwnerId,
                Capacities = [FieldCapacities.Own, FieldCapacities.Work],
                Status = "active",
                CreatedAt = field.CreatedAt
            });
        }

        foreach (var producerId in field.AssignedProducerIds.Distinct())
        {
            var existing = field.Memberships.FirstOrDefault(m => m.UserId == producerId);
            if (existing == null)
            {
                field.Memberships.Add(new FieldMembership
                {
                    UserId = producerId,
                    Capacities = [FieldCapacities.Work],
                    Status = "active",
                    CreatedAt = field.CreatedAt
                });
            }
            else if (!existing.Capacities.Contains(FieldCapacities.Work, StringComparer.OrdinalIgnoreCase))
            {
                existing.Capacities.Add(FieldCapacities.Work);
            }
        }
    }

    public static bool HasCapacity(Field field, string userId, string capacity)
    {
        EnsureBackfilled(field);
        return field.Memberships.Any(m =>
            m.UserId == userId &&
            string.Equals(m.Status, "active", StringComparison.OrdinalIgnoreCase) &&
            m.Capacities.Contains(capacity, StringComparer.OrdinalIgnoreCase));
    }

    public static bool IsMember(Field field, string userId)
    {
        EnsureBackfilled(field);
        return field.Memberships.Any(m =>
            m.UserId == userId &&
            string.Equals(m.Status, "active", StringComparison.OrdinalIgnoreCase));
    }

    public static FieldMembership Upsert(Field field, string userId, IEnumerable<string> capacities, string? invitedBy)
    {
        EnsureBackfilled(field);
        var normalized = capacities
            .Select(FieldCapacities.Normalize)
            .Where(FieldCapacities.IsKnown)
            .Distinct()
            .ToList();
        if (normalized.Count == 0)
        {
            normalized.Add(FieldCapacities.View);
        }

        var membership = field.Memberships.FirstOrDefault(m => m.UserId == userId);
        if (membership == null)
        {
            membership = new FieldMembership
            {
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                InvitedBy = invitedBy
            };
            field.Memberships.Add(membership);
        }

        membership.Capacities = normalized;
        membership.Status = "active";
        SyncDerivedIds(field);
        return membership;
    }

    public static void Remove(Field field, string userId)
    {
        EnsureBackfilled(field);
        field.Memberships.RemoveAll(m => m.UserId == userId);
        if (!field.Memberships.Any(m => m.Capacities.Contains(FieldCapacities.Own, StringComparer.OrdinalIgnoreCase)
                                        && string.Equals(m.Status, "active", StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException("A field must keep at least one person who looks after it.");
        }

        SyncDerivedIds(field);
    }

    public static void SyncDerivedIds(Field field)
    {
        var active = field.Memberships
            .Where(m => string.Equals(m.Status, "active", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var owner = active.FirstOrDefault(m => m.Capacities.Contains(FieldCapacities.Own, StringComparer.OrdinalIgnoreCase));
        if (owner != null)
        {
            field.OwnerId = owner.UserId;
        }

        field.AssignedProducerIds = active
            .Where(m => m.Capacities.Contains(FieldCapacities.Work, StringComparer.OrdinalIgnoreCase)
                        && m.UserId != field.OwnerId)
            .Select(m => m.UserId)
            .Distinct()
            .ToList();
    }
}
