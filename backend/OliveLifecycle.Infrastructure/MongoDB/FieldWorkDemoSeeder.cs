using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Documents.FieldWork;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// LIVE alpha story: curated field_tasks for Kostas on Giorgos's Filiatra parcels.
/// </summary>
public static class FieldWorkDemoSeeder
{
    public const string OwnerId = DemoFarmDataSeeder.OwnerId;
    public const string ProducerId = DemoFarmDataSeeder.ProducerId;

    /// <summary>Stable demo task ids (ObjectId hex).</summary>
    public static readonly string[] TaskIds =
    [
        "675555555555555555556001", // overdue
        "675555555555555555556002", // suitable today
        "675555555555555555556003", // weather-blocked
        "675555555555555555556004", // in progress → producer
        "675555555555555555556005", // completed + checklist/cost/photos
    ];

    private static readonly string[] PhotoIds =
    [
        "675555555555555555557001",
        "675555555555555555557002",
        "675555555555555555557003",
        "675555555555555555557004",
    ];

    private const string CompletedExecutionId = "675555555555555555558001";

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

        var fieldIds = DemoFarmDataSeeder.FieldIds;
        var fieldsCol = context.GetCollection<FieldDocument>("fields");
        var existingFields = await fieldsCol
            .Find(f => fieldIds.Contains(f.Id))
            .ToListAsync(cancellationToken);

        if (existingFields.Count == 0)
        {
            logger.LogInformation("FieldWork demo skip: no demo fields present.");
            return;
        }

        var f0 = fieldIds[0];
        var f1 = fieldIds.Length > 1 ? fieldIds[1] : f0;
        var f2 = fieldIds.Length > 2 ? fieldIds[2] : f0;

        var now = DateTime.UtcNow;
        var resultYear = now.Month >= 2 ? now.Year : now.Year - 1;
        var todayStart = new DateTime(now.Year, now.Month, now.Day, 6, 0, 0, DateTimeKind.Utc);

        var tasksCol = context.GetCollection<FieldTaskDocument>("field_tasks");
        var executionsCol = context.GetCollection<TaskExecutionDocument>("task_executions");
        var mediaCol = context.GetCollection<MediaAttachmentDocument>("media_attachments");

        // Replace prior Cycle 2 demo tasks/executions/photos so reseed stays idempotent.
        await tasksCol.DeleteManyAsync(t => TaskIds.Contains(t.Id), cancellationToken);
        await executionsCol.DeleteManyAsync(e => e.Id == CompletedExecutionId || TaskIds.Contains(e.TaskId), cancellationToken);
        await mediaCol.DeleteManyAsync(m => PhotoIds.Contains(m.Id), cancellationToken);

        var completedPhotoIds = new List<string> { PhotoIds[0], PhotoIds[1] };
        var irrigationChecklist = ChecklistFromCatalogue("T08", answered: false);
        var flyChecklist = ChecklistFromCatalogue("T14", answered: false);
        var groundCoverChecklist = ChecklistFromCatalogue("T09", answered: false);
        var fertChecklist = ChecklistFromCatalogue("T05", answered: false);
        var stressChecklist = ChecklistFromCatalogue("T17", answered: true, photoAttachmentIds: completedPhotoIds);

