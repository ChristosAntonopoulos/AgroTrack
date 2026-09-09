using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Documents.Geospatial;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Seeds North Olive Grove and South Valley Fields for Giorgos (owner) and Kostas (producer).
/// Extra retired demo plots are removed. Geodata is placeholder — edit later.
/// </summary>
public static class DemoFarmDataSeeder
{
    public const string OwnerId = "675555555555555555555501";
    public const string ProducerId = "675555555555555555555502";

    public static readonly string[] FieldIds =
    [
        "675555555555555555555101",
        "675555555555555555555102",
    ];

    private static readonly string[] RetiredFieldIds =
    [
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

        var retiredRemoved = await RemoveFieldsAsync(context, RetiredFieldIds, cancellationToken);
        if (retiredRemoved > 0)
        {
            logger.LogInformation("Removed {Count} extra demo fields (East Hill, West Slope, Central Meadow).", retiredRemoved);
        }

        var fieldsCol = context.GetCollection<FieldDocument>("fields");
        var existingKept = await fieldsCol
            .Find(f => FieldIds.Contains(f.Id))
            .ToListAsync(cancellationToken);

        var reseed = string.Equals(configuration["DemoAccounts:ReseedFarmData"], "true", StringComparison.OrdinalIgnoreCase);
        if (existingKept.Count == FieldIds.Length && !reseed)
        {
            logger.LogInformation("Demo farm data already present; skipping seed.");
            return;
        }

        if (existingKept.Count > 0)
        {
            await RemoveFieldsAsync(context, FieldIds, cancellationToken);
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

    private static async Task<long> RemoveFieldsAsync(
        MongoDbContext context,
        IReadOnlyCollection<string> fieldIds,
        CancellationToken cancellationToken)
    {
        if (fieldIds.Count == 0) return 0;

        var fieldFilter = Builders<FieldDocument>.Filter.In(f => f.Id, fieldIds);
        var deleted = await context.GetCollection<FieldDocument>("fields")
            .DeleteManyAsync(fieldFilter, cancellationToken);
        await context.GetCollection<LifecycleDocument>("lifecycles")
            .DeleteManyAsync(l => fieldIds.Contains(l.FieldId), cancellationToken);
        await context.GetCollection<TaskDocument>("tasks")
            .DeleteManyAsync(t => fieldIds.Contains(t.FieldId), cancellationToken);
        await context.GetCollection<ActivityDocument>("activities")
            .DeleteManyAsync(a => fieldIds.Contains(a.FieldId), cancellationToken);
        await context.GetCollection<FinancialEntryDocument>("financial_entries")
            .DeleteManyAsync(e => fieldIds.Contains(e.FieldId), cancellationToken);
        await context.GetCollection<HarvestRecordDocument>("harvest_records")
            .DeleteManyAsync(h => fieldIds.Contains(h.FieldId), cancellationToken);
        await context.GetCollection<NoteDocument>("notes")
            .DeleteManyAsync(n => n.FieldId != null && fieldIds.Contains(n.FieldId), cancellationToken);
        await context.GetCollection<FieldSpatialProfileDocument>("field_spatial_profiles")
            .DeleteManyAsync(p => fieldIds.Contains(p.FieldId), cancellationToken);
        await context.GetCollection<FieldDailyWeatherSnapshotDocument>("field_daily_weather_snapshots")
            .DeleteManyAsync(s => fieldIds.Contains(s.FieldId), cancellationToken);
        await context.GetCollection<FieldSatelliteObservationDocument>("field_satellite_observations")
            .DeleteManyAsync(o => fieldIds.Contains(o.FieldId), cancellationToken);
        await context.GetCollection<FieldEnvironmentalAlertDocument>("field_environmental_alerts")
            .DeleteManyAsync(a => fieldIds.Contains(a.FieldId), cancellationToken);
        await context.GetCollection<GeospatialProcessingJobDocument>("geospatial_processing_jobs")
            .DeleteManyAsync(j => j.FieldId != null && fieldIds.Contains(j.FieldId), cancellationToken);
        return deleted.DeletedCount;
    }

    private static List<FieldMembershipDocument> Memberships(DateTime created) =>
    [
        new()
        {
            UserId = OwnerId,
            Capacities = ["own", "work"],
            Status = "active",
            CreatedAt = created,
        },
        new()
        {
            UserId = ProducerId,
            Capacities = ["work"],
            Status = "active",
            InvitedBy = OwnerId,
            CreatedAt = created,
        },
    ];

    private static GeoJsonPointDocument Center(double latitude, double longitude) =>
        new()
        {
            Type = "Point",
            Coordinates = [longitude, latitude],
        };

    private static List<FieldDocument> BuildFields(DateTime created, DateTime updated) =>
    [
        new()
        {
            Id = FieldIds[0],
            OwnerId = OwnerId,
            Name = "North Olive Grove",
            Location = new LocationDocument { Latitude = 37.1568, Longitude = 21.586 },
            CenterPoint = Center(37.1568, 21.586),
            Area = 12.5,
            Variety = "Kalamata",
            TreeAge = 15,
            TreeCount = 420,
            GroundType = "Clay Loam",
            SoilType = "Clay Loam",
            IrrigationStatus = true,
            IrrigationType = "Drip",
            CurrentLifecycleYear = "low",
            CurrentLifecycleStage = OliveLifecycleStage.FruitGrowth,
            AssignedProducerIds = [ProducerId],
            Memberships = Memberships(created),
            Status = FieldStatus.Active,
            CropType = "Olive",
            LocationText = "Messenia",
            Color = "#2F6B4F",
            CreatedAt = created,
            UpdatedAt = updated,
        },
        new()
        {
            Id = FieldIds[1],
            OwnerId = OwnerId,
            Name = "South Valley Fields",
            Location = new LocationDocument { Latitude = 37.1492, Longitude = 21.5745 },
            CenterPoint = Center(37.1492, 21.5745),
            Area = 8.3,
            Variety = "Arbequina",
            TreeAge = 8,
            TreeCount = 280,
            GroundType = "Sandy Loam",
            SoilType = "Sandy Loam",
            IrrigationStatus = true,
            IrrigationType = "Sprinkler",
            CurrentLifecycleYear = "high",
            CurrentLifecycleStage = OliveLifecycleStage.Harvest,
            AssignedProducerIds = [ProducerId],
            Memberships = Memberships(created),
            Status = FieldStatus.Active,
            CropType = "Olive",
            LocationText = "Messenia",
            Color = "#3D6EA8",
            CreatedAt = created,
            UpdatedAt = updated,
        },
    ];

    private static List<LifecycleDocument> BuildLifecycles(DateTime cycleStart, DateTime updated)
    {
        var years = new[] { "low", "high" };
        var stages = new[] { OliveLifecycleStage.FruitGrowth, OliveLifecycleStage.Harvest };

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
        var fieldNames = new[] { "North Olive Grove", "South Valley Fields" };
        var fieldYears = new[] { "low", "high" };

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
                        approvalNote = roll < 7
                            ? "Good work — approved for payment."
                            : roll < 9 ? null : "Rejected — please redo north zone.";
                    }
                }
                else if (scheduledStart <= now && scheduledEnd >= now)
                {
                    status = taskIndex % 2 == 0 ? "in_progress" : "pending";
                    if (status == "in_progress") actualStart = scheduledStart;
                }
                else
                {
                    status = "pending";
                }

                var taskId = $"67555555555555555555{(0x6000 + taskIndex):x4}";
                taskIndex++;
                var title = $"{template.Title} — {fieldNames[fieldIdx]}";
                var lifecycleYear = template.LifecycleYear ?? fieldYears[fieldIdx];

                tasks.Add(new TaskDocument
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
                });

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

