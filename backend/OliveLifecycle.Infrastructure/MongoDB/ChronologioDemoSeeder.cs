using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Retired three-field / multi-year chronologio seed. Replaced by <see cref="SimpleFarmerStorySeeder"/>.
/// Kept so older call sites compile; intentionally a no-op.
/// </summary>
public static class ChronologioDemoSeeder
{
    public const string OwnerId = DemoFarmDataSeeder.OwnerId;
    public const string ProducerId = DemoFarmDataSeeder.ProducerId;
    public const string FamilyUserId = DemoFarmDataSeeder.FamilyUserId;

    public static Task SeedAsync(
        MongoDbContext context,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation("ChronologioDemoSeeder skipped — simple farmer story owns money, harvests, and notes.");
        return Task.CompletedTask;
    }
}
