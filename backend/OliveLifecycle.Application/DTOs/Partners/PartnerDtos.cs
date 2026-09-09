namespace OliveLifecycle.Application.DTOs.Partners;

public class LocalizedTextDto
{
    public string El { get; set; } = string.Empty;
    public string En { get; set; } = string.Empty;
    public string It { get; set; } = string.Empty;
}

public class ServiceCategoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public LocalizedTextDto Name { get; set; } = new();
    public LocalizedTextDto Description { get; set; } = new();
    public string Icon { get; set; } = string.Empty;
    public string? ParentCategoryId { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public bool IsProminent { get; set; }
    public List<string> SuggestedTaskTypes { get; set; } = new();
}

public class ServiceProviderProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string? BusinessName { get; set; }
    public string ProviderKind { get; set; } = "Individual";
    public List<string> ServiceCategoryIds { get; set; } = new();
    public List<ServiceCategoryDto> Categories { get; set; } = new();
    public string? BaseAreaLabel { get; set; }
    public int ServiceRadiusKm { get; set; }
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
    public string ContactPreference { get; set; } = "InApp";
    public bool ShowPhone { get; set; }
    public string? PhoneNumber { get; set; }
    public string Availability { get; set; } = "Available";
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableUntil { get; set; }
    public bool IsPaused { get; set; }
    public string VerificationStatus { get; set; } = "Unverified";
    public bool IsVerified { get; set; }
    public string? PricingNote { get; set; }
    public bool IsListed { get; set; }
    public int CompletenessScore { get; set; }
    public bool HasBaseLocation { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpsertServiceProfileDto
{
    public string? DisplayName { get; set; }
    public string? PhotoUrl { get; set; }
    public string? BusinessName { get; set; }
    public string? ProviderKind { get; set; }
    public List<string>? ServiceCategoryIds { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? BaseAreaLabel { get; set; }
    public int? ServiceRadiusKm { get; set; }
    public List<string>? ServiceAreas { get; set; }
    public string? ShortDescription { get; set; }
    public int? ExperienceYears { get; set; }
    public string? Equipment { get; set; }
    public int? CrewSize { get; set; }
    public string? MillOperatingPeriod { get; set; }
    public string? MillProcessingMethod { get; set; }
    public bool? MillOrganic { get; set; }
    public bool? MillAppointmentRequired { get; set; }
    public List<string>? Languages { get; set; }
    public List<string>? Certifications { get; set; }
    public string? ContactPreference { get; set; }
    public bool? ShowPhone { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Availability { get; set; }
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableUntil { get; set; }
    public string? PricingNote { get; set; }
}

public class PartnerSearchResultDto
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string? BusinessName { get; set; }
    public string ProviderKind { get; set; } = "Individual";
    public List<ServiceCategoryDto> Categories { get; set; } = new();
    public int DistanceKm { get; set; }
    public string Availability { get; set; } = "Available";
    public int? ExperienceYears { get; set; }
    public int? CrewSize { get; set; }
    public string? Equipment { get; set; }
    public bool IsVerified { get; set; }
    public string VerificationStatus { get; set; } = "Unverified";
    public int CompletenessScore { get; set; }
    public int ServiceRadiusKm { get; set; }
    public string? BaseAreaLabel { get; set; }
    public string? PricingNote { get; set; }
}

public class PartnerSearchResponseDto
{
    public IReadOnlyList<PartnerSearchResultDto> Results { get; set; } = Array.Empty<PartnerSearchResultDto>();
    public int RadiusKm { get; set; }
    public int NextRadiusKm { get; set; }
    public bool CanExpandRadius { get; set; }
    public string? FieldApproximateArea { get; set; }
}

public class PartnerPublicProfileDto
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public string? BusinessName { get; set; }
    public string ProviderKind { get; set; } = "Individual";
    public List<ServiceCategoryDto> Categories { get; set; } = new();
    public string? BaseAreaLabel { get; set; }
    public int ServiceRadiusKm { get; set; }
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
    public string ContactPreference { get; set; } = "InApp";
    public string? PhoneNumber { get; set; }
    public string Availability { get; set; } = "Available";
    public DateTime? AvailableFrom { get; set; }
    public DateTime? AvailableUntil { get; set; }
    public bool IsVerified { get; set; }
    public string VerificationStatus { get; set; } = "Unverified";
    public string? PricingNote { get; set; }
    public int CompletenessScore { get; set; }
}

public class CreatePartnerContactDto
{
    public string ServiceCategoryId { get; set; } = string.Empty;
    public string? FieldId { get; set; }
    public string? TaskId { get; set; }
    public DateTime? SuggestedStart { get; set; }
    public DateTime? SuggestedEnd { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class ServiceContactRequestDto
{
    public string Id { get; set; } = string.Empty;
    public string RequesterUserId { get; set; } = string.Empty;
    public string ProviderUserId { get; set; } = string.Empty;
    public string? RequesterName { get; set; }
    public string? ProviderName { get; set; }
    public string ServiceCategoryId { get; set; } = string.Empty;
    public ServiceCategoryDto? Category { get; set; }
    public string? FieldId { get; set; }
    public string? TaskId { get; set; }
    public string ApproximateArea { get; set; } = string.Empty;
    public double? AreaHectares { get; set; }
    public DateTime? SuggestedStart { get; set; }
    public DateTime? SuggestedEnd { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = "New";
    public string ContactMethod { get; set; } = "in_app";
    public string Direction { get; set; } = "outgoing";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpdateServiceContactStatusDto
{
    public string Status { get; set; } = string.Empty;
    public bool LinkTask { get; set; }
}

public class UserNotificationDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? RelatedEntityId { get; set; }
    public string? RelatedEntityType { get; set; }
    public string? ActionUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
