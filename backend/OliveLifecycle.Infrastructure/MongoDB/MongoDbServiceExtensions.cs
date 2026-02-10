using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using OliveLifecycle.Infrastructure.MongoDB;

namespace OliveLifecycle.Infrastructure;

public static class MongoDbServiceExtensions
{
    public static IServiceCollection AddMongoDb(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration["MongoDB:ConnectionString"];
        var databaseName = configuration["MongoDB:DatabaseName"];

        if (string.IsNullOrEmpty(connectionString))
        {
            throw new InvalidOperationException("MongoDB connection string is not configured.");
        }

        if (string.IsNullOrEmpty(databaseName))
        {
            throw new InvalidOperationException("MongoDB database name is not configured.");
        }

        var client = new MongoClient(connectionString);
        var database = new MongoDbContext(client, databaseName);

        services.AddSingleton<IMongoClient>(client);
        services.AddSingleton(database);

        return services;
    }
}
