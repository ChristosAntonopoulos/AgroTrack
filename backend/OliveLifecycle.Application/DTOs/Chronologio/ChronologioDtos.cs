namespace OliveLifecycle.Application.DTOs.Chronologio;

public class ChronologioEntryDto
{
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public ChronologioFieldRefDto Field { get; set; } = new();
    public string? CropCycleId { get; set; }
    public string? LifecycleYear { get; set; }
    public DateTime OccurredAt { get; set; }
    public DateTime? CreatedAt { get; set; }
    public string Category { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public string SourceId { get; set; } = string.Empty;
    public bool IsSystemGenerated { get; set; }
    public ChronologioActorDto? Actor { get; set; }
    public string Importance { get; set; } = "normal";
    public ChronologioAmountDto? Amount { get; set; }
    public IReadOnlyList<ChronologioMediaDto> Media { get; set; } = Array.Empty<ChronologioMediaDto>();
    public ChronologioDetailsDto Details { get; set; } = new();
}

public class ChronologioFieldRefDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    /// <summary>Field accent color as #RRGGBB when set.</summary>
    public string? Color { get; set; }
}

public class ChronologioActorDto
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public class ChronologioAmountDto
{
    public decimal Value { get; set; }
    public string Currency { get; set; } = "EUR";
}

public class ChronologioMediaDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = "image";
    public string? ThumbnailUrl { get; set; }
    public string? Url { get; set; }
}

/// <summary>
/// Category-specific details. Only the matching nested object is populated.
/// </summary>
public class ChronologioDetailsDto
{
    public ChronologioTaskDetailsDto? Task { get; set; }
    public ChronologioExpenseDetailsDto? Expense { get; set; }
    public ChronologioHarvestDetailsDto? Harvest { get; set; }
    public ChronologioNoteDetailsDto? Note { get; set; }
    public ChronologioLifecycleDetailsDto? Lifecycle { get; set; }
    public ChronologioCollaboratorDetailsDto? Collaborator { get; set; }
    public ChronologioActivityDetailsDto? Activity { get; set; }
    public ChronologioWeatherDetailsDto? Weather { get; set; }
    public ChronologioIntelligenceDetailsDto? Intelligence { get; set; }
}

public class ChronologioTaskDetailsDto
{
    public string TaskId { get; set; } = string.Empty;
    public string? TaskType { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? AssigneeName { get; set; }
}

public class ChronologioExpenseDetailsDto
{
    public string ExpenseId { get; set; } = string.Empty;
    public string? ExpenseCategory { get; set; }
    public string? LinkedTaskId { get; set; }
    public string? Description { get; set; }
}

public class ChronologioHarvestDetailsDto
{
    public string HarvestId { get; set; } = string.Empty;
    public double OliveKg { get; set; }
    public double? OilKg { get; set; }
    public double? OilYieldPercent { get; set; }
    public string? Mill { get; set; }
    public string? Quality { get; set; }
    public int Workers { get; set; }
    public string? HarvestMethod { get; set; }
}

public class ChronologioNoteDetailsDto
{
    public string NoteId { get; set; } = string.Empty;
    public string BodyPreview { get; set; } = string.Empty;
    public bool Pinned { get; set; }
}

public class ChronologioLifecycleDetailsDto
{
    public string? PreviousYear { get; set; }
    public string? NewYear { get; set; }
    public string? PreviousStage { get; set; }
    public string? NewStage { get; set; }
    public string? Message { get; set; }
}

public class ChronologioCollaboratorDetailsDto
{
    public string? ProducerId { get; set; }
    public string? RequestId { get; set; }
    public string? Message { get; set; }
}

public class ChronologioActivityDetailsDto
{
    public string ActivityType { get; set; } = string.Empty;
    public string? Message { get; set; }
    public IReadOnlyDictionary<string, string>? Metadata { get; set; }
}

public class ChronologioWeatherDetailsDto
{
    public string? Period { get; set; }
    public int? Year { get; set; }
    public int? Month { get; set; }
    public double? RainfallMm { get; set; }
    public double? TemperatureMin { get; set; }
    public double? TemperatureMax { get; set; }
    public int? FrostNights { get; set; }
    public int? HeatDays { get; set; }
    public int? HeavyRainDays { get; set; }
    public int? LongestDryStreakDays { get; set; }
    public double? RainVsPreviousPercent { get; set; }
    public int? WettestMonth { get; set; }
    public double? NdviMean { get; set; }
    public double? NdviDeltaPercent { get; set; }
    public IReadOnlyList<double>? RainSeries { get; set; }
    public IReadOnlyList<string>? RainLabels { get; set; }
    public string? Source { get; set; }
    public string? VegetationNote { get; set; }
}

public class ChronologioIntelligenceDetailsDto
{
    public string? Message { get; set; }
    public string? Severity { get; set; }
    public IReadOnlyList<string>? RelatedSourceIds { get; set; }
    public string? Recommendation { get; set; }
}

public class ChronologioQuery
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? Category { get; set; }
    public string? LifecycleYear { get; set; }
    public string? CropCycleId { get; set; }
    public string? FieldId { get; set; }
    public int Limit { get; set; } = 50;
    public int Offset { get; set; }
}
