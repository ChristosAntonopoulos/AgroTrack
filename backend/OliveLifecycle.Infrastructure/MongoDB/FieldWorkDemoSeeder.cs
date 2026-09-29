using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace OliveLifecycle.Infrastructure.MongoDB;

/// <summary>
/// Retired multi-parcel live-task seed. Replaced by <see cref="SimpleFarmerStorySeeder"/>.
/// Kept so older call sites compile; intentionally a no-op.
/// </summary>
public static class FieldWorkDemoSeeder
{
    public const string OwnerId = DemoFarmDataSeeder.OwnerId;
    public const string ProducerId = DemoFarmDataSeeder.ProducerId;

    public static readonly string[] TaskIds =
    [
        "675555555555555555556001",
        "675555555555555555556002",
        "675555555555555555556003",
        "675555555555555555556004",
        "675555555555555555556005",
    ];

    public static Task SeedAsync(
        MongoDbContext context,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation("FieldWorkDemoSeeder skipped — simple farmer story owns tasks and photos.");
        return Task.CompletedTask;
    }
}
