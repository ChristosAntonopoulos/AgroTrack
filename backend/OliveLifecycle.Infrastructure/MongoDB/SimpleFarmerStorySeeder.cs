using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using OliveLifecycle.Core.Finance;
using OliveLifecycle.Infrastructure.Persistence.Documents;
using OliveLifecycle.Infrastructure.Persistence.Documents.FieldWork;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Phase 2–3: a simple year on both ελαιώνες, ending with finished harvests
/// in the past 10 days. Photos are frontend /demo-images/ URLs (no binary upload).
/// </summary>
public static class SimpleFarmerStorySeeder
{
    private const string OwnerId = DemoFarmDataSeeder.OwnerId;
    private const string ProducerId = DemoFarmDataSeeder.ProducerId;
    private const string MillName = "Ελαιουργείο Φιλιατρών";
    private const decimal OilKgPerLitre = 0.916m;

    private sealed record GroveStory(
        string FieldId,
        int FieldNumber,
        string Name,
        (double Kg, int Sacks)[] HarvestDays,
        double OilKg,
        decimal OilLitres,
        decimal MillCost,
        decimal HarvestLabor,
        decimal PruningLabor,
        decimal FertCost,
        bool FullYear);

    private static readonly GroveStory[] Groves =
    [
        new(
            DemoFarmDataSeeder.FieldId,
            FieldNumber: 1,
            Name: DemoFarmDataSeeder.FieldName,
            HarvestDays: [(420, 17), (450, 18), (370, 15)],
            OilKg: 236,
            OilLitres: 258m,
            MillCost: 161m,
            HarvestLabor: 300m,
            PruningLabor: 360m,
            FertCost: 168m,
            FullYear: true),
        new(
            DemoFarmDataSeeder.FieldIdLower,
            FieldNumber: 2,
            Name: DemoFarmDataSeeder.FieldNameLower,
            HarvestDays: [(280, 11), (320, 13)],
            OilKg: 114,
            OilLitres: 124m,
            MillCost: 78m,
            HarvestLabor: 200m,
            PruningLabor: 270m,
            FertCost: 112m,
            FullYear: false),
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
        var calendar = StoryCalendar.FromToday(DateTime.UtcNow);
        var tasksCol = context.GetCollection<FieldTaskDocument>("field_tasks");
        var executionsCol = context.GetCollection<TaskExecutionDocument>("task_executions");
        var notesCol = context.GetCollection<NoteDocument>("notes");
        var mediaCol = context.GetCollection<MediaAttachmentDocument>("media_attachments");
        var moneyCol = context.GetCollection<FinancialTransactionDocument>("financial_transactions");
        var harvestsCol = context.GetCollection<HarvestRecordDocument>("harvest_records");
        var activitiesCol = context.GetCollection<ActivityDocument>("activities");
        var oilLotsCol = context.GetCollection<OilLotDocument>("oil_lots");
        var stockMovementsCol = context.GetCollection<StockMovementDocument>("stock_movements");

        var totalTasks = 0;
        var totalNotes = 0;
        var totalPhotos = 0;
        var totalMoney = 0;
        var totalHarvests = 0;
        var totalOilLots = 0;

        foreach (var grove in Groves)
        {
            var exists = await fieldsCol.Find(f => f.Id == grove.FieldId).AnyAsync(cancellationToken);
            if (!exists)
            {
                logger.LogWarning("Simple farmer story skip: field {FieldId} missing.", grove.FieldId);
                continue;
            }

            var builder = new StoryBuilder(calendar, grove);
            foreach (var task in builder.Tasks)
                await tasksCol.ReplaceOneAsync(t => t.Id == task.Id, task, new ReplaceOptions { IsUpsert = true }, cancellationToken);
            foreach (var execution in builder.Executions)
                await executionsCol.ReplaceOneAsync(e => e.Id == execution.Id, execution, new ReplaceOptions { IsUpsert = true }, cancellationToken);
            foreach (var note in builder.Notes)
                await notesCol.ReplaceOneAsync(n => n.Id == note.Id, note, new ReplaceOptions { IsUpsert = true }, cancellationToken);
            foreach (var photo in builder.Photos)
                await mediaCol.ReplaceOneAsync(m => m.Id == photo.Id, photo, new ReplaceOptions { IsUpsert = true }, cancellationToken);
            foreach (var money in builder.Money)
                await moneyCol.ReplaceOneAsync(m => m.Id == money.Id, money, new ReplaceOptions { IsUpsert = true }, cancellationToken);
            foreach (var harvest in builder.Harvests)
                await harvestsCol.ReplaceOneAsync(h => h.Id == harvest.Id, harvest, new ReplaceOptions { IsUpsert = true }, cancellationToken);
            foreach (var activity in builder.Activities)
                await activitiesCol.ReplaceOneAsync(a => a.Id == activity.Id, activity, new ReplaceOptions { IsUpsert = true }, cancellationToken);
            foreach (var lot in builder.OilLots)
                await oilLotsCol.ReplaceOneAsync(l => l.Id == lot.Id, lot, new ReplaceOptions { IsUpsert = true }, cancellationToken);
            foreach (var move in builder.StockMovements)
                await stockMovementsCol.ReplaceOneAsync(m => m.Id == move.Id, move, new ReplaceOptions { IsUpsert = true }, cancellationToken);

            totalTasks += builder.Tasks.Count;
            totalNotes += builder.Notes.Count;
            totalPhotos += builder.Photos.Count;
            totalMoney += builder.Money.Count;
            totalHarvests += builder.Harvests.Count;
            totalOilLots += builder.OilLots.Count;
        }

        logger.LogInformation(
            "Phase 3: simple farmer story on {Count} ελαιώνες — {Tasks} tasks, {Notes} notes, {Photos} photos, {Money} money, {Harvests} harvest days, {OilLots} oil lots (result year {Year}).",
            Groves.Length,
            totalTasks,
            totalNotes,
            totalPhotos,
            totalMoney,
            totalHarvests,
            totalOilLots,
            calendar.ResultYear);
    }

