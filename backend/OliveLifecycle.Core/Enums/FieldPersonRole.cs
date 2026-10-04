namespace OliveLifecycle.Core.Enums;

/// <summary>
/// Relationship of an account to one grove. Exactly one Admin (owner).
/// Partner is the collaborator relationship. Family and Partner are not seat-capped;
/// owned groves are the billable unit, not people.
/// Values start at 1 so default(0) means "unset" during dual-read.
/// </summary>
public enum FieldPersonRole
{
    Admin = 1,
    Partner = 2,
    Family = 3
}
