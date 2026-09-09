namespace OliveLifecycle.Core.Enums;

/// <summary>
/// Architectural hook for later verification. V1 listings stay Unverified unless an administrator sets a status.
/// Do not display a verified badge for Unverified.
/// </summary>
public enum VerificationStatus
{
    Unverified,
    IdentityVerified,
    ProfessionalVerified,
    BusinessVerified
}