    /// <summary>
    /// Maps the script onto calendar dates so harvest always lands in the past 10 days.
    /// Script “28 Sep” = today; picking days are today−9 … today−7.
    /// </summary>
    private sealed class StoryCalendar
    {
        public required int ResultYear { get; init; }
        public required int PrevYear { get; init; }
        public required DateTime Today { get; init; }

        public static StoryCalendar FromToday(DateTime utcNow)
        {
            var today = utcNow.Date;
            var harvestDay3 = today.AddDays(-7);
            return new StoryCalendar
            {
                Today = today,
                ResultYear = harvestDay3.Year,
                PrevYear = harvestDay3.Year - 1,
            };
        }

        public DateTime DaysAgo(int days, int hour = 10, int minute = 0) =>
            Today.AddDays(-days).AddHours(hour).AddMinutes(minute);

        public DateTime On(int year, int month, int day, int hour = 10, int minute = 0) =>
            new(year, month, day, hour, minute, 0, DateTimeKind.Utc);
    }

    private sealed class StoryBuilder
    {
        private readonly StoryCalendar _c;
        private readonly GroveStory _grove;
        private readonly string _fieldId;
        private readonly int _n;
        private readonly string _batchId;
        private readonly string _harvestLastId;
        private int _seq;

        public List<FieldTaskDocument> Tasks { get; } = [];
        public List<TaskExecutionDocument> Executions { get; } = [];
        public List<NoteDocument> Notes { get; } = [];
        public List<MediaAttachmentDocument> Photos { get; } = [];
        public List<FinancialTransactionDocument> Money { get; } = [];
        public List<HarvestRecordDocument> Harvests { get; } = [];
        public List<OilLotDocument> OilLots { get; } = [];
        public List<StockMovementDocument> StockMovements { get; } = [];
        public List<ActivityDocument> Activities { get; } = [];

        public StoryBuilder(StoryCalendar calendar, GroveStory grove)
        {
            _c = calendar;
            _grove = grove;
            _fieldId = grove.FieldId;
            _n = grove.FieldNumber;
            _batchId = $"675555555555555555557b0{_n}";
            _harvestLastId = $"675555555555555555557a{_n}{grove.HarvestDays.Length}";
            Build();
        }

        private string NextId(char kind)
        {
            _seq++;
            // 8-char hex prefix (field digit) + 16-char counter
            return $"675555{kind}{_n}{_seq:x16}";
        }

        private string TaskId(int seq) =>
            $"67555555555555555556{_c.ResultYear % 10}{_n}{seq:00}";

        private string ExecId(int seq) =>
            $"67555555555555555558{_c.ResultYear % 10}{_n}{seq:00}";

        private string MoneyId(int seq) =>
            $"675555555555555555559{_c.ResultYear % 10}{_n}{seq:x}";

