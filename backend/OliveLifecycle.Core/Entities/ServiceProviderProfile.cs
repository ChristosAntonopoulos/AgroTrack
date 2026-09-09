using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.ValueObjects;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Service offering attached to an existing User. Not a user type or security role.
/// A FieldOwner or Producer can also offer services through this profile.
/// </summary>
public class ServiceProviderProfile : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string? BusinessName { get; set; }
    public ProviderKind ProviderKind { get; set; } = ProviderKind.Individual;
    public List<string> ServiceCategoryIds { get; set; } = new();
    public GeoJsonPoint? BaseLocation { get; set; }
    public string? BaseAreaLabel { get; set; }
    public int ServiceRadiusKm { get; set; } = 50;
    public List<string> ServiceAreas { get; set; } = new();
    public string ShortDescription { get; set; } = string.Empty;
    public int? ExperienceYears { get; set; }
    public int? CrewSize { get; set; }
    public string? Equipment { get; set; }
    public string? MillOperatingPeriod { get; set; }
    public string? MillProcessingMethod { get; set; }
    public bool? MillOrganic { get; set; }
    public bool? MillAppointmentRequired { get; set; }
    public List<string> Languages { get; set; } = new();
    public List<string> Certifications { get; set; } = new();
    public ContactPreference ContactPreference { get; set; } = ContactPreference.InApp;
    public bool ShowPhone { get; set; }
    public string? PhoneNumber { get; set; }
    public ProviderAvailability Availability { get; set; } = ProviderAvailability.Available;
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableUntil { get; set; }
    public bool IsPaused { get; set; }
    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Unverified;
    public string? PricingNote { get; set; }
    public bool IsListed { get; set; }
    public int CompletenessScore { get; set; }

    public void RecalculateListingState()
    {
        CompletenessScore = ComputeCompleteness();
        IsListed = !IsPaused
            && !string.IsNullOrWhiteSpace(DisplayName)
            && ServiceCategoryIds.Count > 0
            && HasUsableLocation()
            && ServiceRadiusKm > 0
            && !string.IsNullOrWhiteSpace(ShortDescription);
    }

    public bool HasUsableLocation() =>
        BaseLocation?.Coordinates is { Count: >= 2 };

    private int ComputeCompleteness()
    {
        var points = 0;
        if (!string.IsNullOrWhiteSpace(DisplayName)) points += 12;
        if (!string.IsNullOrWhiteSpace(PhotoUrl)) points += 10;
        if (ServiceCategoryIds.Count > 0) points += 12;
        if (HasUsableLocation()) points += 12;
        if (ServiceRadiusKm > 0) points += 8;
        if (!string.IsNullOrWhiteSpace(ShortDescription)) points += 10;
        if (!string.IsNullOrWhiteSpace(BaseAreaLabel)) points += 6;
        if (ExperienceYears.HasValue) points += 6;
        if (CrewSize is > 0) points += 4;
        if (!string.IsNullOrWhiteSpace(Equipment)) points += 5;
        if (ServiceAreas.Count > 0) points += 5;
        if (Languages.Count > 0) points += 4;
        if (!string.IsNullOrWhiteSpace(BusinessName)) points += 4;
        if (Certifications.Count > 0) points += 3;
        if (ShowPhone && !string.IsNullOrWhiteSpace(PhoneNumber)) points += 3;
        return Math.Min(100, points);
    }
}