        AddPinnedTask(tasks, activities, ref activityIndex, now, "675555555555555555556f01", FieldIds[0], "Irrigation",
            "Irrigation — North Olive Grove", -6, -2, "pending", true);
        AddPinnedTask(tasks, activities, ref activityIndex, now, "675555555555555555556f02", FieldIds[0], "Pest Control",
            "Fruit fly scouting — North Olive Grove", -3, 1, "in_progress", true);
        AddPinnedTask(tasks, activities, ref activityIndex, now, "675555555555555555556f03", FieldIds[1], "Fertilization",
            "Fertilization — South Valley Fields", -1, 3, "pending", true);

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
        tasks.Add(new TaskDocument
        {
            Id = id,
            FieldId = fieldId,
            Type = type,
            Title = title,
            LifecycleYear = fieldId == FieldIds[1] ? "high" : "low",
            AssignedTo = assignProducer ? ProducerId : null,
            Status = status,
            ScheduledStart = start,
            ScheduledEnd = end,
            ActualStart = status == "in_progress" ? start.AddDays(1) : null,
            ApprovalStatus = "not_required",
            CreatedAt = start.AddDays(-4),
            UpdatedAt = now,
        });
        activities.Add(MakeActivity(ref activityIndex, fieldId, "task_assigned", title, OwnerId, id, start.AddDays(-4)));
    }
}