        private void Build()
        {
            var y = _c.ResultYear;
            var p = _c.PrevYear;

            // —— October (previous year): year starts ——
            var oct15 = _c.On(p, 10, 15, 9);
            Activities.Add(Activity(
                NextId('a'), _fieldId, "lifecycle_year_changed",
                "Νέα χρονιά στο πάνω λιόφυτο", OwnerId, oct15,
                new Dictionary<string, string>
                {
                    ["previousYear"] = "low",
                    ["newYear"] = "high",
                    ["previousStage"] = OliveLifecycleStage.Harvest,
                    ["newStage"] = OliveLifecycleStage.Dormancy,
                }));
            Activities.Add(Activity(
                NextId('a'), _fieldId, "lifecycle_stage_changed",
                "Τα δέντρα ξεκουράζονται", OwnerId, oct15.AddMinutes(5),
                new Dictionary<string, string>
                {
                    ["previousStage"] = OliveLifecycleStage.Harvest,
                    ["newStage"] = OliveLifecycleStage.Dormancy,
                }));

            var octNote = Note(NextId('c'), OwnerId,
                "Τέλειωσε η περσινή. Τα δέντρα κουρασμένα — όπως κι εγώ. Μένει η γη.",
                _c.On(p, 10, 18, 17));
            Notes.Add(octNote);
            Photos.Add(FieldPhoto(NextId('d'), "/demo-images/olive-grove-hillside.jpg",
                _grove.Name, _c.On(p, 10, 18, 17, 20)));

            // —— November: rain + peacock spot ——
            var novNote = Note(NextId('c'), OwnerId,
                "Μετά τη βροχή η χαμηλή γωνία κρατάει νερό. Πάντα έτσι. Το ξέρουμε το χωράφι.",
                _c.On(p, 11, 8, 16));
            Notes.Add(novNote);
            Photos.Add(FieldPhoto(NextId('d'), "/demo-images/olive-grove-hillside.jpg",
                "Μετά τη βροχή", _c.On(p, 11, 8, 16, 15)));
            Photos.Add(NotePhoto(NextId('d'), novNote.Id, "/demo-images/olive-grove-hillside.jpg",
                "Η χαμηλή γωνία", _c.On(p, 11, 8, 16, 20)));

            AddCompletedTask(
                taskId: $"67555555555555555556{y % 10}{_n}01",
                execId: $"67555555555555555558{y % 10}{_n}01",
                code: "E04",
                when: _c.On(p, 11, 12, 10),
                assignee: OwnerId,
                notes: "Λίγες κηλίδες στα φύλλα. Δεν άξιζε ψεκασμό.");

            // —— December: quiet ——
            Notes.Add(Note(NextId('c'), OwnerId,
                "Χειμώνας. Ησυχία.",
                _c.On(p, 12, 14, 11)));

            // —— January: winter walk ——
            var janWalk = _c.On(y, 1, 18, 10);
            AddCompletedTask(
                taskId: $"67555555555555555556{y % 10}{_n}02",
                execId: $"67555555555555555558{y % 10}{_n}02",
                code: "T02",
                when: janWalk,
                assignee: OwnerId,
                notes: "Περπάτησα το χωράφι. Η βόρεια σειρά ζητάει κλάδεμα.");
            Notes.Add(Note(NextId('c'), OwnerId,
                "Η βόρεια σειρά έχει πυκνώσει. Φεβρουάριο κλαδεύουμε — όπως κάθε χρόνο.",
                _c.On(y, 1, 18, 17)));
            Photos.Add(FieldPhoto(NextId('d'), "/demo-images/olive-tree-field.jpg",
                "Πριν το κλάδεμα", _c.On(y, 1, 18, 17, 10)));

            // —— February: pruning ——
            var pruneWhen = _c.On(y, 2, 14, 8);
            var pruneTaskId = $"67555555555555555556{y % 10}{_n}03";
            var prunePhotoId = NextId('d');
            AddCompletedTask(
                taskId: pruneTaskId,
                execId: $"67555555555555555558{y % 10}{_n}03",
                code: "T06",
                when: pruneWhen,
                assignee: ProducerId,
                durationHours: 8,
                days: 4,
                photoIds: [prunePhotoId],
                notes: "Κλαδέψαμε με τον Κώστα. Τα δέντρα άνοιξαν.");
            Photos.Add(TaskPhoto(prunePhotoId, pruneTaskId, "/demo-images/olive-branch.jpg",
                "Μετά το κλάδεμα", pruneWhen.AddHours(6), PhotoKind.After));

            AddCompletedTask(
                taskId: $"67555555555555555556{y % 10}{_n}04",
                execId: $"67555555555555555558{y % 10}{_n}04",
                code: "T07",
                when: _c.On(y, 2, 21, 9),
                assignee: ProducerId,
                notes: "Θρυμματίσαμε τα κλαδιά. Δεν κάψαμε.");

            Money.Add(Expense(
                $"675555555555555555559{y % 10}{_n}1",
                _grove.PruningLabor, "Μεροκάματα κλαδέματος", "labor",
                pruneWhen.AddHours(10),
                productKind: "labour", taskId: pruneTaskId, collaboratorId: ProducerId));

            // —— March: fertiliser + irrigation ——
            var fertWhen = _c.On(y, 3, 8, 9);
            var fertTaskId = $"67555555555555555556{y % 10}{_n}05";
            AddCompletedTask(
                taskId: fertTaskId,
                execId: $"67555555555555555558{y % 10}{_n}05",
                code: "T05",
                when: fertWhen,
                assignee: OwnerId,
                notes: "Λίπασμα στο χωράφι. Ό,τι χρειάζεται η χρονιά.");
            Money.Add(Expense(
                $"675555555555555555559{y % 10}{_n}2",
                _grove.FertCost, "Λίπασμα", "fertilizers",
                fertWhen,
                productKind: "fertilizer", taskId: fertTaskId));

            var irrigTaskId = $"67555555555555555556{y % 10}{_n}06";
            var irrigPhotoId = NextId('d');
            var irrigWhen = _c.On(y, 3, 15, 10);
            AddCompletedTask(
                taskId: irrigTaskId,
                execId: $"67555555555555555558{y % 10}{_n}06",
                code: "T08",
                when: irrigWhen,
                assignee: OwnerId,
                photoIds: [irrigPhotoId],
                notes: "Δύο σταλάκτες βουλωμένοι στη νότια γωνία. Καθαρίστηκαν.");
            Photos.Add(TaskPhoto(irrigPhotoId, irrigTaskId, "/demo-images/olive-tree-field.jpg",
                "Το αρδευτικό", irrigWhen.AddHours(1), PhotoKind.After));

            var budBreak = _c.On(y, 3, 12, 8);
            Activities.Add(Activity(
                NextId('a'), _fieldId, "lifecycle_stage_changed",
                "Ξυπνάνε τα δέντρα", OwnerId, budBreak,
                new Dictionary<string, string>
                {
                    ["previousStage"] = OliveLifecycleStage.Dormancy,
                    ["newStage"] = OliveLifecycleStage.BudBreak,
                }));

            // —— April: flowering ——
            var flowerWhen = _c.On(y, 4, 18, 10);
            Activities.Add(Activity(
                NextId('a'), _fieldId, "lifecycle_stage_changed",
                "Άνθισε", OwnerId, flowerWhen,
                new Dictionary<string, string>
                {
                    ["previousStage"] = OliveLifecycleStage.BudBreak,
                    ["newStage"] = OliveLifecycleStage.Flowering,
                }));
            var flowerTaskId = $"67555555555555555556{y % 10}{_n}07";
            var flowerPhotoId = NextId('d');
            AddCompletedTask(
                taskId: flowerTaskId,
                execId: $"67555555555555555558{y % 10}{_n}07",
                code: "T10",
                when: flowerWhen.AddHours(2),
                assignee: OwnerId,
                photoIds: [flowerPhotoId],
                notes: "Καλή άνθιση. Η σειρά στον δρόμο πάντα πιο αδύναμη.");
            Photos.Add(TaskPhoto(flowerPhotoId, flowerTaskId, "/demo-images/olive-branch.jpg",
                "Άνθιση", flowerWhen.AddHours(3), PhotoKind.General));
            Notes.Add(Note(NextId('c'), OwnerId,
                "Άνθισε όμορφα φέτος. Έχει ελπίδα η χρονιά.",
                _c.On(y, 4, 18, 18)));

            // —— May: fruit set + moth ——
            var fruitSetWhen = _c.On(y, 5, 28, 10);
            Activities.Add(Activity(
                NextId('a'), _fieldId, "lifecycle_stage_changed",
                "Έδεσε καρπός", OwnerId, fruitSetWhen,
                new Dictionary<string, string>
                {
                    ["previousStage"] = OliveLifecycleStage.Flowering,
                    ["newStage"] = OliveLifecycleStage.FruitSet,
                }));
            AddCompletedTask(
                taskId: $"67555555555555555556{y % 10}{_n}08",
                execId: $"67555555555555555558{y % 10}{_n}08",
                code: "T12",
                when: fruitSetWhen.AddHours(1),
                assignee: OwnerId,
                notes: "Καλό δέσιμο. Κρατάει η υπόσχεση της άνθισης.");
            Notes.Add(Note(NextId('c'), OwnerId,
                "Ο καρπός έδεσε. Από εδώ και πέρα — υπομονή και νερό.",
                _c.On(y, 5, 28, 17)));
            AddCompletedTask(
                taskId: $"67555555555555555556{y % 10}{_n}09",
                execId: $"67555555555555555558{y % 10}{_n}09",
                code: "T11",
                when: _c.On(y, 5, 22, 9),
                assignee: OwnerId,
                notes: "Λίγα τσιμπήματα. Δεν ψέκασα.");

            // —— June: traps ——
            var trapWhen = _c.On(y, 6, 12, 8);
            var trapTaskId = $"67555555555555555556{y % 10}{_n}10";
            AddCompletedTask(
                taskId: trapTaskId,
                execId: $"67555555555555555558{y % 10}{_n}10",
                code: "T13",
                when: trapWhen,
                assignee: ProducerId,
                notes: "Μπήκαν οι παγίδες. Αρχίζει η φύλαξη.");
            Money.Add(Expense(
                $"675555555555555555559{y % 10}{_n}3",
                40m, "Παγίδες δάκου", "plant_protection",
                trapWhen,
                quantity: 10m, unit: "piece", unitPrice: 4m,
                productKind: "plant_protection", taskId: trapTaskId));

            var trapNote = Note(NextId('c'), OwnerId,
                "Οι παγίδες είναι στη θέση τους. Τώρα προσέχουμε.",
                _c.On(y, 6, 12, 18));
            Notes.Add(trapNote);
            var trapNotePhotoId = NextId('d');
            Photos.Add(NotePhoto(trapNotePhotoId, trapNote.Id, "/demo-images/olive-branch.jpg",
                "Παγίδα", _c.On(y, 6, 12, 18, 10)));
            Photos.Add(FieldPhoto(NextId('d'), "/demo-images/olive-tree-field.jpg",
                "Παγίδα στη νότια γωνία", _c.On(y, 6, 12, 18, 15)));

            var fruitGrowth = _c.On(y, 6, 20, 8);
            Activities.Add(Activity(
                NextId('a'), _fieldId, "lifecycle_stage_changed",
                "Μεγαλώνει ο καρπός", OwnerId, fruitGrowth,
                new Dictionary<string, string>
                {
                    ["previousStage"] = OliveLifecycleStage.FruitSet,
                    ["newStage"] = OliveLifecycleStage.FruitGrowth,
                }));

            // —— July: irrigation + summer stress ——
            AddCompletedTask(
                taskId: $"67555555555555555556{y % 10}{_n}11",
                execId: $"67555555555555555558{y % 10}{_n}11",
                code: "T15",
                when: _c.On(y, 7, 10, 7),
                assignee: OwnerId,
                notes: "Πότισμα. Η ζέστη δεν συγχωρεί.");
            AddCompletedTask(
                taskId: $"67555555555555555556{y % 10}{_n}12",
                execId: $"67555555555555555558{y % 10}{_n}12",
                code: "T17",
                when: _c.On(y, 7, 22, 11),
                assignee: OwnerId,
                notes: "Η δύση υποφέρει το μεσημέρι. Έδωσα παραπάνω νερό.");
            Money.Add(Expense(
                $"675555555555555555559{y % 10}{_n}4",
                90m, "Ρεύμα άρδευσης", "irrigation",
                _c.On(y, 7, 31, 12),
                productKind: "irrigation"));

            // —— August: fly check + bait ——
            var flyWhen = _c.On(y, 8, 14, 7);
            var flyTaskId = $"67555555555555555556{y % 10}{_n}13";
            AddCompletedTask(
                taskId: flyTaskId,
                execId: $"67555555555555555558{y % 10}{_n}13",
                code: "T14",
                when: flyWhen,
                assignee: OwnerId,
                notes: "Ανέβηκε ο δάκος. Ράντισα δόλωμα το χάραμα.");
            Money.Add(Expense(
                $"675555555555555555559{y % 10}{_n}5",
                75m, "Ψεκασμός δάκου", "plant_protection",
                flyWhen.AddHours(1),
                productKind: "plant_protection", taskId: flyTaskId));
            Notes.Add(Note(NextId('c'), OwnerId,
                "Ράντισα νωρίς. Δεν έβρεξε. Καλό σημάδι.",
                _c.On(y, 8, 14, 18)));

            // —— Early September: get ready ——
            AddCompletedTask(
                taskId: $"67555555555555555556{y % 10}{_n}14",
                execId: $"67555555555555555558{y % 10}{_n}14",
                code: "T18",
                when: _c.DaysAgo(18, 10),
                assignee: OwnerId,
                notes: "Καλή χρονιά. Όχι ρεκόρ — αρκετή.");
            AddCompletedTask(
                taskId: $"67555555555555555556{y % 10}{_n}15",
                execId: $"67555555555555555558{y % 10}{_n}15",
                code: "T19",
                when: _c.DaysAgo(16, 11),
                assignee: OwnerId,
                notes: $"Ραντεβού στο {MillName}.");

            var prepTaskId = $"67555555555555555556{y % 10}{_n}16";
            AddCompletedTask(
                taskId: prepTaskId,
                execId: $"67555555555555555558{y % 10}{_n}16",
                code: "T20",
                when: _c.DaysAgo(11, 9),
                assignee: OwnerId,
                notes: "Δίχτυα έτοιμα. Ώρα για συγκομιδή.");
            Money.Add(Expense(
                $"675555555555555555559{y % 10}{_n}6",
                36m, "Δίχτυα και τσουβάλια", "equipment_and_tools",
                _c.DaysAgo(11, 14),
                productKind: "equipment", taskId: prepTaskId));
            Notes.Add(Note(NextId('c'), OwnerId,
                "Μαύρισαν οι ελιές. Αύριο αρχίζουμε.",
                _c.DaysAgo(11, 19)));

            // —— Harvest window (past 10 days) ——
            Notes.Add(Note(NextId('c'), OwnerId,
                "Αύριο μαζεύουμε. Οικογένεια στο χωράφι.",
                _c.DaysAgo(10, 19)));

            var harvestStart = _c.DaysAgo(9, 7);
            Activities.Add(Activity(
                NextId('a'), _fieldId, "lifecycle_stage_changed",
                "Συγκομιδή", OwnerId, harvestStart,
                new Dictionary<string, string>
                {
                    ["previousStage"] = OliveLifecycleStage.FruitGrowth,
                    ["newStage"] = OliveLifecycleStage.Harvest,
                }));

            var harvestTaskId = $"67555555555555555556{y % 10}{_n}17";
            var harvestPhoto1 = NextId('d');
            var harvestPhoto2 = NextId('d');
            var harvestDays = _grove.HarvestDays;
            var totalOlive = harvestDays.Sum(d => d.Kg);
            AddCompletedTask(
                taskId: harvestTaskId,
                execId: $"67555555555555555558{y % 10}{_n}17",
                code: "T21",
                when: harvestStart,
                assignee: ProducerId,
                durationHours: 10,
                days: harvestDays.Length,
                photoIds: [harvestPhoto1, harvestPhoto2],
                relatedHarvestId: _harvestLastId,
                notes: harvestDays.Length == 3
                    ? "Τρεις μέρες. Οικογένεια και ένας εργάτης. Τελειώσαμε."
                    : "Δύο μέρες. Τελειώσαμε.");

            Photos.Add(TaskPhoto(harvestPhoto1, harvestTaskId, "/demo-images/olive-harvest.jpg",
                "Πρώτη μέρα", _c.DaysAgo(8 + harvestDays.Length, 11), PhotoKind.Before));
            Photos.Add(TaskPhoto(harvestPhoto2, harvestTaskId, "/demo-images/olive-harvest.jpg",
                "Τελευταία μέρα", _c.DaysAgo(7, 16), PhotoKind.After));
            Photos.Add(FieldPhoto(NextId('d'), "/demo-images/olive-harvest.jpg",
                "Συγκομιδή", _c.DaysAgo(8 + harvestDays.Length, 11, 30)));

            for (var i = 0; i < harvestDays.Length; i++)
            {
                var day = harvestDays[i];
                var isLast = i == harvestDays.Length - 1;
                var dayId = $"675555555555555555557a{_n}{i + 1}";
                var dayOffset = 7 + (harvestDays.Length - 1 - i);
                Harvests.Add(HarvestDay(
                    dayId,
                    _c.DaysAgo(dayOffset, 18),
                    oliveKg: day.Kg,
                    sacks: day.Sacks,
                    oilKg: isLast ? _grove.OilKg : null,
                    oilLitres: isLast ? _grove.OilLitres : null,
                    totalOliveKg: totalOlive,
                    notes: isLast
                        ? $"Τέλος συγκομιδής. {totalOlive:0} κιλά · {_grove.OilLitres:0} λίτρα · οξύτητα 0,4."
                        : i == 0 ? "Πρώτη μέρα." : "Δεύτερη μέρα."));
            }

            // What is still in the cellar after the demo oil sale (matches money keep-home remainder).
            var keepHome = _n == 1 ? 40m : 20m;
            var tin16 = (int)(keepHome / 16m);
            var bulk = keepHome - tin16 * 16m;
            var pressedOn = _c.DaysAgo(5, 14);
            var oilLotId = $"67555555555555555555e0{_n}1";
            OilLots.Add(new OilLotDocument
            {
                Id = oilLotId,
                OwnerUserId = OwnerId,
                BatchId = _batchId,
                PressedOn = pressedOn,
                ResultYear = _c.ResultYear,
                HarvestRecordIds = [_harvestLastId],
                FieldIds = [_fieldId],
                TotalAmount = _grove.OilLitres,
                Unit = "litres",
                MillKept = 0,
                ConversionFactor = OilKgPerLitre,
                Packing = new OilPackDocument
                {
                    Tin16 = tin16,
                    Tin17 = 0,
                    BulkLitres = bulk
                },
                Notes = "Demo cellar after sales",
                CreatedAt = pressedOn,
                UpdatedAt = pressedOn
            });
            StockMovements.Add(new StockMovementDocument
            {
                Id = $"67555555555555555555e1{_n}1",
                OwnerUserId = OwnerId,
                OilLotId = oilLotId,
                Kind = "Produced",
                PackDelta = new OilPackDocument { BulkLitres = _grove.OilLitres },
                LitresDelta = _grove.OilLitres,
                Notes = "Demo oil lot",
                OccurredOn = pressedOn,
                CreatedAt = pressedOn,
                UpdatedAt = pressedOn
            });

            Money.Add(Expense(
                $"675555555555555555559{y % 10}{_n}7",
                _grove.HarvestLabor, "Μεροκάματα συγκομιδής", "labor",
                _c.DaysAgo(7, 19),
                productKind: "labour", taskId: harvestTaskId, harvestId: _harvestLastId,
                collaboratorId: ProducerId));

            Money.Add(Expense(
                $"675555555555555555559{y % 10}{_n}8",
                _n == 1 ? 48m : 32m, "Μεταφορά στο ελαιουργείο", "fuel_and_energy",
                _c.DaysAgo(6, 10),
                productKind: "fuel", harvestId: _harvestLastId));

            Money.Add(Expense(
                $"675555555555555555559{y % 10}{_n}9",
                _grove.MillCost, "Ελαιουργείο", "mill",
                _c.DaysAgo(5, 14),
                quantity: (decimal)totalOlive, unit: "kilogram", unitPrice: 0.13m,
                productKind: "mill", harvestId: _harvestLastId, counterparty: MillName));

            Notes.Add(Note(NextId('c'), OwnerId,
                _n == 1
                    ? "Οξύτητα 0,4. Λάδι σαν παλιά. Χαρήκαμε."
                    : "Και από τον κάτω — καλό λάδι.",
                _c.DaysAgo(5, 16)));

            var soldLitres = _grove.OilLitres - (_n == 1 ? 40m : 20m);
            Money.Add(Income(
                $"675555555555555555559{y % 10}{_n}a",
                soldLitres * 7m, "Πώληση λαδιού", "olive_oil_sale",
                _c.DaysAgo(3, 12),
                quantity: soldLitres, unit: "litre", unitPrice: 7m,
                productKind: "olive_oil", harvestId: _harvestLastId,
                counterparty: "Τοπικός αγοραστής Φιλιατρών"));

            AddCompletedTask(
                taskId: $"67555555555555555556{y % 10}{_n}18",
                execId: $"67555555555555555558{y % 10}{_n}18",
                code: "T22",
                when: _c.DaysAgo(2, 10),
                assignee: OwnerId,
                relatedHarvestId: _harvestLastId,
                notes: $"{totalOlive:0} κιλά · {_grove.OilLitres:0} λίτρα. Κρατήσαμε λίγο για το σπίτι.");

            Notes.Add(Note(
                $"675555555555555555557e{_n:00}",
                OwnerId,
                "Κρατήσαμε λάδι για το σπίτι. Όπως κάθε χρόνο.",
                _c.DaysAgo(2, 16)));

            AddCompletedTask(
                taskId: $"67555555555555555556{y % 10}{_n}19",
                execId: $"67555555555555555558{y % 10}{_n}19",
                code: "T23",
                when: _c.DaysAgo(1, 9),
                assignee: OwnerId,
                notes: "Λίγοι σπασμένοι βλαστοί δίπλα στον δρόμο. Τίποτα.");
            AddCompletedTask(
                taskId: $"67555555555555555556{y % 10}{_n}20",
                execId: $"67555555555555555558{y % 10}{_n}20",
                code: "T24",
                when: _c.DaysAgo(1, 11),
                assignee: OwnerId,
                notes: "Κλείνει η χρονιά. Καλή σοδειά. Λάδι στο σπίτι. Αρκετά.");
            Photos.Add(FieldPhoto(NextId('d'), "/demo-images/olive-grove-hillside.jpg",
                "Μετά τη συγκομιδή", _c.DaysAgo(1, 12)));
        }

