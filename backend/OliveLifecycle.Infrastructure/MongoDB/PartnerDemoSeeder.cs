using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.MongoDB;

public static class PartnerDemoSeeder
{
    private static readonly (string Id, string Email, string Password, string First, string Last)[] DemoProviders =
    [
        ("675555555555555555555601", "pruner@olivefarm.com", "password123", "Νίκος", "Καρράς"),
        ("675555555555555555555602", "harvester@olivefarm.com", "password123", "Ελένη", "Βασιλείου"),
        ("675555555555555555555603", "agronomist@olivefarm.com", "password123", "Μαρία", "Στεφάνου"),
        ("675555555555555555555604", "mill@olivefarm.com", "password123", "Δημήτρης", "Μυλωνάς"),
    ];

    public static async Task SeedAsync(
        MongoDbContext context,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(configuration["DemoAccounts:Seed"], "true", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var users = context.GetCollection<UserDocument>("users");
        var profiles = context.GetCollection<ServiceProviderProfileDocument>("service_provider_profiles");
        var now = DateTime.UtcNow;

        foreach (var demo in DemoProviders)
        {
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(demo.Password);
            var existing = await users.Find(u => u.Id == demo.Id || u.Email == demo.Email).FirstOrDefaultAsync(cancellationToken);
            if (existing == null)
            {
                await users.InsertOneAsync(new UserDocument
                {
                    Id = demo.Id,
                    Email = demo.Email,
                    PasswordHash = passwordHash,
                    Role = Roles.Producer,
                    FirstName = demo.First,
                    LastName = demo.Last,
                    CreatedAt = now,
                    UpdatedAt = now
                }, cancellationToken: cancellationToken);
            }
        }

        var categories = context.GetCollection<ServiceCategoryDocument>("service_categories");
        async Task<string> CategoryId(string slug)
        {
            var doc = await categories.Find(c => c.Slug == slug).FirstOrDefaultAsync(cancellationToken);
            return doc?.Id ?? ServiceCategorySeeder.Catalog.First(c => c.Slug == slug).Id;
        }

        var pruningId = await CategoryId("pruning");
        var harvestId = await CategoryId("harvest");
        var agronomistId = await CategoryId("agronomist");
        var millId = await CategoryId("olive-mill");
        var laborId = await CategoryId("labor");
        var machineryId = await CategoryId("machinery");

        var listings = new (string UserId, string ProfileId, string Display, string Kind, string Area, double Lat, double Lng, int Radius, string[] Categories, string Bio, int Years, int? Crew, string Equipment, string Availability, string? MillPeriod, string? MillMethod, bool? MillAppt)[]
        {
            ("675555555555555555555601", "675777777777777777777601", "Νίκος Καρράς — Κλάδεμα", "Individual", "Φιλιατρά", 37.158, 21.586, 40, [pruningId], "Χειμερινό κλάδεμα ελαιώνων στη Μεσσηνία.", 18, null, "Κονταροψάλιδα, αλυσοπρίονα", "Available", null, null, null),
            ("675555555555555555555602", "675777777777777777777602", "Συνεργείο Βασιλείου", "Team", "Γαργαλιάνοι", 37.065, 21.638, 50, [harvestId, laborId, machineryId], "Συνεργείο συγκομιδής με δίχτυα, κτένες και μικρό δονητή.", 12, 8, "Δίχτυα, δονητής, κλούβες", "Limited", null, null, null),
            ("675555555555555555555603", "675777777777777777777603", "Μαρία Στεφάνου — Γεωπόνος", "Individual", "Κυπαρισσία", 37.252, 21.678, 70, [agronomistId], "Επισκέψεις στον ελαιώνα, θρέψη και φυτοπροστασία.", 20, null, "", "Available", null, null, null),
            ("675555555555555555555604", "675777777777777777777604", "Ελαιοτριβείο Φιλιατρών", "Business", "Φιλιατρά", 37.148, 21.585, 35, [millId], "Διφασικό ελαιοτριβείο. Κλείστε ραντεβού πριν τη συγκομιδή.", 30, 4, "Γραμμή άλεσης", "Available", "Οκτ–Φεβ", "Two-phase", true),
        };

        foreach (var listing in listings)
        {
            var profile = new ServiceProviderProfileDocument
            {
                Id = listing.ProfileId,
                UserId = listing.UserId,
                DisplayName = listing.Display,
                ProviderKind = listing.Kind,
                ServiceCategoryIds = listing.Categories.ToList(),
                BaseLocation = new GeoJsonPointDocument
                {
                    Type = "Point",
                    Coordinates = [listing.Lng, listing.Lat]
                },
                BaseAreaLabel = listing.Area,
                ServiceRadiusKm = listing.Radius,
                ServiceAreas = [listing.Area, "Μεσσηνία"],
                ShortDescription = listing.Bio,
                ExperienceYears = listing.Years,
                CrewSize = listing.Crew,
                Equipment = string.IsNullOrWhiteSpace(listing.Equipment) ? null : listing.Equipment,
                MillOperatingPeriod = listing.MillPeriod,
                MillProcessingMethod = listing.MillMethod,
                MillAppointmentRequired = listing.MillAppt,
                Languages = ["el", "en"],
                ContactPreference = "InApp",
                Availability = listing.Availability,
                PricingNote = "Contact for price",
                IsPaused = false,
                IsListed = true,
                CompletenessScore = 78,
                VerificationStatus = "Unverified",
                CreatedAt = now,
                UpdatedAt = now
            };

            await profiles.ReplaceOneAsync(
                p => p.UserId == listing.UserId,
                profile,
                new ReplaceOptions { IsUpsert = true },
                cancellationToken);
        }

        logger.LogInformation("Seeded {Count} demo partner listings around Filiatra.", listings.Length);

        await SeedOwnerPartnerStoryAsync(context, harvestId, millId, now, cancellationToken);
    }

    private static async Task SeedOwnerPartnerStoryAsync(
        MongoDbContext context,
        string harvestCategoryId,
        string millCategoryId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var northFieldId = DemoFarmDataSeeder.FieldIds[0];
        var contacts = context.GetCollection<SavedContactDocument>("saved_contacts");
        await contacts.ReplaceOneAsync(
            c => c.Id == "67c801b20000000000000001",
            new SavedContactDocument
            {
                Id = "67c801b20000000000000001",
                OwnerUserId = DemoFarmDataSeeder.OwnerId,
                DisplayName = "Κώστας Μανουσάκης",
                Phone = "+30 697 210 0881",
                Email = "producer1@olivefarm.com",
                Notes = "Σταθερός συνεργάτης στα δύο ΚΑΕΚ. Κλάδεμα, ψεκασμοί, συγκομιδή.",
                ServiceCategoryIds = [],
                FieldIds = DemoFarmDataSeeder.FieldIds.ToList(),
                LinkedUserId = DemoFarmDataSeeder.ProducerId,
                Source = "Invite",
                CreatedAt = now.AddDays(-200),
                UpdatedAt = now
            },
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);

        await contacts.ReplaceOneAsync(
            c => c.Id == "67c801b20000000000000002",
            new SavedContactDocument
            {
                Id = "67c801b20000000000000002",
                OwnerUserId = DemoFarmDataSeeder.OwnerId,
                DisplayName = "Ελαιοτριβείο Φιλιατρών",
                Phone = "+30 27610 22010",
                Email = "mill@olivefarm.com",
                Notes = "Διφασικό. Κλείνουμε πάντα πριν την πρώτη εβδομάδα του Οκτώβρη.",
                ServiceCategoryIds = [millCategoryId],
                FieldIds = DemoFarmDataSeeder.FieldIds.ToList(),
                LinkedUserId = "675555555555555555555604",
                Source = "Manual",
                CreatedAt = now.AddDays(-400),
                UpdatedAt = now
            },
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);

        var requests = context.GetCollection<ServiceContactRequestDocument>("service_contact_requests");
        await requests.ReplaceOneAsync(
            r => r.Id == "67c801b10000000000000001",
            new ServiceContactRequestDocument
            {
                Id = "67c801b10000000000000001",
                RequesterUserId = DemoFarmDataSeeder.OwnerId,
                ProviderUserId = "675555555555555555555602",
                ServiceCategoryId = harvestCategoryId,
                FieldId = northFieldId,
                ApproximateArea = "Φιλιατρά",
                AreaHectares = 0.32,
                SuggestedStart = new DateTime(2026, 10, 7, 7, 0, 0, DateTimeKind.Utc),
                SuggestedEnd = new DateTime(2026, 10, 7, 16, 0, 0, DateTimeKind.Utc),
                Message = "Ελένη, θέλουμε 4 άτομα στις 7 Οκτωβρίου στο ΚΑΕΚ 088. Δίχτυα και κτένες υπάρχουν.",
                Status = "New",
                ContactMethod = "in_app",
                CreatedAt = now.AddHours(-6),
                UpdatedAt = now.AddHours(-6)
            },
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);

        var notifications = context.GetCollection<UserNotificationDocument>("user_notifications");
        await notifications.ReplaceOneAsync(
            n => n.Id == "67c801b30000000000000001",
            new UserNotificationDocument
            {
                Id = "67c801b30000000000000001",
                UserId = DemoFarmDataSeeder.OwnerId,
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
                UserId = DemoFarmDataSeeder.ProducerId,
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

        await notifications.ReplaceOneAsync(
            n => n.Id == "67c801b30000000000000003",
            new UserNotificationDocument
            {
                Id = "67c801b30000000000000003",
                UserId = "675555555555555555555602",
                Type = "partner_contact",
                Title = "Νέο αίτημα συνεργασίας",
                Message = "Ο Γιώργος Παπαδάκης ζητά συνεργείο συγκομιδής στις 7 Οκτωβρίου.",
                RelatedEntityId = "67c801b10000000000000001",
                RelatedEntityType = "ServiceContactRequest",
                ActionUrl = "/partners/requests",
                IsRead = false,
                CreatedAt = now.AddHours(-6),
                UpdatedAt = now.AddHours(-6)
            },
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);
    }
}
