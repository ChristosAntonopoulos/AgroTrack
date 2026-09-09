using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Storage;
using OliveLifecycle.Infrastructure.MongoDB;
using OliveLifecycle.Infrastructure.Persistence;
using OliveLifecycle.Infrastructure.Persistence.Repositories;
using OliveLifecycle.Infrastructure.Geospatial;
using OliveLifecycle.Infrastructure.Storage;

namespace OliveLifecycle.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddMongoDb(configuration);
        services.AddHostedService<MongoIndexInitializer>();
        services.AddHostedService<DataSeeder>();

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IFieldRepository, FieldRepository>();
        services.AddScoped<IFieldInviteRepository, FieldInviteRepository>();
        services.AddScoped<ILifecycleRepository, LifecycleRepository>();
        services.AddScoped<ITaskRepository, TaskRepository>();
        services.AddScoped<IActivityRepository, ActivityRepository>();
        services.AddScoped<ITaskTemplateRepository, TaskTemplateRepository>();
        services.AddScoped<IMinistryNotificationRepository, MinistryNotificationRepository>();
        services.AddScoped<IHarvestRecordRepository, HarvestRecordRepository>();
        services.AddScoped<IFinancialEntryRepository, FinancialEntryRepository>();
        services.AddScoped<IServiceCategoryRepository, ServiceCategoryRepository>();
        services.AddScoped<IServiceProviderProfileRepository, ServiceProviderProfileRepository>();
        services.AddScoped<IServiceContactRequestRepository, ServiceContactRequestRepository>();
        services.AddScoped<IUserNotificationRepository, UserNotificationRepository>();
        services.AddScoped<ISavedContactRepository, SavedContactRepository>();
        services.AddScoped<INoteRepository, NoteRepository>();
        services.AddScoped<IMediaAttachmentRepository, MediaAttachmentRepository>();
        services.AddScoped<IFamilyCircleRepository, FamilyCircleRepository>();
        services.AddScoped<IFamilyMemberRepository, FamilyMemberRepository>();
        services.AddScoped<IFamilyInviteRepository, FamilyInviteRepository>();
        services.AddScoped<IFieldLifecycleSync, FieldLifecycleSync>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();

        services.AddGeospatial(configuration);

        return services;
    }
}