        private void AddCompletedTask(
            string taskId,
            string execId,
            string code,
            DateTime when,
            string assignee,
            string? notes = null,
            int durationHours = 4,
            int days = 1,
            IReadOnlyList<string>? photoIds = null,
            string? relatedHarvestId = null)
        {
            var entry = FieldWorkCatalogue.GetByCode(code) ?? FieldWorkEventCatalogue.GetByCode(code);
            var title = entry?.GreekName ?? code;
            var checklist = ChecklistFromCatalogue(code, answered: true, photoIds);
            var end = when.AddDays(Math.Max(0, days - 1)).AddHours(durationHours);
            var completed = end;

            Tasks.Add(new FieldTaskDocument
            {
                Id = taskId,
                FieldId = _fieldId,
                ResultYear = _c.ResultYear,
                TemplateCode = code,
                TemplateVersion = FieldWorkCatalogue.Version,
                Title = title,
                Description = notes,
                Status = FieldTaskStatus.Completed.ToApiString(),
                PlannedStart = when,
                PlannedEnd = end,
                StartedAt = when.AddMinutes(30),
                AssignedUserId = assignee,
                ResponsibleUserId = assignee,
                AssignmentResponse = TaskAssignmentResponse.Accepted.ToApiString(),
                AssignmentRespondedAt = when.AddDays(-1),
                ChecklistSnapshot = checklist,
                Notes = notes,
                AttachmentIds = photoIds?.ToList() ?? [],
                RelatedHarvestId = relatedHarvestId,
                LatestExecutionId = execId,
                WeatherSuitability = WeatherSuitability.Good.ToApiString(),
                CreatedByUserId = OwnerId,
                CreatedAt = when.AddDays(-2),
                UpdatedAt = completed,
            });

            Executions.Add(new TaskExecutionDocument
            {
                Id = execId,
                TaskId = taskId,
                FieldId = _fieldId,
                ResultYear = _c.ResultYear,
                StartedAt = when.AddMinutes(30),
                CompletedAt = completed,
                Outcome = TaskExecutionOutcome.Completed.ToApiString(),
                CompletedByUserIds = [assignee],
                ChecklistResults = checklist.Select(c => new TaskExecutionChecklistResultDocument
                {
                    Key = c.Key,
                    IsAnswered = true,
                    TextValue = c.TextValue,
                    NumberValue = c.NumberValue,
                    BoolValue = c.BoolValue,
                    AttachmentIds = c.AttachmentIds,
                }).ToList(),
                Notes = notes,
                AttachmentIds = photoIds?.ToList() ?? [],
                WeatherSuitability = WeatherSuitability.Good.ToApiString(),
                RecordedByUserId = assignee,
                PlannedStartSnapshot = when,
                PlannedEndSnapshot = end,
                CreatedAt = completed,
                UpdatedAt = completed,
            });
        }

