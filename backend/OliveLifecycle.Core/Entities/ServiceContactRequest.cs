using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities;

public class ServiceContactRequest : BaseEntity
{
    public string RequesterUserId { get; set; } = string.Empty;
    public string ProviderUserId { get; set; } = string.Empty;
    public string ServiceCategoryId { get; set; } = string.Empty;
    public string? FieldId { get; set; }
    public string? TaskId { get; set; }
    public string ApproximateArea { get; set; } = string.Empty;
    public double? AreaHectares { get; set; }
    public DateTime? SuggestedStart { get; set; }
    public DateTime? SuggestedEnd { get; set; }
    public string Message { get; set; } = string.Empty;
    public ServiceContactStatus Status { get; set; } = ServiceContactStatus.New;
    public string ContactMethod { get; set; } = "in_app";
    public DateTime? ViewedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
}
