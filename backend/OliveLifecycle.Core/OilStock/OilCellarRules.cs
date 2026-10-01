using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.OilStock;

/// <summary>
/// Whose personal cellar may receive oil from a grove.
/// Eligible: Admin (owner) or Family — not Partner/collaborator.
/// </summary>
public static class OilCellarRules
{
    public static bool IsEligibleCellarRole(FieldPersonRole role) =>
        role is FieldPersonRole.Admin or FieldPersonRole.Family;

    public static bool IsEligibleCellarOwner(Field field, string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return false;
        }

        if (FieldPeopleRules.IsAdmin(field, userId))
        {
            return true;
        }

        var seat = FieldPeopleRules.GetActiveByUserId(field, userId);
        return seat is not null
               && IsEligibleCellarRole(seat.Role)
               && string.Equals(seat.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsEligibleCellarOwner(IEnumerable<Field> fields, string userId) =>
        fields.Any(f => IsEligibleCellarOwner(f, userId));

    public static bool CanAssignCellar(Field field, string callerUserId) =>
        FieldPeopleRules.IsAdmin(field, callerUserId);

    public static bool CanAssignCellar(IEnumerable<Field> fields, string callerUserId) =>
        fields.Any(f => CanAssignCellar(f, callerUserId));

    /// <summary>People who may receive this oil into Το λάδι μου.</summary>
    public static IReadOnlyList<FieldPerson> EligibleCellarPeople(IEnumerable<Field> fields)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var result = new List<FieldPerson>();
        foreach (var field in fields)
        {
            FieldPeopleRules.EnsureNormalized(field);
            foreach (var person in field.People.Where(FieldPeopleRules.IsOccupied))
            {
                if (!IsEligibleCellarRole(person.Role))
                {
                    continue;
                }

                if (!string.Equals(person.Status, FamilyMemberStatuses.Active, StringComparison.OrdinalIgnoreCase)
                    && !FieldPeopleRules.IsAdmin(field, person.UserId))
                {
                    continue;
                }

                if (string.IsNullOrWhiteSpace(person.UserId) || !seen.Add(person.UserId))
                {
                    continue;
                }

                result.Add(person);
            }

            // OwnerId fallback when seats are thin.
            if (!string.IsNullOrWhiteSpace(field.OwnerId) && seen.Add(field.OwnerId))
            {
                var admin = FieldPeopleRules.GetAdmin(field);
                result.Add(admin ?? FieldPeopleRules.CreateAdminSeat(field.OwnerId));
            }
        }

        return result;
    }
}