        private HarvestRecordDocument HarvestDay(
            string id,
            DateTime when,
            double oliveKg,
            int sacks,
            double? oilKg,
            decimal? oilLitres,
            double totalOliveKg,
            string? notes = null) =>
            new()
            {
                Id = id,
                FieldId = _fieldId,
                OwnerId = OwnerId,
                HarvestDate = when,
                ResultYear = _c.ResultYear,
                HarvestMethod = "Χτένες και δίχτυα",
                WorkersUsed = 4,
                SackCount = sacks,
                OliveKg = oliveKg,
                MillName = MillName,
                OilKg = oilKg,
                OilLitres = oilLitres,
                ConversionFactor = oilKg.HasValue ? OilKgPerLitre : null,
                ConversionSource = oilKg.HasValue ? "mill_ticket" : null,
                ConversionRecordedAt = oilKg.HasValue ? when.AddDays(2) : null,
                OilYieldPercent = oilKg.HasValue ? 19.0 : null,
                QualityGrade = oilKg.HasValue ? "Έξτρα παρθένο" : string.Empty,
                Notes = notes ?? $"{oliveKg:0} κιλά · {sacks} τσουβάλια",
                BatchId = _batchId,
                AllocationWeight = totalOliveKg > 0 ? oliveKg / totalOliveKg : null,
                Status = "posted",
                CreatedAt = when,
                UpdatedAt = when.AddHours(2),
            };

