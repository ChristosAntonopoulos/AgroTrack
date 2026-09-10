using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.Entities.FieldWork;

public class MonthDayRange
{
    public int StartMonth { get; set; }
    public int StartDay { get; set; } = 1;
    public int EndMonth { get; set; }
    public int EndDay { get; set; } = 28;
}

public class BbchRange
{
    public int? MinCode { get; set; }
    public int? MaxCode { get; set; }

    public bool Contains(OliveBbchStage stage)
    {
        if (stage == OliveBbchStage.Unknown)
        {
            return false;
        }

        var min = stage.MinCode();
        var max = stage.MaxCode();
        if (min is null || max is null)
        {
            return false;
        }

        if (MinCode.HasValue && max < MinCode.Value)
        {
            return false;
        }

        if (MaxCode.HasValue && min > MaxCode.Value)
        {
            return false;
        }

        return true;
    }
}

public class TaskChecklistDefinition
{
    public string Key { get; set; } = string.Empty;
    public string GreekLabel { get; set; } = string.Empty;
    public string EnglishLabel { get; set; } = string.Empty;
    public ChecklistItemType ItemType { get; set; } = ChecklistItemType.Checkbox;
    public ChecklistItemRequirement Requirement { get; set; } = ChecklistItemRequirement.Optional;
    public List<string> Choices { get; set; } = [];
    public string? Unit { get; set; }
    public bool IsEssential { get; set; } = true;
    public int SortOrder { get; set; }
}

public class FieldTaskChecklistItem
{
    public string Key { get; set; } = string.Empty;
    public string GreekLabel { get; set; } = string.Empty;
    public string EnglishLabel { get; set; } = string.Empty;
    public ChecklistItemType ItemType { get; set; } = ChecklistItemType.Checkbox;
    public ChecklistItemRequirement Requirement { get; set; } = ChecklistItemRequirement.Optional;
    public List<string> Choices { get; set; } = [];
    public string? Unit { get; set; }
    public bool IsEssential { get; set; } = true;
    public int SortOrder { get; set; }
    public bool IsAnswered { get; set; }
    public string? TextValue { get; set; }
    public decimal? NumberValue { get; set; }
    public bool? BoolValue { get; set; }
    public List<string> AttachmentIds { get; set; } = [];
}

public class TaskExecutionChecklistResult
{
    public string Key { get; set; } = string.Empty;
    public string GreekLabel { get; set; } = string.Empty;
    public string EnglishLabel { get; set; } = string.Empty;
    public ChecklistItemType ItemType { get; set; } = ChecklistItemType.Checkbox;
    public ChecklistItemRequirement Requirement { get; set; } = ChecklistItemRequirement.Optional;
    public bool IsAnswered { get; set; }
    public string? TextValue { get; set; }
    public decimal? NumberValue { get; set; }
    public bool? BoolValue { get; set; }
    public string? Unit { get; set; }
    public List<string> AttachmentIds { get; set; } = [];
}

public class TaskMaterial
{
    public string Name { get; set; } = string.Empty;
    public decimal? Quantity { get; set; }
    public string? Unit { get; set; }
    public string? ProductCode { get; set; }
    public string? Notes { get; set; }
}

public class TaskQuantity
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public string Unit { get; set; } = string.Empty;
}

public class TaskAssignment
{
    public string? ResponsibleUserId { get; set; }
    public string? AssignedUserId { get; set; }
    public string? AssignedCollaboratorId { get; set; }
    public List<string> AdditionalParticipantUserIds { get; set; } = [];
    public TaskAssignmentResponse Response { get; set; } = TaskAssignmentResponse.Pending;
    public DateTime? RespondedAt { get; set; }
}
