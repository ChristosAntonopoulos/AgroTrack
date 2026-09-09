namespace OliveLifecycle.Application.DTOs.Notes;

public class NoteDto
{
    public string Id { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? FieldId { get; set; }
    public bool Pinned { get; set; }
    public DateTime OccurredAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<string> MediaUrls { get; set; } = new();
}

public class UpsertNoteDto
{
    public string Body { get; set; } = string.Empty;
    public string? FieldId { get; set; }
    public bool Pinned { get; set; }
    public DateTime? OccurredAt { get; set; }
    public List<string>? MediaUrls { get; set; }
}