        private FinancialTransactionDocument Expense(
            string id,
            decimal amount,
            string description,
            string category,
            DateTime when,
            decimal? quantity = null,
            string? unit = null,
            decimal? unitPrice = null,
            string? productKind = null,
            string? taskId = null,
            string? harvestId = null,
            string? counterparty = null,
            string? collaboratorId = null) =>
            MoneyDoc(id, amount, description, category, when, "expense",
                quantity, unit, unitPrice, productKind, taskId, harvestId, counterparty, collaboratorId);

        private FinancialTransactionDocument Income(
            string id,
            decimal amount,
            string description,
            string category,
            DateTime when,
            decimal? quantity = null,
            string? unit = null,
            decimal? unitPrice = null,
            string? productKind = null,
            string? harvestId = null,
            string? counterparty = null) =>
            MoneyDoc(id, amount, description, category, when, "income",
                quantity, unit, unitPrice, productKind, null, harvestId, counterparty, null);

        private FinancialTransactionDocument MoneyDoc(
            string id,
            decimal amount,
            string description,
            string category,
            DateTime when,
            string type,
            decimal? quantity,
            string? unit,
            decimal? unitPrice,
            string? productKind,
            string? taskId,
            string? harvestId,
            string? counterparty,
            string? collaboratorId) =>
            new()
            {
                Id = id,
                OwnerUserId = OwnerId,
                Type = type,
                Status = "posted",
                Amount = FinancialCalculator.RoundMoney(amount),
                Currency = "EUR",
                OccurredOn = when,
                ResultYear = _c.ResultYear,
                FieldId = _fieldId,
                Category = category,
                ProductKind = productKind,
                Quantity = quantity,
                QuantityUnit = unit,
                UnitPrice = unitPrice,
                CalculationMode = quantity.HasValue && unitPrice.HasValue
                    ? "quantity_times_unit_price"
                    : "total_only",
                Description = description,
                CounterpartyName = counterparty,
                RelatedTaskId = taskId,
                RelatedHarvestId = harvestId,
                RelatedCollaboratorId = collaboratorId,
                SourceType = taskId != null ? "task" : harvestId != null ? "harvest" : "manual",
                IdempotencyKey = id,
                CreatedByUserId = OwnerId,
                CreatedAt = when,
                UpdatedAt = when,
                PostedAt = when,
            };

