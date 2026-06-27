using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Seeds a full year of olive-farm demo data for Giorgos (owner) and Kostas (producer).
/// </summary>
public static class DemoFarmDataSeeder
{
    public const string OwnerId = "675555555555555555555501";
    public const string ProducerId = "675555555555555555555502";

    private static readonly string[] FieldIds =
    [
        "675555555555555555555101",
        "675555555555555555555102",
        "675555555555555555555103",
        "675555555555555555555104",
        "675555555555555555555105",
    ];

    public static async Task SeedAsync(
        MongoDbContext context,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (!string.Equals(configuration["DemoAccounts:Seed"], "true", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var fieldsCol = context.GetCollection<FieldDocument>("fields");
        var marker = await fieldsCol
            .Find(f => f.Id == FieldIds[0])
            .FirstOrDefaultAsync(cancellationToken);

        var reseed = string.Equals(configuration["DemoAccounts:ReseedFarmData"], "true", StringComparison.OrdinalIgnoreCase);
        if (marker != null && !reseed)
        {
            logger.LogInformation("Demo farm data already present; skipping seed.");
            return;
        }

        if (marker != null && reseed)
        {
            await ClearDemoFarmDataAsync(context, cancellationToken);
            logger.LogInformation("Cleared existing demo farm data for reseed.");
        }

        var now = DateTime.UtcNow;
        var oneYearAgo = now.AddDays(-365);

        var fields = BuildFields(oneYearAgo, now);
        await fieldsCol.InsertManyAsync(fields, cancellationToken: cancellationToken);

        var lifecycles = BuildLifecycles(oneYearAgo, now);
        await context.GetCollection<LifecycleDocument>("lifecycles")
            .InsertManyAsync(lifecycles, cancellationToken: cancellationToken);

        var (tasks, activities) = BuildTasksAndActivities(now);
        await context.GetCollection<TaskDocument>("tasks")
            .InsertManyAsync(tasks, cancellationToken: cancellationToken);

        if (activities.Count > 0)
        {
            await context.GetCollection<ActivityDocument>("activities")
                .InsertManyAsync(activities, cancellationToken: cancellationToken);
        }

        logger.LogInformation(
            "Seeded demo farm: {FieldCount} fields, {TaskCount} tasks, {ActivityCount} activities.",
            fields.Count,
            tasks.Count,
            activities.Count);
    }

    private static async Task ClearDemoFarmDataAsync(MongoDbContext context, CancellationToken cancellationToken)
    {
        var fieldFilter = Builders<FieldDocument>.Filter.In(f => f.Id, FieldIds);
        await context.GetCollection<FieldDocument>("fields").DeleteManyAsync(fieldFilter, cancellationToken);
        await context.GetCollection<LifecycleDocument>("lifecycles")
            .DeleteManyAsync(l => FieldIds.Contains(l.FieldId), cancellationToken);
        await context.GetCollection<TaskDocument>("tasks")
            .DeleteManyAsync(t => FieldIds.Contains(t.FieldId), cancellationToken);
        await context.GetCollection<ActivityDocument>("activities")
            .DeleteManyAsync(a => FieldIds.Contains(a.FieldId), cancellationToken);
    }

    private static List<FieldDocument> BuildFields(DateTime created, DateTime updated) =>
    [
        new()
        {
            Id = FieldIds[0],
            OwnerId = OwnerId,
            Name = "North Olive Grove",
            Location = new LocationDocument { Latitude = 37.1568, Longitude = 21.586 },
            Area = 12.5,
            Variety = "Kalamata",
            TreeAge = 15,
            GroundType = "Clay Loam",
            IrrigationStatus = true,
            CurrentLifecycleYear = "low",
            CurrentLifecycleStage = OliveLifecycleStage.FruitGrowth,
            AssignedProducerIds = [ProducerId],
            CreatedAt = created,
            UpdatedAt = updated,
        },
        new()
        {
            Id = FieldIds[1],
            OwnerId = OwnerId,
            Name = "South Valley Fields",
            Location = new LocationDocument { Latitude = 37.1492, Longitude = 21.5745 },
            Area = 8.3,
            Variety = "Arbequina",
            TreeAge = 8,
            GroundType = "Sandy Loam",
            IrrigationStatus = true,
            CurrentLifecycleYear = "high",
            CurrentLifecycleStage = OliveLifecycleStage.Harvest,
            AssignedProducerIds = [ProducerId],
            CreatedAt = created,
            UpdatedAt = updated,
        },
        new()
        {
            Id = FieldIds[2],
            OwnerId = OwnerId,
            Name = "East Hill Plantation",
            Location = new LocationDocument { Latitude = 37.1615, Longitude = 21.5668 },
            Area = 15.7,
            Variety = "Picual",
            TreeAge = 20,
            GroundType = "Loam",
            IrrigationStatus = true,
            CurrentLifecycleYear = "low",
            CurrentLifecycleStage = OliveLifecycleStage.FruitSet,
            AssignedProducerIds = [ProducerId],
            CreatedAt = created,
            UpdatedAt = updated,
        },
        new()
        {
            Id = FieldIds[3],
            OwnerId = OwnerId,
            Name = "West Slope Orchard",
            Location = new LocationDocument { Latitude = 37.1455, Longitude = 21.5908 },
            Area = 6.2,
            Variety = "Koroneiki",
            TreeAge = 12,
            GroundType = "Sandy",
            IrrigationStatus = true,
            CurrentLifecycleYear = "high",
            CurrentLifecycleStage = OliveLifecycleStage.Harvest,
            AssignedProducerIds = [ProducerId],
            CreatedAt = created,
            UpdatedAt = updated,
        },
        new()
        {
            Id = FieldIds[4],
            OwnerId = OwnerId,
            Name = "Central Meadow",
            Location = new LocationDocument { Latitude = 37.153, Longitude = 21.5612 },
            Area = 10.0,
            Variety = "Frantoio",
            TreeAge = 18,
            GroundType = "Clay",
            IrrigationStatus = false,
            CurrentLifecycleYear = "low",
            CurrentLifecycleStage = OliveLifecycleStage.Dormancy,
            AssignedProducerIds = [ProducerId],
            CreatedAt = created,
            UpdatedAt = updated,
        },
    ];

    private static List<LifecycleDocument> BuildLifecycles(DateTime cycleStart, DateTime updated)
    {
        var years = new[] { "low", "high", "low", "high", "low" };
        var stages = new[]
        {
            OliveLifecycleStage.FruitGrowth,
            OliveLifecycleStage.Harvest,
            OliveLifecycleStage.FruitSet,
            OliveLifecycleStage.Harvest,
            OliveLifecycleStage.Dormancy,
        };

        var list = new List<LifecycleDocument>();
        for (var i = 0; i < FieldIds.Length; i++)
        {
            list.Add(new LifecycleDocument
            {
                Id = $"6755555555555555555520{(i + 1):D2}",
                FieldId = FieldIds[i],
                CurrentYear = years[i],
                CurrentStage = stages[i],
                CycleStartDate = cycleStart,
                LastProgressionDate = i % 2 == 0 ? updated.AddDays(-30) : null,
                CreatedAt = cycleStart,
                UpdatedAt = updated,
            });
        }

        return list;
    }

    private sealed record WorkTemplate(
        int[] Months,
        string Type,
        string Title,
        string Description,
        string? LifecycleYear = null);

    private static readonly WorkTemplate[] Templates =
    [
        new([1, 2], "Pruning", "Winter pruning", "Shape canopy and remove deadwood."),
        new([2, 3], "Soil Testing", "Soil sampling", "Collect zone samples for analysis."),
        new([3, 4], "Fertilization", "Spring fertilization", "Apply nutrients per plan."),
        new([4, 5], "Irrigation", "Irrigation system check", "Inspect lines and timers."),
        new([5, 6, 7], "Pest Control", "Fruit fly monitoring", "Deploy traps and scout fruit."),
        new([6, 7, 8], "Irrigation", "Summer irrigation", "Adjust schedule for heat."),
        new([8, 9], "Harvesting", "Harvest preparation", "Confirm crew and equipment.", "high"),
        new([10, 11], "Harvesting", "Olive harvest", "Harvest and record yields.", "high"),
        new([11, 12], "Fertilization", "Post-harvest feed", "Replenish after harvest."),
        new([12, 1], "Irrigation", "Winter irrigation audit", "Drain lines and protect valves."),
    ];

    private static (List<TaskDocument> Tasks, List<ActivityDocument> Activities) BuildTasksAndActivities(DateTime now)
    {
        var tasks = new List<TaskDocument>();
        var activities = new List<ActivityDocument>();
        var seen = new HashSet<string>();
        var taskIndex = 0;
        var activityIndex = 0;
        var fieldNames = new[] { "North Olive Grove", "South Valley Fields", "East Hill Plantation", "West Slope Orchard", "Central Meadow" };
        var fieldYears = new[] { "low", "high", "low", "high", "low" };

        for (var monthOffset = -12; monthOffset <= 2; monthOffset++)
        {
            var anchor = new DateTime(now.Year, now.Month, 12, 0, 0, 0, DateTimeKind.Utc).AddMonths(monthOffset);
            var month = anchor.Month;
            var monthTemplates = Templates.Where(t => t.Months.Contains(month)).ToList();
            if (monthTemplates.Count == 0) continue;

            for (var fieldIdx = 0; fieldIdx < FieldIds.Length; fieldIdx++)
            {
                var template = monthTemplates[(fieldIdx + monthOffset + 12) % monthTemplates.Count];
                var dedupeKey = $"{FieldIds[fieldIdx]}:{anchor.Year}-{anchor.Month}:{template.Type}";
                if (!seen.Add(dedupeKey)) continue;

                var scheduledStart = anchor.AddDays(fieldIdx - 2);
                var scheduledEnd = scheduledStart.AddDays(2 + (fieldIdx % 3));
                var createdAt = scheduledStart.AddDays(-5);
                var assignProducer = taskIndex % 7 != 0;
                var assignedTo = assignProducer ? ProducerId : null;

                string status;
                DateTime? actualStart = null;
                DateTime? actualEnd = null;
                var approval = "not_required";
                string? approvalNote = null;
                List<EvidenceDocument> evidence = [];

                if (scheduledEnd < now.AddDays(-3))
                {
                    status = "completed";
                    actualStart = scheduledStart;
                    actualEnd = scheduledEnd.AddDays(-1);
                    if (assignedTo != null)
                    {
                        var roll = taskIndex % 10;
                        approval = roll < 7 ? "approved" : roll < 9 ? "pending" : "rejected";
                        approvalNote = roll < 7 ? "Good work — approved for payment." : roll < 9 ? null : "Rejected — please redo north zone.";
                    }

                    if (taskIndex % 3 == 0)
                    {
                        evidence.Add(new EvidenceDocument
                        {
                            PhotoUrl = "/demo-images/olive-branch.jpg",
                            Notes = "Field work documented by Kostas.",
                            Kind = "general",
                            Timestamp = actualEnd.Value,
                        });
                    }
                }
                else if (scheduledStart <= now && scheduledEnd >= now)
                {
                    status = taskIndex % 2 == 0 ? "in_progress" : "pending";
                    if (status == "in_progress") actualStart = scheduledStart;
                }
                else if (scheduledEnd < now)
                {
                    status = "pending";
                }
                else
                {
                    status = "pending";
                }

                var taskId = $"67555555555555555555{(0x6000 + taskIndex):x4}";
                taskIndex++;
                var title = $"{template.Title} — {fieldNames[fieldIdx]}";
                var lifecycleYear = template.LifecycleYear ?? fieldYears[fieldIdx];

                var task = new TaskDocument
                {
                    Id = taskId,
                    FieldId = FieldIds[fieldIdx],
                    Type = template.Type,
                    Title = title,
                    Description = template.Description,
                    LifecycleYear = lifecycleYear,
                    AssignedTo = assignedTo,
                    Status = status,
                    ScheduledStart = scheduledStart,
                    ScheduledEnd = scheduledEnd,
                    ActualStart = actualStart,
                    ActualEnd = actualEnd,
                    Cost = status == "completed" ? 80 + (taskIndex % 12) * 25 : null,
                    ApprovalStatus = approval,
                    ApprovalNote = approvalNote,
                    Evidence = evidence,
                    Notes = assignedTo != null && status == "completed" ? "Producer note logged." : null,
                    CreatedAt = createdAt,
                    UpdatedAt = actualEnd ?? actualStart ?? scheduledStart,
                };
                tasks.Add(task);

                activities.Add(MakeActivity(ref activityIndex, FieldIds[fieldIdx], assignedTo != null ? "task_assigned" : "task_scheduled",
                    assignedTo != null ? $"Giorgos assigned Kostas: {title}" : $"Giorgos scheduled: {title}",
                    OwnerId, taskId, createdAt));

                if (status == "in_progress" && actualStart.HasValue)
                {
                    activities.Add(MakeActivity(ref activityIndex, FieldIds[fieldIdx], "task_started",
                        $"Kostas started: {title}", ProducerId, taskId, actualStart.Value));
                }

                if (status == "completed" && actualEnd.HasValue)
                {
                    activities.Add(MakeActivity(ref activityIndex, FieldIds[fieldIdx], "task_completed",
                        $"Kostas completed: {title}", ProducerId, taskId, actualEnd.Value));

                    if (approval == "approved")
                    {
                        activities.Add(MakeActivity(ref activityIndex, FieldIds[fieldIdx], "task_approved",
                            $"Giorgos approved: {title}", OwnerId, taskId, actualEnd.Value.AddDays(1)));
                    }
                }
            }
        }

        // Pinned near-term tasks (dashboard / today)
        AddPinnedTask(tasks, activities, ref activityIndex, now, "675555555555555555556f01", FieldIds[0], "Irrigation",
            "Irrigation — North Olive Grove", -6, -2, "pending", true);
        AddPinnedTask(tasks, activities, ref activityIndex, now, "675555555555555555556f02", FieldIds[0], "Pest Control",
            "Fruit fly scouting — North Olive Grove", -3, 1, "in_progress", true);
        AddPinnedTask(tasks, activities, ref activityIndex, now, "675555555555555555556f03", FieldIds[1], "Fertilization",
            "Fertilization — South Valley Fields", -1, 3, "pending", true);
        AddPinnedTask(tasks, activities, ref activityIndex, now, "675555555555555555556f04", FieldIds[4], "Irrigation",
            "Irrigation setup — Central Meadow", -5, -1, "pending", true);

        foreach (var fieldId in FieldIds)
        {
            activities.Add(MakeActivity(ref activityIndex, fieldId, "producer_assigned",
                "Giorgos assigned Kostas to field.", OwnerId, null, now.AddDays(-365)));
        }

        return (tasks, activities.Take(800).ToList());
    }

    private static ActivityDocument MakeActivity(
        ref int activityIndex,
        string fieldId,
        string type,
        string message,
        string actorUserId,
        string? taskId,
        DateTime timestamp)
    {
        var id = $"67555555555555555555{(0x7000 + activityIndex):x4}";
        activityIndex++;
        return new ActivityDocument
        {
            Id = id,
            FieldId = fieldId,
            Type = type,
            Message = message,
            ActorUserId = actorUserId,
            TaskId = taskId,
            Timestamp = timestamp,
        };
    }

    private static void AddPinnedTask(
        List<TaskDocument> tasks,
        List<ActivityDocument> activities,
        ref int activityIndex,
        DateTime now,
        string id,
        string fieldId,
        string type,
        string title,
        int startDays,
        int endDays,
        string status,
        bool assignProducer)
    {
        tasks.RemoveAll(t => t.Id == id);
        var start = now.AddDays(startDays);
        var end = now.AddDays(endDays);
        var task = new TaskDocument
        {
            Id = id,
            FieldId = fieldId,
            Type = type,
            Title = title,
            LifecycleYear = "low",
            AssignedTo = assignProducer ? ProducerId : null,
            Status = status,
            ScheduledStart = start,
            ScheduledEnd = end,
            ActualStart = status == "in_progress" ? start.AddDays(1) : null,
            ApprovalStatus = "not_required",
            CreatedAt = start.AddDays(-4),
            UpdatedAt = now,
        };
        tasks.Add(task);
        activities.Add(MakeActivity(ref activityIndex, fieldId, "task_assigned", title, OwnerId, id, task.CreatedAt));
    }
}