        var tasks = new List<FieldTaskDocument>
        {
            // 1) Overdue irrigation inspection — assigned to collaborator
            new()
            {
                Id = TaskIds[0],
                FieldId = f0,
                ResultYear = resultYear,
                TemplateCode = "T08",
                TemplateVersion = FieldWorkCatalogue.Version,
                Title = "Έλεγχος αρδευτικού συστήματος",
                Description = "Έλεγχος αντλίας, φίλτρων και σταλακτών πριν την επόμενη άρδευση.",
                Status = FieldTaskStatus.Planned.ToApiString(),
                PlannedStart = todayStart.AddDays(-8),
                PlannedEnd = todayStart.AddDays(-3),
                AssignedUserId = ProducerId,
                ResponsibleUserId = ProducerId,
                AssignmentResponse = TaskAssignmentResponse.Accepted.ToApiString(),
                AssignmentRespondedAt = todayStart.AddDays(-7),
                ChecklistSnapshot = irrigationChecklist,
                EstimatedCost = 45m,
                EstimatedCostCurrency = "EUR",
                EstimatedLabourHours = 2m,
                WeatherSuitability = WeatherSuitability.Good.ToApiString(),
                CreatedByUserId = OwnerId,
                CreatedAt = todayStart.AddDays(-10),
                UpdatedAt = todayStart.AddDays(-3),
            },
            // 2) Suitable today — fly trap check
            new()
            {
                Id = TaskIds[1],
                FieldId = f1,
                ResultYear = resultYear,
                TemplateCode = "T14",
                TemplateVersion = FieldWorkCatalogue.Version,
                Title = "Έλεγχος παγίδων δάκου και καρπών",
                Description = "Καταμέτρηση συλλήψεων και δειγματοληψία καρπών — καλές συνθήκες σήμερα.",
                Status = FieldTaskStatus.Ready.ToApiString(),
                PlannedStart = todayStart,
                PlannedEnd = todayStart.AddHours(4),
                AssignedUserId = ProducerId,
                ResponsibleUserId = ProducerId,
                AssignmentResponse = TaskAssignmentResponse.Accepted.ToApiString(),
                AssignmentRespondedAt = todayStart.AddDays(-1),
                ChecklistSnapshot = flyChecklist,
                EstimatedLabourHours = 1.5m,
                WeatherSuitability = WeatherSuitability.Good.ToApiString(),
                CreatedByUserId = OwnerId,
                CreatedAt = todayStart.AddDays(-2),
                UpdatedAt = now,
            },
            // 3) Weather-blocked ground cover
            new()
            {
                Id = TaskIds[2],
                FieldId = f2,
                ResultYear = resultYear,
                TemplateCode = "T09",
                TemplateVersion = FieldWorkCatalogue.Version,
                Title = "Διαχείριση ζιζανίων / κάλυψης εδάφους",
                Description = "Αναβολή λόγω βροχής και υγρασίας — ακατάλληλες συνθήκες.",
                Status = FieldTaskStatus.Blocked.ToApiString(),
                PlannedStart = todayStart.AddDays(1),
                PlannedEnd = todayStart.AddDays(2),
                AssignedUserId = OwnerId,
                ResponsibleUserId = OwnerId,
                AssignmentResponse = TaskAssignmentResponse.Accepted.ToApiString(),
                ChecklistSnapshot = groundCoverChecklist,
                EstimatedCost = 80m,
                EstimatedCostCurrency = "EUR",
                WeatherSuitability = WeatherSuitability.Unsuitable.ToApiString(),
                Notes = "Πρόγνωση: βροχή > 8 mm και υγρασία φύλλων υψηλή.",
                CreatedByUserId = OwnerId,
                CreatedAt = todayStart.AddDays(-1),
                UpdatedAt = now,
            },
            // 4) In progress fertilisation — collaborator
            new()
            {
                Id = TaskIds[3],
                FieldId = f0,
                ResultYear = resultYear,
                TemplateCode = "T05",
                TemplateVersion = FieldWorkCatalogue.Version,
                Title = "Βασική / εδαφική λίπανση",
                Description = "Ο Κώστας εφαρμόζει το σχέδιο λίπανσης στη βόρεια πλευρά.",
                Status = FieldTaskStatus.InProgress.ToApiString(),
                PlannedStart = todayStart.AddDays(-1),
                PlannedEnd = todayStart.AddDays(1),
                StartedAt = todayStart.AddHours(-3),
                AssignedUserId = ProducerId,
                ResponsibleUserId = ProducerId,
                AssignmentResponse = TaskAssignmentResponse.Accepted.ToApiString(),
                AssignmentRespondedAt = todayStart.AddDays(-2),
                ChecklistSnapshot = fertChecklist,
                EstimatedCost = 120m,
                EstimatedCostCurrency = "EUR",
                EstimatedLabourHours = 3m,
                WeatherSuitability = WeatherSuitability.Good.ToApiString(),
                CreatedByUserId = OwnerId,
                CreatedAt = todayStart.AddDays(-4),
                UpdatedAt = now,
            },
            // 5) Completed summer stress check — checklist + cost + photos
            new()
            {
                Id = TaskIds[4],
                FieldId = f1,
                ResultYear = resultYear,
                TemplateCode = "T17",
                TemplateVersion = FieldWorkCatalogue.Version,
                Title = "Θερινός έλεγχος καταπόνησης",
                Description = "Ολοκληρώθηκε με φωτογραφίες και κόστος εργασίας.",
                Status = FieldTaskStatus.Completed.ToApiString(),
                PlannedStart = todayStart.AddDays(-12),
                PlannedEnd = todayStart.AddDays(-11),
                StartedAt = todayStart.AddDays(-12).AddHours(1),
                AssignedUserId = ProducerId,
                ResponsibleUserId = ProducerId,
                AssignmentResponse = TaskAssignmentResponse.Accepted.ToApiString(),
                AssignmentRespondedAt = todayStart.AddDays(-13),
                ChecklistSnapshot = stressChecklist.Select(c =>
                {
                    if (c.Key == "area") c.TextValue = "Βόρεια ζώνη · ~0.15 ha";
                    return c;
                }).ToList(),
                EstimatedCost = 95m,
                EstimatedCostCurrency = "EUR",
                EstimatedLabourHours = 2.5m,
                Notes = "Ήπια καταπόνηση στα νεότερα δέντρα. Προτείνεται άρδευση εντός 3 ημερών.",
                AttachmentIds = completedPhotoIds,
                LatestExecutionId = CompletedExecutionId,
                WeatherSuitability = WeatherSuitability.Good.ToApiString(),
                CreatedByUserId = OwnerId,
                CreatedAt = todayStart.AddDays(-14),
                UpdatedAt = todayStart.AddDays(-11),
            },
        };