        private NoteDocument Note(string id, string ownerId, string body, DateTime when) =>
            new()
            {
                Id = id,
                OwnerUserId = ownerId,
                Body = body,
                FieldId = _fieldId,
                Pinned = false,
                OccurredAt = when,
                CreatedAt = when,
                UpdatedAt = when,
            };

        private MediaAttachmentDocument FieldPhoto(
            string id, string url, string caption, DateTime when) =>
            Photo(id, MediaOwnerType.Field, string.Empty, url, caption, when, PhotoKind.General);

        private MediaAttachmentDocument TaskPhoto(
            string id, string taskId, string url, string caption, DateTime when, PhotoKind kind) =>
            Photo(id, MediaOwnerType.Task, taskId, url, caption, when, kind);

        private MediaAttachmentDocument NotePhoto(
            string id, string noteId, string url, string caption, DateTime when) =>
            Photo(id, MediaOwnerType.Note, noteId, url, caption, when, PhotoKind.General);

        private MediaAttachmentDocument Photo(
            string id,
            MediaOwnerType ownerType,
            string ownerId,
            string url,
            string caption,
            DateTime when,
            PhotoKind kind) =>
            new()
            {
                Id = id,
                OwnerType = ownerType.ToApiString(),
                OwnerId = ownerType == MediaOwnerType.Field ? string.Empty : ownerId,
                FieldId = _fieldId,
                MediaType = "image",
                Url = url,
                ThumbnailUrl = url,
                FileName = url.Contains('/') ? url[(url.LastIndexOf('/') + 1)..] : url,
                ContentType = "image/jpeg",
                UploadedByUserId = OwnerId,
                CapturedAt = when,
                FieldAssignment = FieldAssignmentStatus.Manual.ToApiString(),
                Kind = kind.ToApiString(),
                Caption = caption,
                LinkedTitle = caption,
                LinkedOccurredAt = when,
                CreatedAt = when,
                UpdatedAt = when,
            };

        private static ActivityDocument Activity(
            string id,
            string fieldId,
            string type,
            string message,
            string actorId,
            DateTime when,
            Dictionary<string, string>? metadata = null) =>
            new()
            {
                Id = id,
                FieldId = fieldId,
                Type = type,
                Message = message,
                ActorUserId = actorId,
                Timestamp = when,
                Metadata = metadata,
            };

        private static List<FieldTaskChecklistItemDocument> ChecklistFromCatalogue(
            string templateCode,
            bool answered,
            IReadOnlyList<string>? photoAttachmentIds = null)
        {
            var entry = FieldWorkCatalogue.GetByCode(templateCode)
                ?? FieldWorkEventCatalogue.GetByCode(templateCode);
            if (entry is null) return [];

            return ChecklistSnapshotFactory.WorkingChecks(entry.DefaultChecklist).Select((c, i) => new FieldTaskChecklistItemDocument
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
}
