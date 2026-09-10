using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities.FieldWork;

/// <summary>Persisted weather suitability evaluation (engine arrives in Phase 4).</summary>
public class TaskWeatherEvaluation : BaseEntity
{
    public string? TaskId { get; set; }
    public string? ProposalId { get; set; }
    public string FieldId { get; set; } = string.Empty;
    public string? TemplateCode { get; set; }
    public DateTime CandidateDate { get; set; }
    public TimeSpan? CandidateDuration { get; set; }
    public WeatherSuitability Suitability { get; set; } = WeatherSuitability.Unknown;
    public int Score { get; set; }
    public List<string> Reasons { get; set; } = [];
    public List<string> HardBlockers { get; set; } = [];
    public string? WeatherSnapshotJson { get; set; }
    public DateTime EvaluatedAt { get; set; } = DateTime.UtcNow;
    public int? ForecastHorizonHours { get; set; }
    public List<DateTime> SuggestedAlternativeDates { get; set; } = [];
}