        await tasksCol.InsertManyAsync(tasks, cancellationToken: cancellationToken);

        var completedAt = todayStart.AddDays(-11).AddHours(3);
        await executionsCol.InsertOneAsync(
            new TaskExecutionDocument
            {
                Id = CompletedExecutionId,
                TaskId = TaskIds[4],
                FieldId = f1,
                ResultYear = resultYear,
                StartedAt = todayStart.AddDays(-12).AddHours(1),
                CompletedAt = completedAt,
                Outcome = TaskExecutionOutcome.Completed.ToApiString(),
                CompletedByUserIds = [ProducerId],
                ChecklistResults = tasks[4].ChecklistSnapshot.Select(c => new TaskExecutionChecklistResultDocument
                {
                    Key = c.Key,
                    IsAnswered = c.IsAnswered,
                    TextValue = c.TextValue,
                    NumberValue = c.NumberValue,
                    BoolValue = c.BoolValue,
                    AttachmentIds = c.AttachmentIds,
                }).ToList(),
                Notes = tasks[4].Notes,
                AttachmentIds = completedPhotoIds,
                WeatherSuitability = WeatherSuitability.Good.ToApiString(),
                RecordedByUserId = ProducerId,
                PlannedStartSnapshot = tasks[4].PlannedStart,
                PlannedEndSnapshot = tasks[4].PlannedEnd,
                CreatedAt = completedAt,
                UpdatedAt = completedAt,
            },
            cancellationToken: cancellationToken);

        // Minimal Photo Hub documents (demo image URLs — no binary upload).
        var photos = new List<MediaAttachmentDocument>
        {
            Photo(PhotoIds[0], f1, MediaOwnerType.Task, TaskIds[4],
                "/demo-images/olive-tree-field.jpg", OwnerId, completedAt.AddHours(-2), PhotoKind.Before),
            Photo(PhotoIds[1], f1, MediaOwnerType.Task, TaskIds[4],
                "/demo-images/olive-branch.jpg", ProducerId, completedAt.AddHours(-1), PhotoKind.After),
            Photo(PhotoIds[2], f0, MediaOwnerType.Field, f0,
                "/demo-images/olive-grove-hillside.jpg", OwnerId, todayStart.AddDays(-5), PhotoKind.General),
            Photo(PhotoIds[3], f2, MediaOwnerType.Field, f2,
                "/demo-images/olive-harvest.jpg", ProducerId, todayStart.AddDays(-20), PhotoKind.General),
        };
        await mediaCol.InsertManyAsync(photos, cancellationToken: cancellationToken);

