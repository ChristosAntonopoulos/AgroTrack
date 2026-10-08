namespace OliveLifecycle.Core.Entities.FieldWork;

/// <summary>
/// Persisted dismissal of a template suggestion for a field + crop year.
/// Suggestions themselves are ephemeral — only dismissals are stored.
/// </summary>
public class TaskSuggestionDismissal : BaseEntity
{
    public string FieldId { get; set; } = string.Empty;
    public int ResultYear { get; set; }
    public string TemplateCode { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string DismissedByUserId { get; set; } = string.Empty;
    public DateTime DismissedAt { get; set; } = DateTime.UtcNow;
}
