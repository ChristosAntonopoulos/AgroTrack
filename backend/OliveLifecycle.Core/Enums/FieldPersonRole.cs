namespace OliveLifecycle.Core.Enums;

/// <summary>
/// Per-field seat role. Limits: 1 Admin, 1 Partner, 2 Family per field.
/// Values start at 1 so default(0) means "unset" during dual-read.
/// </summary>
public enum FieldPersonRole
{
    Admin = 1,
    Partner = 2,
    Family = 3
}