        await SeedHouseholdNotificationsAsync(context, cancellationToken);

        logger.LogInformation(
            "FieldWork demo seeded {TaskCount} tasks and {PhotoCount} photos for alpha household story.",
            tasks.Count,
            photos.Count);
    }

    /// <summary>Giorgos + Kostas only — Eleni gets no task noise.</summary>
    private static async Task SeedHouseholdNotificationsAsync(
        MongoDbContext context,
        CancellationToken cancellationToken)
    {
        var notifications = context.GetCollection<UserNotificationDocument>("user_notifications");
        await notifications.ReplaceOneAsync(
            n => n.Id == "67c801b30000000000000001",
            new UserNotificationDocument
            {
                Id = "67c801b30000000000000001",
                UserId = OwnerId,
                Type = "task_approval",
                Title = "Ο Κώστας περιμένει έγκριση",
                Message = "Ψεκασμός δάκου στο Φιλιατρών 088 — έλεγχος πριν την πληρωμή.",
                RelatedEntityType = "Task",
                ActionUrl = "/tasks",
                IsRead = false,
                CreatedAt = new DateTime(2026, 9, 6, 16, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 9, 6, 16, 0, 0, DateTimeKind.Utc)
            },
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);

        await notifications.ReplaceOneAsync(
            n => n.Id == "67c801b30000000000000002",
            new UserNotificationDocument
            {
                Id = "67c801b30000000000000002",
                UserId = ProducerId,
                Type = "task_assigned",
                Title = "Παρακολούθηση δάκου σε εξέλιξη",
                Message = "Συνέχισε τις παγίδες στο 088 μέχρι τις 12/9.",
                RelatedEntityType = "Task",
                ActionUrl = "/tasks",
                IsRead = false,
                CreatedAt = new DateTime(2026, 9, 8, 7, 35, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 9, 8, 7, 35, 0, DateTimeKind.Utc)
            },
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);
    }

    private static MediaAttachmentDocument Photo(
        string id,
        string fieldId,
        MediaOwnerType ownerType,
        string ownerId,
        string url,
        string uploadedBy,
        DateTime when,
        PhotoKind kind) =>
        new()
        {
            Id = id,
            OwnerType = ownerType.ToApiString(),
            OwnerId = ownerType == MediaOwnerType.Field ? string.Empty : ownerId,
            FieldId = fieldId,
            MediaType = "image",
            Url = url,
            ThumbnailUrl = url,
            FileName = url.Contains('/') ? url[(url.LastIndexOf('/') + 1)..] : url,
            ContentType = "image/jpeg",
            UploadedByUserId = uploadedBy,
            CapturedAt = when,
            FieldAssignment = FieldAssignmentStatus.Manual.ToApiString(),
            Kind = kind.ToApiString(),
            CreatedAt = when,
            UpdatedAt = when,
        };

    private static List<FieldTaskChecklistItemDocument> ChecklistFromCatalogue(
        string templateCode,
        bool answered,
        IReadOnlyList<string>? photoAttachmentIds = null)
    {
        var entry = FieldWorkCatalogue.GetByCode(templateCode);
        if (entry is null) return [];

        return entry.DefaultChecklist.Select((c, i) => new FieldTaskChecklistItemDocument
        {
            Key = c.Key,
            GreekLabel = c.GreekLabel,
            EnglishLabel = c.EnglishLabel,
            ItemType = c.ItemType.ToApiString(),
            Requirement = c.Requirement.ToApiString(),
            Choices = c.Choices?.ToList() ?? [],
            Unit = c.Unit,
            IsEssential = c.IsEssential,
            SortOrder = c.SortOrder > 0 ? c.SortOrder : i + 1,
            IsAnswered = answered,
            BoolValue = answered && c.ItemType is ChecklistItemType.Checkbox or ChecklistItemType.Confirmation
                ? true
                : null,
            AttachmentIds = answered
                            && c.ItemType == ChecklistItemType.Photo
                            && photoAttachmentIds is { Count: > 0 }
                ? photoAttachmentIds.ToList()
                : [],
        }).ToList();
    }

}
