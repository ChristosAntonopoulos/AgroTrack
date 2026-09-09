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
        ("675555555555555555555601", "pruner@olivefarm.com", "password123", "Nikos", "Karras"),
        ("675555555555555555555602", "harvester@olivefarm.com", "password123", "Eleni", "Vassiliou"),
        ("675555555555555555555603", "agronomist@olivefarm.com", "password123", "Maria", "Stefanou"),
        ("675555555555555555555604", "mill@olivefarm.com", "password123", "Crete", "Mills"),
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
            ("675555555555555555555601", "675777777777777777777601", "Nikos Karras Pruning", "Individual", "Heraklion", 35.34, 25.13, 50, [pruningId], "Seasonal pruning for olive groves around Heraklion.", 18, null, "Pole pruners, chainsaws", "Available", null, null, null),
            ("675555555555555555555602", "675777777777777777777602", "Vassiliou Harvest Crew", "Team", "Peza", 35.32, 25.18, 80, [harvestId, laborId, machineryId], "Harvest crew with nets, rakes, and a small shaker.", 12, 8, "Nets, shaker, crates", "Limited", null, null, null),
            ("675555555555555555555603", "675777777777777777777603", "Maria Stefanou Agronomist", "Individual", "Archanes", 35.31, 25.16, 100, [agronomistId], "Grove visits, nutrition, and plant-protection advice.", 20, null, "", "Available", null, null, null),
            ("675555555555555555555604", "675777777777777777777604", "Crete Hills Mill", "Business", "Skala", 35.28, 25.10, 60, [millId], "Two-phase mill. Contact for a milling slot.", 30, 4, "Mill line", "Available", "Nov–Feb", "Two-phase", true),
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
                ServiceAreas = [listing.Area, "Heraklion"],
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

        logger.LogInformation("Seeded {Count} demo partner listings around Crete.", listings.Length);
    }
}
