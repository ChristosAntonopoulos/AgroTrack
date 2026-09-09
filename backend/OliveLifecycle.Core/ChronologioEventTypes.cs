namespace OliveLifecycle.Core;

/// <summary>
/// Canonical Chronologio eventType values. Prefer these constants over raw string literals.
/// </summary>
public static class ChronologioEventTypes
{
    public const string TaskCompleted = "task.completed";
    public const string TaskCreated = "task.created";
    public const string TaskCancelled = "task.cancelled";

    public const string ExpenseRecorded = "expense.recorded";

    public const string HarvestRecorded = "harvest.recorded";

    public const string NoteCreated = "note.created";

    public const string PhotoAdded = "photo.added";

    public const string WeatherHeavyRain = "weather.heavyRain";
    public const string WeatherFrost = "weather.frost";
    public const string WeatherHeat = "weather.heat";

    public const string IntelligenceSprayRainRisk = "intelligence.sprayRainRisk";
    public const string IntelligenceFrostRisk = "intelligence.frostRisk";
    public const string IntelligenceHarvestObservation = "intelligence.harvestObservation";

    public const string LifecycleCycleStarted = "lifecycle.cycleStarted";
    public const string LifecycleStageChanged = "lifecycle.stageChanged";
    public const string LifecycleHarvestCompleted = "lifecycle.harvestCompleted";
    public const string LifecycleCorrected = "lifecycle.corrected";

    public const string CollaboratorProducerAssigned = "collaborator.producerAssigned";
    public const string CollaboratorProducerUnassigned = "collaborator.producerUnassigned";
    public const string CollaboratorPartnerAccepted = "collaborator.partnerAccepted";

    public const string ActivityGeneric = "activity.recorded";
}

/// <summary>
/// Source entity type strings used in ChronologioEntryDto.SourceType.
/// </summary>
public static class ChronologioSourceTypes
{
    public const string Task = "Task";
    public const string Expense = "Expense";
    public const string Harvest = "Harvest";
    public const string Note = "Note";
    public const string Activity = "Activity";
}
